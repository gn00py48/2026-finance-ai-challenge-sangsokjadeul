package com.sangsok.api.roadmap;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
@Service
public class RoadmapService {
    private final RoadmapRepository maps;private final RoadmapStepRepository steps;private final TaskResultRepository results;private final WarningRepository warnings;private final FinancialItemRepository items;private final CaseRepository cases;private final DeadlinePolicy deadlines;
    public RoadmapService(RoadmapRepository maps,RoadmapStepRepository steps,TaskResultRepository results,WarningRepository warnings,FinancialItemRepository items,CaseRepository cases,DeadlinePolicy deadlines){this.maps=maps;this.steps=steps;this.results=results;this.warnings=warnings;this.items=items;this.cases=cases;this.deadlines=deadlines;}
    @Transactional public Generated generate(InheritanceCase c){Map<String,RoadmapStep> previous=activeStepsByKey(c.getId());maps.findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(c.getId()).ifPresent(old->{old.setActive(false);maps.save(old);});Roadmap m=new Roadmap();m.setInheritanceCase(c);m.setVersion((int)maps.countByInheritanceCaseId(c.getId())+1);m.setActive(true);m.setRulesVersion(DeadlinePolicy.VERSION);maps.save(m);var limitation=deadlines.limitationDecision(c);var tax=deadlines.taxReview(c);add(m,"VERIFY_INFORMATION","상속 정보와 채무 확인","입력·업로드한 정보에서 누락과 미확인 금액을 확인합니다.",1,null,DeadlineStatus.NONE,"사용자 직접 확인","업로드 문서, 알고 있는 재산·채무","문서 분석 결과와 직접 입력 항목을 비교하고 미확인 금액을 확인하세요.","기관 자료를 자동 조회한 결과가 아닙니다.",false);add(m,"DECISION_SUPPORT","승인·포기·한정승인 검토","확인된 정보로 공식 절차와 전문가 상담 필요성을 검토합니다.",2,limitation.date(),limitation.status(),"가정법원 또는 전문가","가족관계·사망 관련 공식 서류 등","법적 선택을 확정하지 말고 법원 공식 안내 또는 전문가와 확인하세요.","인지일 기준 기한은 사실관계에 따라 달라질 수 있습니다.",true);add(m,"HEIR_COORDINATION","공동상속인 후보와 협의","사용자가 파악한 후보들과 재산 처리 방향을 정리합니다.",3,null,DeadlineStatus.NONE,"공동상속인 후보","재산·채무 목록","후보 명단과 유언 존재 여부를 다시 확인하세요.","입력된 후보는 법정상속인 확정 명단이 아닙니다.",true);add(m,"FINANCIAL_PROCEDURES","금융기관별 필요 절차 확인","각 기관의 공식 안내에 따라 구비서류와 신청 절차를 확인합니다.",4,null,DeadlineStatus.NONE,"각 금융기관","기관별 요구 서류","기관 공식 채널에서 실제 잔액과 제출 서류를 확인하세요.","서비스는 실제 지급 상태를 확인하지 않습니다.",false);add(m,"TAX_REVIEW","상속세 신고 필요성 확인","신고 대상 여부와 평가 자료를 전문가 또는 공식 안내로 확인합니다.",5,tax.date(),tax.status(),"국세청 또는 세무 전문가","재산·채무 평가 자료","홈택스·국세청 안내 또는 세무 전문가에게 확인하세요.","표시 기한은 참고용이며 정확한 신고기한·세액을 확정하지 않습니다.",true);List<RoadmapStep> created=steps.findAllByRoadmapIdOrderBySequenceNo(m.getId());carryOverResults(previous,created);recompute(created);c.setRoadmapDirty(false);c.setRoadmapUpdatedAt(Instant.now());cases.save(c);rebuildWarnings(c,m);return new Generated(m,changes(previous,created));}

