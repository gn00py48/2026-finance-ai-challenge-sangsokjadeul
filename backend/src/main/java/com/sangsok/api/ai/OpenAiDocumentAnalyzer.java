package com.sangsok.api.ai;

import com.fasterxml.jackson.databind.*;
import com.sangsok.api.document.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.util.*;

@Service
@ConditionalOnProperty(name="app.ai.provider",havingValue="openai")
public class OpenAiDocumentAnalyzer implements AiDocumentAnalyzer {
    private final OpenAiResponsesClient client; private final ObjectMapper mapper;
    public OpenAiDocumentAnalyzer(OpenAiResponsesClient client,ObjectMapper mapper){this.client=client;this.mapper=mapper;}
    @Override public AnalysisResult analyze(Path file,String mimeType){
        try{
            String data="data:"+mimeType+";base64,"+Base64.getEncoder().encodeToString(Files.readAllBytes(file));
            Map<String,Object> media=mimeType.equals("application/pdf")?Map.of("type","input_file","filename","inheritance-document.pdf","file_data",data):Map.of("type","input_image","image_url",data,"detail","high");
            List<Object> content=new ArrayList<>();content.add(Map.of("type","input_text","text","문서의 금융 항목만 추출하세요. 주민등록번호·계좌번호·실명은 출력하지 말고 기관명, 유형, 자산/채무, 금액, 기준일, 신뢰도, 짧은 근거만 반환하세요. 없는 값은 null과 NEEDS_CONFIRMATION으로 표시하세요."));content.add(media);
            Object input=List.of(Map.of("role","user","content",content));
            JsonNode out=client.structured(input,"법률·세무 판단을 하지 않는 상속 금융 문서 정보 추출기입니다. 문서에 없는 값은 추론하지 않습니다.","inheritance_document_analysis",schema());
            return mapper.treeToValue(out,AnalysisResult.class);
        }catch(Exception e){throw new IllegalStateException("Document analysis failed",e);}
    }
    private JsonNode schema(){try{return mapper.readTree("""
      {"type":"object","additionalProperties":false,"required":["documentType","items","warnings"],"properties":{"documentType":{"type":"string"},"items":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["institution","category","assetOrDebt","amount","amountStatus","referenceDate","confidence","evidenceText"],"properties":{"institution":{"type":"string"},"category":{"type":"string","enum":["DEPOSIT","INSURANCE","STOCK","REAL_ESTATE","LOAN","CARD_DEBT","TAX","OTHER"]},"assetOrDebt":{"type":"string","enum":["ASSET","DEBT"]},"amount":{"type":["number","null"]},"amountStatus":{"type":"string","enum":["CONFIRMED","NEEDS_CONFIRMATION"]},"referenceDate":{"type":["string","null"]},"confidence":{"type":"number","minimum":0,"maximum":1},"evidenceText":{"type":"string"}}}},"warnings":{"type":"array","items":{"type":"string"}}}}
      """);}catch(Exception e){throw new IllegalStateException(e);}}
}
