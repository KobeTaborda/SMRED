package com.networkmonitor.controller;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controlador para el Mapa de Topologia de Red
 */
@Controller
public class TopologyController {

    @GetMapping("/topology")
    public String topology(Model model, Authentication auth) {
        model.addAttribute("currentUser", auth != null ? auth.getName() : "");
        return "topology";
    }
}
