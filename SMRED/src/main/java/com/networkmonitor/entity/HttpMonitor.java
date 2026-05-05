package com.networkmonitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entidad para monitoreo de servicios HTTP/URLs
 */
@Entity
@Table(name = "http_monitors")
@Data
@NoArgsConstructor
public class HttpMonitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonitorStatus status = MonitorStatus.UNKNOWN;

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "interval_seconds")
    private int intervalSeconds = 60;

    @Column(name = "last_response_code")
    private Integer lastResponseCode;

    @Column(name = "last_response_time_ms")
    private Integer lastResponseTimeMs;

    @Column(name = "last_checked")
    private LocalDateTime lastChecked;

    @Column(name = "expected_status_code")
    private int expectedStatusCode = 200;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum MonitorStatus {
        UP, DOWN, SLOW, UNKNOWN
    }
}
