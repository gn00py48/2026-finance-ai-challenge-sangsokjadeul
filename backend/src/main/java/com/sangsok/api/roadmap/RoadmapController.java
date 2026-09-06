package com.sangsok.api.roadmap;
import com.sangsok.api.caseinfo.CaseService;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import com.sangsok.api.pii.PiiTextMasker;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
@RestController
public class RoadmapController {
    private final RoadmapService service;private final CaseService access;private final RoadmapStepRepository steps;private final TaskResultRepository results;private final WarningRepository warnings;private final FinancialItemRepository items;private final DocumentRepository documents;private final PiiTextMasker masker;
    public RoadmapController(RoadmapService service,CaseService access,RoadmapStepRepository steps,TaskResultRepository results,WarningRepository warnings,FinancialItemRepository items,DocumentRepository documents,PiiTextMasker masker){this.service=service;this.access=access;this.steps=steps;this.results=results;this.warnings=warnings;this.items=items;this.documents=documents;this.masker=masker;}
    @PostMapping({"/api/cases/{caseId}/roadmaps","/api/cases/{caseId}/roadmaps/recalculate"}) Object generate(@PathVariable Long caseId,Authentication auth){RoadmapService.Generated g=service.generate(access.owned(caseId,auth));Map<String,Object> body=roadmap(g.roadmap());body.put("changes",g.changes());return body;}
    @GetMapping("/api/cases/{caseId}/roadmaps/diff") Object diff(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return service.latestDiff(caseId);}
    @GetMapping("/api/cases/{caseId}/roadmaps/current") Object current(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return roadmap(service.current(caseId));}
    @GetMapping("/api/cases/{caseId}/tasks") Object tasks(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return service.currentSteps(caseId).stream().map(this::step).toList();}
    @GetMapping("/api/tasks/{id}") Object task(@PathVariable Long id,Authentication auth){return step(ownedStep(id,auth));}
    public record ResultInput(TaskProgressStatus progressStatus,LocalDate resultDate,@Size(max=500) String resultText,@Size(max=1000) String memo){}
    @PatchMapping("/api/tasks/{id}/result") Object result(@PathVariable Long id,@RequestBody ResultInput in,Authentication auth){RoadmapStep s=ownedStep(id,auth);return step(service.updateResult(s,in.progressStatus(),in.resultDate(),masker.mask(in.resultText()),masker.mask(in.memo())));}
    @GetMapping("/api/cases/{caseId}/warnings") Object warningList(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return warnings.findAllByInheritanceCaseIdAndResolvedFalse(caseId).stream().sorted(Comparator.comparing(Warning::getLevel).reversed().thenComparing(w->Optional.ofNullable(w.getDeadline()).orElse(LocalDate.MAX))).map(this::warning).toList();}
    @GetMapping("/api/cases/{caseId}/dashboard") Object dashboard(@PathVariable Long caseId,Authentication auth){InheritanceCase c=access.owned(caseId,auth);List<RoadmapStep> list=service.currentSteps(caseId);RoadmapStep current=list.stream().filter(x->x.getStatus()==RoadmapStepStatus.CURRENT||x.getStatus()==RoadmapStepStatus.RECHECK_REQUIRED).findFirst().orElse(null);long unknown=items.findAllByInheritanceCaseIdOrderByCreatedAtDesc(caseId).stream().filter(x->x.getAmountStatus()==AmountStatus.NEEDS_CONFIRMATION).count();return Map.of("case",Map.of("id",c.getId(),"deceasedDisplayName",c.getDeceasedDisplayName(),"roadmapDirty",c.isRoadmapDirty()),"priorityTask",current==null?Map.of():step(current),"roadmap",list.stream().map(this::step).toList(),"needsConfirmationCount",unknown,"documentCount",documents.findAllByInheritanceCaseIdOrderByUploadedAtDesc(caseId).size(),"warnings",warnings.findAllByInheritanceCaseIdAndResolvedFalse(caseId).stream().limit(3).map(this::warning).toList());}
    private Map<String,Object> roadmap(Roadmap m){Map<String,Object> body=new LinkedHashMap<>();body.put("id",m.getId());body.put("version",m.getVersion());body.put("rulesVersion",m.getRulesVersion());body.put("createdAt",m.getCreatedAt());body.put("steps",steps.findAllByRoadmapIdOrderBySequenceNo(m.getId()).stream().map(this::step).toList());return body;}
    private Object step(RoadmapStep s){TaskResult r=results.findByStepId(s.getId()).orElse(null);Long dday=s.getDeadline()==null?null:ChronoUnit.DAYS.between(LocalDate.now(),s.getDeadline());return new StepView(s.getId(),s.getStepKey(),s.getTitle(),s.getPurpose(),s.getSequenceNo(),s.getStatus(),s.getDeadline(),s.getDeadlineStatus(),dday,s.getInstitution(),s.getRequiredDocuments(),s.getInstructions(),s.getCautions(),s.getOfficialUrl(),s.isExpertRecommended(),r==null?null:r.getProgressStatus(),r==null?null:r.getResultDate(),r==null?null:r.getMemo());}
    private Object warning(Warning w){Map<String,Object> m=new LinkedHashMap<>();m.put("id",w.getId());m.put("category",w.getCategory());m.put("level",w.getLevel());m.put("title",w.getTitle());m.put("message",w.getMessage());m.put("navigationTarget",w.getNavigationTarget());m.put("resolved",w.isResolved());m.put("officialUrl",w.getStep()==null?null:w.getStep().getOfficialUrl());return m;}
    private RoadmapStep ownedStep(Long id,Authentication auth){return steps.findByIdAndRoadmapInheritanceCaseOwnerId(id,access.principal(auth).id()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"TASK_NOT_FOUND","업무를 찾을 수 없습니다."));}
    public record StepView(Long id,String stepKey,String title,String purpose,int sequenceNo,RoadmapStepStatus status,LocalDate deadline,DeadlineStatus deadlineStatus,Long dDay,String institution,String requiredDocuments,String instructions,String cautions,String officialUrl,boolean expertRecommended,TaskProgressStatus progressStatus,LocalDate resultDate,String memo){}
}
