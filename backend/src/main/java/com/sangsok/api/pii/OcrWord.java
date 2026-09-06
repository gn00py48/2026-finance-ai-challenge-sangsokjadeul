package com.sangsok.api.pii;

/** tesseract TSV 한 행. 좌표는 이미지 픽셀 기준. */
public record OcrWord(int lineId,int left,int top,int width,int height,String text){}
