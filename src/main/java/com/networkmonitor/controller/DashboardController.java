package com.networkmonitor.controller;

import com.networkmonitor.entity.Alert;
import com.networkmonitor.repository.AlertRepository;
import com.networkmonitor.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final HostService hostService;
    private final AlertService alertService;
    private final PingService pingService;
    private final PortScanService portScanService;
    private final BandwidthService bandwidthService;
    private final AlertRepository alertRepository;

    @GetMapping("/")
    public String dashboard(Model model) {
        model.addAttribute("hosts", hostService.getActiveHosts());
        model.addAttribute("totalHosts", hostService.countTotal());
        model.addAttribute("onlineHosts", hostService.countOnline());
        model.addAttribute("offlineHosts", hostService.countOffline());
        model.addAttribute("activeAlerts", alertRepository.countActiveAlerts());
        model.addAttribute("criticalAlerts", alertRepository.countCriticalAlerts());
        model.addAttribute("recentAlerts", alertService.getRecentAlerts());
        model.addAttribute("interfaces", bandwidthService.getAvailableInterfaces());
        return "dashboard";
    }

    @GetMapping("/hosts/{id}")
    public String hostDetail(@PathVariable Long id, Model model) {
        var host = hostService.getHostById(id)
                .orElseThrow(() -> new RuntimeException("Host no encontrado"));
        model.addAttribute("host", host);
        model.addAttribute("pingHistory", pingService.getPingHistory(id, 24));
        model.addAttribute("portScan", portScanService.getLatestScanResults(id));
        model.addAttribute("hostAlerts", alertService.getAlertsByHost(id));
        return "host-detail";
    }

    @GetMapping("/hosts")
    public String hostList(Model model) {
        model.addAttribute("hosts", hostService.getAllHosts());
        model.addAttribute("newHost", new com.networkmonitor.entity.Host());
        return "hosts";
    }

    @PostMapping("/hosts/create")
    public String createHost(@ModelAttribute com.networkmonitor.entity.Host host) {
        try {
            hostService.createHost(host);
        } catch (IllegalArgumentException e) {
            return "redirect:/hosts?error=" + e.getMessage();
        }
        return "redirect:/hosts?success=true";
    }

    @PostMapping("/hosts/{id}/edit")
    public String editHost(
            @PathVariable Long id,
            @RequestParam String name,
            @RequestParam String ipAddress,
            @RequestParam(required = false, defaultValue = "") String type,
            @RequestParam(required = false, defaultValue = "") String location,
            @RequestParam(required = false, defaultValue = "") String monitoredPorts,
            @RequestParam(required = false, defaultValue = "") String description) {
        try {
            hostService.getHostById(id).ifPresent(host -> {
                host.setName(name);
                host.setIpAddress(ipAddress);
                host.setType(type.isEmpty() ? null : type);
                host.setLocation(location.isEmpty() ? null : location);
                host.setMonitoredPorts(monitoredPorts.isEmpty() ? null : monitoredPorts);
                host.setDescription(description.isEmpty() ? null : description);
                host.setActive(true);
                hostService.updateHost(id, host);
            });
            return "redirect:/hosts?updated=true";
        } catch (Exception e) {
            return "redirect:/hosts?error=" + e.getMessage();
        }
    }

    @PostMapping("/hosts/{id}/delete")
    public String deleteHost(@PathVariable Long id) {
        hostService.deleteHost(id);
        return "redirect:/hosts?deleted=true";
    }

    // ── ALERTAS CON PAGINACION ──

    @GetMapping("/alerts")
    public String alertsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            Model model) {

        Alert.AlertStatus statusEnum = null;
        Alert.Severity severityEnum = null;

        try { if (status != null && !status.isEmpty()) statusEnum = Alert.AlertStatus.valueOf(status); }
        catch (Exception ignored) {}
        try { if (severity != null && !severity.isEmpty()) severityEnum = Alert.Severity.valueOf(severity); }
        catch (Exception ignored) {}

        Page<Alert> alertPage = alertService.getAlertsPaginated(statusEnum, severityEnum, page, size);

        model.addAttribute("alertPage",    alertPage);
        model.addAttribute("alerts",       alertPage.getContent());
        model.addAttribute("currentPage",  page);
        model.addAttribute("totalPages",   alertPage.getTotalPages());
        model.addAttribute("totalAlerts",  alertPage.getTotalElements());
        model.addAttribute("pageSize",     size);
        model.addAttribute("filterStatus",   status != null ? status : "");
        model.addAttribute("filterSeverity", severity != null ? severity : "");

        // Contadores para las tarjetas
        model.addAttribute("activeCount",   alertRepository.countActiveAlerts());
        model.addAttribute("criticalCount", alertRepository.countCriticalAlerts());

        return "alerts";
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public String acknowledgeAlert(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "") String status,
            @RequestParam(required = false, defaultValue = "") String severity) {
        alertService.acknowledgeAlert(id);
        return "redirect:/alerts?page=" + page + "&status=" + status + "&severity=" + severity;
    }

    @PostMapping("/alerts/{id}/resolve")
    public String resolveAlert(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "") String status,
            @RequestParam(required = false, defaultValue = "") String severity) {
        alertService.resolveAlert(id);
        return "redirect:/alerts?page=" + page + "&status=" + status + "&severity=" + severity;
    }

    // ── ACCIONES MASIVAS ──

    @PostMapping("/alerts/bulk-acknowledge")
    public String bulkAcknowledge(
            @RequestParam List<Long> alertIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "") String filterStatus,
            @RequestParam(required = false, defaultValue = "") String filterSeverity,
            RedirectAttributes redirect) {
        int count = alertService.bulkAcknowledge(alertIds);
        redirect.addFlashAttribute("success",
                count + " alerta(s) marcadas como reconocidas.");
        return "redirect:/alerts?page=" + page
                + "&status=" + filterStatus + "&severity=" + filterSeverity;
    }

    @PostMapping("/alerts/bulk-resolve")
    public String bulkResolve(
            @RequestParam List<Long> alertIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "") String filterStatus,
            @RequestParam(required = false, defaultValue = "") String filterSeverity,
            RedirectAttributes redirect) {
        int count = alertService.bulkResolve(alertIds);
        redirect.addFlashAttribute("success",
                count + " alerta(s) marcadas como resueltas.");
        return "redirect:/alerts?page=" + page
                + "&status=" + filterStatus + "&severity=" + filterSeverity;
    }

    @GetMapping("/bandwidth")
    public String bandwidthPage(Model model) {
        model.addAttribute("interfaces", bandwidthService.getAvailableInterfaces());
        return "bandwidth";
    }

    @PostMapping("/hosts/{id}/ping")
    public String manualPing(@PathVariable Long id) {
        hostService.getHostById(id).ifPresent(pingService::pingHost);
        return "redirect:/hosts/" + id + "?pinged=true";
    }

    @PostMapping("/hosts/{id}/scan")
    public String manualScan(@PathVariable Long id) {
        hostService.getHostById(id).ifPresent(portScanService::scanHost);
        return "redirect:/hosts/" + id + "?scanned=true";
    }
}
