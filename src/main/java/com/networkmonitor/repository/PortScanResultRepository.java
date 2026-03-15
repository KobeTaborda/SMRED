package com.networkmonitor.repository;

import com.networkmonitor.entity.PortScanResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PortScanResultRepository extends JpaRepository<PortScanResult, Long> {

    List<PortScanResult> findByHostIdOrderByScannedAtDesc(Long hostId);

    List<PortScanResult> findByHostIdAndStatus(Long hostId, PortScanResult.PortStatus status);

    @Query("SELECT p FROM PortScanResult p WHERE p.host.id = :hostId AND p.scannedAt = " +
           "(SELECT MAX(p2.scannedAt) FROM PortScanResult p2 WHERE p2.host.id = :hostId)")
    List<PortScanResult> findLatestScanByHostId(@Param("hostId") Long hostId);

    @Query("SELECT p FROM PortScanResult p WHERE p.host.id = :hostId AND p.status = 'OPEN' " +
           "AND p.scannedAt > :since")
    List<PortScanResult> findOpenPortsSince(@Param("hostId") Long hostId, @Param("since") LocalDateTime since);

    boolean existsByHostIdAndPortNumberAndStatus(Long hostId, Integer port, PortScanResult.PortStatus status);
}
