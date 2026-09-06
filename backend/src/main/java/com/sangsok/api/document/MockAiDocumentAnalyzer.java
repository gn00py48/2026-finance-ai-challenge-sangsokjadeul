package com.sangsok.api.document;
import com.sangsok.api.domain.Enums.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
@Service @ConditionalOnProperty(name="app.ai.provider",havingValue="mock",matchIfMissing=true)
public class MockAiDocumentAnalyzer implements AiDocumentAnalyzer {
    public AnalysisResult analyze(Path file,String mime){return new AnalysisResult("SAFE_INHERITANCE_RESULT",List.of(
      new AnalysisResult.Item("샘플은행",FinancialItemType.DEPOSIT,AssetOrDebt.ASSET,new BigDecimal("12000000"),AmountStatus.CONFIRMED,LocalDate.of(2026,8,20),new BigDecimal("0.92"),"예금 잔액 12,000,000원"),
      new AnalysisResult.Item("샘플카드",FinancialItemType.CARD_DEBT,AssetOrDebt.DEBT,null,AmountStatus.NEEDS_CONFIRMATION,null,new BigDecimal("0.61"),"카드 이용대금 존재")),List.of("샘플 분석 결과입니다. 실제 기관 조회 결과가 아니며 반드시 확인해 주세요."));}
}
