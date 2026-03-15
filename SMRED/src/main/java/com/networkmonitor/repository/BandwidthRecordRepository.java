package com.networkmonitor.repository;

import com.networkmonitor.entity.BandwidthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BandwidthRecordRepository extends JpaRepository<BandwidthRecord, Long> {

    List<BandwidthRecord> findByInterfaceNameOrderByRecordedAtDesc(String interfaceName);

    List<BandwidthRecord> findByInterfaceNameAndRecordedAtAfterOrderByRecordedAtAsc(
            String interfaceName, LocalDateTime after);

    @Query("SELECT b FROM BandwidthRecord b WHERE b.recordedAt > :since ORDER BY b.recordedAt ASC")
    List<BandwidthRecord> findAllSince(@Param("since") LocalDateTime since);

    @Query("SELECT DISTINCT b.interfaceName FROM BandwidthRecord b")
    List<String> findDistinctInterfaces();

    @Query("SELECT b FROM BandwidthRecord b WHERE b.interfaceName = :name ORDER BY b.recordedAt DESC LIMIT 1")
    BandwidthRecord findLatestByInterface(@Param("name") String interfaceName);

    void deleteByRecordedAtBefore(LocalDateTime before);
}
