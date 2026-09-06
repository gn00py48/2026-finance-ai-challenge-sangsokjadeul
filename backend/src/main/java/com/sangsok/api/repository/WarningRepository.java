package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.Warning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface WarningRepository extends JpaRepository<Warning, Long> { List<Warning> findAllByInheritanceCaseIdAndResolvedFalse(Long caseId); void deleteAllByInheritanceCaseId(Long caseId); }
