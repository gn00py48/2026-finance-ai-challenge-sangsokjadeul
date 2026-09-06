package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.HeirCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface HeirCandidateRepository extends JpaRepository<HeirCandidate, Long> { List<HeirCandidate> findAllByInheritanceCaseId(Long caseId); void deleteAllByInheritanceCaseId(Long caseId); }
