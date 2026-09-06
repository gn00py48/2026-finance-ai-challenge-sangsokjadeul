package com.sangsok.api.chat;
import com.sangsok.api.domain.Enums.*;
import java.util.List;
public interface AiChatService {
    ChatReply reply(String question,Long currentTaskId,List<StepRef> steps);

    /** 로드맵에 실제로 존재하는 단계. 절차명을 입력했을 때 이동 대상을 찾는 데 쓴다. */
    record StepRef(Long id,String title){}

    /** 이동 후보. 대상이 여러 개이거나 일치하는 화면이 없을 때 채운다. */
    record Candidate(String label,String description,NavigationTarget navigationTarget,Long targetId){}

    record ChatReply(String message,ChatIntent intent,NavigationTarget navigationTarget,Long targetId,String buttonLabel,boolean requiresConfirmation,WarningLevel riskLevel,List<String> sourceLinks,List<Candidate> candidates){}
}
