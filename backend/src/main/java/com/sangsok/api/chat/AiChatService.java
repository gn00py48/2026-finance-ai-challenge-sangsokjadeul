package com.sangsok.api.chat;
import com.sangsok.api.domain.Enums.*;
import java.util.List;
public interface AiChatService {
    ChatReply reply(String question,Long currentTaskId);
    record ChatReply(String message,ChatIntent intent,NavigationTarget navigationTarget,Long targetId,String buttonLabel,boolean requiresConfirmation,WarningLevel riskLevel,List<String> sourceLinks){}
}
