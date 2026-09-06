package com.sangsok.api.storage;

// ponytail: byte[] 전량 로드. 업로드 상한이 10MB라 스트리밍 없이 처리한다. 상한을 올리면 InputStream 기반으로 바꾼다.
public interface DocumentStorage {
    void put(String key, byte[] content, String contentType);
    byte[] get(String key);
    void delete(String key);
}
