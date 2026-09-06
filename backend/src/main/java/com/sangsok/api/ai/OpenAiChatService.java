package com.sangsok.api.ai;

import com.fasterxml.jackson.databind.*;
import com.sangsok.api.chat.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import java.util.*;

@Service @Primary
@ConditionalOnProperty(name="app.ai.provider",havingValue="openai")
public class OpenAiChatService implements AiChatService {
    private final OpenAiResponsesClient client;private final ObjectMapper mapper;private final KeywordFallbackChatService fallback;
    public OpenAiChatService(OpenAiResponsesClient client,ObjectMapper mapper,KeywordFallbackChatService fallback){this.client=client;this.mapper=mapper;this.fallback=fallback;}
    @Override public ChatReply reply(String question,Long currentTaskId,java.util.List<StepRef> steps){
        try{
            String context="현재 최우선 업무 ID="+(currentTaskId==null?"없음":currentTaskId)+". 로드맵 단계: "+steps+". 사용자의 질문: "+question;
            JsonNode out=client.structured(context,"상속 절차를 쉬운 한국어로 안내하되 법정상속인, 포기·한정승인 필요성, 세액, 법적 효력을 확정하지 마세요. URL을 만들지 말고 허용된 navigationTarget만 선택하세요. 위험한 질문은 전문가 또는 관계기관 확인을 권하세요.","inheritance_navigation",schema());
            ChatReply parsed=mapper.treeToValue(out,ChatReply.class);
            Long target=parsed.navigationTarget()==com.sangsok.api.domain.Enums.NavigationTarget.TASK_DETAIL?currentTaskId:null;
            // 모델이 화면을 특정하지 못하면 규칙 기반 결과를 쓴다. 후보 선택지와 미일치 안내가 거기에 있다.
            if(parsed.navigationTarget()==null)return fallback.reply(question,currentTaskId,steps);
            return new ChatReply(parsed.message(),parsed.intent(),parsed.navigationTarget(),target,parsed.buttonLabel(),parsed.requiresConfirmation(),parsed.riskLevel(),List.of(),List.of());
        }catch(Exception ignored){return fallback.reply(question,currentTaskId,steps);}
    }
    private JsonNode schema(){try{return mapper.readTree("""
      {"type":"object","additionalProperties":false,"required":["message","intent","navigationTarget","buttonLabel","requiresConfirmation","riskLevel"],"properties":{"message":{"type":"string"},"intent":{"type":"string","enum":["VIEW_DOCUMENTS","UPLOAD_DOCUMENT","MANAGE_FINANCIAL_ITEMS","EDIT_CASE","VIEW_PRIORITY_TASK","VIEW_DEADLINES","VIEW_ROADMAP","GENERAL_QUESTION"]},"navigationTarget":{"type":"string","enum":["DASHBOARD","CASE_INFO","CASE_EDIT","DOCUMENT_UPLOAD","DOCUMENT_LIST","FINANCIAL_ITEM_ADD","FINANCIAL_ITEM_LIST","ROADMAP","TASK_DETAIL","WARNING_LIST"]},"buttonLabel":{"type":"string"},"requiresConfirmation":{"type":"boolean"},"riskLevel":{"type":"string","enum":["LOW","MEDIUM","HIGH","CRITICAL"]}}}
      """);}catch(Exception e){throw new IllegalStateException(e);}}
}
