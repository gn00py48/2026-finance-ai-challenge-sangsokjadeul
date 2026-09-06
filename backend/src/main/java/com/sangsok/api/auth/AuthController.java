package com.sangsok.api.auth;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Models.User;
import com.sangsok.api.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users; private final CaseRepository cases; private final PasswordEncoder encoder; private final JwtService jwt;
    public AuthController(UserRepository users,CaseRepository cases,PasswordEncoder encoder,JwtService jwt){this.users=users;this.cases=cases;this.encoder=encoder;this.jwt=jwt;}
    public record Credentials(@NotBlank @Size(min=4,max=80) String username,@NotBlank @Size(min=8,max=72) String password){}
    @PostMapping("/signup") @ResponseStatus(HttpStatus.CREATED) Object signup(@Valid @RequestBody Credentials r){if(users.findByUsername(r.username()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"USERNAME_EXISTS","이미 사용 중인 아이디입니다.");User u=new User();u.setUsername(r.username());u.setPasswordHash(encoder.encode(r.password()));users.save(u);return token(u);}
    @PostMapping("/login") Object login(@Valid @RequestBody Credentials r){User u=users.findByUsername(r.username()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","아이디 또는 비밀번호가 올바르지 않습니다."));if(!encoder.matches(r.password(),u.getPasswordHash()))throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","아이디 또는 비밀번호가 올바르지 않습니다.");return token(u);}
    @PostMapping("/refresh") Object refresh(Authentication auth){return Map.of("accessToken",jwt.issue(principal(auth).id(),principal(auth).username()),"tokenType","Bearer");}
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) void logout(){}
    private Object token(User u){Long active=cases.findAllByOwnerIdOrderByCreatedAtDesc(u.getId()).stream().findFirst().map(x->x.getId()).orElse(null);return new AuthResponse(jwt.issue(u.getId(),u.getUsername()),"Bearer",u.getUsername(),active);}
    private static UserPrincipal principal(Authentication a){if(a==null||!(a.getPrincipal() instanceof UserPrincipal p))throw new ApiException(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","로그인이 필요합니다.");return p;}
    public record AuthResponse(String accessToken,String tokenType,String username,Long activeCaseId){}
}
