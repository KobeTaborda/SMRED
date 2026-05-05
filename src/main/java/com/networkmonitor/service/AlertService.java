package com.networkmonitor.service;

import com.networkmonitor.entity.Alert;
import com.networkmonitor.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
    public void checkHostStatusChange(
            com.networkmonitor.entity.Host host,
            com.networkmonitor.entity.Host.HostStatus previous,
            com.networkmonitor.entity.Host.HostStatus current,
            PingService.PingResult pingResult) {

        if (current == com.networkmonitor.entity.Host.HostStatus.OFFLINE
                && previous != com.networkmonitor.entity.Host.HostStatus.OFFLINE) {
            createAlert(host, Alert.AlertType.HOST_DOWN, Alert.Severity.CRITICAL,
                    "🔴 Host CAIDO: " + host.getName(),
                    String.format("El host %s (%s) no responde. Última vez: %s",
                            host.getName(), host.getIpAddress(),
                            host.getLastSeen() != null ? host.getLastSeen().toString() : "desconocido"));
        }

        if (current == com.networkmonitor.entity.Host.HostStatus.ONLINE
                && previous == com.networkmonitor.entity.Host.HostStatus.OFFLINE) {
            createAlert(host, Alert.AlertType.HOST_UP, Alert.Severity.INFO,
                    "🟢 Host RECUPERADO: " + host.getName(),
                    String.format("El host %s (%s) está de nuevo en línea. Latencia: %.1f ms",
                            host.getName(), host.getIpAddress(), pingResult.getAvgLatency()));
            resolveAlertsByType(host, Alert.AlertType.HOST_DOWN);
        }

        if (pingResult.isReachable() && pingResult.getAvgLatency() > latencyThreshold) {
            createAlert(host, Alert.AlertType.HIGH_LATENCY, Alert.Severity.WARNING,
                    "⚠️ Alta Latencia: " + host.getName(),
                    String.format("Latencia de %.1f ms en %s (%s). Umbral: %d ms",
                            pingResult.getAvgLatency(), host.getName(),
                            host.getIpAddress(), latencyThreshold));
        }

        if (pingResult.getPacketLoss() >= packetLossThreshold) {
            createAlert(host, Alert.AlertType.PACKET_LOSS, Alert.Severity.WARNING,
                    "📦 Pérdida de Paquetes: " + host.getName(),
                    String.format("Pérdida del %d%% en %s (%s). Umbral: %d%%",
                            pingResult.getPacketLoss(), host.getName(),
                            host.getIpAddress(), packetLossThreshold));
        }
    }

    @Transactional
    public void checkPortChanges(
            com.networkmonitor.entity.Host host,
            List<com.networkmonitor.entity.PortScanResult> results) {
        for (var result : results) {
            if (result.getStatus() == com.networkmonitor.entity.PortScanResult.PortStatus.OPEN) {
                createAlert(host, Alert.AlertType.PORT_OPEN, Alert.Severity.WARNING,
                        "🔓 Nuevo Puerto Abierto: " + host.getName(),
                        String.format("Puerto %d (%s) abierto en %s (%s)",
                                result.getPortNumber(), result.getServiceName(),
                                host.getName(), host.getIpAddress()));
            }
        }
    }

    @Transactional
    public Alert createAlert(com.networkmonitor.entity.Host host,
                              Alert.AlertType type, Alert.Severity severity,
                              String title, String message) {
        Alert alert = new Alert(host, type, severity, title, message);
        alertRepository.save(alert);
        log.warn("[ALERTA-{}] {}: {}", severity, title, message);
        notifyWebSocket(alert);
        if (emailEnabled && severity != Alert.Severity.INFO) sendEmailAlert(alert);
        return alert;
    }

    // ── ACCIONES INDIVIDUALES ──

    @Transactional
    public void acknowledgeAlert(Long alertId) {
        alertRepository.findById(alertId).ifPresent(a -> {
            a.setStatus(Alert.AlertStatus.ACKNOWLEDGED);
            alertRepository.save(a);
        });
    }

    @Transactional
    public void resolveAlert(Long alertId) {
        alertRepository.findById(alertId).ifPresent(a -> {
            a.setStatus(Alert.AlertStatus.RESOLVED);
            a.setResolvedAt(LocalDateTime.now());
            alertRepository.save(a);
        });
    }

    // ── ACCIONES MASIVAS ──

    @Transactional
    public int bulkAcknowledge(List<Long> ids) {
        List<Alert> alerts = alertRepository.findByIdIn(ids);
        alerts.forEach(a -> {
            if (a.getStatus() == Alert.AlertStatus.ACTIVE) {
                a.setStatus(Alert.AlertStatus.ACKNOWLEDGED);
            }
        });
        alertRepository.saveAll(alerts);
        log.info("Reconocidas {} alertas en masa", alerts.size());
        return alerts.size();
    }

    @Transactional
    public int bulkResolve(List<Long> ids) {
        List<Alert> alerts = alertRepository.findByIdIn(ids);
        alerts.forEach(a -> {
            if (a.getStatus() != Alert.AlertStatus.RESOLVED) {
                a.setStatus(Alert.AlertStatus.RESOLVED);
                a.setResolvedAt(LocalDateTime.now());
            }
        });
        alertRepository.saveAll(alerts);
        log.info("Resueltas {} alertas en masa", alerts.size());
        return alerts.size();
    }

    // ── CONSULTAS PAGINADAS ──

    public Page<Alert> getAlertsPaginated(
            Alert.AlertStatus status, Alert.Severity severity, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return alertRepository.findWithFilters(status, severity, pageable);
    }

    @Transactional
    public void resolveAlertsByType(com.networkmonitor.entity.Host host, Alert.AlertType type) {
        alertRepository.findByStatusOrderByCreatedAtDesc(Alert.AlertStatus.ACTIVE).stream()
                .filter(a -> a.getHost() != null
                        && a.getHost().getId().equals(host.getId())
                        && a.getAlertType() == type)
                .forEach(a -> {
                    a.setStatus(Alert.AlertStatus.RESOLVED);
                    a.setResolvedAt(LocalDateTime.now());
                    alertRepository.save(a);
                });
    }

    private void notifyWebSocket(Alert alert) {
        try { messagingTemplate.convertAndSend("/topic/alerts", alert); }
        catch (Exception e) { log.error("Error WebSocket: {}", e.getMessage()); }
    }

    private void sendEmailAlert(Alert alert) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(alertEmailTo);
            mail.setSubject("[NetworkMonitor] " + alert.getTitle());
            mail.setText("Severidad: " + alert.getSeverity() + "\nMensaje: " + alert.getMessage());
            mailSender.send(mail);
            alert.setEmailSent(true);
            alertRepository.save(alert);
        } catch (Exception e) { log.error("Error email: {}", e.getMessage()); }
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
