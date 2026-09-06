package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> { Optional<Roadmap> findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(Long caseId); long countByInheritanceCaseId(Long caseId); }
