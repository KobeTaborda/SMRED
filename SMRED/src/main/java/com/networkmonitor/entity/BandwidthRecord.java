package com.networkmonitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Registro de ancho de banda por interfaz de red del servidor
 */
@Entity
@Table(name = "bandwidth_records", indexes = {
    @Index(name = "idx_bw_interface", columnList = "interface_name"),
    @Index(name = "idx_bw_recorded_at", columnList = "recorded_at")
})
@Data
@NoArgsConstructor
public class BandwidthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interface_name", nullable = false, length = 100)
    private String interfaceName;

    @Column(name = "bytes_received")
    private Long bytesReceived; // bytes totales recibidos

    @Column(name = "bytes_sent")
    private Long bytesSent; // bytes totales enviados

    @Column(name = "rx_rate_kbps")
    private Double rxRateKbps; // tasa recepcion en Kbps

    @Column(name = "tx_rate_kbps")
    private Double txRateKbps; // tasa transmision en Kbps

    @Column(name = "rx_packets")
    private Long rxPackets;

    @Column(name = "tx_packets")
    private Long txPackets;

    @Column(name = "rx_errors")
    private Long rxErrors;

    @Column(name = "tx_errors")
    private Long txErrors;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    public BandwidthRecord(String interfaceName, Long bytesReceived, Long bytesSent,
                           Double rxRateKbps, Double txRateKbps) {
        this.interfaceName = interfaceName;
        this.bytesReceived = bytesReceived;
        this.bytesSent = bytesSent;
        this.rxRateKbps = rxRateKbps;
        this.txRateKbps = txRateKbps;
    }
}
