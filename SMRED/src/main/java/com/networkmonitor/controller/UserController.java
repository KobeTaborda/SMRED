package com.networkmonitor.controller;

import com.networkmonitor.entity.User;
import com.networkmonitor.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/**
 * Controlador del Panel de Administracion de Usuarios
 */
@Controller
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public String listUsers(Model model, Authentication auth) {
        model.addAttribute("users", userService.getAllUsers());
        model.addAttribute("currentUser", auth != null ? auth.getName() : "");
        return "admin-users";
    }

    @PostMapping("/create")
    public String createUser(
            @RequestParam String username,
            @RequestParam String password,
            @RequestParam String fullName,
            @RequestParam(required = false, defaultValue = "") String email,
            @RequestParam User.Role role,
            RedirectAttributes redirect) {
        try {
            userService.createUserWithEmail(username, password, fullName, email, role);
            redirect.addFlashAttribute("success", "Usuario '" + username + "' creado correctamente.");
        } catch (IllegalArgumentException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/users";
    }

    @PostMapping("/{id}/password")
    public String changePassword(
            @PathVariable Long id,
            @RequestParam String newPassword,
            RedirectAttributes redirect) {
        try {
            userService.changePasswordById(id, newPassword);
            redirect.addFlashAttribute("success", "Contraseña actualizada.");
        } catch (Exception e) {
            redirect.addFlashAttribute("error", "Error al cambiar contraseña.");
        }
        return "redirect:/admin/users";
    }

    @PostMapping("/{id}/role")
    public String changeRole(
            @PathVariable Long id,
            @RequestParam User.Role role,
            RedirectAttributes redirect) {
        try {
            userService.changeRole(id, role);
            redirect.addFlashAttribute("success", "Rol actualizado.");
        } catch (Exception e) {
            redirect.addFlashAttribute("error", "Error al cambiar rol.");
        }
        return "redirect:/admin/users";
    }

    @PostMapping("/{id}/toggle")
    public String toggleUser(@PathVariable Long id, RedirectAttributes redirect) {
        try {
            String status = userService.toggleUserAndGetStatus(id);
            redirect.addFlashAttribute("success", "Usuario " + status + ".");
        } catch (Exception e) {
            redirect.addFlashAttribute("error", "Error al cambiar estado.");
        }
        return "redirect:/admin/users";
    }

    @PostMapping("/{id}/delete")
    public String deleteUser(@PathVariable Long id, RedirectAttributes redirect) {
        try {
            userService.deleteUser(id);
            redirect.addFlashAttribute("success", "Usuario eliminado.");
        } catch (Exception e) {
            redirect.addFlashAttribute("error", "No se puede eliminar este usuario.");
        }
        return "redirect:/admin/users";
    }
}
