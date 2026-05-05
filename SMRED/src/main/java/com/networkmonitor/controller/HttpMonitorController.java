package com.networkmonitor.controller;

import com.networkmonitor.entity.HttpMonitor;
import com.networkmonitor.service.HttpMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

/**
 * Controlador de Monitor HTTP
 */
@Controller
@RequiredArgsConstructor
public class HttpMonitorController {

    private final HttpMonitorService httpMonitorService;

    /**
     * Vista de monitores HTTP
     */
    @GetMapping("/http-monitors")
    public String httpMonitorsPage(Model model) {
        model.addAttribute("monitors", httpMonitorService.getAllMonitors());
        return "http-monitors";
    }

    /**
     * Crear nuevo monitor
     */
    @PostMapping("/http-monitors/create")
    public String createMonitor(
            @RequestParam String name,
            @RequestParam String url,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "60") int intervalSeconds,
            RedirectAttributes redirect) {
        try {
            httpMonitorService.createMonitor(name, url, description, intervalSeconds);
            redirect.addFlashAttribute("success", "Monitor '" + name + "' creado.");
        } catch (Exception e) {
            redirect.addFlashAttribute("error", "Error al crear monitor: " + e.getMessage());
        }
        return "redirect:/http-monitors";
    }

    /**
     * Verificar un monitor manualmente
     */
    @PostMapping("/http-monitors/{id}/check")
    public String checkMonitor(@PathVariable Long id, RedirectAttributes redirect) {
        httpMonitorService.getAllMonitors().stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .ifPresent(httpMonitorService::checkMonitor);
        redirect.addFlashAttribute("success", "Verificacion completada.");
        return "redirect:/http-monitors";
    }

    /**
     * Eliminar monitor
     */
    @PostMapping("/http-monitors/{id}/delete")
    public String deleteMonitor(@PathVariable Long id, RedirectAttributes redirect) {
        httpMonitorService.deleteMonitor(id);
        redirect.addFlashAttribute("success", "Monitor eliminado.");
        return "redirect:/http-monitors";
    }

    /**
     * API - obtener todos los monitores
     */
    @GetMapping("/api/http-monitors")
    @ResponseBody
    public ResponseEntity<List<HttpMonitor>> getMonitors() {
        return ResponseEntity.ok(httpMonitorService.getAllMonitors());
    }

    /**
     * API - verificar monitor
     */
    @PostMapping("/api/http-monitors/{id}/check")
    @ResponseBody
    public ResponseEntity<HttpMonitor> apiCheckMonitor(@PathVariable Long id) {
        return httpMonitorService.getAllMonitors().stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .map(m -> ResponseEntity.ok(httpMonitorService.checkMonitor(m)))
                .orElse(ResponseEntity.notFound().build());
    }
}
