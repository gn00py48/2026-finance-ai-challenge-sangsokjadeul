package com.sangsok.api.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class Models {
    private Models() {}

    @Getter @Setter @NoArgsConstructor @Entity(name="AppUser") @Table(name="app_user")
    public static class User {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @Column(nullable=false, unique=true) private String username;
        @Column(name="password_hash", nullable=false) private String passwordHash;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="inheritance_case")
    public static class InheritanceCase {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="owner_id") private User owner;
        @Column(name="deceased_display_name", nullable=false) private String deceasedDisplayName;
        @Column(name="death_date") private LocalDate deathDate;
        @Column(name="awareness_date") private LocalDate awarenessDate;
        @Column(name="awareness_date_certain", nullable=false) private boolean awarenessDateCertain;
        @Column(nullable=false) private String relationship;
        @Enumerated(EnumType.STRING) @Column(name="inquiry_status", nullable=false) private Enums.InquiryStatus inquiryStatus;
        @Column(name="minor_heir_exists") private Boolean minorHeirExists;
        @Column(name="will_exists") private Boolean willExists;
        @Column(name="completed_procedures") private String completedProcedures;
        @Column(name="roadmap_dirty", nullable=false) private boolean roadmapDirty;
        @Column(name="roadmap_updated_at") private Instant roadmapUpdatedAt;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="heir_candidate")
    public static class HeirCandidate {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @Column(name="display_name", nullable=false) private String displayName;
        @Column(nullable=false) private String relationship;
        @Column(nullable=false) private boolean minor;
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="document")
    public static class Document {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @Column(name="original_name", nullable=false) private String originalName;
        @Column(name="storage_key", nullable=false) private String storageKey;
        @Column(name="mime_type", nullable=false) private String mimeType;
        @Column(name="size_bytes", nullable=false) private long sizeBytes;
        @Enumerated(EnumType.STRING) @Column(nullable=false) private Enums.DocumentStatus status;
        @Column(name="consented_at") private Instant consentedAt;
        @Column(name="uploaded_at", nullable=false) private Instant uploadedAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="document_analysis")
    public static class DocumentAnalysis {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="document_id") private Document document;
        @Column(nullable=false) private String status;
        @Column(name="document_type") private String documentType;
        @Column(name="result_json", columnDefinition="text") private String resultJson;
        @Column(name="error_message") private String errorMessage;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="financial_item")
    public static class FinancialItem {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="source_document_id") private Document sourceDocument;
        @Enumerated(EnumType.STRING) @Column(name="asset_or_debt", nullable=false) private Enums.AssetOrDebt assetOrDebt;
        @Enumerated(EnumType.STRING) @Column(name="item_type", nullable=false) private Enums.FinancialItemType itemType;
        private String institution;
        private BigDecimal amount;
        @Enumerated(EnumType.STRING) @Column(name="amount_status", nullable=false) private Enums.AmountStatus amountStatus;
        @Column(name="reference_date") private LocalDate referenceDate;
        private String memo;
        private BigDecimal confidence;
        @Column(name="evidence_text") private String evidenceText;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="roadmap")
    public static class Roadmap {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @Column(nullable=false) private int version;
        @Column(nullable=false) private boolean active;
        @Column(name="rules_version", nullable=false) private String rulesVersion;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="roadmap_step")
    public static class RoadmapStep {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="roadmap_id") private Roadmap roadmap;
        @Column(name="step_key", nullable=false) private String stepKey;
        @Column(nullable=false) private String title;
        @Column(nullable=false) private String purpose;
        @Column(name="sequence_no", nullable=false) private int sequenceNo;
        @Enumerated(EnumType.STRING) @Column(nullable=false) private Enums.RoadmapStepStatus status;
        private LocalDate deadline;
        @Enumerated(EnumType.STRING) @Column(name="deadline_status", nullable=false) private Enums.DeadlineStatus deadlineStatus;
        private String institution;
        @Column(name="required_documents") private String requiredDocuments;
        private String instructions;
        private String cautions;
        @Column(name="official_url") private String officialUrl;
        @Column(name="expert_recommended", nullable=false) private boolean expertRecommended;
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="task_result")
    public static class TaskResult {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @OneToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="step_id") private RoadmapStep step;
        @Enumerated(EnumType.STRING) @Column(name="progress_status", nullable=false) private Enums.TaskProgressStatus progressStatus;
        @Column(name="result_date") private LocalDate resultDate;
        @Column(name="result_text") private String resultText;
        private String memo;
        @Column(name="updated_at", nullable=false) private Instant updatedAt = Instant.now();
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="warning")
    public static class Warning {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="step_id") private RoadmapStep step;
        @Enumerated(EnumType.STRING) @Column(nullable=false) private Enums.WarningCategory category;
        @Enumerated(EnumType.STRING) @Column(nullable=false) private Enums.WarningLevel level;
        @Column(nullable=false) private String title;
        @Column(nullable=false) private String message;
        private LocalDate deadline;
        @Enumerated(EnumType.STRING) @Column(name="navigation_target", nullable=false) private Enums.NavigationTarget navigationTarget;
        @Column(nullable=false) private boolean resolved;
    }

    @Getter @Setter @NoArgsConstructor @Entity @Table(name="chat_message")
    public static class ChatMessage {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="case_id") private InheritanceCase inheritanceCase;
        @Column(nullable=false) private String role;
        @Column(nullable=false) private String message;
        @Enumerated(EnumType.STRING) private Enums.ChatIntent intent;
        @Enumerated(EnumType.STRING) @Column(name="navigation_target") private Enums.NavigationTarget navigationTarget;
        @Column(name="target_id") private Long targetId;
        @Column(name="created_at", nullable=false) private Instant createdAt = Instant.now();
    }
}
