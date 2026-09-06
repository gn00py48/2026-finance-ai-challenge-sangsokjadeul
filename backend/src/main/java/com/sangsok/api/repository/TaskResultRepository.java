package com.sangsok.api.repository;
import com.sangsok.api.domain.Models.TaskResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface TaskResultRepository extends JpaRepository<TaskResult, Long> { Optional<TaskResult> findByStepId(Long stepId); }
