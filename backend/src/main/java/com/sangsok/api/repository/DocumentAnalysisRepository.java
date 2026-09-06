package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.DocumentAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface DocumentAnalysisRepository extends JpaRepository<DocumentAnalysis, Long> { Optional<DocumentAnalysis> findFirstByDocumentIdOrderByCreatedAtDesc(Long documentId); }
