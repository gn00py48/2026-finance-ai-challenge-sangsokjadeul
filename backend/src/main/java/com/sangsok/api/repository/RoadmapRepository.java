package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> { Optional<Roadmap> findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(Long caseId); long countByInheritanceCaseId(Long caseId); List<Roadmap> findAllByInheritanceCaseIdOrderByVersionDesc(Long caseId); }
