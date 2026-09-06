package com.sangsok.api.caseinfo;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import com.sangsok.api.pii.PiiTextMasker;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api/cases")
public class CaseController {
    private final CaseRepository cases; private final HeirCandidateRepository heirs; private final CaseService access;private final PiiTextMasker masker;
    public CaseController(CaseRepository cases,HeirCandidateRepository heirs,CaseService access,PiiTextMasker masker){this.cases=cases;this.heirs=heirs;this.access=access;this.masker=masker;}
    public record HeirInput(@NotBlank String displayName,@NotBlank String relationship,boolean minor){}
    public record CaseInput(@NotBlank String deceasedDisplayName,LocalDate deathDate,LocalDate awarenessDate,boolean awarenessDateCertain,@NotBlank String relationship,@NotNull InquiryStatus inquiryStatus,Boolean minorHeirExists,Boolean willExists,String completedProcedures,List<@Valid HeirInput> heirCandidates){}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional public Object create(@Valid @RequestBody CaseInput in,Authentication auth){InheritanceCase c=new InheritanceCase();c.setOwner(access.owner(auth));apply(c,in,false);cases.save(c);saveHeirs(c,in.heirCandidates());return view(c);}
    @GetMapping public Object list(Authentication auth){return cases.findAllByOwnerIdOrderByCreatedAtDesc(access.principal(auth).id()).stream().map(this::view).toList();}
    @GetMapping("/{id}") public Object get(@PathVariable Long id,Authentication auth){return view(access.owned(id,auth));}
    @PatchMapping("/{id}") @Transactional public Object patch(@PathVariable Long id,@Valid @RequestBody CaseInput in,Authentication auth){InheritanceCase c=access.owned(id,auth);boolean impactful=!Objects.equals(c.getDeathDate(),in.deathDate())||!Objects.equals(c.getAwarenessDate(),in.awarenessDate())||c.isAwarenessDateCertain()!=in.awarenessDateCertain()||!Objects.equals(c.getWillExists(),in.willExists())||!Objects.equals(c.getMinorHeirExists(),in.minorHeirExists());apply(c,in,impactful);heirs.deleteAllByInheritanceCaseId(id);saveHeirs(c,in.heirCandidates());return Map.of("case",view(c),"roadmapImpact",impactful,"impactSummary",impactful?"기산일·유언·미성년 후보 변경은 단계 또는 기한에 영향을 줄 수 있습니다.":"현재 로드맵 순서에 영향이 없는 변경입니다.");}
    private void apply(InheritanceCase c,CaseInput i,boolean dirty){c.setDeceasedDisplayName(masker.mask(i.deceasedDisplayName()));c.setDeathDate(i.deathDate());c.setAwarenessDate(i.awarenessDate());c.setAwarenessDateCertain(i.awarenessDateCertain());c.setRelationship(masker.mask(i.relationship()));c.setInquiryStatus(i.inquiryStatus());c.setMinorHeirExists(i.minorHeirExists());c.setWillExists(i.willExists());c.setCompletedProcedures(masker.mask(i.completedProcedures()));if(dirty)c.setRoadmapDirty(true);}
    private void saveHeirs(InheritanceCase c,List<HeirInput> list){if(list==null)return;for(HeirInput x:list){HeirCandidate h=new HeirCandidate();h.setInheritanceCase(c);h.setDisplayName(masker.mask(x.displayName()));h.setRelationship(masker.mask(x.relationship()));h.setMinor(x.minor());heirs.save(h);}}
    private Object view(InheritanceCase c){return new CaseView(c.getId(),c.getDeceasedDisplayName(),c.getDeathDate(),c.getAwarenessDate(),c.isAwarenessDateCertain(),c.getRelationship(),c.getInquiryStatus(),c.getMinorHeirExists(),c.getWillExists(),c.getCompletedProcedures(),c.isRoadmapDirty(),c.getRoadmapUpdatedAt(),heirs.findAllByInheritanceCaseId(c.getId()).stream().map(h->new HeirInput(mask(h.getDisplayName()),h.getRelationship(),h.isMinor())).toList());}
    private String mask(String s){if(s==null||s.length()<2)return s;return s.substring(0,1)+"*".repeat(Math.max(1,s.length()-1));}
    public record CaseView(Long id,String deceasedDisplayName,LocalDate deathDate,LocalDate awarenessDate,boolean awarenessDateCertain,String relationship,InquiryStatus inquiryStatus,Boolean minorHeirExists,Boolean willExists,String completedProcedures,boolean roadmapDirty,Instant roadmapUpdatedAt,List<HeirInput> heirCandidates){}
}
