package com.networkmonitor.controller;

import com.networkmonitor.entity.*;
import com.networkmonitor.repository.BandwidthRecordRepository;
import com.networkmonitor.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.NetworkInterface;
import java.net.SocketException;
import java.time.LocalDateTime;
import java.util.*;

/**
 * REST API para el dashboard (datos en tiempo real via AJAX/WebSocket)
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiController {

    private final HostService hostService;
    private final AlertService alertService;
    private final PingService pingService;
    private final PortScanService portScanService;
    private final BandwidthService bandwidthService;
    private final BandwidthRecordRepository bandwidthRepo;

    // ─────────────────────── HOSTS ───────────────────────

    @GetMapping("/hosts")
    public List<Host> getHosts() {
        return hostService.getActiveHosts();
    }

    @GetMapping("/hosts/{id}")
    public ResponseEntity<Host> getHost(@PathVariable Long id) {
        return hostService.getHostById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/hosts")
    public ResponseEntity<Host> createHost(@RequestBody Host host) {
        return ResponseEntity.ok(hostService.createHost(host));
    }

    @PutMapping("/hosts/{id}")
    public ResponseEntity<Host> updateHost(@PathVariable Long id, @RequestBody Host host) {
        return ResponseEntity.ok(hostService.updateHost(id, host));
    }

    @DeleteMapping("/hosts/{id}")
    public ResponseEntity<Void> deleteHost(@PathVariable Long id) {
        hostService.deleteHost(id);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────── PING ───────────────────────

    @PostMapping("/hosts/{id}/ping")
    public ResponseEntity<Map<String, Object>> pingHost(@PathVariable Long id) {
        return hostService.getHostById(id).map(host -> {
            PingRecord record = pingService.pingHost(host);
            Map<String, Object> result = new HashMap<>();
            result.put("reachable",  record.isReachable());
            result.put("latencyMs",  record.getLatencyMs());
            result.put("packetLoss", record.getPacketLoss());
            result.put("timestamp",  record.getRecordedAt());
            result.put("status",     host.getStatus());
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/hosts/{id}/ping-history")
    public ResponseEntity<List<PingRecord>> getPingHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(pingService.getPingHistory(id, hours));
    }

    // ─────────────────────── PORT SCAN ───────────────────────

    @PostMapping("/hosts/{id}/scan")
    public ResponseEntity<List<PortScanResult>> scanHost(@PathVariable Long id) {
        return hostService.getHostById(id)
                .map(host -> ResponseEntity.ok(portScanService.scanHost(host)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/hosts/{id}/ports")
    public ResponseEntity<List<PortScanResult>> getPorts(@PathVariable Long id) {
        return ResponseEntity.ok(portScanService.getLatestScanResults(id));
    }

    @PostMapping("/hosts/{id}/scan-range")
    public ResponseEntity<List<PortScanResult>> scanRange(
            @PathVariable Long id,
            @RequestParam int from,
            @RequestParam int to) {
        return hostService.getHostById(id).map(host ->
                ResponseEntity.ok(portScanService.scanPortRange(host, from, to))
        ).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────── ALERTAS ───────────────────────

    @GetMapping("/alerts")
    public List<Alert> getActiveAlerts() {
        return alertService.getActiveAlerts();
    }

    @GetMapping("/alerts/recent")
    public List<Alert> getRecentAlerts() {
        return alertService.getRecentAlerts();
    }

    @GetMapping("/hosts/{id}/alerts")
    public List<Alert> getHostAlerts(@PathVariable Long id) {
        return alertService.getAlertsByHost(id);
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable Long id) {
        alertService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alerts/{id}/resolve")
    public ResponseEntity<Void> resolveAlert(@PathVariable Long id) {
        alertService.resolveAlert(id);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────── ANCHO DE BANDA ───────────────────────

    @GetMapping("/bandwidth")
    public ResponseEntity<List<BandwidthRecord>> getBandwidth(
            @RequestParam String iface,
            @RequestParam(defaultValue = "1") int hours) {
        return ResponseEntity.ok(bandwidthService.getBandwidthHistory(iface, hours));
    }

    @GetMapping("/bandwidth/interfaces")
    public List<String> getInterfaces() {
        return bandwidthService.getAvailableInterfaces();
    }

    /**
     * Devuelve el último valor de RX/TX por cada interfaz usando registros
     * de los últimos 2 minutos. Compatible con SQL Server.
     *
     * Lógica en Java: trae todos los registros recientes (ORDER BY fecha DESC)
     * y se queda con el primero de cada interfaz = el más reciente.
     *
     * Respuesta: { "wireless_1": {rxKbps, txKbps}, "ethernet_32768": {...}, ... }
     */
    @GetMapping("/bandwidth/current")
    public Map<String, Object> getBandwidthCurrent() {
        LocalDateTime since = LocalDateTime.now().minusMinutes(2);
        List<BandwidthRecord> recent = bandwidthRepo.findRecentRecords(since);

        Map<String, Object> result = new LinkedHashMap<>();

        // La lista viene ORDER BY recordedAt DESC, así que el primero
        // de cada interfaz ya es el más reciente
        for (BandwidthRecord rec : recent) {
            if (result.containsKey(rec.getInterfaceName())) continue; // ya tenemos el más reciente

            Map<String, Object> stats = new HashMap<>();
            stats.put("rxKbps",    rec.getRxRateKbps() != null ? rec.getRxRateKbps() : 0.0);
            stats.put("txKbps",    rec.getTxRateKbps() != null ? rec.getTxRateKbps() : 0.0);
            stats.put("timestamp", rec.getRecordedAt());
            result.put(rec.getInterfaceName(), stats);
        }

        return result;
    }

    /**
     * Mantiene el endpoint /latest por compatibilidad con otros módulos.
     * Ahora usa findTop1 que sí funciona en SQL Server.
     */
    @GetMapping("/bandwidth/latest")
    public ResponseEntity<Map<String, Object>> getLatestBandwidth() {
        List<String> interfaces = bandwidthService.getAvailableInterfaces();
        Map<String, Object> result = new HashMap<>();
        for (String iface : interfaces) {
            BandwidthRecord latest =
                    bandwidthRepo.findTop1ByInterfaceNameOrderByRecordedAtDesc(iface);
            if (latest != null) {
                Map<String, Object> stats = new HashMap<>();
                stats.put("rxKbps",    latest.getRxRateKbps());
                stats.put("txKbps",    latest.getTxRateKbps());
                stats.put("timestamp", latest.getRecordedAt());
                result.put(iface, stats);
            }
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Mapea cada nombre interno al nombre real del adaptador.
     * Usa Java NetworkInterface estándar (sin dependencias externas).
     */
    @GetMapping("/bandwidth/interface-details")
    public List<Map<String, Object>> getInterfaceDetails() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> nics = NetworkInterface.getNetworkInterfaces();
            if (nics == null) return result;
            while (nics.hasMoreElements()) {
                NetworkInterface ni   = nics.nextElement();
                String internalName   = ni.getName();
                String displayName    = ni.getDisplayName();
                String displayLower   = displayName != null ? displayName.toLowerCase() : "";
                String type, icon, cssColor;

                if (displayLower.contains("wi-fi") || displayLower.contains("wifi") ||
                    displayLower.contains("wireless") || internalName.toLowerCase().contains("wlan")) {
                    type = "WiFi"; icon = "fa-wifi"; cssColor = "#6366f1";
                } else if (displayLower.contains("hyper-v") || displayLower.contains("vmware") ||
                           displayLower.contains("virtualbox") || displayLower.contains("virtual ethernet")) {
                    type = "Virtual (Hyper-V/VM)"; icon = "fa-cube"; cssColor = "#f59e0b";
                } else if (displayLower.contains("tap") || displayLower.contains("sophos") ||
                           displayLower.contains("openvpn") || displayLower.contains("tunnel")) {
                    type = "TAP / VPN"; icon = "fa-shield-alt"; cssColor = "#ef4444";
                } else if (displayLower.contains("bluetooth")) {
                    type = "Bluetooth"; icon = "fa-bluetooth-b"; cssColor = "#3b82f6";
                } else if (displayLower.contains("loopback") || internalName.equals("lo")) {
                    type = "Loopback"; icon = "fa-redo"; cssColor = "#6b7280";
                } else if (displayLower.contains("ethernet") || displayLower.contains("gigabit") ||
                           displayLower.contains("realtek") || displayLower.contains("intel") ||
                           internalName.toLowerCase().startsWith("eth")) {
                    type = "Ethernet"; icon = "fa-ethernet"; cssColor = "#10b981";
                } else {
                    type = "Desconocido"; icon = "fa-network-wired"; cssColor = "#94a3b8";
                }

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("name",        internalName);
                entry.put("displayName", displayName != null ? displayName : internalName);
                entry.put("type",        type);
                entry.put("icon",        icon);
                entry.put("cssColor",    cssColor);
                entry.put("isUp",        ni.isUp());
                result.add(entry);
            }
        } catch (SocketException ignored) {}
        return result;
    }

    // ─────────────────────── RESUMEN GENERAL ───────────────────────

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalHosts",   hostService.countTotal());
        summary.put("onlineHosts",  hostService.countOnline());
        summary.put("offlineHosts", hostService.countOffline());
        summary.put("activeAlerts", alertService.getActiveAlerts().size());
        summary.put("timestamp",    LocalDateTime.now());
        return ResponseEntity.ok(summary);
    }
}
