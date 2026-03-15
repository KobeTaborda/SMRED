package com.networkmonitor.config;

import com.networkmonitor.entity.Host;
import com.networkmonitor.entity.User;
import com.networkmonitor.repository.HostRepository;
import com.networkmonitor.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Carga datos iniciales al arrancar la aplicacion si las tablas estan vacias
 * - 5 hosts de ejemplo
 * - 2 usuarios por defecto: admin y viewer
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final HostRepository hostRepository;
    private final UserService userService;

    @Override
    public void run(String... args) {

        // ── Usuarios ADMIN (acceso completo) ──
        if (!userService.existsByUsername("RootKobe")) {
            userService.createUser("RootKobe", "Tabord4", "Kobe Taborda", User.Role.ADMIN);
            log.info("✅ Usuario ADMIN creado: RootKobe");
        }
        if (!userService.existsByUsername("RootSebastian")) {
            userService.createUser("RootSebastian", "Otalvar0", "Sebastian Otalvaro", User.Role.ADMIN);
            log.info("✅ Usuario ADMIN creado: RootSebastian");
        }
        if (!userService.existsByUsername("RootFerney")) {
            userService.createUser("RootFerney", "Roj4s", "Ferney Rojas", User.Role.ADMIN);
            log.info("✅ Usuario ADMIN creado: RootFerney");
        }

        // ── Usuarios VIEWER (solo lectura) ──
        if (!userService.existsByUsername("Kobe")) {
            userService.createUser("Kobe", "Tabord4", "Kobe Taborda", User.Role.VIEWER);
            log.info("✅ Usuario VIEWER creado: Kobe");
        }
        if (!userService.existsByUsername("Sebastian")) {
            userService.createUser("Sebastian", "Otalvar0", "Sebastian Otalvaro", User.Role.VIEWER);
            log.info("✅ Usuario VIEWER creado: Sebastian");
        }
        if (!userService.existsByUsername("Ferney")) {
            userService.createUser("Ferney", "Roj4s", "Ferney Rojas", User.Role.VIEWER);
            log.info("✅ Usuario VIEWER creado: Ferney");
        }

        // ── Crear hosts de ejemplo ──
        if (hostRepository.count() == 0) {
            log.info("Cargando hosts de ejemplo...");

            Host h1 = new Host("Google DNS", "8.8.8.8", "Servidor DNS publico de Google");
            h1.setType("SERVER"); h1.setLocation("Internet"); h1.setMonitoredPorts("53,443");

            Host h2 = new Host("Cloudflare DNS", "1.1.1.1", "Servidor DNS publico de Cloudflare");
            h2.setType("SERVER"); h2.setLocation("Internet"); h2.setMonitoredPorts("53,443,80");

            Host h3 = new Host("Router Local", "192.168.1.1", "Gateway de red local");
            h3.setType("ROUTER"); h3.setLocation("Sala de Servidores");
            h3.setMonitoredPorts("22,80,443,8080");

            Host h4 = new Host("Servidor Web Local", "192.168.1.10", "Servidor web interno");
            h4.setType("SERVER"); h4.setLocation("Datacenter");
            h4.setMonitoredPorts("22,80,443,8080,8443");

            Host h5 = new Host("OpenDNS", "208.67.222.222", "DNS alternativo OpenDNS");
            h5.setType("SERVER"); h5.setLocation("Internet"); h5.setMonitoredPorts("53,80");

            hostRepository.save(h1);
            hostRepository.save(h2);
            hostRepository.save(h3);
            hostRepository.save(h4);
            hostRepository.save(h5);

            log.info("✅ 5 hosts de ejemplo creados.");
        }
    }
}
