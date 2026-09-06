package com.sangsok.api.document;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangsok.api.caseinfo.CaseService;
import com.sangsok.api.common.ApiException;
import com.sangsok.api.domain.Enums.*;
import com.sangsok.api.domain.Models.*;
import com.sangsok.api.repository.*;
import com.sangsok.api.storage.DocumentStorage;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.net.URLEncoder;
import java.time.Instant;
import java.util.*;
@RestController
public class DocumentController {
    private static final Set<String> MIME=Set.of("application/pdf","image/png","image/jpeg");
    private final DocumentRepository documents;private final DocumentAnalysisRepository analyses;private final FinancialItemRepository items;private final CaseService access;private final AiDocumentAnalyzer analyzer;private final ObjectMapper mapper;private final DocumentStorage storage;
    public DocumentController(DocumentRepository documents,DocumentAnalysisRepository analyses,FinancialItemRepository items,CaseService access,AiDocumentAnalyzer analyzer,ObjectMapper mapper,DocumentStorage storage){this.documents=documents;this.analyses=analyses;this.items=items;this.access=access;this.analyzer=analyzer;this.mapper=mapper;this.storage=storage;}
    @PostMapping(value="/api/cases/{caseId}/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED)
    Object upload(@PathVariable Long caseId,@RequestPart MultipartFile file,@RequestParam(defaultValue="false") boolean aiConsent,Authentication auth)throws IOException{InheritanceCase c=access.owned(caseId,auth);if(!aiConsent)throw new ApiException(HttpStatus.BAD_REQUEST,"AI_CONSENT_REQUIRED","AI 분석 동의가 필요합니다.");byte[] content=file.getBytes();validate(file,content);String key=UUID.randomUUID()+extension(file.getOriginalFilename());storage.put(key,content,file.getContentType());Document d=new Document();d.setInheritanceCase(c);d.setOriginalName(safeName(file.getOriginalFilename()));d.setStorageKey(key);d.setMimeType(file.getContentType());d.setSizeBytes(content.length);d.setStatus(DocumentStatus.UPLOADED);d.setConsentedAt(Instant.now());return view(documents.save(d));}
    @PostMapping("/api/cases/{caseId}/documents/sample") @ResponseStatus(HttpStatus.CREATED)
    Object sample(@PathVariable Long caseId,Authentication auth){InheritanceCase c=access.owned(caseId,auth);String key=UUID.randomUUID()+".pdf";byte[] content=samplePdf();storage.put(key,content,"application/pdf");Document d=new Document();d.setInheritanceCase(c);d.setOriginalName("샘플_안심상속_조회결과.pdf");d.setStorageKey(key);d.setMimeType("application/pdf");d.setSizeBytes(content.length);d.setStatus(DocumentStatus.UPLOADED);d.setConsentedAt(Instant.now());return view(documents.save(d));}
    @GetMapping("/api/cases/{caseId}/documents") Object list(@PathVariable Long caseId,Authentication auth){access.owned(caseId,auth);return documents.findAllByInheritanceCaseIdOrderByUploadedAtDesc(caseId).stream().map(this::view).toList();}
    @GetMapping("/api/documents/{id}") Object get(@PathVariable Long id,Authentication auth){return view(owned(id,auth));}
    @GetMapping("/api/documents/{id}/file") ResponseEntity<byte[]> file(@PathVariable Long id,Authentication auth){
        Document d=owned(id,auth);byte[] content=storage.get(d.getStorageKey());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(d.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename*=UTF-8''"+URLEncoder.encode(d.getOriginalName(),StandardCharsets.UTF_8))
                .header(HttpHeaders.CACHE_CONTROL,"no-store").header("X-Content-Type-Options","nosniff").body(content);
    }
    @DeleteMapping("/api/documents/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional void delete(@PathVariable Long id,Authentication auth){
        Document d=owned(id,auth);
        // 확정된 재산·채무 항목은 남기고 출처 링크만 끊는다. source_document_id에 cascade가 없어 먼저 비워야 FK 위반이 없다.
        items.findAllBySourceDocumentId(id).forEach(x->{x.setSourceDocument(null);items.save(x);});
        storage.delete(d.getStorageKey());
        documents.delete(d);
    }
    @PostMapping("/api/documents/{id}/analyze") @Transactional Object analyze(@PathVariable Long id,Authentication auth){Document d=owned(id,auth);d.setStatus(DocumentStatus.ANALYZING);documents.save(d);DocumentAnalysis a=new DocumentAnalysis();a.setDocument(d);a.setStatus("ANALYZING");try{AnalysisResult result=analyzer.analyze(storage.get(d.getStorageKey()),d.getMimeType());a.setDocumentType(result.documentType());a.setResultJson(mapper.writeValueAsString(result));a.setStatus("NEEDS_REVIEW");d.setStatus(DocumentStatus.NEEDS_REVIEW);}catch(Exception e){a.setStatus("FAILED");a.setErrorMessage("분석 결과를 처리하지 못했습니다.");d.setStatus(DocumentStatus.FAILED);}analyses.save(a);documents.save(d);return view(d);}
    @PatchMapping("/api/documents/{id}/confirm") @Transactional Object confirm(@PathVariable Long id,@Valid @RequestBody AnalysisResult result,Authentication auth){Document d=owned(id,auth);if(d.getStatus()!=DocumentStatus.NEEDS_REVIEW)throw new ApiException(HttpStatus.CONFLICT,"ANALYSIS_NOT_REVIEWABLE","검토 가능한 분석 결과가 아닙니다.");if(items.existsBySourceDocumentId(id))throw new ApiException(HttpStatus.CONFLICT,"ALREADY_CONFIRMED","이미 확정된 문서입니다.");for(AnalysisResult.Item i:result.items()){FinancialItem x=new FinancialItem();x.setInheritanceCase(d.getInheritanceCase());x.setSourceDocument(d);x.setInstitution(i.institution());x.setItemType(i.category());x.setAssetOrDebt(i.assetOrDebt());boolean low=i.confidence()!=null&&i.confidence().doubleValue()<0.75;x.setAmountStatus(low||i.amount()==null?AmountStatus.NEEDS_CONFIRMATION:i.amountStatus());x.setAmount(x.getAmountStatus()==AmountStatus.CONFIRMED?i.amount():null);x.setReferenceDate(i.referenceDate());x.setConfidence(i.confidence());x.setEvidenceText(i.evidenceText());items.save(x);}d.setStatus(DocumentStatus.CONFIRMED);d.getInheritanceCase().setRoadmapDirty(true);documents.save(d);return view(d);}
    private Document owned(Long id,Authentication a){return documents.findByIdAndInheritanceCaseOwnerId(id,access.principal(a).id()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"DOCUMENT_NOT_FOUND","문서를 찾을 수 없습니다."));}
    private Object view(Document d){Object result=null;String error=null;var a=analyses.findFirstByDocumentIdOrderByCreatedAtDesc(d.getId());if(a.isPresent()){error=a.get().getErrorMessage();try{if(a.get().getResultJson()!=null)result=mapper.readValue(a.get().getResultJson(),AnalysisResult.class);}catch(Exception ignored){error="저장된 분석 결과 형식이 올바르지 않습니다.";}}return new DocumentView(d.getId(),d.getOriginalName(),d.getMimeType(),d.getSizeBytes(),d.getStatus(),d.getUploadedAt(),result,error);}
    private void validate(MultipartFile f,byte[] content){if(content.length==0||content.length>10*1024*1024)throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_FILE_SIZE","1바이트 이상 10MB 이하 파일만 업로드할 수 있습니다.");String ext=extension(f.getOriginalFilename());if(!Set.of(".pdf",".png",".jpg",".jpeg").contains(ext)||!MIME.contains(f.getContentType()))throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,"UNSUPPORTED_FILE","PDF, PNG, JPG, JPEG만 지원합니다.");byte[] h=Arrays.copyOf(content,Math.min(8,content.length));boolean magic=(ext.equals(".pdf")&&h.length>=4&&h[0]=='%'&&h[1]=='P'&&h[2]=='D'&&h[3]=='F')||(ext.equals(".png")&&h.length>=8&&(h[0]&255)==137&&h[1]=='P'&&h[2]=='N'&&h[3]=='G')||((ext.equals(".jpg")||ext.equals(".jpeg"))&&h.length>=2&&(h[0]&255)==255&&(h[1]&255)==216);if(!magic)throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,"FILE_SIGNATURE_MISMATCH","파일 형식과 내용이 일치하지 않습니다.");}
    private static String extension(String n){if(n==null)return "";int p=n.lastIndexOf('.');return p<0?"":n.substring(p).toLowerCase(Locale.ROOT);}
    private static String safeName(String n){return n==null?"document":Paths.get(n).getFileName().toString().replaceAll("[\\r\\n]","");}
    private static byte[] samplePdf(){
        String stream="BT /F1 12 Tf 50 760 Td (Fictional Safe Inheritance Result - DEMO ONLY) Tj 0 -24 Td (Hanguk Sample Bank / Deposit / Asset / KRW 12000000) Tj 0 -24 Td (Reference date: 2026-08-20) Tj 0 -24 Td (Sample Card / Card debt / Amount not shown) Tj ET";
        List<String> objects=List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
                "<< /Length "+stream.getBytes(java.nio.charset.StandardCharsets.US_ASCII).length+" >>\nstream\n"+stream+"\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        StringBuilder pdf=new StringBuilder("%PDF-1.4\n");List<Integer> offsets=new ArrayList<>();
        for(int i=0;i<objects.size();i++){offsets.add(pdf.length());pdf.append(i+1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");}
        int xref=pdf.length();pdf.append("xref\n0 ").append(objects.size()+1).append("\n0000000000 65535 f \n");
        for(int offset:offsets)pdf.append(String.format(Locale.ROOT,"%010d 00000 n \n",offset));
        pdf.append("trailer\n<< /Size ").append(objects.size()+1).append(" /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF\n");
        return pdf.toString().getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    }
    public record DocumentView(Long id,String name,String mimeType,long sizeBytes,DocumentStatus status,Instant uploadedAt,Object analysis,String error){}
}
