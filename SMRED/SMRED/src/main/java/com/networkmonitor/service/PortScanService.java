package com.networkmonitor.service;

import com.networkmonitor.entity.Host;
import com.networkmonitor.entity.PortScanResult;
import com.networkmonitor.repository.HostRepository;
import com.networkmonitor.repository.PortScanResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.*;
import java.util.concurrent.*;

/**
 * Servicio de Escaneo de Puertos
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PortScanService {

    private final HostRepository hostRepository;
    private final PortScanResultRepository portScanResultRepository;
    private final AlertService alertService;

    private static final int SCAN_TIMEOUT_MS = 1000;
    private static final int MAX_THREADS = 20;

    // Puertos comunes con sus nombres de servicio
    private static final Map<Integer, String> COMMON_SERVICES = new LinkedHashMap<>();
    static {
        COMMON_SERVICES.put(21,   "FTP");
        COMMON_SERVICES.put(22,   "SSH");
        COMMON_SERVICES.put(23,   "Telnet");
        COMMON_SERVICES.put(25,   "SMTP");
        COMMON_SERVICES.put(53,   "DNS");
        COMMON_SERVICES.put(80,   "HTTP");
        COMMON_SERVICES.put(110,  "POP3");
        COMMON_SERVICES.put(143,  "IMAP");
        COMMON_SERVICES.put(443,  "HTTPS");
        COMMON_SERVICES.put(445,  "SMB");
        COMMON_SERVICES.put(1433, "SQL Server");
        COMMON_SERVICES.put(1521, "Oracle DB");
        COMMON_SERVICES.put(3306, "MySQL");
        COMMON_SERVICES.put(3389, "RDP");
        COMMON_SERVICES.put(5432, "PostgreSQL");
        COMMON_SERVICES.put(5900, "VNC");
        COMMON_SERVICES.put(6379, "Redis");
        COMMON_SERVICES.put(8080, "HTTP-Alt");
        COMMON_SERVICES.put(8443, "HTTPS-Alt");
        COMMON_SERVICES.put(9200, "Elasticsearch");
        COMMON_SERVICES.put(27017,"MongoDB");
    }

    /**
     * Escanea todos los hosts activos
     */
    @Transactional
    public void scanAllActiveHosts() {
        List<Host> hosts = hostRepository.findByActiveTrue();
        log.info("Iniciando escaneo de puertos en {} hosts", hosts.size());
        for (Host host : hosts) {
            try {
                scanHost(host);
            } catch (Exception e) {
                log.error("Error escaneando {}: {}", host.getName(), e.getMessage());
            }
        }
    }

    /**
     * Escanea los puertos configurados de un host
     */
    @Transactional
    public List<PortScanResult> scanHost(Host host) {
        List<Integer> portsToScan = getPortsToScan(host);
        log.info("Escaneando {} puertos en {}", portsToScan.size(), host.getIpAddress());

        ExecutorService executor = Executors.newFixedThreadPool(MAX_THREADS);
        List<Future<PortScanResult>> futures = new ArrayList<>();

        for (int port : portsToScan) {
            final int p = port;
            futures.add(executor.submit(() -> scanPort(host, p)));
        }

        List<PortScanResult> results = new ArrayList<>();
        for (Future<PortScanResult> future : futures) {
            try {
                PortScanResult result = future.get(5, TimeUnit.SECONDS);
                if (result != null) {
                    results.add(result);
                }
            } catch (Exception e) {
                log.warn("Timeout en escaneo de puerto");
            }
        }
        executor.shutdown();

        // Guardar resultados y verificar alertas
        portScanResultRepository.saveAll(results);
        alertService.checkPortChanges(host, results);

        log.info("Escaneo completado en {}: {} puertos abiertos",
                host.getName(),
                results.stream().filter(r -> r.getStatus() == PortScanResult.PortStatus.OPEN).count());

        return results;
    }

    /**
     * Escanea un puerto especifico
     */
    private PortScanResult scanPort(Host host, int port) {
        long start = System.currentTimeMillis();
        PortScanResult.PortStatus status;
        double responseTime = 0;

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host.getIpAddress(), port), SCAN_TIMEOUT_MS);
            responseTime = System.currentTimeMillis() - start;
            status = PortScanResult.PortStatus.OPEN;
        } catch (java.net.ConnectException e) {
            status = PortScanResult.PortStatus.CLOSED;
        } catch (Exception e) {
            status = PortScanResult.PortStatus.FILTERED;
        }

        String serviceName = COMMON_SERVICES.getOrDefault(port, "Unknown");
        PortScanResult result = new PortScanResult(host, port, status, serviceName);
        result.setResponseTimeMs(responseTime > 0 ? responseTime : null);

        return result;
    }

    /**
     * Escaneo manual de rango de puertos
     */
    public List<PortScanResult> scanPortRange(Host host, int startPort, int endPort) {
        List<Integer> ports = new ArrayList<>();
        for (int p = startPort; p <= endPort; p++) {
            ports.add(p);
        }
        host.setMonitoredPorts(startPort + "-" + endPort);
        return scanHostPorts(host, ports);
    }

    private List<Integer> getPortsToScan(Host host) {
        if (host.getMonitoredPorts() != null && !host.getMonitoredPorts().isEmpty()) {
            return parsePortList(host.getMonitoredPorts());
        }
        return new ArrayList<>(COMMON_SERVICES.keySet());
    }

    private List<Integer> parsePortList(String portsStr) {
        List<Integer> ports = new ArrayList<>();
        for (String part : portsStr.split(",")) {
            part = part.trim();
            if (part.contains("-")) {
                String[] range = part.split("-");
                int from = Integer.parseInt(range[0].trim());
                int to = Integer.parseInt(range[1].trim());
                for (int p = from; p <= to; p++) ports.add(p);
            } else {
                ports.add(Integer.parseInt(part));
            }
        }
        return ports;
    }

    private List<PortScanResult> scanHostPorts(Host host, List<Integer> ports) {
        host.setMonitoredPorts(
            ports.stream().map(String::valueOf).reduce((a,b) -> a+","+b).orElse(""));
        return scanHost(host);
    }

    public Map<Integer, String> getCommonServices() {
        return Collections.unmodifiableMap(COMMON_SERVICES);
    }

    /**
     * Obtiene el resultado mas reciente del escaneo de un host
     */
    public List<PortScanResult> getLatestScanResults(Long hostId) {
        return portScanResultRepository.findLatestScanByHostId(hostId);
    }
}
