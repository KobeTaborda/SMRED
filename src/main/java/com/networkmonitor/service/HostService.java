package com.networkmonitor.service;

import com.networkmonitor.entity.Host;
import com.networkmonitor.repository.HostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Servicio de gestion de Hosts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class HostService {

    private final HostRepository hostRepository;

    public List<Host> getAllHosts() {
        return hostRepository.findAll();
    }

    public List<Host> getActiveHosts() {
        return hostRepository.findByActiveTrue();
    }

    public Optional<Host> getHostById(Long id) {
        return hostRepository.findById(id);
    }

    @Transactional
    public Host createHost(Host host) {
        if (hostRepository.findByIpAddress(host.getIpAddress()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un host con la IP: " + host.getIpAddress());
        }
        return hostRepository.save(host);
    }

    @Transactional
    public Host updateHost(Long id, Host updated) {
        return hostRepository.findById(id).map(host -> {
            host.setName(updated.getName());
            host.setIpAddress(updated.getIpAddress());
            host.setDescription(updated.getDescription());
            host.setLocation(updated.getLocation());
            host.setType(updated.getType());
            host.setMonitoredPorts(updated.getMonitoredPorts());
            host.setActive(updated.isActive());
            return hostRepository.save(host);
        }).orElseThrow(() -> new RuntimeException("Host no encontrado: " + id));
    }

    @Transactional
    public void deleteHost(Long id) {
        hostRepository.deleteById(id);
    }

    public long countOnline() { return hostRepository.countOnlineHosts(); }
    public long countOffline() { return hostRepository.countOfflineHosts(); }
    public long countTotal() { return hostRepository.countActiveHosts(); }
}
