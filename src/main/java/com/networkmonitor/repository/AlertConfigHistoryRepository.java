package com.networkmonitor.repository;

import com.networkmonitor.entity.AlertConfigHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertConfigHistoryRepository extends JpaRepository<AlertConfigHistory, Long> {

    // Últimos 50 cambios ordenados por fecha desc
    List<AlertConfigHistory> findTop50ByOrderByChangedAtDesc();

    // Historial de una clave específica
    List<AlertConfigHistory> findByConfigKeyOrderByChangedAtDesc(String configKey);
}
