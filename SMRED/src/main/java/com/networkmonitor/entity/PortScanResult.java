package com.networkmonitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Resultado del escaneo de puertos para un host
 */
@Entity
@Table(name = "port_scan_results", indexes = {
    @Index(name = "idx_portscan_host", columnList = "host_id"),
    @Index(name = "idx_portscan_time", columnList = "scanned_at")
})
@Data
@NoArgsConstructor
public class PortScanResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private Host host;

    @Column(name = "port_number", nullable = false)
    private Integer portNumber;

    @Column(length = 10)
    private String protocol; // TCP, UDP

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PortStatus status;

    @Column(name = "service_name", length = 100)
    private String serviceName; // HTTP, SSH, MySQL, etc.

    @Column(name = "response_time_ms")
    private Double responseTimeMs;

    @Column(length = 500)
    private String banner; // Banner del servicio si es accesible

    @Column(name = "is_new_open")
    private boolean newOpen = false; // True si este puerto acaba de abrirse (alerta)

    @CreationTimestamp
    @Column(name = "scanned_at", nullable = false, updatable = false)
    private LocalDateTime scannedAt;

    public PortScanResult(Host host, Integer portNumber, PortStatus status, String serviceName) {
        this.host = host;
        this.portNumber = portNumber;
        this.status = status;
        this.serviceName = serviceName;
        this.protocol = "TCP";
    }

    public enum PortStatus {
        OPEN, CLOSED, FILTERED
    }
}
