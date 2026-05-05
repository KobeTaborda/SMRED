package com.networkmonitor.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Entidad que representa un host/dispositivo de red a monitorear
 */
@Entity
@Table(name = "hosts")
@Data
@NoArgsConstructor
public class Host {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "La IP o hostname es obligatoria")
    @Column(nullable = false, length = 255, unique = true)
    private String ipAddress;

    @Column(length = 500)
    private String description;

    @Column(length = 50)
    private String location;

    @Column(length = 50)
    private String type; // SERVER, ROUTER, SWITCH, PC, PRINTER

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HostStatus status = HostStatus.UNKNOWN;

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "last_latency")
    private Double lastLatency; // en ms

    @Column(name = "monitored_ports", length = 500)
    private String monitoredPorts; // "22,80,443,3306" comma separated

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relaciones
    @OneToMany(mappedBy = "host", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PingRecord> pingRecords;

    @OneToMany(mappedBy = "host", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Alert> alerts;

    public Host(String name, String ipAddress, String description) {
        this.name = name;
        this.ipAddress = ipAddress;
        this.description = description;
    }

    public enum HostStatus {
        ONLINE, OFFLINE, DEGRADED, UNKNOWN
    }
}
