package com.sangsok.api.auth;

import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.Base64;

/** 회전하는 refresh token. 원문은 응답으로만 나가고 DB에는 SHA-256 해시만 남는다. */
@Service
public class RefreshTokenService {
    private final RefreshTokenRepository tokens; private final long ttlSeconds;
    private final SecureRandom random=new SecureRandom();
    public RefreshTokenService(RefreshTokenRepository tokens,@Value("${app.jwt.refresh-expiration-seconds}") long ttlSeconds){this.tokens=tokens;this.ttlSeconds=ttlSeconds;}

    public long ttlSeconds(){return ttlSeconds;}

    @Transactional public String issue(User user){
        byte[] raw=new byte[32];random.nextBytes(raw);
        String value=Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        RefreshToken token=new RefreshToken();
        token.setUser(user);token.setTokenHash(hash(value));token.setExpiresAt(Instant.now().plusSeconds(ttlSeconds));
        tokens.save(token);
        return value;
    }

    /**
     * 검증 후 폐기하고 새 토큰을 발급한다. 이미 폐기된 토큰이 다시 오면 탈취로 보고 해당 사용자 토큰을 모두 폐기한다.
     * 그 폐기는 401과 함께 커밋되어야 하므로 ApiException은 롤백 대상에서 뺀다.
     */
    @Transactional(dontRollbackOn=ApiException.class) public Rotation rotate(String value){
        RefreshToken current=tokens.findByTokenHash(hash(value)).orElseThrow(RefreshTokenService::unauthorized);
        if(current.getRevokedAt()!=null){revokeAll(current.getUser().getId());throw unauthorized();}
        if(current.getExpiresAt().isBefore(Instant.now()))throw unauthorized();
        User user=current.getUser();
        String next=issue(user);
        current.setRevokedAt(Instant.now());
        current.setReplacedById(tokens.findByTokenHash(hash(next)).orElseThrow().getId());
        tokens.save(current);
        // 트랜잭션 밖에서 lazy 프록시를 건드리지 않도록 필요한 값만 꺼내 반환한다.
        return new Rotation(user.getId(),user.getUsername(),next);
    }

    @Transactional public void revoke(String value){
        if(value==null)return;
        tokens.findByTokenHash(hash(value)).ifPresent(t->{t.setRevokedAt(Instant.now());tokens.save(t);});
    }

    @Transactional public void revokeAll(Long userId){
        tokens.findAllByUserIdAndRevokedAtIsNull(userId).forEach(t->{t.setRevokedAt(Instant.now());tokens.save(t);});
    }

    private static String hash(String value){
        try{
            byte[] digest=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex=new StringBuilder(64);
            for(byte b:digest)hex.append(String.format("%02x",b));
            return hex.toString();
        }catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }

    private static ApiException unauthorized(){return new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_REFRESH_TOKEN","다시 로그인해 주세요.");}

    public record Rotation(Long userId,String username,String refreshToken){}
}
