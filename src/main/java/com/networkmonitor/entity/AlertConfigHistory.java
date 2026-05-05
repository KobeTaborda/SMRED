package com.networkmonitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Historial de cambios en la configuración de alertas.
 * Registra quién cambió qué valor y cuándo.
 */
@Entity
@Table(name = "alert_config_history")
public class AlertConfigHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String configKey;

    @Column(length = 500)
    private String oldValue;

    @Column(nullable = false, length = 500)
    private String newValue;

    @Column(length = 100)
    private String changedBy;

    @Column(nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    @Column(length = 300)
    private String description;

    public AlertConfigHistory() {}

    public AlertConfigHistory(String configKey, String oldValue,
                               String newValue, String changedBy, String description) {
        this.configKey   = configKey;
        this.oldValue    = oldValue;
        this.newValue    = newValue;
        this.changedBy   = changedBy;
        this.changedAt   = LocalDateTime.now();
        this.description = description;
    }

    public Long getId() { return id; }
    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
