package com.sangsok.api.roadmap;
import com.sangsok.api.domain.Enums.DeadlineStatus;
import com.sangsok.api.domain.Models.InheritanceCase;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
@Component
public class DeadlinePolicy {
    public static final String VERSION="KR-INHERITANCE-MVP-2026-01";
    public Deadline limitationDecision(InheritanceCase c){return c.isAwarenessDateCertain()&&c.getAwarenessDate()!=null?new Deadline(c.getAwarenessDate().plusMonths(3),DeadlineStatus.CALCULATED):new Deadline(null,DeadlineStatus.NEEDS_CONFIRMATION);}
    public Deadline taxReview(InheritanceCase c){return c.getDeathDate()!=null?new Deadline(c.getDeathDate().plusMonths(6),DeadlineStatus.CALCULATED):new Deadline(null,DeadlineStatus.NEEDS_CONFIRMATION);}
    public record Deadline(LocalDate date,DeadlineStatus status){}
}
