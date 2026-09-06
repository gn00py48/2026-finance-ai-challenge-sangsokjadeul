package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.InheritanceCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface CaseRepository extends JpaRepository<InheritanceCase, Long> {
    Optional<InheritanceCase> findByIdAndOwnerId(Long id, Long ownerId);
    List<InheritanceCase> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
