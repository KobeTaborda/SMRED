package com.networkmonitor.config;

import com.networkmonitor.entity.Host;
import com.networkmonitor.repository.HostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Carga hosts de ejemplo al iniciar la aplicacion si la BD esta vacia
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final HostRepository hostRepository;

    @Override
    public void run(String... args) {
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

            log.info("✅ {} hosts de ejemplo creados.", 5);
        }
    }
}
