package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.FinancialItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface FinancialItemRepository extends JpaRepository<FinancialItem, Long> { List<FinancialItem> findAllByInheritanceCaseIdOrderByCreatedAtDesc(Long caseId); Optional<FinancialItem> findByIdAndInheritanceCaseOwnerId(Long id, Long ownerId); boolean existsBySourceDocumentId(Long documentId); List<FinancialItem> findAllBySourceDocumentId(Long documentId); }
