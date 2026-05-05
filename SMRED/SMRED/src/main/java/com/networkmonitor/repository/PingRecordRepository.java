package com.networkmonitor.repository;

import com.networkmonitor.entity.PingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PingRecordRepository extends JpaRepository<PingRecord, Long> {

    List<PingRecord> findByHostIdOrderByRecordedAtDesc(Long hostId);

    List<PingRecord> findByHostIdAndRecordedAtAfterOrderByRecordedAtAsc(Long hostId, LocalDateTime after);

    @Query("SELECT AVG(p.latencyMs) FROM PingRecord p WHERE p.host.id = :hostId AND p.recordedAt > :since AND p.reachable = true")
    Double findAvgLatency(@Param("hostId") Long hostId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(p) FROM PingRecord p WHERE p.host.id = :hostId AND p.recordedAt > :since AND p.reachable = false")
    long countFailedPings(@Param("hostId") Long hostId, @Param("since") LocalDateTime since);

    @Query("SELECT p FROM PingRecord p WHERE p.host.id = :hostId ORDER BY p.recordedAt DESC LIMIT 1")
    PingRecord findLatestByHostId(@Param("hostId") Long hostId);

    void deleteByRecordedAtBefore(LocalDateTime before);
}
