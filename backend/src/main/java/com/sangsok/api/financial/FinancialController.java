package com.sangsok.api.financial;
import com.sangsok.api.caseinfo.CaseService;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import jakarta.validation.Valid;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@RestController
@Transactional
public class FinancialController {
    private final FinancialItemRepository items; private final CaseService access; private final CaseRepository cases;
    public FinancialController(FinancialItemRepository items,CaseService access,CaseRepository cases){this.items=items;this.access=access;this.cases=cases;}
    public record ItemInput(@NotNull AssetOrDebt assetOrDebt,@NotNull FinancialItemType itemType,String institution,@PositiveOrZero BigDecimal amount,@NotNull AmountStatus amountStatus,LocalDate referenceDate,@Size(max=500) String memo){}
    @GetMapping("/api/cases/{caseId}/financial-items") Object list(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return items.findAllByInheritanceCaseIdOrderByCreatedAtDesc(caseId).stream().map(this::view).toList();}
    @PostMapping("/api/cases/{caseId}/financial-items") @ResponseStatus(HttpStatus.CREATED) Object add(@PathVariable Long caseId,@Valid @RequestBody ItemInput in,Authentication auth){InheritanceCase c=access.owned(caseId,auth);FinancialItem x=new FinancialItem();x.setInheritanceCase(c);apply(x,in);c.setRoadmapDirty(true);cases.save(c);return view(items.save(x));}
    @PatchMapping("/api/financial-items/{id}") Object patch(@PathVariable Long id,@Valid @RequestBody ItemInput in,Authentication auth){FinancialItem x=items.findByIdAndInheritanceCaseOwnerId(id,access.principal(auth).id()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"ITEM_NOT_FOUND","재산·채무 항목을 찾을 수 없습니다."));apply(x,in);x.getInheritanceCase().setRoadmapDirty(true);cases.save(x.getInheritanceCase());return view(items.save(x));}
    @DeleteMapping("/api/financial-items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable Long id,Authentication auth){FinancialItem x=items.findByIdAndInheritanceCaseOwnerId(id,access.principal(auth).id()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"ITEM_NOT_FOUND","재산·채무 항목을 찾을 수 없습니다."));x.getInheritanceCase().setRoadmapDirty(true);cases.save(x.getInheritanceCase());items.delete(x);}
    private void apply(FinancialItem x,ItemInput i){if(i.amountStatus()==AmountStatus.CONFIRMED&&i.amount()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"AMOUNT_REQUIRED","확정 금액을 입력해 주세요.");x.setAssetOrDebt(i.assetOrDebt());x.setItemType(i.itemType());x.setInstitution(i.institution());x.setAmount(i.amountStatus()==AmountStatus.CONFIRMED?i.amount():null);x.setAmountStatus(i.amountStatus());x.setReferenceDate(i.referenceDate());x.setMemo(i.memo());}
    private Object view(FinancialItem x){return new ItemView(x.getId(),x.getAssetOrDebt(),x.getItemType(),x.getInstitution(),x.getAmount(),x.getAmountStatus(),x.getReferenceDate(),x.getMemo(),x.getSourceDocument()==null?null:x.getSourceDocument().getId(),x.getConfidence(),x.getEvidenceText());}
    public record ItemView(Long id,AssetOrDebt assetOrDebt,FinancialItemType itemType,String institution,BigDecimal amount,AmountStatus amountStatus,LocalDate referenceDate,String memo,Long sourceDocumentId,BigDecimal confidence,String evidenceText){}
}
