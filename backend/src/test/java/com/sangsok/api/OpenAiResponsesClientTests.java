package com.sangsok.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangsok.api.ai.OpenAiResponsesClient;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import static org.assertj.core.api.Assertions.assertThat;

class OpenAiResponsesClientTests {
    @Test void sendsStructuredResponsesRequestWithoutProviderStorage() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress(0),0);AtomicReference<String> requestBody=new AtomicReference<>();
        server.createContext("/responses",exchange->{requestBody.set(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));byte[] response="{\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"answer\\\":\\\"ok\\\"}\"}]}]}".getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(200,response.length);exchange.getResponseBody().write(response);exchange.close();});server.start();
        try{
            ObjectMapper mapper=new ObjectMapper();OpenAiResponsesClient client=new OpenAiResponsesClient("test-secret","test-model","http://localhost:"+server.getAddress().getPort(),mapper);
            var result=client.structured("hello","instructions","contract",mapper.readTree("{\"type\":\"object\"}"));
            var sent=mapper.readTree(requestBody.get());assertThat(result.get("answer").asText()).isEqualTo("ok");assertThat(sent.get("store").asBoolean()).isFalse();assertThat(sent.at("/text/format/type").asText()).isEqualTo("json_schema");assertThat(sent.get("model").asText()).isEqualTo("test-model");
        }finally{server.stop(0);}
    }
}
