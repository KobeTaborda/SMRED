package com.networkmonitor.repository;

import com.networkmonitor.entity.Host;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HostRepository extends JpaRepository<Host, Long> {

    List<Host> findByActiveTrue();

    Optional<Host> findByIpAddress(String ipAddress);

    List<Host> findByStatus(Host.HostStatus status);

    @Query("SELECT COUNT(h) FROM Host h WHERE h.status = 'ONLINE' AND h.active = true")
    long countOnlineHosts();

    @Query("SELECT COUNT(h) FROM Host h WHERE h.status = 'OFFLINE' AND h.active = true")
    long countOfflineHosts();

    @Query("SELECT COUNT(h) FROM Host h WHERE h.active = true")
    long countActiveHosts();
}
