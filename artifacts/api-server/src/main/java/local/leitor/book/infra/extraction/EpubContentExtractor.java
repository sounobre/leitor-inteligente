package local.leitor.book.infra.extraction;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import local.leitor.book.application.port.out.BookContentExtractorPort;
import local.leitor.book.domain.exception.InvalidBookContentException;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.SourceType;
import local.leitor.shared.domain.BusinessValidationException;

@Component
public class EpubContentExtractor implements BookContentExtractorPort {
    private static final int MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

    @Override
    public boolean supports(SourceType sourceType) {
        return sourceType == SourceType.EPUB;
    }

    @Override
    public List<Chapter> extract(String rawContent, String fileName) {
        if (fileName != null && !fileName.toLowerCase().endsWith(".epub")) {
            throw new BusinessValidationException("Only .epub files are supported for EPUB source type");
        }

        byte[] bytes = decodeBase64Content(rawContent);
        if (bytes.length == 0) {
            throw new BusinessValidationException("EPUB file content is empty");
        }
        if (bytes.length > MAX_FILE_SIZE_BYTES) {
            throw new BusinessValidationException("The EPUB must be smaller than 50 MB");
        }

        Path temporary = null;
        try {
            temporary = Files.createTempFile("leitor-", ".epub");
            Files.write(temporary, bytes);

            try (ZipFile zip = new ZipFile(temporary.toFile())) {
                String rootFile = findRootOpfPath(zip);
                ZipEntry opf = zip.getEntry(rootFile);
                if (opf == null) {
                    throw new InvalidBookContentException("Invalid EPUB: package document (OPF) missing");
                }

                Document packageDoc = parseXml(zip.getInputStream(opf));
                Map<String, String> manifests = buildManifestMap(packageDoc, rootFile);

                List<Chapter> chapters = new ArrayList<>();
                NodeList spine = packageDoc.getElementsByTagNameNS("*", "itemref");
                for (int i = 0; i < spine.getLength(); i++) {
                    Element itemRef = (Element) spine.item(i);
                    String path = manifests.get(itemRef.getAttribute("idref"));
                    if (path == null) continue;

                    ZipEntry chapterEntry = zip.getEntry(path);
                    if (chapterEntry == null) continue;

                    String chapterText = extractHtmlText(new String(
                        zip.getInputStream(chapterEntry).readAllBytes(), StandardCharsets.UTF_8
                    ));

                    if (!chapterText.isBlank()) {
                        int position = chapters.size() + 1;
                        String title = extractChapterTitle(chapterText, path);
                        chapters.add(new Chapter(
                            UUID.randomUUID().toString(),
                            position,
                            title,
                            chapterText,
                            Chapter.calculateWordCount(chapterText)
                        ));
                    }
                }

                if (chapters.isEmpty()) {
                    throw new InvalidBookContentException("The EPUB did not contain readable chapters");
                }

                return chapters;
            }
        } catch (BusinessValidationException | InvalidBookContentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new InvalidBookContentException("Could not read this EPUB. Check that it is a valid, unencrypted EPUB.", ex);
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (Exception ignored) {
                }
            }
        }
    }

    private byte[] decodeBase64Content(String rawContent) {
        try {
            String encoded = rawContent.contains(",") ? rawContent.substring(rawContent.indexOf(',') + 1) : rawContent;
            return Base64.getDecoder().decode(encoded.trim());
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException("Invalid Base64 encoded EPUB content");
        }
    }

    private String findRootOpfPath(ZipFile zip) throws Exception {
        String defaultPath = "OEBPS/content.opf";
        ZipEntry container = zip.getEntry("META-INF/container.xml");
        if (container != null) {
            Document containerDoc = parseXml(zip.getInputStream(container));
            NodeList roots = containerDoc.getElementsByTagNameNS("*", "rootfile");
            if (roots.getLength() > 0) {
                return ((Element) roots.item(0)).getAttribute("full-path");
            }
        }
        return defaultPath;
    }

    private Map<String, String> buildManifestMap(Document packageDoc, String rootFile) {
        Map<String, String> manifests = new HashMap<>();
        NodeList items = packageDoc.getElementsByTagNameNS("*", "item");
        String basePath = rootFile.contains("/") ? rootFile.substring(0, rootFile.lastIndexOf('/') + 1) : "";
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            manifests.put(item.getAttribute("id"), resolvePath(basePath, item.getAttribute("href")));
        }
        return manifests;
    }

    private Document parseXml(InputStream input) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        return factory.newDocumentBuilder().parse(input);
    }

    private String resolvePath(String base, String href) {
        return java.nio.file.Paths.get(base, URLDecoder.decode(href.split("#")[0], StandardCharsets.UTF_8))
            .normalize().toString().replace('\\', '/');
    }

    private String extractHtmlText(String html) {
        String withBreaks = html.replaceAll(
            "(?i)<\\s*(br|/p|/div|/h[1-6]|/li|/section|/article)\\s*[^>]*>", "\n"
        );
        String withoutTags = withBreaks.replaceAll("(?s)<[^>]*>", " ");
        return withoutTags.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replaceAll("[ \\t\\x0B\\f\\r]+", " ")
            .replaceAll("\\n\\s*\\n+", "\n\n")
            .trim();
    }

    private String extractChapterTitle(String text, String path) {
        String firstLine = text.split("\\n", 2)[0].trim();
        return firstLine.length() > 100 ? path.substring(path.lastIndexOf('/') + 1) : firstLine;
    }
}
