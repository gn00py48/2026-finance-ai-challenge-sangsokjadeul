package com.sangsok.api.pii;

import org.junit.jupiter.api.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class PiiRedactionTests {

    @Test void findsResidentAndAccountNumbersButKeepsDatesAndAmounts(){
        assertThat(PiiPatterns.sensitiveRanges("성명 홍길동 900101-1234567")).hasSize(1);
        assertThat(PiiPatterns.sensitiveRanges("계좌 110-234-567890 입니다")).hasSize(1);
        assertThat(PiiPatterns.sensitiveRanges("카드 1234-5678-9012-3456")).hasSize(1);
        assertThat(PiiPatterns.sensitiveRanges("기준일 2026-08-20")).isEmpty();
        assertThat(PiiPatterns.sensitiveRanges("잔액 12,000,000원")).isEmpty();
        assertThat(PiiPatterns.sensitiveRanges("계좌번호 9001011234567")).hasSize(1);
        assertThat(PiiPatterns.sensitiveRanges("계좌 12-3456-78")).hasSize(1);
    }

    @Test void ocrTsvParsingKeepsWordRowsOnly(){
        String tsv=String.join("\n",
                "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
                "4\t1\t1\t1\t1\t0\t0\t0\t100\t20\t-1\t",
                "5\t1\t1\t1\t1\t1\t10\t20\t80\t18\t92\t900101-1234567",
                "5\t1\t1\t1\t1\t2\t100\t20\t40\t18\t90\t   ");
        List<OcrWord> words=TesseractOcr.parse(tsv);
        assertThat(words).singleElement().satisfies(w->{
            assertThat(w.text()).isEqualTo("900101-1234567");
            assertThat(w.left()).isEqualTo(10);
            assertThat(w.width()).isEqualTo(80);
        });
    }

    @Test void redactedImageHidesResidentNumber(){
        Assumptions.assumeTrue(tesseractAvailable(),"tesseract 미설치 환경에서는 건너뛴다");
        BufferedImage image=render("Hong Gil Dong  900101-1234567");
        BufferedImage before=copy(image);
        BufferedImage after=new PiiRedactor(new TesseractOcr()).redact(image);
        assertThat(differs(before,after)).isTrue();
        assertThat(new TesseractOcr().words(after).stream().map(OcrWord::text)).noneMatch(t->t.contains("1234567"));
    }

    private static BufferedImage render(String text){
        BufferedImage image=new BufferedImage(900,120,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        g.setColor(Color.WHITE);g.fillRect(0,0,image.getWidth(),image.getHeight());
        g.setColor(Color.BLACK);g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,36));
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.drawString(text,20,70);g.dispose();
        return image;
    }
    private static BufferedImage copy(BufferedImage src){
        BufferedImage out=new BufferedImage(src.getWidth(),src.getHeight(),src.getType());
        Graphics2D g=out.createGraphics();g.drawImage(src,0,0,null);g.dispose();return out;
    }
    private static boolean differs(BufferedImage a,BufferedImage b){
        for(int y=0;y<a.getHeight();y++)for(int x=0;x<a.getWidth();x++)if(a.getRGB(x,y)!=b.getRGB(x,y))return true;
        return false;
    }
    private static boolean tesseractAvailable(){
        try{return new ProcessBuilder("tesseract","--version").start().waitFor()==0;}catch(Exception e){return false;}
    }
}
