package com.networkmonitor.repository;

import com.networkmonitor.entity.AlertConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertConfigRepository extends JpaRepository<AlertConfig, Long> {

    Optional<AlertConfig> findByConfigKey(String configKey);

    List<AlertConfig> findAllByOrderByConfigKeyAsc();
}
