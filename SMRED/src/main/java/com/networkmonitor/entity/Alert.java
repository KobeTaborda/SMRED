package com.networkmonitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Alertas generadas por el sistema de monitoreo
 */
@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alert_host", columnList = "host_id"),
    @Index(name = "idx_alert_type", columnList = "alert_type"),
    @Index(name = "idx_alert_status", columnList = "status")
})
@Data
@NoArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id")
    private Host host;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status = AlertStatus.ACTIVE;

    @Column(name = "email_sent")
    private boolean emailSent = false;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Alert(Host host, AlertType type, Severity severity, String title, String message) {
        this.host = host;
        this.alertType = type;
        this.severity = severity;
        this.title = title;
        this.message = message;
    }

    public enum AlertType {
        HOST_DOWN, HOST_UP, HIGH_LATENCY, PACKET_LOSS,
        PORT_OPEN, PORT_CLOSED, BANDWIDTH_HIGH, SYSTEM
    }

    public enum Severity {
        INFO, WARNING, CRITICAL
    }

    public enum AlertStatus {
        ACTIVE, ACKNOWLEDGED, RESOLVED
    }
}
