package com.sangsok.api.pii;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.*;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import java.util.List;

/**
 * 외부 AI로 보내기 전에 주민등록번호·계좌번호를 이미지에서 지운다.
 *
 * PDF는 페이지를 이미지로 다시 그린다. 텍스트 위에 검은 사각형만 덮으면 텍스트 레이어가 그대로 남아
 * 추출이 가능하므로 마스킹이 되지 않는다. 래스터화하면 원래 텍스트가 사라진다.
 */
@Component
public class PiiRedactor {
    private static final int DPI=200, MAX_PAGES=10, PADDING=2;
    private final TesseractOcr ocr;
    public PiiRedactor(TesseractOcr ocr){this.ocr=ocr;}

    /** 마스킹된 PNG 페이지들. 실패하면 예외를 던지며, 원본을 그대로 반환하지 않는다. */
    public List<byte[]> redactToPng(byte[] content,String mimeType){
        List<byte[]> pages=new ArrayList<>();
        for(BufferedImage image:rasterize(content,mimeType))pages.add(toPng(redact(image)));
        return pages;
    }

    private List<BufferedImage> rasterize(byte[] content,String mimeType){
        try{
            if(!"application/pdf".equals(mimeType)){
                BufferedImage image=ImageIO.read(new ByteArrayInputStream(content));
                if(image==null)throw new IllegalStateException("Unreadable image");
                return List.of(image);
            }
            try(PDDocument pdf=Loader.loadPDF(content)){
                PDFRenderer renderer=new PDFRenderer(pdf);
                List<BufferedImage> images=new ArrayList<>();
                for(int i=0;i<Math.min(pdf.getNumberOfPages(),MAX_PAGES);i++)images.add(renderer.renderImageWithDPI(i,DPI,ImageType.RGB));
                return images;
            }
        }catch(IOException e){throw new IllegalStateException("Failed to rasterize document",e);}
    }

    BufferedImage redact(BufferedImage image){
        Map<Integer,List<OcrWord>> lines=new LinkedHashMap<>();
        for(OcrWord w:ocr.words(image))lines.computeIfAbsent(w.lineId(),k->new ArrayList<>()).add(w);
        Graphics2D g=image.createGraphics();
        g.setColor(Color.BLACK);
        for(List<OcrWord> line:lines.values()){
            StringBuilder text=new StringBuilder();
            List<int[]> spans=new ArrayList<>();
            for(OcrWord w:line){
                if(text.length()>0)text.append(' ');
                spans.add(new int[]{text.length(),text.length()+w.text().length()});
                text.append(w.text());
            }
            List<int[]> sensitive=PiiPatterns.sensitiveRanges(text.toString());
            if(sensitive.isEmpty())continue;
            for(int i=0;i<line.size();i++){
                if(!PiiPatterns.overlaps(spans.get(i)[0],spans.get(i)[1],sensitive))continue;
                OcrWord w=line.get(i);
                g.fillRect(w.left()-PADDING,w.top()-PADDING,w.width()+PADDING*2,w.height()+PADDING*2);
            }
        }
        g.dispose();
        return image;
    }

    private static byte[] toPng(BufferedImage image){
        try(ByteArrayOutputStream out=new ByteArrayOutputStream()){ImageIO.write(image,"png",out);return out.toByteArray();}
        catch(IOException e){throw new IllegalStateException("Failed to encode redacted page",e);}
    }
}
