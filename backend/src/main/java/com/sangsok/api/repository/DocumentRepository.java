package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface DocumentRepository extends JpaRepository<Document, Long> { List<Document> findAllByInheritanceCaseIdOrderByUploadedAtDesc(Long caseId); Optional<Document> findByIdAndInheritanceCaseOwnerId(Long id, Long ownerId); }
