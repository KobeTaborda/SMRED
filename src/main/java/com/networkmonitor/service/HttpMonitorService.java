package com.networkmonitor.service;

import com.networkmonitor.entity.Alert;
import com.networkmonitor.entity.HttpMonitor;
import com.networkmonitor.repository.HttpMonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de monitoreo de servicios HTTP/URLs
 * Verifica que una URL responda con codigo 200 OK
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class HttpMonitorService {

    private final HttpMonitorRepository httpMonitorRepository;
    private final AlertService alertService;

    private static final int TIMEOUT_MS = 5000;

    /**
     * Verifica todos los monitores HTTP activos
     */
    @Transactional
    public void checkAllMonitors() {
        List<HttpMonitor> monitors = httpMonitorRepository.findByActiveTrue();
        log.info("Verificando {} servicios HTTP", monitors.size());
        for (HttpMonitor monitor : monitors) {
            checkMonitor(monitor);
        }
    }

    /**
     * Verifica un monitor especifico
     */
    @Transactional
    public HttpMonitor checkMonitor(HttpMonitor monitor) {
        HttpCheckResult result = executeHttpCheck(monitor.getUrl());

        HttpMonitor.MonitorStatus previousStatus = monitor.getStatus();
        HttpMonitor.MonitorStatus newStatus;

        if (result.isUp()) {
            if (result.getResponseTimeMs() > 3000) {
                newStatus = HttpMonitor.MonitorStatus.SLOW;
            } else {
                newStatus = HttpMonitor.MonitorStatus.UP;
            }
            monitor.setLastResponseCode(result.getStatusCode());
            monitor.setLastResponseTimeMs(result.getResponseTimeMs());
            monitor.setLastChecked(LocalDateTime.now());
        } else {
            newStatus = HttpMonitor.MonitorStatus.DOWN;
            monitor.setLastResponseCode(result.getStatusCode());
        }

        monitor.setStatus(newStatus);
        httpMonitorRepository.save(monitor);

        // Generar alertas si cambia el estado
        if (newStatus == HttpMonitor.MonitorStatus.DOWN
                && previousStatus != HttpMonitor.MonitorStatus.DOWN) {
            alertService.createAlert(null,
                    Alert.AlertType.SYSTEM,
                    Alert.Severity.CRITICAL,
                    "🔴 Servicio HTTP CAIDO: " + monitor.getName(),
                    String.format("El servicio %s (%s) no responde. Codigo: %d",
                            monitor.getName(), monitor.getUrl(),
                            result.getStatusCode()));
        }

        if (newStatus == HttpMonitor.MonitorStatus.UP
                && previousStatus == HttpMonitor.MonitorStatus.DOWN) {
            alertService.createAlert(null,
                    Alert.AlertType.SYSTEM,
                    Alert.Severity.INFO,
                    "🟢 Servicio HTTP RECUPERADO: " + monitor.getName(),
                    String.format("El servicio %s (%s) esta de nuevo en linea. Tiempo: %dms",
                            monitor.getName(), monitor.getUrl(),
                            result.getResponseTimeMs()));
        }

        return monitor;
    }

    /**
     * Ejecuta la verificacion HTTP real
     */
    private HttpCheckResult executeHttpCheck(String urlStr) {
        long start = System.currentTimeMillis();
        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "SMRED-Monitor/1.0");

            int statusCode = conn.getResponseCode();
            long responseTime = System.currentTimeMillis() - start;
            conn.disconnect();

            boolean isUp = statusCode >= 200 && statusCode < 400;
            return new HttpCheckResult(isUp, statusCode, (int) responseTime);

        } catch (Exception e) {
            log.warn("Error verificando {}: {}", urlStr, e.getMessage());
            return new HttpCheckResult(false, 0, (int)(System.currentTimeMillis() - start));
        }
    }

    @Transactional
    public HttpMonitor createMonitor(String name, String url,
                                      String description, int intervalSeconds) {
        HttpMonitor monitor = new HttpMonitor();
        monitor.setName(name);
        monitor.setUrl(url);
        monitor.setDescription(description);
        monitor.setIntervalSeconds(intervalSeconds);
        return httpMonitorRepository.save(monitor);
    }

    @Transactional
    public void deleteMonitor(Long id) {
        httpMonitorRepository.deleteById(id);
    }

    public List<HttpMonitor> getAllMonitors() {
        return httpMonitorRepository.findAll();
    }

    // ── Inner class para resultados ──
    public static class HttpCheckResult {
        private final boolean up;
        private final int statusCode;
        private final int responseTimeMs;

        public HttpCheckResult(boolean up, int statusCode, int responseTimeMs) {
            this.up = up;
            this.statusCode = statusCode;
            this.responseTimeMs = responseTimeMs;
        }

        public boolean isUp() { return up; }
        public int getStatusCode() { return statusCode; }
        public int getResponseTimeMs() { return responseTimeMs; }
    }
}
