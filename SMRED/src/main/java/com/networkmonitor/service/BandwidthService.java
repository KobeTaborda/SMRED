package com.networkmonitor.service;

import com.networkmonitor.entity.BandwidthRecord;
import com.networkmonitor.repository.BandwidthRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio de Monitoreo de Ancho de Banda
 * Lee estadisticas de interfaces de red del sistema operativo
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class BandwidthService {

    private final BandwidthRecordRepository bandwidthRepository;

    // Almacena la lectura anterior para calcular tasa
    private final Map<String, long[]> previousStats = new ConcurrentHashMap<>();
    private final Map<String, Long> previousTimestamp = new ConcurrentHashMap<>();

    /**
     * Captura estadisticas de todas las interfaces activas
     */
    @Transactional
    public List<BandwidthRecord> captureAllInterfaces() {
        List<BandwidthRecord> records = new ArrayList<>();

        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("linux")) {
            records = captureLinuxStats();
        } else if (os.contains("win")) {
            records = captureWindowsStats();
        } else {
            records = captureJavaNetworkStats();
        }

        if (!records.isEmpty()) {
            bandwidthRepository.saveAll(records);
        }
        return records;
    }

    /**
     * Lee /proc/net/dev en Linux
     */
    private List<BandwidthRecord> captureLinuxStats() {
        List<BandwidthRecord> records = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/net/dev"))) {
            String line;
            reader.readLine(); // skip header 1
            reader.readLine(); // skip header 2

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("lo:")) continue;

                String[] parts = line.split("[:\\s]+");
                if (parts.length < 10) continue;

                String iface = parts[0].replace(":", "");
                long rxBytes = Long.parseLong(parts[1]);
                long rxPackets = Long.parseLong(parts[2]);
                long rxErrors = Long.parseLong(parts[3]);
                long txBytes = Long.parseLong(parts[9]);
                long txPackets = Long.parseLong(parts[10]);
                long txErrors = Long.parseLong(parts[11]);

                double[] rates = calculateRates(iface, rxBytes, txBytes);

                BandwidthRecord record = new BandwidthRecord(
                        iface, rxBytes, txBytes, rates[0], rates[1]);
                record.setRxPackets(rxPackets);
                record.setTxPackets(txPackets);
                record.setRxErrors(rxErrors);
                record.setTxErrors(txErrors);

                records.add(record);
                log.debug("Interface {}: RX={} KB/s TX={} KB/s", iface,
                        String.format("%.2f", rates[0]),
                        String.format("%.2f", rates[1]));
            }
        } catch (IOException e) {
            log.warn("No se pudo leer /proc/net/dev: {}", e.getMessage());
            return captureJavaNetworkStats();
        }
        return records;
    }

    /**
     * Usa netstat en Windows
     */
    private List<BandwidthRecord> captureWindowsStats() {
        // En Windows usamos Java NetworkInterface como fallback universal
        return captureJavaNetworkStats();
    }

    /**
     * Usa Java NetworkInterface como metodo universal
     */
    private List<BandwidthRecord> captureJavaNetworkStats() {
        List<BandwidthRecord> records = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (!ni.isUp() || ni.isLoopback() || ni.isVirtual()) continue;

                String name = ni.getName() + " (" + ni.getDisplayName() + ")";
                // Simulated stats desde Java (sin acceso real a contadores del SO)
                BandwidthRecord record = new BandwidthRecord(
                        ni.getName(), 0L, 0L, 0.0, 0.0);
                records.add(record);
            }
        } catch (SocketException e) {
            log.error("Error leyendo interfaces de red: {}", e.getMessage());
        }
        return records;
    }

    /**
     * Calcula la tasa de transferencia en Kbps comparando con la medicion anterior
     */
    private double[] calculateRates(String iface, long currentRx, long currentTx) {
        long now = System.currentTimeMillis();
        double rxRate = 0.0;
        double txRate = 0.0;

        if (previousStats.containsKey(iface)) {
            long[] prev = previousStats.get(iface);
            long prevTime = previousTimestamp.get(iface);
            double elapsedSec = (now - prevTime) / 1000.0;

            if (elapsedSec > 0) {
                long rxDiff = currentRx - prev[0];
                long txDiff = currentTx - prev[1];
                // Convertir bytes/s a Kbps
                rxRate = (rxDiff / elapsedSec) * 8 / 1024;
                txRate = (txDiff / elapsedSec) * 8 / 1024;
                // Evitar negativos (contador overflow)
                rxRate = Math.max(0, rxRate);
                txRate = Math.max(0, txRate);
            }
        }

        previousStats.put(iface, new long[]{currentRx, currentTx});
        previousTimestamp.put(iface, now);

        return new double[]{rxRate, txRate};
    }

    /**
     * Obtiene historial de ancho de banda de las ultimas N horas
     */
    public List<BandwidthRecord> getBandwidthHistory(String interfaceName, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return bandwidthRepository.findByInterfaceNameAndRecordedAtAfterOrderByRecordedAtAsc(
                interfaceName, since);
    }

    /**
     * Obtiene las interfaces disponibles
     */
    public List<String> getAvailableInterfaces() {
        return bandwidthRepository.findDistinctInterfaces();
    }

    /**
     * Limpia registros viejos (mas de 7 dias)
     */
    @Transactional
    public void cleanOldRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        bandwidthRepository.deleteByRecordedAtBefore(cutoff);
    }
}
