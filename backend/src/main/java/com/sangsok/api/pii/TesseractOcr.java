package com.sangsok.api.pii;

import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * tesseract를 서브프로세스로 호출해 단어별 좌표를 얻는다.
 * JNA 바인딩 대신 CLI를 쓰는 이유는 arm64 등 아키텍처마다 네이티브 라이브러리를 맞출 필요가 없기 때문이다.
 * 숫자 위치만 찾으면 되므로 한국어 학습 데이터는 필요하지 않다.
 */
@Component
public class TesseractOcr {
    private static final long TIMEOUT_SECONDS=60;

    public List<OcrWord> words(BufferedImage image){
        Path dir=null;
        try{
            dir=Files.createTempDirectory("ocr");
            Path input=dir.resolve("page.png");
            ImageIO.write(image,"png",input.toFile());
            Process p=new ProcessBuilder("tesseract",input.toString(),"stdout","--psm","6","-c","tessedit_create_tsv=1","tsv")
                    .redirectErrorStream(false).start();
            String tsv;
            try(InputStream in=p.getInputStream()){tsv=new String(in.readAllBytes(),StandardCharsets.UTF_8);}
            if(!p.waitFor(TIMEOUT_SECONDS,TimeUnit.SECONDS)){p.destroyForcibly();throw new IllegalStateException("OCR timed out");}
            if(p.exitValue()!=0)throw new IllegalStateException("tesseract exited with "+p.exitValue());
            return parse(tsv);
        }catch(IOException e){
            // 실행 파일이 없으면 여기로 온다. 마스킹 없이 원본을 외부로 보내지 않도록 실패시킨다.
            throw new IllegalStateException("OCR unavailable",e);
        }catch(InterruptedException e){
            Thread.currentThread().interrupt();throw new IllegalStateException("OCR interrupted",e);
        }finally{
            if(dir!=null)deleteQuietly(dir);
        }
    }

    static List<OcrWord> parse(String tsv){
        List<OcrWord> words=new ArrayList<>();
        String[] lines=tsv.split("\n");
        for(int i=1;i<lines.length;i++){
            String[] c=lines[i].split("\t",-1);
            if(c.length<12||!"5".equals(c[0]))continue; // level 5 = word
            String text=c[11].trim();
            if(text.isEmpty())continue;
            int lineId=Objects.hash(c[2],c[3],c[4]); // block, paragraph, line
            words.add(new OcrWord(lineId,Integer.parseInt(c[6]),Integer.parseInt(c[7]),Integer.parseInt(c[8]),Integer.parseInt(c[9]),text));
        }
        return words;
    }

    private static void deleteQuietly(Path dir){
        try(var paths=Files.walk(dir)){paths.sorted(Comparator.reverseOrder()).forEach(p->{try{Files.deleteIfExists(p);}catch(IOException ignored){}});}
        catch(IOException ignored){}
    }
}
