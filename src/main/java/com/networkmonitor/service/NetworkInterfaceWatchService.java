package com.networkmonitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.*;

/**
 * Detecta nuevas interfaces de red (VPN, virtuales, desconocidas)
 * aparecidas en el servidor desde el último ciclo de revisión.
 */
@Service
@Slf4j
public class NetworkInterfaceWatchService {

    private static final List<String> VPN_KEYWORDS = List.of(
            "tun", "tap", "vpn", "veth", "virbr",
            "docker", "br-", "vmnet", "vbox", "wg", "utun", "ipsec"
    );

    private final Set<String> knownInterfaces = new HashSet<>();
    private boolean initialized = false;

    /**
     * Primera llamada: registra la línea base, devuelve lista vacía.
     * Llamadas siguientes: devuelve interfaces nuevas desde la última vez.
     */
    public List<NewInterfaceInfo> detectNewInterfaces() {
        List<NewInterfaceInfo> newOnes = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> netInterfaces = NetworkInterface.getNetworkInterfaces();
            Set<String> current = new HashSet<>();

            while (netInterfaces != null && netInterfaces.hasMoreElements()) {
                NetworkInterface ni = netInterfaces.nextElement();
                try { if (ni.isLoopback()) continue; } catch (SocketException ignored) {}

                String nameLower = ni.getName().toLowerCase();
                current.add(nameLower);

                if (initialized && !knownInterfaces.contains(nameLower)) {
                    boolean isVpn = isVpnOrVirtual(nameLower, ni);
                    newOnes.add(new NewInterfaceInfo(ni.getName(), ni.getDisplayName(), isVpn));
                    log.warn("Nueva interfaz detectada: {} ({})", ni.getName(), ni.getDisplayName());
                }
            }

            if (!initialized) {
                knownInterfaces.addAll(current);
                initialized = true;
                log.info("NetworkInterfaceWatchService: {} interfaces registradas como base.",
                         current.size());
            } else {
                knownInterfaces.clear();
                knownInterfaces.addAll(current);
            }

        } catch (SocketException e) {
            log.error("Error leyendo interfaces de red: {}", e.getMessage());
        }
        return newOnes;
    }

    private boolean isVpnOrVirtual(String nameLower, NetworkInterface ni) {
        try { if (ni.isVirtual()) return true; } catch (SocketException ignored) {}
        return VPN_KEYWORDS.stream().anyMatch(nameLower::contains);
    }

    public record NewInterfaceInfo(String name, String displayName, boolean isVpnOrVirtual) {}
}
