package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.RoadmapStep;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface RoadmapStepRepository extends JpaRepository<RoadmapStep, Long> { List<RoadmapStep> findAllByRoadmapIdOrderBySequenceNo(Long roadmapId); Optional<RoadmapStep> findByIdAndRoadmapInheritanceCaseOwnerId(Long id, Long ownerId); }
