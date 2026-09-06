package com.sangsok.api.chat;
import com.sangsok.api.domain.Enums.*;
import org.springframework.stereotype.Service;
import java.util.*;

/** 규칙 기반 화면 안내. AI 응답이 없거나 실패했을 때도 같은 결과를 낸다. */
@Service
public class KeywordFallbackChatService implements AiChatService {

    // 일치하는 화면이 없을 때 보여줄 주요 메뉴.
    private static final List<Candidate> MAIN_MENU=List.of(
            new Candidate("메인","최우선 업무와 로드맵 요약",NavigationTarget.DASHBOARD,null),
            new Candidate("상속자료 추가","문서 업로드와 재산·채무 직접 입력",NavigationTarget.DOCUMENT_UPLOAD,null),
            new Candidate("재산·채무","등록된 항목 확인과 수정",NavigationTarget.FINANCIAL_ITEM_LIST,null),
            new Candidate("내 상속 정보","사건 정보와 등록 문서",NavigationTarget.CASE_INFO,null),
            new Candidate("전체 주의사항","기한과 확인이 필요한 항목",NavigationTarget.WARNING_LIST,null));

    public ChatReply reply(String q,Long task,List<StepRef> steps){
        String s=q==null?"":q.replace(" ","");

        // 절차명을 입력한 경우. 로드맵에 있는 단계만 대상으로 한다.
        List<StepRef> matched=matchSteps(s,steps);
        if(matched.size()==1)
            return out("해당 절차의 처리 방법을 확인해 보세요.",ChatIntent.VIEW_PRIORITY_TASK,NavigationTarget.TASK_DETAIL,matched.get(0).id(),"단계 상세 보기",WarningLevel.LOW,List.of());
        if(matched.size()>1)
            return choose("관련된 단계가 여러 개예요. 어디로 갈까요?",ChatIntent.VIEW_ROADMAP,
                    matched.stream().map(x->new Candidate(x.title(),"로드맵 단계 상세",NavigationTarget.TASK_DETAIL,x.id())).toList());

        if(has(s,"문서","파일","업로드","안심상속")){boolean view=has(s,"보여","목록","제출");return out(view?"등록된 상속자료 화면에서 문서를 확인할 수 있어요.":"상속자료 업로드 화면에서 PDF나 이미지를 등록할 수 있어요.",view?ChatIntent.VIEW_DOCUMENTS:ChatIntent.UPLOAD_DOCUMENT,view?NavigationTarget.DOCUMENT_LIST:NavigationTarget.DOCUMENT_UPLOAD,null,view?"등록 문서 보기":"문서 업로드",WarningLevel.LOW,List.of());}
        if(has(s,"자료","정보")&&!has(s,"수정","변경")){
            return choose("어떤 자료를 보시겠어요?",ChatIntent.GENERAL_QUESTION,List.of(
                    new Candidate("등록 문서","업로드한 문서와 분석 결과",NavigationTarget.DOCUMENT_LIST,null),
                    new Candidate("재산·채무","직접 입력·확정한 금융 항목",NavigationTarget.FINANCIAL_ITEM_LIST,null),
                    new Candidate("내 상속 정보","사건 기본정보 요약",NavigationTarget.CASE_INFO,null)));
        }
        if(has(s,"재산","예금","보험","주식","채무","빚")){boolean risk=has(s,"채무","빚");return out(risk?"채무가 의심되면 금액을 임의로 확정하지 말고 기관의 공식 자료와 전문가에게 확인해 주세요.":"재산·채무 목록에서 항목을 확인하거나 추가할 수 있어요.",ChatIntent.MANAGE_FINANCIAL_ITEMS,NavigationTarget.FINANCIAL_ITEM_LIST,null,"재산·채무 보기",risk?WarningLevel.HIGH:WarningLevel.LOW,List.of());}
        if(has(s,"수정","변경","내정보"))return out("내 상속 정보 수정 화면으로 안내할게요.",ChatIntent.EDIT_CASE,NavigationTarget.CASE_EDIT,null,"정보 수정",WarningLevel.LOW,List.of());
        if(has(s,"지금","먼저","해야할일"))return out("현재 최우선 업무의 처리 방법을 확인해 보세요.",ChatIntent.VIEW_PRIORITY_TASK,NavigationTarget.TASK_DETAIL,task,"최우선 업무 보기",WarningLevel.LOW,List.of());
        if(has(s,"기한","마감","D-day","디데이"))return out("기한은 입력된 기준일이 확실한 경우에만 규칙으로 계산합니다. 주의사항에서 확인해 주세요.",ChatIntent.VIEW_DEADLINES,NavigationTarget.WARNING_LIST,null,"기한 주의사항 보기",WarningLevel.MEDIUM,List.of());
        if(has(s,"주의","위험","경고"))return out("전체 주의사항에서 확인이 필요한 항목을 볼 수 있어요.",ChatIntent.VIEW_DEADLINES,NavigationTarget.WARNING_LIST,null,"주의사항 보기",WarningLevel.MEDIUM,List.of());
        if(has(s,"로드맵","순서","절차"))return out("맞춤 로드맵에서 현재와 다음 절차를 볼 수 있어요.",ChatIntent.VIEW_ROADMAP,NavigationTarget.ROADMAP,null,"로드맵 보기",WarningLevel.LOW,List.of());

        // 연결할 화면을 찾지 못한 경우. 이동시키지 않고 재입력을 안내한다.
        return new ChatReply("이 서비스 안의 화면으로 안내하는 기능이에요. 문서, 재산·채무, 로드맵, 기한처럼 찾으시는 것을 한 번 더 입력해 주세요.",
                ChatIntent.GENERAL_QUESTION,null,null,null,false,WarningLevel.LOW,List.of(),MAIN_MENU);
    }

    /** 입력에 단계 제목의 두 글자 이상 조각이 포함되면 후보로 본다. */
    private List<StepRef> matchSteps(String input,List<StepRef> steps){
        if(input.length()<2||steps==null||steps.isEmpty())return List.of();
        List<StepRef> found=new ArrayList<>();
        for(StepRef step:steps){
            String title=step.title().replace(" ","");
            boolean hit=input.contains(title);
            for(int i=0;!hit&&i+2<=title.length();i++)if(input.contains(title.substring(i,i+2)))hit=true;
            if(hit)found.add(step);
        }
        return found;
    }

    private boolean has(String s,String... words){for(String w:words)if(s.contains(w))return true;return false;}
    private ChatReply out(String m,ChatIntent i,NavigationTarget n,Long id,String b,WarningLevel r,List<Candidate> c){return new ChatReply(m,i,n,id,b,false,r,List.of(),c);}
    private ChatReply choose(String m,ChatIntent i,List<Candidate> c){return new ChatReply(m,i,null,null,null,false,WarningLevel.LOW,List.of(),c);}
}
