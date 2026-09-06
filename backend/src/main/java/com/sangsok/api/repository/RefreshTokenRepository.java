package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> { Optional<RefreshToken> findByTokenHash(String tokenHash); List<RefreshToken> findAllByUserIdAndRevokedAtIsNull(Long userId); }
