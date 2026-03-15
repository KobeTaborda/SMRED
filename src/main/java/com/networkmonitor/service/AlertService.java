package com.networkmonitor.service;

import com.networkmonitor.entity.Alert;
import com.networkmonitor.entity.Host;
import com.networkmonitor.entity.PortScanResult;
import com.networkmonitor.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de Alertas - Genera y gestiona alertas del sistema
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JavaMailSender mailSender;

    @Value("${monitor.alert.latency-threshold:500}")
    private int latencyThreshold;

    @Value("${monitor.alert.packet-loss-threshold:20}")
    private int packetLossThreshold;

    @Value("${monitor.alert.email-enabled:false}")
    private boolean emailEnabled;

    @Value("${monitor.alert.email-to:admin@empresa.com}")
    private String alertEmailTo;

    /**
     * Verifica y genera alertas basadas en cambio de estado del host
     */
    @Transactional
    public void checkHostStatusChange(Host host, Host.HostStatus previous,
                                       Host.HostStatus current,
                                       PingService.PingResult pingResult) {
        // Host caido
        if (current == Host.HostStatus.OFFLINE && previous != Host.HostStatus.OFFLINE) {
            createAlert(host,
                    Alert.AlertType.HOST_DOWN,
                    Alert.Severity.CRITICAL,
                    "🔴 Host CAIDO: " + host.getName(),
                    String.format("El host %s (%s) no responde. Ultima vez visto: %s",
                            host.getName(), host.getIpAddress(),
                            host.getLastSeen() != null ? host.getLastSeen().toString() : "desconocido"));
        }

        // Host recuperado
        if (current == Host.HostStatus.ONLINE && previous == Host.HostStatus.OFFLINE) {
            createAlert(host,
                    Alert.AlertType.HOST_UP,
                    Alert.Severity.INFO,
                    "🟢 Host RECUPERADO: " + host.getName(),
                    String.format("El host %s (%s) esta de nuevo en linea. Latencia: %.1f ms",
                            host.getName(), host.getIpAddress(), pingResult.getAvgLatency()));
            // Resolver alertas previas de host caido
            resolveAlertsByType(host, Alert.AlertType.HOST_DOWN);
        }

        // Alta latencia
        if (pingResult.isReachable() && pingResult.getAvgLatency() > latencyThreshold) {
            createAlert(host,
                    Alert.AlertType.HIGH_LATENCY,
                    Alert.Severity.WARNING,
                    "⚠️ Alta Latencia: " + host.getName(),
                    String.format("Latencia de %.1f ms detectada en %s (%s). Umbral: %d ms",
                            pingResult.getAvgLatency(), host.getName(),
                            host.getIpAddress(), latencyThreshold));
        }

        // Perdida de paquetes
        if (pingResult.getPacketLoss() >= packetLossThreshold) {
            createAlert(host,
                    Alert.AlertType.PACKET_LOSS,
                    Alert.Severity.WARNING,
                    "📦 Perdida de Paquetes: " + host.getName(),
                    String.format("Perdida del %d%% en %s (%s). Umbral: %d%%",
                            pingResult.getPacketLoss(), host.getName(),
                            host.getIpAddress(), packetLossThreshold));
        }
    }

    /**
     * Verifica cambios en puertos escaneados
     */
    @Transactional
    public void checkPortChanges(Host host, List<PortScanResult> results) {
        for (PortScanResult result : results) {
            if (result.getStatus() == PortScanResult.PortStatus.OPEN) {
                boolean wasOpen = portScanResultRepository(host.getId(),
                        result.getPortNumber());

                if (!wasOpen) {
                    createAlert(host,
                            Alert.AlertType.PORT_OPEN,
                            Alert.Severity.WARNING,
                            "🔓 Nuevo Puerto Abierto: " + host.getName(),
                            String.format("Puerto %d (%s) abierto en %s (%s)",
                                    result.getPortNumber(), result.getServiceName(),
                                    host.getName(), host.getIpAddress()));
                }
            }
        }
    }

    /**
     * Crea una nueva alerta y la notifica por WebSocket y email
     */
    @Transactional
    public Alert createAlert(Host host, Alert.AlertType type, Alert.Severity severity,
                              String title, String message) {
        Alert alert = new Alert(host, type, severity, title, message);
        alertRepository.save(alert);

        log.warn("[ALERTA-{}] {}: {}", severity, title, message);

        // Notificar via WebSocket al dashboard en tiempo real
        notifyWebSocket(alert);

        // Enviar email si esta habilitado y es critico/warning
        if (emailEnabled && severity != Alert.Severity.INFO) {
            sendEmailAlert(alert);
        }

        return alert;
    }

    /**
     * Reconocer una alerta
     */
    @Transactional
    public void acknowledgeAlert(Long alertId) {
        alertRepository.findById(alertId).ifPresent(alert -> {
            alert.setStatus(Alert.AlertStatus.ACKNOWLEDGED);
            alertRepository.save(alert);
        });
    }

    /**
     * Resolver una alerta
     */
    @Transactional
    public void resolveAlert(Long alertId) {
        alertRepository.findById(alertId).ifPresent(alert -> {
            alert.setStatus(Alert.AlertStatus.RESOLVED);
            alert.setResolvedAt(LocalDateTime.now());
            alertRepository.save(alert);
        });
    }

    /**
     * Resuelve alertas por tipo para un host
     */
    @Transactional
    public void resolveAlertsByType(Host host, Alert.AlertType type) {
        List<Alert> active = alertRepository.findByStatusOrderByCreatedAtDesc(
                Alert.AlertStatus.ACTIVE);
        active.stream()
              .filter(a -> a.getHost() != null &&
                           a.getHost().getId().equals(host.getId()) &&
                           a.getAlertType() == type)
              .forEach(a -> {
                  a.setStatus(Alert.AlertStatus.RESOLVED);
                  a.setResolvedAt(LocalDateTime.now());
                  alertRepository.save(a);
              });
    }

    /**
     * Envia notificacion WebSocket al dashboard
     */
    private void notifyWebSocket(Alert alert) {
        try {
            messagingTemplate.convertAndSend("/topic/alerts", alert);
        } catch (Exception e) {
            log.error("Error enviando WebSocket: {}", e.getMessage());
        }
    }

    /**
     * Envia notificacion por correo electronico
     */
    private void sendEmailAlert(Alert alert) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(alertEmailTo);
            mail.setSubject("[NetworkMonitor] " + alert.getTitle());
            mail.setText(
                "ALERTA DEL SISTEMA DE MONITOREO DE RED\n" +
                "==========================================\n" +
                "Severidad: " + alert.getSeverity() + "\n" +
                "Tipo: " + alert.getAlertType() + "\n" +
                "Host: " + (alert.getHost() != null ? alert.getHost().getName() : "Sistema") + "\n" +
                "Mensaje: " + alert.getMessage() + "\n" +
                "Fecha: " + alert.getCreatedAt() + "\n" +
                "==========================================\n" +
                "Accede al dashboard: http://localhost:8080"
            );
            mailSender.send(mail);
            alert.setEmailSent(true);
            alertRepository.save(alert);
            log.info("Email de alerta enviado a {}", alertEmailTo);
        } catch (Exception e) {
            log.error("Error enviando email: {}", e.getMessage());
        }
    }

    // Helper - verifica si el puerto estaba abierto antes
    private boolean portScanResultRepository(Long hostId, Integer port) {
        return false; // Simplificado - en produccion buscar en historial
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByStatusOrderByCreatedAtDesc(Alert.AlertStatus.ACTIVE);
    }

    public List<Alert> getRecentAlerts() {
        return alertRepository.findTop20ByOrderByCreatedAtDesc();
    }

    public List<Alert> getAlertsByHost(Long hostId) {
        return alertRepository.findByHostIdOrderByCreatedAtDesc(hostId);
    }
}
