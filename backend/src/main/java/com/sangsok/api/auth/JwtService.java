package com.sangsok.api.auth;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
@Service
public class JwtService {
    private final byte[] secret; private final long ttl; private final ObjectMapper mapper;
    public JwtService(@Value("${app.jwt.secret}") String secret,@Value("${app.jwt.expiration-seconds}") long ttl,ObjectMapper mapper){this.secret=secret.getBytes(StandardCharsets.UTF_8);this.ttl=ttl;this.mapper=mapper;}
    public String issue(Long id,String username){
        try { String h=enc(mapper.writeValueAsBytes(Map.of("alg","HS256","typ","JWT"))); String p=enc(mapper.writeValueAsBytes(Map.of("sub",id,"username",username,"exp",Instant.now().getEpochSecond()+ttl))); return h+"."+p+"."+sign(h+"."+p); }
        catch(Exception e){throw new IllegalStateException(e);}
    }
    public Optional<UserPrincipal> parse(String token){
        try { String[] parts=token.split("\\."); if(parts.length!=3||!constant(parts[2],sign(parts[0]+"."+parts[1]))) return Optional.empty(); Map<?,?> p=mapper.readValue(Base64.getUrlDecoder().decode(parts[1]),Map.class); if(((Number)p.get("exp")).longValue()<Instant.now().getEpochSecond()) return Optional.empty(); return Optional.of(new UserPrincipal(((Number)p.get("sub")).longValue(),String.valueOf(p.get("username")))); } catch(Exception e){ return Optional.empty(); }
    }
    private String sign(String value)throws Exception{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret,"HmacSHA256"));return enc(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));}
    private static String enc(byte[] b){return Base64.getUrlEncoder().withoutPadding().encodeToString(b);}
    private static boolean constant(String a,String b){return java.security.MessageDigest.isEqual(a.getBytes(StandardCharsets.US_ASCII),b.getBytes(StandardCharsets.US_ASCII));}
}
