package com.networkmonitor.service;

import com.networkmonitor.entity.BandwidthRecord;
import com.networkmonitor.repository.BandwidthRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import oshi.SystemInfo;
import oshi.hardware.NetworkIF;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio de Monitoreo de Ancho de Banda usando OSHI.
 *
 * Problema en Windows: cada adaptador físico aparece duplicado varias veces
 * porque Windows crea una copia por cada "filter driver" instalado
 * (WFP, QoS, Native WiFi, Hyper-V, Sophos, etc.).
 *
 * Solución: agrupar por displayName y quedarse con el representante de mayor
 * bytes acumulados, que siempre es el adaptador físico real.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class BandwidthService {

    private final BandwidthRecordRepository bandwidthRepository;

    // Clave: nombre interno (ej: "wireless_1"), valor: [rxBytes, txBytes]
    private final Map<String, long[]> previousStats     = new ConcurrentHashMap<>();
    private final Map<String, Long>   previousTimestamp = new ConcurrentHashMap<>();

    // OSHI — instancia única reutilizable
    private final SystemInfo systemInfo = new SystemInfo();

    /**
     * Captura bandwidth. Para cada displayName (nombre real del adaptador)
     * solo guarda UN registro: el de la instancia con más bytes acumulados.
     * Esto elimina la redundancia de filter-drivers de Windows.
     */
    @Transactional
    public List<BandwidthRecord> captureAllInterfaces() {
        List<BandwidthRecord> records = new ArrayList<>();
        try {
            List<NetworkIF> networkIFs = systemInfo.getHardware().getNetworkIFs();
            long now = System.currentTimeMillis();

            // ── Paso 1: actualiza atributos de todas las interfaces ───────────
            for (NetworkIF netIF : networkIFs) {
                netIF.updateAttributes();
            }

            // ── Paso 2: agrupa por displayName, elige el de más bytes ─────────
            // El adaptador físico real siempre tiene más bytes que sus copias
            // de filter-driver (que reciben tráfico filtrado/parcial).
            Map<String, NetworkIF> bestByDisplay = new LinkedHashMap<>();
            for (NetworkIF netIF : networkIFs) {
                String display = normalizeDisplayName(netIF.getDisplayName());
                long   total   = netIF.getBytesRecv() + netIF.getBytesSent();

                NetworkIF current = bestByDisplay.get(display);
                if (current == null) {
                    bestByDisplay.put(display, netIF);
                } else {
                    long currentTotal = current.getBytesRecv() + current.getBytesSent();
                    if (total > currentTotal) {
                        bestByDisplay.put(display, netIF); // este tiene más bytes → es el real
                    }
                }
            }

            // ── Paso 3: guarda un registro por adaptador físico único ─────────
            for (Map.Entry<String, NetworkIF> entry : bestByDisplay.entrySet()) {
                NetworkIF netIF  = entry.getValue();
                String    iface  = netIF.getName();

                // Ignora loopback y adaptadores completamente sin actividad
                if (iface.equalsIgnoreCase("lo")) continue;
                if (netIF.getSpeed() == 0 &&
                    netIF.getBytesRecv() == 0 &&
                    netIF.getBytesSent() == 0) continue;

                long rxBytes   = netIF.getBytesRecv();
                long txBytes   = netIF.getBytesSent();
                long rxPackets = netIF.getPacketsRecv();
                long txPackets = netIF.getPacketsSent();
                long rxErrors  = netIF.getInErrors();
                long txErrors  = netIF.getOutErrors();

                double[] rates = calculateRates(iface, rxBytes, txBytes, now);

                BandwidthRecord record = new BandwidthRecord(
                        iface, rxBytes, txBytes, rates[0], rates[1]);
                record.setRxPackets(rxPackets);
                record.setTxPackets(txPackets);
                record.setRxErrors(rxErrors);
                record.setTxErrors(txErrors);
                records.add(record);

                if (rates[0] > 0 || rates[1] > 0) {
                    log.debug("TRÁFICO [{}]: RX={} Kbps TX={} Kbps",
                            netIF.getDisplayName(),
                            String.format("%.1f", rates[0]),
                            String.format("%.1f", rates[1]));
                }
            }

            if (!records.isEmpty()) {
                bandwidthRepository.saveAll(records);
                log.debug("Captura bandwidth: {} adaptadores únicos guardados", records.size());
            }

        } catch (Exception e) {
            log.error("Error capturando ancho de banda: {}", e.getMessage(), e);
        }
        return records;
    }

    /**
     * Normaliza el displayName para agrupar duplicados.
     *
     * Windows genera nombres como:
     *   "Intel(R) Wi-Fi 6 AX201 160MHz"
     *   "Intel(R) Wi-Fi 6 AX201 160MHz-WFP Native MAC Layer LightWeight Filter"
     *   "Intel(R) Wi-Fi 6 AX201 160MHz-QoS Packet Scheduler"
     *
     * Al eliminar el sufijo después del primer guión que precede a palabras
     * clave de filter-driver, todos colapsan al mismo nombre base.
     */
    private String normalizeDisplayName(String displayName) {
        if (displayName == null) return "";

        // Lista de sufijos que Windows agrega a los filter-drivers
        String[] filterSuffixes = {
            "-WFP", "-QoS", "-Native WiFi", "-Wireless LAN",
            "-Microsoft", "-NDIS", "-Virtual", "-Filter",
            "-WAN", "-Kernel", "-Packet", "-802"
        };

        String normalized = displayName.trim();
        for (String suffix : filterSuffixes) {
            int idx = normalized.indexOf(suffix);
            if (idx > 0) {
                normalized = normalized.substring(0, idx).trim();
                break;
            }
        }
        return normalized;
    }

    /**
     * Calcula tasa diferencial en Kbps.
     */
    private double[] calculateRates(String iface, long currentRx, long currentTx, long now) {
        double rxRate = 0.0;
        double txRate = 0.0;

        if (previousStats.containsKey(iface)) {
            long[] prev       = previousStats.get(iface);
            long   prevTime   = previousTimestamp.get(iface);
            double elapsedSec = (now - prevTime) / 1000.0;

            if (elapsedSec > 0) {
                long rxDiff = Math.max(0, currentRx - prev[0]);
                long txDiff = Math.max(0, currentTx - prev[1]);
                rxRate = (rxDiff * 8.0) / (elapsedSec * 1000.0);
                txRate = (txDiff * 8.0) / (elapsedSec * 1000.0);
            }
        }

        previousStats.put(iface, new long[]{currentRx, currentTx});
        previousTimestamp.put(iface, now);
        return new double[]{rxRate, txRate};
    }

    // ── API pública ───────────────────────────────────────────────────────────

    public List<BandwidthRecord> getBandwidthHistory(String interfaceName, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return bandwidthRepository.findByInterfaceNameAndRecordedAtAfterOrderByRecordedAtAsc(
                interfaceName, since);
    }

    public List<String> getAvailableInterfaces() {
        return bandwidthRepository.findDistinctInterfaces();
    }

    @Transactional
    public void cleanOldRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        bandwidthRepository.deleteByRecordedAtBefore(cutoff);
        log.info("Limpieza bandwidth_records completada (anteriores a {})", cutoff);
    }
}
