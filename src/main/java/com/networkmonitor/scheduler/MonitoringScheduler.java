package com.networkmonitor.scheduler;

import com.networkmonitor.service.BandwidthService;
import com.networkmonitor.service.HttpMonitorService;
import com.networkmonitor.service.PingService;
import com.networkmonitor.service.PortScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Planificador de tareas de monitoreo
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MonitoringScheduler {

    private final PingService pingService;
    private final PortScanService portScanService;
    private final BandwidthService bandwidthService;
    private final HttpMonitorService httpMonitorService;

    @Scheduled(fixedDelayString = "${monitor.ping.interval:30000}")
    public void scheduledPing() {
        log.debug("⏰ Ejecutando ciclo de ping...");
        try {
            pingService.pingAllActiveHosts();
        } catch (Exception e) {
            log.error("Error en ciclo de ping: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${monitor.portscan.interval:300000}")
    public void scheduledPortScan() {
        log.debug("⏰ Ejecutando escaneo de puertos...");
        try {
            portScanService.scanAllActiveHosts();
        } catch (Exception e) {
            log.error("Error en escaneo: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${monitor.bandwidth.interval:10000}")
    public void scheduledBandwidth() {
        try {
            bandwidthService.captureAllInterfaces();
        } catch (Exception e) {
            log.error("Error en ancho de banda: {}", e.getMessage());
        }
    }

    /**
     * Verificacion de servicios HTTP cada 60 segundos
     */
    @Scheduled(fixedDelay = 60000)
    public void scheduledHttpMonitor() {
        log.debug("⏰ Verificando servicios HTTP...");
        try {
            httpMonitorService.checkAllMonitors();
        } catch (Exception e) {
            log.error("Error en monitoreo HTTP: {}", e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void scheduledCleanup() {
        log.info("🗑️ Limpieza de datos historicos...");
        try {
            bandwidthService.cleanOldRecords();
        } catch (Exception e) {
            log.error("Error en limpieza: {}", e.getMessage());
        }
    }
}
