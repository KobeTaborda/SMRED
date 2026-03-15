package com.networkmonitor.service;

import org.springframework.security.authentication.DisabledException;
import com.networkmonitor.entity.User;
import com.networkmonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de usuarios - Implementa UserDetailsService para Spring Security
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Spring Security llama este metodo al hacer login
     * Busca el usuario en BD y devuelve sus credenciales
     */
    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + username));

        if (!user.isEnabled()) {
            throw new DisabledException("Usuario deshabilitado: " + username);
        }

        // Actualizar ultimo login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(List.of(
                        new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                ))
                .build();
    }

    /**
     * Crear nuevo usuario con contrasena encriptada
     */
    @Transactional
    public User createUser(String username, String rawPassword,
                           String fullName, User.Role role) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El usuario ya existe: " + username);
        }
        User user = new User(
                username,
                passwordEncoder.encode(rawPassword), // BCrypt
                fullName,
                role
        );
        log.info("Usuario creado: {} con rol {}", username, role);
        return userRepository.save(user);
    }

    /**
     * Cambiar contrasena
     */
    @Transactional
    public void changePassword(String username, String newRawPassword) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(newRawPassword));
            userRepository.save(user);
            log.info("Contrasena actualizada para usuario: {}", username);
        });
    }

    /**
     * Habilitar o deshabilitar usuario
     */
    @Transactional
    public void toggleUser(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setEnabled(!user.isEnabled());
            userRepository.save(user);
        });
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
}
