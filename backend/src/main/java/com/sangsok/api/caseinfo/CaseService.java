package com.sangsok.api.caseinfo;
import com.sangsok.api.auth.UserPrincipal;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
@Service
public class CaseService {
    private final CaseRepository cases; private final UserRepository users;
    public CaseService(CaseRepository cases,UserRepository users){this.cases=cases;this.users=users;}
    public UserPrincipal principal(Authentication auth){if(auth==null||!(auth.getPrincipal() instanceof UserPrincipal p))throw new ApiException(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","로그인이 필요합니다.");return p;}
    public InheritanceCase owned(Long id,Authentication auth){return cases.findByIdAndOwnerId(id,principal(auth).id()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"CASE_NOT_FOUND","사건을 찾을 수 없습니다."));}
    public User owner(Authentication auth){return users.findById(principal(auth).id()).orElseThrow();}
}
