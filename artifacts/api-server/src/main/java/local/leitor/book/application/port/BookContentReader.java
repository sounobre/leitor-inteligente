package local.leitor.book.application.port;

import java.util.List;
import local.leitor.book.domain.Chapter;

public interface BookContentReader {
  List<Chapter> read(String data, String fileName);
}