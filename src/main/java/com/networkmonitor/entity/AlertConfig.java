package com.networkmonitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Configuración dinámica de umbrales y activación de alertas.
 * Se almacena en la tabla alert_configs y se edita desde /alert-config.
 * NOTA: Sin Lombok para evitar problemas con el constructor vacío de JPA.
 */
@Entity
@Table(name = "alert_configs")
public class AlertConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String configKey;

    @Column(nullable = false, length = 500)
    private String configValue;

    @Column(length = 300)
    private String description;

    private boolean enabled = true;

    private LocalDateTime updatedAt = LocalDateTime.now();

    // ── Constructor vacío OBLIGATORIO para JPA/Hibernate ──
    public AlertConfig() {}

    // ── Constructor de conveniencia ──
    public AlertConfig(String configKey, String configValue, String description) {
        this.configKey   = configKey;
        this.configValue = configValue;
        this.description = description;
        this.enabled     = true;
        this.updatedAt   = LocalDateTime.now();
    }

    // ── Getters y Setters ──
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }

    public String getConfigValue() { return configValue; }
    public void setConfigValue(String configValue) { this.configValue = configValue; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
