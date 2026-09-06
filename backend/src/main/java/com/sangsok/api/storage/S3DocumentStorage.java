package com.sangsok.api.storage;

import com.sangsok.api.common.ApiException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

@Component
@ConditionalOnProperty(name="app.storage.type", havingValue="s3")
public class S3DocumentStorage implements DocumentStorage {
    private static final String PREFIX="documents/";
    private final S3Client s3; private final String bucket;
    // 자격증명은 기본 제공자 체인이 EC2 인스턴스 프로파일에서 읽는다. 액세스 키를 설정으로 받지 않는다.
    public S3DocumentStorage(@Value("${app.storage.s3.bucket}") String bucket,@Value("${app.storage.s3.region}") String region){
        this.bucket=bucket;this.s3=S3Client.builder().region(Region.of(region)).build();
    }

    @Override public void put(String key,byte[] content,String contentType){
        try{s3.putObject(PutObjectRequest.builder().bucket(bucket).key(PREFIX+key).contentType(contentType).build(),RequestBody.fromBytes(content));}
        catch(S3Exception e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_WRITE_FAILED","문서를 저장하지 못했습니다.");}
    }
    @Override public byte[] get(String key){
        try{return s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(PREFIX+key).build()).asByteArray();}
        catch(NoSuchKeyException e){throw new ApiException(HttpStatus.NOT_FOUND,"DOCUMENT_FILE_NOT_FOUND","문서 원본을 찾을 수 없습니다.");}
        catch(S3Exception e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_READ_FAILED","문서를 읽지 못했습니다.");}
    }
    @Override public void delete(String key){
        try{s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(PREFIX+key).build());}
        catch(S3Exception e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_DELETE_FAILED","문서를 삭제하지 못했습니다.");}
    }
}