    /** 재생성해도 사용자가 입력한 진행 결과를 잃지 않도록 같은 stepKey로 복제한다. */
    private void carryOverResults(Map<String,RoadmapStep> previous,List<RoadmapStep> created){
        for(RoadmapStep step:created){
            RoadmapStep old=previous.get(step.getStepKey());
            if(old==null)continue;
            results.findByStepId(old.getId()).ifPresent(r->{
                TaskResult copy=new TaskResult();copy.setStep(step);copy.setProgressStatus(r.getProgressStatus());
                copy.setResultDate(r.getResultDate());copy.setResultText(r.getResultText());copy.setMemo(r.getMemo());copy.setUpdatedAt(Instant.now());
                results.save(copy);
            });
        }
    }

    /** 저장된 결과만으로 단계 상태를 다시 계산한다. 완료되지 않은 앞 단계가 있으면 뒤의 완료 단계는 재확인 대상이다. */
    private void recompute(List<RoadmapStep> list){
        boolean blocked=false;
        for(RoadmapStep step:list){
            TaskProgressStatus saved=results.findByStepId(step.getId()).map(TaskResult::getProgressStatus).orElse(null);
            boolean done=saved==TaskProgressStatus.COMPLETED||saved==TaskProgressStatus.NOT_APPLICABLE;
            if(done)step.setStatus(blocked?RoadmapStepStatus.RECHECK_REQUIRED:RoadmapStepStatus.COMPLETED);
            else if(!blocked){step.setStatus(RoadmapStepStatus.CURRENT);blocked=true;}
            else step.setStatus(RoadmapStepStatus.UPCOMING);
        }
        steps.saveAll(list);
    }

    private Map<String,RoadmapStep> activeStepsByKey(Long caseId){
        return maps.findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(caseId)
                .map(m->steps.findAllByRoadmapIdOrderBySequenceNo(m.getId()).stream().collect(Collectors.toMap(RoadmapStep::getStepKey,s->s,(a,b)->a,LinkedHashMap::new)))
                .orElseGet(LinkedHashMap::new);
    }

    /** 이전 버전과의 차이. 버전 행이 그대로 남아 있으므로 별도 저장 없이 필요할 때 계산한다. */
    private Map<String,Object> changes(Map<String,RoadmapStep> previous,List<RoadmapStep> created){
        List<String> added=new ArrayList<>(),removed=new ArrayList<>(previous.keySet()),carried=new ArrayList<>();
        List<Map<String,Object>> deadlineChanged=new ArrayList<>();
        for(RoadmapStep step:created){
            removed.remove(step.getStepKey());
            RoadmapStep old=previous.get(step.getStepKey());
            if(old==null){added.add(step.getStepKey());continue;}
            if(results.findByStepId(step.getId()).isPresent())carried.add(step.getStepKey());
            if(!Objects.equals(old.getDeadline(),step.getDeadline())||old.getDeadlineStatus()!=step.getDeadlineStatus())
                deadlineChanged.add(Map.of("stepKey",step.getStepKey(),"title",step.getTitle(),
                        "before",String.valueOf(old.getDeadline()),"beforeStatus",old.getDeadlineStatus(),
                        "after",String.valueOf(step.getDeadline()),"afterStatus",step.getDeadlineStatus()));
        }
        return Map.of("added",added,"removed",removed,"carriedOver",carried,"deadlineChanged",deadlineChanged);
    }

    /** 최신 두 버전 비교. 버전이 하나뿐이면 비어 있다. */
    public Map<String,Object> latestDiff(Long caseId){
        List<Roadmap> all=maps.findAllByInheritanceCaseIdOrderByVersionDesc(caseId);
        if(all.size()<2)return Map.of("added",List.of(),"removed",List.of(),"carriedOver",List.of(),"deadlineChanged",List.of());
        Map<String,RoadmapStep> previous=steps.findAllByRoadmapIdOrderBySequenceNo(all.get(1).getId()).stream()
                .collect(Collectors.toMap(RoadmapStep::getStepKey,s->s,(a,b)->a,LinkedHashMap::new));
        return changes(previous,steps.findAllByRoadmapIdOrderBySequenceNo(all.get(0).getId()));
    }

