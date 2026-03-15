package com.networkmonitor.service;

import com.networkmonitor.entity.Host;
import com.networkmonitor.entity.PingRecord;
import com.networkmonitor.repository.HostRepository;
import com.networkmonitor.repository.PingRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

/**
 * Servicio de Ping - Verifica conectividad y mide latencia a hosts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PingService {

    private final HostRepository hostRepository;
    private final PingRecordRepository pingRecordRepository;
    private final AlertService alertService;

    private static final int PING_TIMEOUT_MS = 3000;
    private static final int PING_COUNT = 4;

    /**
     * Ejecuta ping a todos los hosts activos
     */
    @Transactional
    public void pingAllActiveHosts() {
        List<Host> hosts = hostRepository.findByActiveTrue();
        log.info("Ejecutando ping a {} hosts activos", hosts.size());

        ExecutorService executor = Executors.newFixedThreadPool(
                Math.min(hosts.size(), 10));

        List<Future<?>> futures = new ArrayList<>();
        for (Host host : hosts) {
            futures.add(executor.submit(() -> pingHost(host)));
        }

        for (Future<?> future : futures) {
            try {
                future.get(10, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.error("Error en tarea de ping: {}", e.getMessage());
            }
        }
        executor.shutdown();
    }

    /**
     * Ejecuta ping a un host especifico y guarda el resultado
     */
    @Transactional
    public PingRecord pingHost(Host host) {
        PingResult result = executePing(host.getIpAddress());

        // Actualizar estado del host
        Host.HostStatus previousStatus = host.getStatus();
        Host.HostStatus newStatus;

        if (result.isReachable()) {
            if (result.getAvgLatency() > 200) {
                newStatus = Host.HostStatus.DEGRADED;
            } else {
                newStatus = Host.HostStatus.ONLINE;
            }
            host.setLastSeen(LocalDateTime.now());
            host.setLastLatency(result.getAvgLatency());
        } else {
            newStatus = Host.HostStatus.OFFLINE;
        }

        host.setStatus(newStatus);
        hostRepository.save(host);

        // Guardar registro de ping
        PingRecord record = new PingRecord(
                host,
                result.isReachable() ? result.getAvgLatency() : null,
                result.isReachable(),
                result.getPacketLoss()
        );
        pingRecordRepository.save(record);

        // Generar alertas si cambia el estado
        alertService.checkHostStatusChange(host, previousStatus, newStatus, result);

        log.debug("Ping {} -> {} | Latencia: {}ms | Perdida: {}%",
                host.getName(), newStatus,
                result.getAvgLatency(), result.getPacketLoss());

        return record;
    }

    /**
     * Ejecuta el ping real usando Java InetAddress
     */
    private PingResult executePing(String ipAddress) {
        List<Long> times = new ArrayList<>();
        int lost = 0;

        for (int i = 0; i < PING_COUNT; i++) {
            long start = System.currentTimeMillis();
            try {
                InetAddress addr = InetAddress.getByName(ipAddress);
                boolean reachable = addr.isReachable(PING_TIMEOUT_MS);
                long elapsed = System.currentTimeMillis() - start;

                if (reachable) {
                    times.add(elapsed);
                } else {
                    lost++;
                }
            } catch (UnknownHostException e) {
                log.warn("Host desconocido: {}", ipAddress);
                lost++;
            } catch (IOException e) {
                lost++;
            }

            // Pausa entre pings
            try { Thread.sleep(200); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }

        boolean reachable = !times.isEmpty();
        double avgLatency = times.isEmpty() ? 0.0 :
                times.stream().mapToLong(Long::longValue).average().orElse(0.0);
        int packetLoss = (int) ((lost * 100.0) / PING_COUNT);

        return new PingResult(reachable, avgLatency, packetLoss, times);
    }

    /**
     * Obtiene historial de ping de las ultimas N horas
     */
    public List<PingRecord> getPingHistory(Long hostId, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return pingRecordRepository.findByHostIdAndRecordedAtAfterOrderByRecordedAtAsc(hostId, since);
    }

    /**
     * Clase interna para resultados de ping
     */
    public static class PingResult {
        private final boolean reachable;
        private final double avgLatency;
        private final int packetLoss;
        private final List<Long> times;

        public PingResult(boolean reachable, double avgLatency, int packetLoss, List<Long> times) {
            this.reachable = reachable;
            this.avgLatency = avgLatency;
            this.packetLoss = packetLoss;
            this.times = times;
        }

        public boolean isReachable() { return reachable; }
        public double getAvgLatency() { return avgLatency; }
        public int getPacketLoss() { return packetLoss; }
        public List<Long> getTimes() { return times; }
    }
}
