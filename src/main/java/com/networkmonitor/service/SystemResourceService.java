package com.networkmonitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;

/**
 * Lee métricas de CPU y RAM del servidor donde corre Spring Boot.
 * Usa la API com.sun.management disponible en Java 17 (OpenJDK y Oracle JDK).
 */
@Service
@Slf4j
public class SystemResourceService {

    private final OperatingSystemMXBean osBean;

    public SystemResourceService() {
        this.osBean = ManagementFactory.getOperatingSystemMXBean();
    }

    /**
     * Retorna el uso de CPU del sistema (0.0 – 100.0).
     * Devuelve -1 si la JVM no expone este dato.
     */
    public double getCpuUsagePercent() {
        try {
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
                double cpu = sunBean.getCpuLoad() * 100.0;
                return Math.max(0, cpu);
            }
        } catch (Exception e) {
            log.warn("No se pudo leer CPU: {}", e.getMessage());
        }
        return -1;
    }

    /**
     * Retorna el uso de memoria RAM del sistema (0.0 – 100.0).
     * Devuelve -1 si no está disponible.
     */
    public double getMemoryUsagePercent() {
        try {
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
                long total = sunBean.getTotalMemorySize();
                long free  = sunBean.getFreeMemorySize();
                if (total > 0) return ((double)(total - free) / total) * 100.0;
            }
        } catch (Exception e) {
            log.warn("No se pudo leer memoria: {}", e.getMessage());
        }
        return -1;
    }

    /** Total de RAM del sistema en MB. */
    public long getTotalMemoryMB() {
        try {
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean)
                return sunBean.getTotalMemorySize() / (1024L * 1024L);
        } catch (Exception ignored) {}
        return 0;
    }

    /** RAM usada del sistema en MB. */
    public long getUsedMemoryMB() {
        try {
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
                long total = sunBean.getTotalMemorySize();
                long free  = sunBean.getFreeMemorySize();
                return (total - free) / (1024L * 1024L);
            }
        } catch (Exception ignored) {}
        return 0;
    }
}
