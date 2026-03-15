package com.networkmonitor.controller;

import com.networkmonitor.entity.Alert;
import com.networkmonitor.entity.Host;
import com.networkmonitor.repository.AlertRepository;
import com.networkmonitor.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador principal del Dashboard Web
 */
@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final HostService hostService;
    private final AlertService alertService;
    private final PingService pingService;
    private final PortScanService portScanService;
    private final BandwidthService bandwidthService;
    private final AlertRepository alertRepository;

    /**
     * Dashboard principal
     */
    @GetMapping("/")
    public String dashboard(Model model) {
        List<Host> hosts = hostService.getActiveHosts();

        model.addAttribute("hosts", hosts);
        model.addAttribute("totalHosts", hostService.countTotal());
        model.addAttribute("onlineHosts", hostService.countOnline());
        model.addAttribute("offlineHosts", hostService.countOffline());
        model.addAttribute("activeAlerts", alertRepository.countActiveAlerts());
        model.addAttribute("criticalAlerts", alertRepository.countCriticalAlerts());
        model.addAttribute("recentAlerts", alertService.getRecentAlerts());
        model.addAttribute("interfaces", bandwidthService.getAvailableInterfaces());

        return "dashboard";
    }

    /**
     * Vista de detalle de host
     */
    @GetMapping("/hosts/{id}")
    public String hostDetail(@PathVariable Long id, Model model) {
        Host host = hostService.getHostById(id)
                .orElseThrow(() -> new RuntimeException("Host no encontrado"));

        model.addAttribute("host", host);
        model.addAttribute("pingHistory", pingService.getPingHistory(id, 24));
        model.addAttribute("portScan", portScanService.getLatestScanResults(id));
        model.addAttribute("hostAlerts", alertService.getAlertsByHost(id));

        return "host-detail";
    }

    /**
     * Vista de gestion de hosts
     */
    @GetMapping("/hosts")
    public String hostList(Model model) {
        model.addAttribute("hosts", hostService.getAllHosts());
        model.addAttribute("newHost", new Host());
        return "hosts";
    }

    /**
     * Crear host desde formulario
     */
    @PostMapping("/hosts/create")
    public String createHost(@ModelAttribute Host host) {
        try {
            hostService.createHost(host);
        } catch (IllegalArgumentException e) {
            return "redirect:/hosts?error=" + e.getMessage();
        }
        return "redirect:/hosts?success=true";
    }

    /**
     * Eliminar host
     */
    @PostMapping("/hosts/{id}/delete")
    public String deleteHost(@PathVariable Long id) {
        hostService.deleteHost(id);
        return "redirect:/hosts?deleted=true";
    }

    /**
     * Vista de alertas
     */
    @GetMapping("/alerts")
    public String alertsPage(Model model) {
        model.addAttribute("activeAlerts",
                alertRepository.findActiveAlerts(PageRequest.of(0, 50)));
        model.addAttribute("allAlerts", alertService.getRecentAlerts());
        return "alerts";
    }

    /**
     * Reconocer alerta
     */
    @PostMapping("/alerts/{id}/acknowledge")
    public String acknowledgeAlert(@PathVariable Long id) {
        alertService.acknowledgeAlert(id);
        return "redirect:/alerts";
    }

    /**
     * Resolver alerta
     */
    @PostMapping("/alerts/{id}/resolve")
    public String resolveAlert(@PathVariable Long id) {
        alertService.resolveAlert(id);
        return "redirect:/alerts";
    }

    /**
     * Vista de ancho de banda
     */
    @GetMapping("/bandwidth")
    public String bandwidthPage(Model model) {
        model.addAttribute("interfaces", bandwidthService.getAvailableInterfaces());
        return "bandwidth";
    }

    /**
     * Ping manual a un host
     */
    @PostMapping("/hosts/{id}/ping")
    public String manualPing(@PathVariable Long id) {
        hostService.getHostById(id).ifPresent(pingService::pingHost);
        return "redirect:/hosts/" + id + "?pinged=true";
    }

    /**
     * Escaneo manual de puertos
     */
    @PostMapping("/hosts/{id}/scan")
    public String manualScan(@PathVariable Long id) {
        hostService.getHostById(id).ifPresent(portScanService::scanHost);
        return "redirect:/hosts/" + id + "?scanned=true";
    }
}
