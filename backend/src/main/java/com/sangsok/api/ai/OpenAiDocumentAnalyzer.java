package com.sangsok.api.ai;

import com.fasterxml.jackson.databind.*;
import com.sangsok.api.document.*;
import com.sangsok.api.pii.PiiRedactor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@ConditionalOnProperty(name="app.ai.provider",havingValue="openai")
public class OpenAiDocumentAnalyzer implements AiDocumentAnalyzer {
    private final OpenAiResponsesClient client; private final ObjectMapper mapper; private final PiiRedactor redactor; private final String imageDetail;
    public OpenAiDocumentAnalyzer(OpenAiResponsesClient client,ObjectMapper mapper,PiiRedactor redactor,@Value("${app.ai.image-detail:high}") String imageDetail){this.client=client;this.mapper=mapper;this.redactor=redactor;this.imageDetail=imageDetail;}
    @Override public AnalysisResult analyze(byte[] content0,String mimeType){
        try{
            // 마스킹에 실패하면 예외가 나고 전송되지 않는다. 원본으로 되돌아가는 경로를 두지 않는다.
            List<byte[]> pages=redactor.redactToPng(content0,mimeType);
            List<Object> content=new ArrayList<>();content.add(Map.of("type","input_text","text","문서의 금융 항목만 추출하세요. 검은색으로 가려진 부분은 개인식별정보라 판독할 수 없습니다. 기관명, 유형, 자산/채무, 금액, 기준일, 신뢰도, 짧은 근거만 반환하세요. 없는 값은 null과 NEEDS_CONFIRMATION으로 표시하세요."));
            for(byte[] page:pages)content.add(Map.of("type","input_image","image_url","data:image/png;base64,"+Base64.getEncoder().encodeToString(page),"detail",imageDetail));
            Object input=List.of(Map.of("role","user","content",content));
            JsonNode out=client.structured(input,"법률·세무 판단을 하지 않는 상속 금융 문서 정보 추출기입니다. 문서에 없는 값은 추론하지 않습니다.","inheritance_document_analysis",schema());
            return mapper.treeToValue(out,AnalysisResult.class);
        }catch(Exception e){throw new IllegalStateException("Document analysis failed",e);}
    }
    private JsonNode schema(){try{return mapper.readTree("""
      {"type":"object","additionalProperties":false,"required":["documentType","items","warnings"],"properties":{"documentType":{"type":"string"},"items":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["institution","category","assetOrDebt","amount","amountStatus","referenceDate","confidence","evidenceText"],"properties":{"institution":{"type":"string"},"category":{"type":"string","enum":["DEPOSIT","INSURANCE","STOCK","REAL_ESTATE","LOAN","CARD_DEBT","TAX","OTHER"]},"assetOrDebt":{"type":"string","enum":["ASSET","DEBT"]},"amount":{"type":["number","null"]},"amountStatus":{"type":"string","enum":["CONFIRMED","NEEDS_CONFIRMATION"]},"referenceDate":{"type":["string","null"]},"confidence":{"type":"number","minimum":0,"maximum":1},"evidenceText":{"type":"string"}}}},"warnings":{"type":"array","items":{"type":"string"}}}}
      """);}catch(Exception e){throw new IllegalStateException(e);}}
}