    public record Generated(Roadmap roadmap,Map<String,Object> changes){}
    private void add(Roadmap m,String key,String title,String purpose,int seq,LocalDate date,DeadlineStatus ds,String institution,String docs,String guide,String caution,boolean expert){RoadmapStep s=new RoadmapStep();s.setRoadmap(m);s.setStepKey(key);s.setTitle(title);s.setPurpose(purpose);s.setSequenceNo(seq);s.setStatus(seq==1?RoadmapStepStatus.CURRENT:RoadmapStepStatus.UPCOMING);s.setDeadline(date);s.setDeadlineStatus(ds);s.setInstitution(institution);s.setRequiredDocuments(docs);s.setInstructions(guide);s.setCautions(caution);s.setOfficialUrl(seq==2?"https://help.scourt.go.kr/nm/min_1/min_1_8/index.html":seq==5?"https://www.nts.go.kr/":"https://www.gov.kr/");s.setExpertRecommended(expert);steps.save(s);}
    private void rebuildWarnings(InheritanceCase c,Roadmap m){warnings.deleteAllByInheritanceCaseId(c.getId());List<FinancialItem> inv=items.findAllByInheritanceCaseIdOrderByCreatedAtDesc(c.getId());Map<String,RoadmapStep> byKey=steps.findAllByRoadmapIdOrderBySequenceNo(m.getId()).stream().collect(Collectors.toMap(RoadmapStep::getStepKey,s->s));if(inv.stream().anyMatch(x->x.getAmountStatus()==AmountStatus.NEEDS_CONFIRMATION))warn(c,byKey.get("VERIFY_INFORMATION"),WarningCategory.MISSING_INFO,WarningLevel.HIGH,"금액 확인 필요","금액을 확인하지 못한 재산·채무가 있습니다.",null,NavigationTarget.FINANCIAL_ITEM_LIST);if(!c.isAwarenessDateCertain()||c.getAwarenessDate()==null)warn(c,byKey.get("DECISION_SUPPORT"),WarningCategory.DEADLINE_RISK,WarningLevel.CRITICAL,"기산일 확인 필요","상속개시 사실을 안 날이 불확실하여 관련 기한을 확정하지 않았습니다.",null,NavigationTarget.CASE_EDIT);if(inv.stream().anyMatch(x->x.getAssetOrDebt()==AssetOrDebt.DEBT))warn(c,byKey.get("DECISION_SUPPORT"),WarningCategory.CHECK_NOW,WarningLevel.HIGH,"채무 정보 확인","등록된 채무가 있습니다. 단정적인 선택 전에 공식 안내와 전문가 확인을 권합니다.",null,NavigationTarget.FINANCIAL_ITEM_LIST);}
    private void warn(InheritanceCase c,RoadmapStep s,WarningCategory cat,WarningLevel level,String title,String msg,LocalDate date,NavigationTarget nav){Warning w=new Warning();w.setInheritanceCase(c);w.setStep(s);w.setCategory(cat);w.setLevel(level);w.setTitle(title);w.setMessage(msg);w.setDeadline(date);w.setNavigationTarget(nav);warnings.save(w);}
    public Roadmap current(Long caseId){return maps.findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(caseId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"ROADMAP_NOT_FOUND","로드맵을 먼저 생성해 주세요."));}
    public List<RoadmapStep> currentSteps(Long caseId){return steps.findAllByRoadmapIdOrderBySequenceNo(current(caseId).getId());}
    @Transactional public RoadmapStep updateResult(RoadmapStep step,TaskProgressStatus progress,LocalDate date,String text,String memo){if(progress==null)throw new ApiException(HttpStatus.BAD_REQUEST,"PROGRESS_REQUIRED","진행 상태를 선택해 주세요.");TaskResult r=results.findByStepId(step.getId()).orElseGet(TaskResult::new);r.setStep(step);r.setProgressStatus(progress);r.setResultDate(date);r.setResultText(text);r.setMemo(memo);r.setUpdatedAt(Instant.now());results.save(r);List<RoadmapStep> list=steps.findAllByRoadmapIdOrderBySequenceNo(step.getRoadmap().getId());recompute(list);return list.stream().filter(s->Objects.equals(s.getId(),step.getId())).findFirst().orElse(step);}
}
