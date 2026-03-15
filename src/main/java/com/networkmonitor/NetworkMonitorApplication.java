package com.networkmonitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Clase principal del Sistema de Monitoreo de Red
 * Inicia la aplicacion Spring Boot con soporte de tareas programadas
 */
@SpringBootApplication
@EnableScheduling
public class NetworkMonitorApplication {

    public static void main(String[] args) {
        SpringApplication.run(NetworkMonitorApplication.class, args);
        System.out.println("========================================");
        System.out.println("  Sistema de Monitoreo de Red ACTIVO");
        System.out.println("  Dashboard: http://localhost:8080");
        System.out.println("========================================");
    }
}
