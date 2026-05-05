package com.networkmonitor.config;

import com.networkmonitor.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public SecurityConfig(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // Recursos publicos
                .requestMatchers("/css/**", "/js/**", "/images/**",
                                 "/webjars/**", "/favicon.ico").permitAll()
                // Login completamente publico
                .requestMatchers("/login").permitAll()
                .requestMatchers("/login/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/error/**").permitAll()
                // WebSocket
                .requestMatchers("/ws/**").authenticated()
                // API REST - ADMIN modifica, todos leen
                .requestMatchers(HttpMethod.POST,   "/api/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,    "/api/**").authenticated()
                // Admin
                .requestMatchers("/admin/**", "/users/**").hasRole("ADMIN")
                // Acciones de modificacion
                .requestMatchers("/hosts/create", "/hosts/*/delete",
                                 "/hosts/*/ping", "/hosts/*/scan",
                                 "/alerts/*/acknowledge",
                                 "/alerts/*/resolve").hasRole("ADMIN")
                // Todo lo demas requiere login
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/do-login")
                .defaultSuccessUrl("/dashboard", true)
                .failureUrl("/login?error=true")
                .usernameParameter("username")
                .passwordParameter("password")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .sessionManagement(session -> session
                .maximumSessions(3)
                .expiredUrl("/login?expired=true")
            )
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .cacheControl(cache -> cache.disable())
            )
            .csrf(csrf -> csrf.disable());

        return http.build();
    }
}
