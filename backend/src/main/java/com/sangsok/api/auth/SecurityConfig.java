package com.sangsok.api.auth;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
    @Bean SecurityFilterChain security(HttpSecurity http,JwtFilter filter)throws Exception{
        return http.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
          .exceptionHandling(e->e.authenticationEntryPoint((request,response,error)->response.sendError(401)))
          .authorizeHttpRequests(a->a.requestMatchers("/api/auth/**","/api/actuator/health","/api/swagger-ui.html","/api/swagger-ui/**","/api/v3/api-docs/**").permitAll().requestMatchers(HttpMethod.OPTIONS,"/**").permitAll().anyRequest().authenticated())
          .addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
    }
}
