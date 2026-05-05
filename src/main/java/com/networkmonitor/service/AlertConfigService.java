package com.networkmonitor.service;

import com.networkmonitor.entity.AlertConfig;
import com.networkmonitor.entity.AlertConfigHistory;
import com.networkmonitor.repository.AlertConfigHistoryRepository;
import com.networkmonitor.repository.AlertConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertConfigService {

    private final AlertConfigRepository        alertConfigRepository;
    private final AlertConfigHistoryRepository historyRepository;

    // ── Claves de configuración ──
    public static final String CPU_THRESHOLD            = "cpu.threshold";
    public static final String MEMORY_THRESHOLD         = "memory.threshold";
    public static final String HOST_INACTIVE_MIN        = "host.inactive.minutes";
    public static final String DANGER_RED_MIN_PERCENT   = "danger.red.min.hosts.percent";
    public static final String CPU_CHECK_ENABLED        = "cpu.check.enabled";
    public static final String MEMORY_CHECK_ENABLED     = "memory.check.enabled";
    public static final String INACTIVE_CHECK_ENABLED   = "inactive.check.enabled";
    public static final String DANGER_RED_ENABLED       = "danger.red.enabled";
    public static final String UNKNOWN_IFACE_ENABLED    = "unknown.interface.enabled";

    @PostConstruct
    @Transactional
    public void initDefaults() {
        crearSiNoExiste(CPU_THRESHOLD,          "85",   "% de CPU que dispara alerta CPU_HIGH (0-100)");
        crearSiNoExiste(MEMORY_THRESHOLD,       "90",   "% de memoria RAM que dispara alerta MEMORY_HIGH (0-100)");
        crearSiNoExiste(HOST_INACTIVE_MIN,      "10",   "Minutos sin ping exitoso para generar alerta HOST_INACTIVE");
        crearSiNoExiste(DANGER_RED_MIN_PERCENT, "50",   "% mínimo de hosts OFFLINE para activar alerta DANGER_RED");
        crearSiNoExiste(CPU_CHECK_ENABLED,      "true", "Activar monitoreo de CPU del servidor (true/false)");
        crearSiNoExiste(MEMORY_CHECK_ENABLED,   "true", "Activar monitoreo de memoria RAM del servidor (true/false)");
        crearSiNoExiste(INACTIVE_CHECK_ENABLED, "true", "Activar alerta cuando un host no responde por X minutos (true/false)");
        crearSiNoExiste(DANGER_RED_ENABLED,     "true", "Activar alerta de peligro rojo por caída masiva (true/false)");
        crearSiNoExiste(UNKNOWN_IFACE_ENABLED,  "true", "Activar detección de nuevas interfaces de red VPN/virtuales (true/false)");
        log.info("AlertConfigService: configuraciones inicializadas.");
    }

    private void crearSiNoExiste(String key, String defaultValue, String description) {
        if (alertConfigRepository.findByConfigKey(key).isEmpty()) {
            alertConfigRepository.save(new AlertConfig(key, defaultValue, description));
        }
    }

    // ── Lecturas ──

    public String getValue(String key) {
        return alertConfigRepository.findByConfigKey(key)
                .map(AlertConfig::getConfigValue).orElse("");
    }

    public int getIntValue(String key, int defaultVal) {
        try { return Integer.parseInt(getValue(key)); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    public double getDoubleValue(String key, double defaultVal) {
        try { return Double.parseDouble(getValue(key)); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    public boolean getBooleanValue(String key) {
        return "true".equalsIgnoreCase(getValue(key));
    }

    public List<AlertConfig> getAllConfigs() {
        return alertConfigRepository.findAllByOrderByConfigKeyAsc();
    }

    // ── Actualizar valor existente ──

    @Transactional
    public AlertConfig updateConfig(String key, String newValue, String changedBy) {
        AlertConfig config = alertConfigRepository.findByConfigKey(key)
                .orElseThrow(() -> new RuntimeException("Config no encontrada: " + key));

        String oldValue = config.getConfigValue();
        config.setConfigValue(newValue.trim());
        config.setUpdatedAt(LocalDateTime.now());
        AlertConfig saved = alertConfigRepository.save(config);

        // Guardar en historial
        historyRepository.save(new AlertConfigHistory(
                key, oldValue, newValue.trim(),
                changedBy != null ? changedBy : "sistema",
                config.getDescription()));

        log.info("Config [{}] actualizada: {} -> {} por {}", key, oldValue, newValue, changedBy);
        return saved;
    }

    // Sobrecarga sin changedBy para compatibilidad
    @Transactional
    public AlertConfig updateConfig(String key, String newValue) {
        return updateConfig(key, newValue, "admin");
    }

    // ── Activar / Desactivar ──

    @Transactional
    public AlertConfig toggleEnabled(String key) {
        AlertConfig config = alertConfigRepository.findByConfigKey(key)
                .orElseThrow(() -> new RuntimeException("Config no encontrada: " + key));
        boolean nuevoEstado = !config.isEnabled();
        config.setEnabled(nuevoEstado);
        config.setUpdatedAt(LocalDateTime.now());

        historyRepository.save(new AlertConfigHistory(
                key,
                config.isEnabled() ? "false" : "true",
                nuevoEstado ? "true" : "false",
                "admin",
                "Toggle: " + (nuevoEstado ? "activado" : "desactivado")));

        return alertConfigRepository.save(config);
    }

    // ── Crear nueva clave personalizada ──

    @Transactional
    public AlertConfig createConfig(String key, String value, String description, String createdBy) {
        if (alertConfigRepository.findByConfigKey(key).isPresent()) {
            throw new RuntimeException("Ya existe una configuración con la clave: " + key);
        }
        AlertConfig config = new AlertConfig(key, value, description);
        AlertConfig saved  = alertConfigRepository.save(config);

        historyRepository.save(new AlertConfigHistory(
                key, null, value, createdBy != null ? createdBy : "admin",
                "Creada: " + description));

        log.info("Config nueva creada: [{}] = {} por {}", key, value, createdBy);
        return saved;
    }

    // ── Eliminar clave personalizada ──

    @Transactional
    public void deleteConfig(String key, String deletedBy) {
        AlertConfig config = alertConfigRepository.findByConfigKey(key)
                .orElseThrow(() -> new RuntimeException("Config no encontrada: " + key));

        historyRepository.save(new AlertConfigHistory(
                key, config.getConfigValue(), null,
                deletedBy != null ? deletedBy : "admin",
                "Eliminada"));

        alertConfigRepository.delete(config);
        log.info("Config eliminada: [{}] por {}", key, deletedBy);
    }

    // ── Historial ──

    public List<AlertConfigHistory> getRecentHistory() {
        return historyRepository.findTop50ByOrderByChangedAtDesc();
    }

    public List<AlertConfigHistory> getHistoryByKey(String key) {
        return historyRepository.findByConfigKeyOrderByChangedAtDesc(key);
    }
}
