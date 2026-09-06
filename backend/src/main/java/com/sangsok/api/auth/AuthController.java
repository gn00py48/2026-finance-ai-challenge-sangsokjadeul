package com.sangsok.api.auth;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Models.User;
import com.sangsok.api.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/auth")
public class AuthController {
    static final String COOKIE="refreshToken";
    private final UserRepository users; private final CaseRepository cases; private final PasswordEncoder encoder; private final JwtService jwt; private final RefreshTokenService refreshTokens; private final boolean secureCookie;
    public AuthController(UserRepository users,CaseRepository cases,PasswordEncoder encoder,JwtService jwt,RefreshTokenService refreshTokens,@Value("${app.auth.cookie-secure}") boolean secureCookie){this.users=users;this.cases=cases;this.encoder=encoder;this.jwt=jwt;this.refreshTokens=refreshTokens;this.secureCookie=secureCookie;}
    public record Credentials(@NotBlank @Size(min=4,max=80) String username,@NotBlank @Size(min=8,max=72) String password){}

    @PostMapping("/signup") ResponseEntity<?> signup(@Valid @RequestBody Credentials r){
        if(users.findByUsername(r.username()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"USERNAME_EXISTS","이미 사용 중인 아이디입니다.");
        User u=new User();u.setUsername(r.username());u.setPasswordHash(encoder.encode(r.password()));users.save(u);
        return session(u,HttpStatus.CREATED);
    }
    @PostMapping("/login") ResponseEntity<?> login(@Valid @RequestBody Credentials r){
        User u=users.findByUsername(r.username()).orElseThrow(AuthController::invalid);
        if(!encoder.matches(r.password(),u.getPasswordHash()))throw invalid();
        return session(u,HttpStatus.OK);
    }
    /** access token이 아니라 쿠키의 refresh token으로만 동작한다. 사용한 토큰은 즉시 폐기된다. */
    @PostMapping("/refresh") ResponseEntity<?> refresh(@CookieValue(name=COOKIE,required=false) String refreshToken){
        if(refreshToken==null)throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_REFRESH_TOKEN","다시 로그인해 주세요.");
        RefreshTokenService.Rotation rotated=refreshTokens.rotate(refreshToken);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,cookie(rotated.refreshToken(),refreshTokens.ttlSeconds()).toString())
                .body(Map.of("accessToken",jwt.issue(rotated.userId(),rotated.username()),"tokenType","Bearer"));
    }
    @PostMapping("/logout") ResponseEntity<Void> logout(@CookieValue(name=COOKIE,required=false) String refreshToken){
        refreshTokens.revoke(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE,cookie("",0).toString()).build();
    }

    private ResponseEntity<?> session(User u,HttpStatus status){
        Long active=cases.findAllByOwnerIdOrderByCreatedAtDesc(u.getId()).stream().findFirst().map(x->x.getId()).orElse(null);
        return ResponseEntity.status(status).header(HttpHeaders.SET_COOKIE,cookie(refreshTokens.issue(u),refreshTokens.ttlSeconds()).toString())
                .body(new AuthResponse(jwt.issue(u.getId(),u.getUsername()),"Bearer",u.getUsername(),active));
    }
    // XSS로 읽히지 않도록 HttpOnly. 경로를 /api/auth로 좁혀 일반 API 요청에는 실려 나가지 않는다.
    private ResponseCookie cookie(String value,long maxAge){
        return ResponseCookie.from(COOKIE,value).httpOnly(true).secure(secureCookie).sameSite("Strict").path("/api/auth").maxAge(maxAge).build();
    }
    private static ApiException invalid(){return new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","아이디 또는 비밀번호가 올바르지 않습니다.");}
    public record AuthResponse(String accessToken,String tokenType,String username,Long activeCaseId){}
}
