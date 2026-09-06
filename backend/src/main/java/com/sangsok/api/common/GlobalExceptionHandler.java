package com.sangsok.api.common;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.time.Instant;
import java.util.*;
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException e){ return response(e.getStatus(), e.getCode(), e.getMessage(), null); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e){
        var fields=new LinkedHashMap<String,String>();
        e.getBindingResult().getFieldErrors().forEach(x->fields.putIfAbsent(x.getField(),x.getDefaultMessage()));
        return response(HttpStatus.BAD_REQUEST,"VALIDATION_FAILED","입력값을 확인해 주세요.",fields);
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> size(MaxUploadSizeExceededException e){ return response(HttpStatus.PAYLOAD_TOO_LARGE,"FILE_TOO_LARGE","파일은 10MB 이하여야 합니다.",null); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unknown(Exception e){ return response(HttpStatus.INTERNAL_SERVER_ERROR,"INTERNAL_ERROR","요청 처리 중 오류가 발생했습니다.",null); }
    private ResponseEntity<?> response(HttpStatus status,String code,String detail,Object fields){
        var body=new LinkedHashMap<String,Object>(); body.put("timestamp", Instant.now()); body.put("status",status.value()); body.put("code",code); body.put("detail",detail); if(fields!=null) body.put("fieldErrors",fields);
        return ResponseEntity.status(status).body(body);
    }
}
