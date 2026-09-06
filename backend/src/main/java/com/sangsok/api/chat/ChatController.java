package com.sangsok.api.chat;
import com.sangsok.api.caseinfo.CaseService;
import com.sangsok.api.domain.Enums.RoadmapStepStatus;
import com.sangsok.api.domain.Models.ChatMessage;
import com.sangsok.api.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class ChatController {
    private final CaseService access;private final AiChatService chat;private final ChatMessageRepository messages;private final RoadmapRepository roadmaps;private final RoadmapStepRepository steps;
    public ChatController(CaseService access,AiChatService chat,ChatMessageRepository messages,RoadmapRepository roadmaps,RoadmapStepRepository steps){this.access=access;this.chat=chat;this.messages=messages;this.roadmaps=roadmaps;this.steps=steps;}
    public record ChatInput(@NotBlank @Size(max=1000) String message){}
    @PostMapping("/api/cases/{caseId}/chat") Object send(@PathVariable Long caseId,@Valid @RequestBody ChatInput in,Authentication auth){var c=access.owned(caseId,auth);Long task=roadmaps.findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(caseId).flatMap(m->steps.findAllByRoadmapIdOrderBySequenceNo(m.getId()).stream().filter(s->s.getStatus()==RoadmapStepStatus.CURRENT||s.getStatus()==RoadmapStepStatus.RECHECK_REQUIRED).findFirst()).map(s->s.getId()).orElse(null);ChatMessage user=new ChatMessage();user.setInheritanceCase(c);user.setRole("USER");user.setMessage(in.message());messages.save(user);var stepRefs=roadmaps.findFirstByInheritanceCaseIdAndActiveTrueOrderByVersionDesc(caseId).map(m->steps.findAllByRoadmapIdOrderBySequenceNo(m.getId()).stream().map(x->new AiChatService.StepRef(x.getId(),x.getTitle())).toList()).orElse(List.of());var out=chat.reply(in.message(),task,stepRefs);ChatMessage assistant=new ChatMessage();assistant.setInheritanceCase(c);assistant.setRole("ASSISTANT");assistant.setMessage(out.message());assistant.setIntent(out.intent());assistant.setNavigationTarget(out.navigationTarget());assistant.setTargetId(out.targetId());messages.save(assistant);return out;}
    @GetMapping("/api/cases/{caseId}/chat/messages") Object list(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return messages.findAllByInheritanceCaseIdOrderByCreatedAtAsc(caseId).stream().map(m->Map.of("id",m.getId(),"role",m.getRole(),"message",m.getMessage(),"createdAt",m.getCreatedAt())).toList();}
}
