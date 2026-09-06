package com.sangsok.api.document;
import com.sangsok.api.domain.Enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
public record AnalysisResult(@NotBlank String documentType,@NotNull List<@Valid Item> items,@NotNull List<String> warnings){
    public record Item(@NotBlank String institution,@NotNull FinancialItemType category,@NotNull AssetOrDebt assetOrDebt,@PositiveOrZero BigDecimal amount,@NotNull AmountStatus amountStatus,LocalDate referenceDate,@DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidence,@Size(max=500) String evidenceText){}
}
