package com.sangsok.api.document;
import java.nio.file.Path;
public interface AiDocumentAnalyzer { AnalysisResult analyze(Path privateFile,String mimeType); }
