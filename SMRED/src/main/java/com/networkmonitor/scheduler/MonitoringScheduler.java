package com.networkmonitor.scheduler;

import com.networkmonitor.service.BandwidthService;
import com.networkmonitor.service.PingService;
import com.networkmonitor.service.PortScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Planificador de tareas de monitoreo
 * Ejecuta ping, escaneo de puertos y medicion de ancho de banda periodicamente
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MonitoringScheduler {

    private final PingService pingService;
    private final PortScanService portScanService;
    private final BandwidthService bandwidthService;

    /**
     * Ping a todos los hosts cada 30 segundos
     */
    @Scheduled(fixedDelayString = "${monitor.ping.interval:30000}")
    public void scheduledPing() {
        log.debug("⏰ Ejecutando ciclo de ping programado...");
        try {
            pingService.pingAllActiveHosts();
        } catch (Exception e) {
            log.error("Error en ciclo de ping: {}", e.getMessage());
        }
    }

    /**
     * Escaneo de puertos cada 5 minutos
     */
    @Scheduled(fixedDelayString = "${monitor.portscan.interval:300000}")
    public void scheduledPortScan() {
        log.debug("⏰ Ejecutando ciclo de escaneo de puertos...");
        try {
            portScanService.scanAllActiveHosts();
        } catch (Exception e) {
            log.error("Error en ciclo de escaneo: {}", e.getMessage());
        }
    }

    /**
     * Captura de ancho de banda cada 10 segundos
     */
    @Scheduled(fixedDelayString = "${monitor.bandwidth.interval:10000}")
    public void scheduledBandwidth() {
        log.debug("⏰ Capturando estadisticas de ancho de banda...");
        try {
            bandwidthService.captureAllInterfaces();
        } catch (Exception e) {
            log.error("Error en ciclo de ancho de banda: {}", e.getMessage());
        }
    }

    /**
     * Limpieza de datos historicos cada dia a medianoche
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void scheduledCleanup() {
        log.info("🗑️ Ejecutando limpieza de datos historicos...");
        try {
            bandwidthService.cleanOldRecords();
            log.info("Limpieza completada.");
        } catch (Exception e) {
            log.error("Error en limpieza: {}", e.getMessage());
        }
    }
}
