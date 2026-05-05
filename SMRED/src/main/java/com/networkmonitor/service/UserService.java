package com.networkmonitor.service;

import com.networkmonitor.entity.User;
import com.networkmonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Servicio de usuarios
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + username));

        if (!user.isEnabled()) {
            throw new DisabledException("Usuario deshabilitado: " + username);
        }

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
     * Crear usuario basico
     */
    @Transactional
    public User createUser(String username, String rawPassword,
                           String fullName, User.Role role) {
        return createUserWithEmail(username, rawPassword, fullName, null, role);
    }

    /**
     * Crear usuario con email
     */
    @Transactional
    public User createUserWithEmail(String username, String rawPassword,
                                     String fullName, String email, User.Role role) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El usuario ya existe: " + username);
        }
        User user = new User(
                username,
                passwordEncoder.encode(rawPassword),
                fullName,
                role
        );
        user.setEmail(email);
        log.info("Usuario creado: {} con rol {}", username, role);
        return userRepository.save(user);
    }

    /**
     * Cambiar contrasena por username
     */
    @Transactional
    public void changePassword(String username, String newRawPassword) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(newRawPassword));
            userRepository.save(user);
            log.info("Contrasena actualizada para: {}", username);
        });
    }

    /**
     * Cambiar contrasena por ID
     */
    @Transactional
    public void changePasswordById(Long id, String newRawPassword) {
        userRepository.findById(id).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(newRawPassword));
            userRepository.save(user);
        });
    }

    /**
     * Cambiar rol de un usuario
     */
    @Transactional
    public void changeRole(Long id, User.Role newRole) {
        userRepository.findById(id).ifPresent(user -> {
            user.setRole(newRole);
            userRepository.save(user);
            log.info("Rol cambiado para {}: {}", user.getUsername(), newRole);
        });
    }

    /**
     * Habilitar o deshabilitar usuario
     */
    @Transactional
    public String toggleUserAndGetStatus(Long userId) {
        return userRepository.findById(userId).map(user -> {
            user.setEnabled(!user.isEnabled());
            userRepository.save(user);
            return user.isEnabled() ? "habilitado" : "deshabilitado";
        }).orElse("no encontrado");
    }

    /**
     * Eliminar usuario
     */
    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
}
