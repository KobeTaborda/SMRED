package com.networkmonitor.repository;

import com.networkmonitor.entity.HttpMonitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HttpMonitorRepository extends JpaRepository<HttpMonitor, Long> {
    List<HttpMonitor> findByActiveTrue();
    List<HttpMonitor> findByStatus(HttpMonitor.MonitorStatus status);
}
