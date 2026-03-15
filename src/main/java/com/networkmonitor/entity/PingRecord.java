package com.networkmonitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Registro historico de cada ping realizado a un host
 */
@Entity
@Table(name = "ping_records", indexes = {
    @Index(name = "idx_ping_host_time", columnList = "host_id, recorded_at"),
    @Index(name = "idx_ping_recorded_at", columnList = "recorded_at")
})
@Data
@NoArgsConstructor
public class PingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private Host host;

    @Column(name = "latency_ms")
    private Double latencyMs; // null = timeout/lost

    @Column(nullable = false)
    private boolean reachable;

    @Column(name = "packet_loss")
    private Integer packetLoss; // porcentaje 0-100

    @Column(name = "ttl")
    private Integer ttl;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    public PingRecord(Host host, Double latencyMs, boolean reachable, Integer packetLoss) {
        this.host = host;
        this.latencyMs = latencyMs;
        this.reachable = reachable;
        this.packetLoss = packetLoss;
    }
}
