package local.leitor.book.infra.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.BookStatus;
import local.leitor.book.domain.model.CefrLevel;
import local.leitor.book.domain.model.SourceType;
import local.leitor.engine.domain.model.StudyPlan;

@Component
public class BookRowMapper implements RowMapper<Book> {
    private final ObjectMapper json;

    public BookRowMapper(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public Book mapRow(ResultSet rs, int rowNum) throws SQLException {
        StudyPlan plan = StudyPlan.empty();
        String planJson = null;
        try {
            planJson = rs.getString("plan");
        } catch (SQLException ignored) {
            // Column might not be selected in summary queries
        }

        if (planJson != null && !planJson.isBlank()) {
            try {
                plan = json.readValue(planJson, StudyPlan.class);
            } catch (JsonProcessingException e) {
                plan = StudyPlan.empty();
            }
        }

        String content = "";
        try {
            content = rs.getString("content");
        } catch (SQLException ignored) {
            // Column might not be selected in summary queries
        }

        OffsetDateTime offsetDateTime = rs.getObject("updated_at", OffsetDateTime.class);
        Instant updatedAt = offsetDateTime != null ? offsetDateTime.toInstant() : Instant.now();

        return Book.reconstitute(
            BookId.of(rs.getString("id")),
            rs.getString("title"),
            rs.getString("author"),
            SourceType.fromString(rs.getString("source_type")),
            BookStatus.fromString(rs.getString("status")),
            CefrLevel.fromString(rs.getString("level")),
            rs.getInt("progress"),
            rs.getString("cover_color"),
            content,
            plan,
            Collections.emptyList(),
            updatedAt
        );
    }
}
