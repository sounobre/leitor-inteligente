package local.leitor.book.application.port;

import java.util.List;
import local.leitor.book.domain.Book;
import local.leitor.book.domain.Chapter;

public interface BookRepository {
  List<Book> findAll();

  List<Book> findReady();

  Book findById(String id);

  List<Chapter> findChapters(String bookId);

  Object findPlan(String bookId);

  Book save(Book book, String content, String plan, List<Chapter> chapters);
}