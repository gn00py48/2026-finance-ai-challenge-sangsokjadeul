package com.sangsok.api;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangsok.api.chat.AiChatService.StepRef;
import com.sangsok.api.chat.KeywordFallbackChatService;
import com.sangsok.api.document.AnalysisResult;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.InheritanceCase;
import com.sangsok.api.roadmap.DeadlinePolicy;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
class CoreRulesTests {
    @Test void uncertainAwarenessDateDoesNotInventDeadline(){InheritanceCase c=new InheritanceCase();c.setAwarenessDate(LocalDate.of(2026,8,20));c.setAwarenessDateCertain(false);var d=new DeadlinePolicy().limitationDecision(c);assertThat(d.status()).isEqualTo(DeadlineStatus.NEEDS_CONFIRMATION);assertThat(d.date()).isNull();}
    @Test void invalidAnalysisJsonIsRejected(){assertThatThrownBy(()->new ObjectMapper().readValue("{invalid",AnalysisResult.class)).isInstanceOf(Exception.class);}
    @Test void chatFallbackOnlyReturnsWhitelistedTargets(){var chat=new KeywordFallbackChatService();Set<NavigationTarget> allowed=Set.of(NavigationTarget.values());for(String q:new String[]{"문서 올려","채무가 있어","지금 뭘 해야 해","기한","로드맵"}){var t=chat.reply(q,7L,List.of()).navigationTarget();assertThat(allowed).contains(t);}}
    @Test void aiFailureKeywordFallbackRoutesDocumentUpload(){var r=new KeywordFallbackChatService().reply("안심상속 파일 업로드",null,List.of());assertThat(r.navigationTarget()).isEqualTo(NavigationTarget.DOCUMENT_UPLOAD);}

    @Test void unmatchedInputOffersMainMenuInsteadOfNavigating(){
        var r=new KeywordFallbackChatService().reply("오늘 날씨 어때",null,List.of());
        assertThat(r.navigationTarget()).isNull();
        assertThat(r.candidates()).isNotEmpty();
        assertThat(r.message()).contains("한 번 더 입력");
    }

    @Test void stepNameMatchesSingleStepAndOffersChoiceWhenAmbiguous(){
        var chat=new KeywordFallbackChatService();
        var steps=List.of(new StepRef(11L,"상속세 신고 필요성 확인"),new StepRef(12L,"금융기관별 필요 절차 확인"));
        var single=chat.reply("상속세 신고",null,steps);
        assertThat(single.navigationTarget()).isEqualTo(NavigationTarget.TASK_DETAIL);
        assertThat(single.targetId()).isEqualTo(11L);

        var ambiguous=chat.reply("필요 확인",null,steps);
        assertThat(ambiguous.navigationTarget()).isNull();
        assertThat(ambiguous.candidates()).hasSize(2);
        assertThat(ambiguous.candidates()).allSatisfy(c->assertThat(c.navigationTarget()).isEqualTo(NavigationTarget.TASK_DETAIL));
    }
}
