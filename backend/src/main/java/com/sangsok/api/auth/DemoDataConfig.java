package com.sangsok.api.auth;
import com.sangsok.api.domain.Models.User;
import com.sangsok.api.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
@Configuration
public class DemoDataConfig {
    @Bean CommandLineRunner demoUser(UserRepository users,PasswordEncoder encoder){return args->{if(users.findByUsername("demo").isEmpty()){User u=new User();u.setUsername("demo");u.setPasswordHash(encoder.encode("demo1234"));users.save(u);}};}
}
