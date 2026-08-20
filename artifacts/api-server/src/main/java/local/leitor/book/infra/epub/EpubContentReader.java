package local.leitor.book.infra.epub;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import local.leitor.book.application.port.BookContentReader;
import local.leitor.book.domain.Chapter;

@Component
public class EpubContentReader implements BookContentReader {
  @Override
  public List<Chapter> read(String dataUrl, String fileName) {
    try {
      if (fileName != null && !fileName.toLowerCase().endsWith(".epub")) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .epub files are supported");
      }
      String encoded = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
      byte[] bytes = Base64.getDecoder().decode(encoded);
      if (bytes.length == 0 || bytes.length > 50 * 1024 * 1024) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The EPUB must be smaller than 50 MB");
      }
      Path temporary = Files.createTempFile("leitor-", ".epub");
      Files.write(temporary, bytes);
      try (ZipFile zip = new ZipFile(temporary.toFile())) {
        String rootFile = "OEBPS/content.opf";
        ZipEntry container = zip.getEntry("META-INF/container.xml");
        if (container != null) {
          Document containerDoc = xml(zip.getInputStream(container));
          NodeList roots = containerDoc.getElementsByTagNameNS("*", "rootfile");
          if (roots.getLength() > 0) {
            rootFile = ((Element) roots.item(0)).getAttribute("full-path");
          }
        }
        ZipEntry opf = zip.getEntry(rootFile);
        if (opf == null) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid EPUB: package document missing");
        }
        Document packageDoc = xml(zip.getInputStream(opf));
        Map<String, String> manifests = new HashMap<>();
        NodeList items = packageDoc.getElementsByTagNameNS("*", "item");
        String basePath = rootFile.contains("/") ? rootFile.substring(0, rootFile.lastIndexOf('/') + 1) : "";
        for (int i = 0; i < items.getLength(); i++) {
          Element item = (Element) items.item(i);
          manifests.put(item.getAttribute("id"), resolvePath(basePath, item.getAttribute("href")));
        }
        List<Chapter> result = new ArrayList<>();
        NodeList spine = packageDoc.getElementsByTagNameNS("*", "itemref");
        for (int i = 0; i < spine.getLength(); i++) {
          String path = manifests.get(((Element) spine.item(i)).getAttribute("idref"));
          if (path == null) continue;
          ZipEntry chapterEntry = zip.getEntry(path);
          if (chapterEntry == null) continue;
          String chapterText = htmlText(new String(
              zip.getInputStream(chapterEntry).readAllBytes(), StandardCharsets.UTF_8
          ));
          if (!chapterText.isBlank()) {
            result.add(new Chapter(
                UUID.randomUUID().toString(),
                result.size() + 1,
                chapterTitle(chapterText, path),
                chapterText,
                countWords(chapterText)
            ));
          }
        }
        return result;
      } finally {
        Files.deleteIfExists(temporary);
      }
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Could not read this EPUB. Check that it is a valid, unencrypted EPUB.",
          exception
      );
    }
  }

  private Document xml(InputStream input) throws Exception {
    var factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    return factory.newDocumentBuilder().parse(input);
  }

  private String resolvePath(String base, String href) {
    return java.nio.file.Paths.get(base, URLDecoder.decode(href.split("#")[0], StandardCharsets.UTF_8))
        .normalize().toString().replace('\\', '/');
  }

  private String htmlText(String html) {
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

  private String chapterTitle(String text, String path) {
    String first = text.split("\\n", 2)[0].trim();
    return first.length() > 100 ? path.substring(path.lastIndexOf('/') + 1) : first;
  }

  private int countWords(String text) {
    return text.isBlank() ? 0 : text.trim().split("\\s+").length;
  }
}