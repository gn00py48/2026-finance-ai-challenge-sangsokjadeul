package com.sangsok.api.storage;

import com.sangsok.api.common.ApiException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.*;

@Component
@ConditionalOnProperty(name="app.storage.type", havingValue="local", matchIfMissing=true)
public class LocalDocumentStorage implements DocumentStorage {
    private final Path root;
    public LocalDocumentStorage(@Value("${app.storage.path}") String root){this.root=Paths.get(root).toAbsolutePath().normalize();}

    @Override public void put(String key,byte[] content,String contentType){
        try{Files.createDirectories(root);Files.write(resolve(key),content);}
        catch(IOException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_WRITE_FAILED","문서를 저장하지 못했습니다.");}
    }
    @Override public byte[] get(String key){
        try{return Files.readAllBytes(resolve(key));}
        catch(IOException e){throw new ApiException(HttpStatus.NOT_FOUND,"DOCUMENT_FILE_NOT_FOUND","문서 원본을 찾을 수 없습니다.");}
    }
    @Override public void delete(String key){
        try{Files.deleteIfExists(resolve(key));}
        catch(IOException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_DELETE_FAILED","문서를 삭제하지 못했습니다.");}
    }
    private Path resolve(String key){
        Path target=root.resolve(key).normalize();
        if(!target.startsWith(root))throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_FILE","잘못된 파일입니다.");
        return target;
    }
}
