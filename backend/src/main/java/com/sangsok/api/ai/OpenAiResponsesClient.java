package com.sangsok.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@Component
@ConditionalOnProperty(name="app.ai.provider", havingValue="openai")
public class OpenAiResponsesClient {
    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public OpenAiResponsesClient(@Value("${AI_API_KEY:}") String apiKey,
                                 @Value("${app.ai.model}") String model,
                                 @Value("${app.ai.base-url:https://api.openai.com/v1}") String baseUrl,
                                 ObjectMapper mapper) {
        if (apiKey.isBlank()) throw new IllegalStateException("AI_PROVIDER=openai requires AI_API_KEY");
        this.apiKey=apiKey; this.model=model; this.baseUrl=baseUrl.replaceAll("/$",""); this.mapper=mapper;
        this.http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public JsonNode structured(Object input, String instructions, String schemaName, JsonNode schema) {
        try {
            Map<String,Object> format=new LinkedHashMap<>();
            format.put("type","json_schema"); format.put("name",schemaName); format.put("strict",true); format.put("schema",schema);
            Map<String,Object> body=new LinkedHashMap<>();
            body.put("model",model); body.put("instructions",instructions); body.put("input",input); body.put("store",false);
            body.put("text",Map.of("format",format)); body.put("max_output_tokens",2000);
            HttpRequest request=HttpRequest.newBuilder(URI.create(baseUrl+"/responses"))
                    .timeout(Duration.ofSeconds(90)).header("Authorization","Bearer "+apiKey)
                    .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()<200||response.statusCode()>=300) throw new IllegalStateException("AI provider returned status "+response.statusCode());
            JsonNode root=mapper.readTree(response.body());
            for(JsonNode output:root.path("output")) for(JsonNode content:output.path("content"))
                if("output_text".equals(content.path("type").asText())) return mapper.readTree(content.path("text").asText());
            throw new IllegalStateException("AI response did not include structured output");
        } catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException("AI request interrupted",e);}
        catch(Exception e){throw new IllegalStateException("AI request failed",e);}
    }
}
