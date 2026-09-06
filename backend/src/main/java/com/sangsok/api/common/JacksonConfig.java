package com.sangsok.api.common;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class JacksonConfig {
    @Bean ObjectMapper legacyObjectMapper(){ return new ObjectMapper().findAndRegisterModules(); }
}
