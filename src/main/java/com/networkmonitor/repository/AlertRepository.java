package com.networkmonitor.repository;

import com.networkmonitor.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    // Paginacion con filtros opcionales
    @Query("SELECT a FROM Alert a " +
           "WHERE (:status IS NULL OR a.status = :status) " +
           "AND (:severity IS NULL OR a.severity = :severity) " +
           "ORDER BY a.createdAt DESC")
    Page<Alert> findWithFilters(
            @Param("status")   Alert.AlertStatus status,
            @Param("severity") Alert.Severity severity,
            Pageable pageable);

    @Query("SELECT a FROM Alert a WHERE a.status = 'ACTIVE' ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlerts(Pageable pageable);

    // Para acciones masivas
    List<Alert> findByIdIn(List<Long> ids);
}
