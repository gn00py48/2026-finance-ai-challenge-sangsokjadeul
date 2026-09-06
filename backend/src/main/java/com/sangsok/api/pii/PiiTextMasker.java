package com.sangsok.api.pii;

import org.springframework.stereotype.Component;
import java.util.regex.*;

/** 화면용 자유 텍스트와 AI 질문에 섞인 식별번호를 저장·전송 전에 가린다. */
@Component
public class PiiTextMasker {
    private static final Pattern RESIDENT=Pattern.compile("(?<!\\d)(\\d{6})[-\\s]?([1-8]\\d{6})(?!\\d)");
    private static final Pattern CARD=Pattern.compile("(?<!\\d)(\\d{4})[-\\s](\\d{4})[-\\s](\\d{4})[-\\s](\\d{4})(?!\\d)");
    private static final Pattern PHONE=Pattern.compile("(?<!\\d)(01\\d)[-\\s](\\d{3,4})[-\\s](\\d{4})(?!\\d)");
    private static final Pattern ACCOUNT=Pattern.compile("(계좌(?:번호)?\\s*[:：]?\\s*)(\\d[\\d\\s-]{5,}\\d)");

    public String mask(String value){
        if(value==null||value.isBlank())return value;
        String masked=RESIDENT.matcher(value).replaceAll("$1-*******");
        masked=CARD.matcher(masked).replaceAll("$1-****-****-$4");
        masked=PHONE.matcher(masked).replaceAll("$1-****-$3");
        Matcher matcher=ACCOUNT.matcher(masked);StringBuffer out=new StringBuffer();
        while(matcher.find())matcher.appendReplacement(out,Matcher.quoteReplacement(matcher.group(1)+maskExceptLast(matcher.group(2),4)));
        matcher.appendTail(out);return out.toString();
    }

    private String maskExceptLast(String value,int visible){
        int digits=(int)value.chars().filter(Character::isDigit).count(),hide=Math.max(0,digits-visible);
        StringBuilder out=new StringBuilder(value.length());
        for(char c:value.toCharArray())out.append(Character.isDigit(c)&&hide-->0?'*':c);
        return out.toString();
    }
}
