package com.networkmonitor.controller;

import com.networkmonitor.entity.*;
import com.networkmonitor.repository.BandwidthRecordRepository;
import com.networkmonitor.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
            result.put("reachable", record.isReachable());
            result.put("latencyMs", record.getLatencyMs());
            result.put("packetLoss", record.getPacketLoss());
            result.put("timestamp", record.getRecordedAt());
            result.put("status", host.getStatus());
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

    @GetMapping("/bandwidth/latest")
    public ResponseEntity<Map<String, Object>> getLatestBandwidth() {
        List<String> interfaces = bandwidthService.getAvailableInterfaces();
        Map<String, Object> result = new HashMap<>();
        for (String iface : interfaces) {
            BandwidthRecord latest = bandwidthRepo.findLatestByInterface(iface);
            if (latest != null) {
                Map<String, Object> stats = new HashMap<>();
                stats.put("rxKbps", latest.getRxRateKbps());
                stats.put("txKbps", latest.getTxRateKbps());
                stats.put("timestamp", latest.getRecordedAt());
                result.put(iface, stats);
            }
        }
        return ResponseEntity.ok(result);
    }

    // ─────────────────────── RESUMEN GENERAL ───────────────────────

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalHosts", hostService.countTotal());
        summary.put("onlineHosts", hostService.countOnline());
        summary.put("offlineHosts", hostService.countOffline());
        summary.put("activeAlerts", alertService.getActiveAlerts().size());
        summary.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(summary);
    }
}
