package com.sangsok.api.domain;

public final class Enums {
    private Enums() {}
    public enum InquiryStatus { BEFORE, IN_PROGRESS, RESULT_AVAILABLE, PARTIAL }
    public enum DocumentStatus { UPLOADED, ANALYZING, NEEDS_REVIEW, CONFIRMED, FAILED }
    public enum FinancialItemType { DEPOSIT, INSURANCE, STOCK, REAL_ESTATE, LOAN, CARD_DEBT, TAX, OTHER }
    public enum AssetOrDebt { ASSET, DEBT }
    public enum AmountStatus { CONFIRMED, NEEDS_CONFIRMATION }
    public enum RoadmapStepStatus { COMPLETED, CURRENT, UPCOMING, RECHECK_REQUIRED }
    public enum DeadlineStatus { CALCULATED, NEEDS_CONFIRMATION, NONE }
    public enum TaskProgressStatus { NOT_APPLICABLE, CHECKING, BEFORE_APPLICATION, IN_PROGRESS, COMPLETED }
    public enum WarningLevel { LOW, MEDIUM, HIGH, CRITICAL }
    public enum WarningCategory { CHECK_NOW, CURRENT_STEP, LATER_STEP, DEADLINE_RISK, MISSING_INFO }
    public enum NavigationTarget { DASHBOARD, CASE_INFO, CASE_EDIT, DOCUMENT_UPLOAD, DOCUMENT_LIST, FINANCIAL_ITEM_ADD, FINANCIAL_ITEM_LIST, ROADMAP, TASK_DETAIL, WARNING_LIST }
    public enum ChatIntent { VIEW_DOCUMENTS, UPLOAD_DOCUMENT, MANAGE_FINANCIAL_ITEMS, EDIT_CASE, VIEW_PRIORITY_TASK, VIEW_DEADLINES, VIEW_ROADMAP, GENERAL_QUESTION }
}
