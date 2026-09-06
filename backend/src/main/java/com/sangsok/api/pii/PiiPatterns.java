package com.sangsok.api.pii;

import java.util.*;
import java.util.regex.*;

/** OCR로 읽은 한 줄에서 주민등록번호·계좌번호·카드번호로 보이는 구간을 찾는다. */
public final class PiiPatterns {
    private PiiPatterns(){}

    // 숫자 묶음이 하이픈·공백으로 이어진 형태(계좌·카드·주민번호) 또는 붙어 있는 긴 숫자열.
    private static final Pattern CANDIDATE=Pattern.compile("\\d[\\d\\-\\s]{6,}\\d");
    private static final Pattern LABELED_ACCOUNT=Pattern.compile("계좌(?:번호)?\\s*[:：]?\\s*(\\d[\\d\\-\\s]{5,}\\d)");
    // 날짜는 제외한다. 기준일은 분석에 필요한 값이고 개인 식별정보가 아니다.
    private static final Pattern DATE=Pattern.compile("^\\d{4}[-.\\s]\\d{1,2}[-.\\s]\\d{1,2}$");
    // ponytail: 자릿수만 본다. 콤마 없는 10자리 이상 금액도 함께 가려질 수 있으나, 덜 가리는 쪽보다 낫다.
    private static final int MIN_DIGITS=10;

    /** 한 줄 문자열에서 가려야 할 [start,end) 구간들. */
    public static List<int[]> sensitiveRanges(String line){
        List<int[]> ranges=new ArrayList<>();
        Matcher account=LABELED_ACCOUNT.matcher(line);
        while(account.find())ranges.add(new int[]{account.start(1),account.end(1)});
        Matcher m=CANDIDATE.matcher(line);
        while(m.find()){
            String token=m.group().trim();
            if(DATE.matcher(token).matches())continue;
            if(token.chars().filter(Character::isDigit).count()<MIN_DIGITS)continue;
            if(!overlaps(m.start(),m.end(),ranges))ranges.add(new int[]{m.start(),m.end()});
        }
        return ranges;
    }

    public static boolean overlaps(int start,int end,List<int[]> ranges){
        for(int[] r:ranges)if(start<r[1]&&r[0]<end)return true;
        return false;
    }
}
