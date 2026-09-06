package com.sangsok.api.chat;
import com.sangsok.api.domain.Enums.*;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class KeywordFallbackChatService implements AiChatService {
    public ChatReply reply(String q,Long task){String s=q==null?"":q.replace(" ","");if(has(s,"문서","파일","업로드","안심상속")){boolean view=has(s,"보여","목록","제출");return out(view?"등록된 상속자료 화면에서 문서를 확인할 수 있어요.":"상속자료 업로드 화면에서 PDF나 이미지를 등록할 수 있어요.",view?ChatIntent.VIEW_DOCUMENTS:ChatIntent.UPLOAD_DOCUMENT,view?NavigationTarget.DOCUMENT_LIST:NavigationTarget.DOCUMENT_UPLOAD,null,view?"등록 문서 보기":"문서 업로드",WarningLevel.LOW);}if(has(s,"재산","예금","보험","주식","채무","빚")){boolean risk=has(s,"채무","빚");return out(risk?"채무가 의심되면 금액을 임의로 확정하지 말고 기관의 공식 자료와 전문가에게 확인해 주세요.":"재산·채무 목록에서 항목을 확인하거나 추가할 수 있어요.",ChatIntent.MANAGE_FINANCIAL_ITEMS,NavigationTarget.FINANCIAL_ITEM_LIST,null,"재산·채무 보기",risk?WarningLevel.HIGH:WarningLevel.LOW);}if(has(s,"수정","변경","내정보"))return out("내 상속 정보 수정 화면으로 안내할게요.",ChatIntent.EDIT_CASE,NavigationTarget.CASE_EDIT,null,"정보 수정",WarningLevel.LOW);if(has(s,"지금","먼저","해야할일"))return out("현재 최우선 업무의 처리 방법을 확인해 보세요.",ChatIntent.VIEW_PRIORITY_TASK,NavigationTarget.TASK_DETAIL,task,"최우선 업무 보기",WarningLevel.LOW);if(has(s,"기한","마감","D-day","디데이"))return out("기한은 입력된 기준일이 확실한 경우에만 규칙으로 계산합니다. 주의사항에서 확인해 주세요.",ChatIntent.VIEW_DEADLINES,NavigationTarget.WARNING_LIST,null,"기한 주의사항 보기",WarningLevel.MEDIUM);if(has(s,"로드맵","순서","절차"))return out("맞춤 로드맵에서 현재와 다음 절차를 볼 수 있어요.",ChatIntent.VIEW_ROADMAP,NavigationTarget.ROADMAP,null,"로드맵 보기",WarningLevel.LOW);return out("입력된 진행 상황을 바탕으로 문서, 재산·채무, 로드맵 또는 기한 화면을 안내해 드릴 수 있어요.",ChatIntent.GENERAL_QUESTION,NavigationTarget.DASHBOARD,null,"대시보드 보기",WarningLevel.LOW);}
    private boolean has(String s,String... words){for(String w:words)if(s.contains(w))return true;return false;}
    private ChatReply out(String m,ChatIntent i,NavigationTarget n,Long id,String b,WarningLevel r){return new ChatReply(m,i,n,id,b,false,r,List.of());}
}
