package com.sangsok.api;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc
class ApiFlowTests {
    @Autowired MockMvc mvc; @Autowired ObjectMapper mapper;
    private String signup(String prefix)throws Exception{String username=prefix+UUID.randomUUID().toString().substring(0,8);String body="{\"username\":\""+username+"\",\"password\":\"password123\"}";String json=mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();return mapper.readTree(json).get("accessToken").asText();}
    private long createCase(String token,boolean certain)throws Exception{String body="{\"deceasedDisplayName\":\"테스트 고인\",\"deathDate\":\"2026-08-20\",\"awarenessDate\":\"2026-08-21\",\"awarenessDateCertain\":"+certain+",\"relationship\":\"자녀\",\"inquiryStatus\":\"RESULT_AVAILABLE\",\"minorHeirExists\":false,\"willExists\":false,\"heirCandidates\":[]}";String json=mvc.perform(post("/api/cases").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();return mapper.readTree(json).get("id").asLong();}
    @Test void authenticationAndCaseOwnershipAreEnforced()throws Exception{String owner=signup("owner"),other=signup("other");long id=createCase(owner,true);mvc.perform(get("/api/cases/{id}",id)).andExpect(status().isUnauthorized());mvc.perform(get("/api/cases/{id}",id).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());mvc.perform(get("/api/cases/{id}",999999).header("Authorization","Bearer "+owner)).andExpect(status().isNotFound());}
    @Test void taskCompletionActivatesNextAndCancellationMarksRecheck()throws Exception{String token=signup("task");long id=createCase(token,true);String auth="Bearer "+token;mvc.perform(post("/api/cases/{id}/roadmaps",id).header("Authorization",auth)).andExpect(status().isOk());JsonNode steps=mapper.readTree(mvc.perform(get("/api/cases/{id}/tasks",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString());long first=steps.get(0).get("id").asLong(),second=steps.get(1).get("id").asLong();String done="{\"progressStatus\":\"COMPLETED\",\"resultDate\":\"2026-09-01\"}";mvc.perform(patch("/api/tasks/{id}/result",first).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content(done)).andExpect(jsonPath("$.status").value("COMPLETED"));mvc.perform(patch("/api/tasks/{id}/result",second).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content(done)).andExpect(jsonPath("$.status").value("COMPLETED"));mvc.perform(patch("/api/tasks/{id}/result",first).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{\"progressStatus\":\"IN_PROGRESS\"}"));mvc.perform(get("/api/tasks/{id}",second).header("Authorization",auth)).andExpect(jsonPath("$.status").value("RECHECK_REQUIRED"));}
    @Test void documentCandidatesAreNotAppliedUntilConfirmAndLowConfidenceNeedsReview()throws Exception{String token=signup("doc");long id=createCase(token,true);String auth="Bearer "+token;String created=mvc.perform(post("/api/cases/{id}/documents/sample",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString();long docId=mapper.readTree(created).get("id").asLong();String analyzed=mvc.perform(post("/api/documents/{id}/analyze",docId).header("Authorization",auth)).andExpect(jsonPath("$.status").value("NEEDS_REVIEW")).andReturn().getResponse().getContentAsString();mvc.perform(get("/api/cases/{id}/financial-items",id).header("Authorization",auth)).andExpect(jsonPath("$.length()").value(0));JsonNode result=mapper.readTree(analyzed).get("analysis");mvc.perform(patch("/api/documents/{id}/confirm",docId).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(result))).andExpect(jsonPath("$.status").value("CONFIRMED"));String itemJson=mvc.perform(get("/api/cases/{id}/financial-items",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString();JsonNode list=mapper.readTree(itemJson);assertThat(list.size()).isEqualTo(2);assertThat(list.get(0).get("amountStatus").asText()).isEqualTo("NEEDS_CONFIRMATION");}
    @Test void regeneratingRoadmapKeepsTaskResultsAndReportsChanges()throws Exception{
        String token=signup("recalc");long id=createCase(token,true);String auth="Bearer "+token;
        mvc.perform(post("/api/cases/{id}/roadmaps",id).header("Authorization",auth)).andExpect(status().isOk());
        JsonNode steps=mapper.readTree(mvc.perform(get("/api/cases/{id}/tasks",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/api/tasks/{id}/result",steps.get(0).get("id").asLong()).header("Authorization",auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"progressStatus\":\"COMPLETED\",\"resultDate\":\"2026-09-01\"}")).andExpect(status().isOk());

        String regenerated=mvc.perform(post("/api/cases/{id}/roadmaps/recalculate",id).header("Authorization",auth)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode body=mapper.readTree(regenerated);
        assertThat(body.get("version").asInt()).isEqualTo(2);
        assertThat(body.get("steps").get(0).get("status").asText()).isEqualTo("COMPLETED");
        assertThat(body.get("steps").get(0).get("progressStatus").asText()).isEqualTo("COMPLETED");
        assertThat(body.get("steps").get(1).get("status").asText()).isEqualTo("CURRENT");
        assertThat(body.get("changes").get("carriedOver").toString()).contains("VERIFY_INFORMATION");
        assertThat(body.get("changes").get("added")).isEmpty();

        mvc.perform(get("/api/cases/{id}/roadmaps/diff",id).header("Authorization",auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.carriedOver[0]").value("VERIFY_INFORMATION"));
    }

    @Test void refreshTokenRotatesAndLogoutRevokesIt()throws Exception{
        String username="rot"+UUID.randomUUID().toString().substring(0,8);
        String body="{\"username\":\""+username+"\",\"password\":\"password123\"}";
        var signup=mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn().getResponse();
        String first=cookie(signup.getHeader("Set-Cookie"));
        assertThat(signup.getHeader("Set-Cookie")).contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api/auth");

        var refreshed=mvc.perform(post("/api/auth/refresh").cookie(new jakarta.servlet.http.Cookie("refreshToken",first))).andExpect(status().isOk()).andReturn().getResponse();
        String second=cookie(refreshed.getHeader("Set-Cookie"));
        assertThat(second).isNotEqualTo(first);
        String access=mapper.readTree(refreshed.getContentAsString()).get("accessToken").asText();
        mvc.perform(get("/api/cases").header("Authorization","Bearer "+access)).andExpect(status().isOk());

        // 이미 쓴 토큰을 다시 내면 탈취로 보고 해당 사용자의 토큰을 모두 폐기한다.
        mvc.perform(post("/api/auth/refresh").cookie(new jakarta.servlet.http.Cookie("refreshToken",first))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(new jakarta.servlet.http.Cookie("refreshToken",second))).andExpect(status().isUnauthorized());

        String fresh=cookie(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andReturn().getResponse().getHeader("Set-Cookie"));
        mvc.perform(post("/api/auth/logout").cookie(new jakarta.servlet.http.Cookie("refreshToken",fresh))).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/refresh").cookie(new jakarta.servlet.http.Cookie("refreshToken",fresh))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }
    @Test void reviewedZeroAmountOverridesLowAiConfidenceAndIsReturnedOnReload() throws Exception {
        String auth = "Bearer " + signup("review");
        long caseId = createCase(auth.substring(7), true);
        long docId = mapper.readTree(mvc.perform(post("/api/cases/{id}/documents/sample", caseId)
                .header("Authorization", auth)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        JsonNode analyzed = mapper.readTree(mvc.perform(post("/api/documents/{id}/analyze", docId)
                .header("Authorization", auth)).andReturn().getResponse().getContentAsString()).get("analysis");
        var reviewed = (com.fasterxml.jackson.databind.node.ObjectNode) analyzed.get("items").get(1);
        reviewed.put("amount", 0);
        reviewed.put("amountStatus", "CONFIRMED");
        mvc.perform(patch("/api/documents/{id}/confirm", docId).header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(analyzed)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.analysis.items[1].amount").value(0))
                .andExpect(jsonPath("$.analysis.items[1].amountStatus").value("CONFIRMED"));
        JsonNode saved = mapper.readTree(mvc.perform(get("/api/cases/{id}/financial-items", caseId)
                .header("Authorization", auth)).andReturn().getResponse().getContentAsString());
        JsonNode corrected = java.util.stream.StreamSupport.stream(saved.spliterator(), false)
                .filter(item -> item.get("institution").asText().equals(reviewed.get("institution").asText()))
                .findFirst().orElseThrow();
        assertThat(corrected.get("amount").decimalValue()).isEqualByComparingTo("0");
        assertThat(corrected.get("amountStatus").asText()).isEqualTo("CONFIRMED");
        mvc.perform(get("/api/documents/{id}", docId).header("Authorization", auth))
                .andExpect(jsonPath("$.analysis.items[1].amount").value(0));
    }

    @Test void deathDateChangeRequiresRoadmapRecalculation() throws Exception {
        String token = signup("death");
        long id = createCase(token, true);
        String auth = "Bearer " + token;
        mvc.perform(post("/api/cases/{id}/roadmaps", id).header("Authorization", auth));
        var body = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(mvc.perform(get("/api/cases/{id}", id)
                .header("Authorization", auth)).andReturn().getResponse().getContentAsString());
        body.put("deathDate", "2026-07-15");
        mvc.perform(patch("/api/cases/{id}", id).header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
                .andExpect(jsonPath("$.roadmapImpact").value(true))
                .andExpect(jsonPath("$.case.roadmapDirty").value(true));
    }

    @Test void financialAmountCanBeConfirmedAndDeletedAcrossRequests() throws Exception {
        String token = signup("amountqa"), auth = "Bearer " + token;
        long id = createCase(token, true);
        String unknown = "{\"assetOrDebt\":\"DEBT\",\"itemType\":\"LOAN\",\"institution\":\"QA bank\",\"amountStatus\":\"NEEDS_CONFIRMATION\"}";
        long itemId = mapper.readTree(mvc.perform(post("/api/cases/{id}/financial-items", id)
                .header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(unknown))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/cases/{id}/roadmaps", id).header("Authorization", auth)).andExpect(status().isOk());
        String confirmed = "{\"assetOrDebt\":\"DEBT\",\"itemType\":\"LOAN\",\"institution\":\"QA bank\",\"amountStatus\":\"CONFIRMED\",\"amount\":1200000}";
        mvc.perform(patch("/api/financial-items/{id}", itemId).header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(confirmed)).andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(1200000));
        mvc.perform(get("/api/cases/{id}/financial-items", id).header("Authorization", auth))
                .andExpect(jsonPath("$[0].amountStatus").value("CONFIRMED"));
        mvc.perform(get("/api/cases/{id}", id).header("Authorization", auth))
                .andExpect(jsonPath("$.roadmapDirty").value(true));
        mvc.perform(delete("/api/financial-items/{id}", itemId).header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/cases/{id}/financial-items", id).header("Authorization", auth))
                .andExpect(jsonPath("$.length()").value(0));
    }

    private static String cookie(String setCookie){return setCookie.substring(setCookie.indexOf('=')+1,setCookie.indexOf(';'));}

    @Test void documentOriginalIsServedToOwnerOnlyAndDeletableByOwner()throws Exception{
        String token=signup("file"),other=signup("fileother");long id=createCase(token,true);String auth="Bearer "+token;
        long docId=mapper.readTree(mvc.perform(post("/api/cases/{id}/documents/sample",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        byte[] body=mvc.perform(get("/api/documents/{id}/file",docId).header("Authorization",auth)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(body,0,4,java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF");
        mvc.perform(get("/api/documents/{id}/file",docId)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/documents/{id}/file",docId).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/documents/{id}",docId).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/documents/{id}",docId).header("Authorization",auth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/documents/{id}/file",docId).header("Authorization",auth)).andExpect(status().isNotFound());
    }
    @Test void deletingConfirmedDocumentKeepsFinancialItems()throws Exception{
        String token=signup("del");long id=createCase(token,true);String auth="Bearer "+token;
        long docId=mapper.readTree(mvc.perform(post("/api/cases/{id}/documents/sample",id).header("Authorization",auth)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        String analyzed=mvc.perform(post("/api/documents/{id}/analyze",docId).header("Authorization",auth)).andReturn().getResponse().getContentAsString();
        mvc.perform(patch("/api/documents/{id}/confirm",docId).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(mapper.readTree(analyzed).get("analysis")))).andExpect(status().isOk());
        mvc.perform(delete("/api/documents/{id}",docId).header("Authorization",auth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/cases/{id}/financial-items",id).header("Authorization",auth)).andExpect(jsonPath("$.length()").value(2));
    }
    @Test void impactfulCaseChangeMarksRoadmapDirty()throws Exception{String token=signup("edit");long id=createCase(token,true);String auth="Bearer "+token;mvc.perform(post("/api/cases/{id}/roadmaps",id).header("Authorization",auth));String body="{\"deceasedDisplayName\":\"테스트 고인\",\"deathDate\":\"2026-08-20\",\"awarenessDate\":\"2026-08-21\",\"awarenessDateCertain\":false,\"relationship\":\"자녀\",\"inquiryStatus\":\"RESULT_AVAILABLE\",\"minorHeirExists\":false,\"willExists\":false,\"heirCandidates\":[]}";mvc.perform(patch("/api/cases/{id}",id).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(jsonPath("$.roadmapImpact").value(true)).andExpect(jsonPath("$.case.roadmapDirty").value(true));}
}
