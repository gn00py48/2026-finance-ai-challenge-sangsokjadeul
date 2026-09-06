package com.sangsok.api;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangsok.api.chat.KeywordFallbackChatService;
import com.sangsok.api.document.AnalysisResult;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.InheritanceCase;
import com.sangsok.api.roadmap.DeadlinePolicy;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
class CoreRulesTests {
    @Test void uncertainAwarenessDateDoesNotInventDeadline(){InheritanceCase c=new InheritanceCase();c.setAwarenessDate(LocalDate.of(2026,8,20));c.setAwarenessDateCertain(false);var d=new DeadlinePolicy().limitationDecision(c);assertThat(d.status()).isEqualTo(DeadlineStatus.NEEDS_CONFIRMATION);assertThat(d.date()).isNull();}
    @Test void invalidAnalysisJsonIsRejected(){assertThatThrownBy(()->new ObjectMapper().readValue("{invalid",AnalysisResult.class)).isInstanceOf(Exception.class);}
    @Test void chatFallbackOnlyReturnsWhitelistedTargets(){var chat=new KeywordFallbackChatService();Set<NavigationTarget> allowed=Set.of(NavigationTarget.values());for(String q:new String[]{"문서 올려","채무가 있어","지금 뭘 해야 해","기한","로드맵","기타"})assertThat(allowed).contains(chat.reply(q,7L).navigationTarget());}
    @Test void aiFailureKeywordFallbackRoutesDocumentUpload(){var r=new KeywordFallbackChatService().reply("안심상속 파일 업로드",null);assertThat(r.navigationTarget()).isEqualTo(NavigationTarget.DOCUMENT_UPLOAD);}
}
