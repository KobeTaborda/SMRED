package com.networkmonitor.repository;

import com.networkmonitor.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatusOrderByCreatedAtDesc(Alert.AlertStatus status);

    List<Alert> findByHostIdOrderByCreatedAtDesc(Long hostId);

    List<Alert> findTop20ByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.status = 'ACTIVE'")
    long countActiveAlerts();

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.status = 'ACTIVE' AND a.severity = 'CRITICAL'")
    long countCriticalAlerts();

    List<Alert> findBySeverityAndStatus(Alert.Severity severity, Alert.AlertStatus status);

    @Query("SELECT a FROM Alert a WHERE a.status = 'ACTIVE' ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlerts(Pageable pageable);
}
