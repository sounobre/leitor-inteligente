package local.leitor.dictionary.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.PlatformTransactionManager;

class PublicDictionaryImporterTest {
    private static final URI SOURCE = URI.create("https://example.test/dictionary.jsonl");
    private static final String VERSION = "test-release";

    @Test
    void resumesFromThePersistedCheckpointInsteadOfReadingTheDatasetAgain() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        PublicDictionaryImporter.Checkpoint checkpoint = new PublicDictionaryImporter.Checkpoint(
            VERSION, SOURCE.toString(), 2, 1, null, "ERROR", "interrompida");
        PublicDictionaryImporter.Checkpoint completed = new PublicDictionaryImporter.Checkpoint(
            VERSION, SOURCE.toString(), 4, 1, 4L, "COMPLETED", null);
        doReturn(List.of(checkpoint), List.of(completed)).when(jdbc).query(
            anyString(), any(RowMapper.class), eq("wiktextract-english"));
        doReturn(2L).when(jdbc).queryForObject(anyString(), eq(Long.class), any(), any());

        AtomicInteger flushedRecords = new AtomicInteger();
        PublicDictionaryImporter importer = new PublicDictionaryImporter(jdbc, new ObjectMapper(), transactionManager) {
            @Override
            protected java.io.InputStream open(URI ignored) {
                return new ByteArrayInputStream("""
                    {"lang_code":"en","word":"old","pos":"noun","senses":[]}
                    {"lang_code":"en","word":"already-read","pos":"noun","senses":[]}
                    {"lang_code":"en","word":"new","pos":"noun","senses":[]}
                    {"lang_code":"en","word":"another","pos":"verb","senses":[]}
                    """.getBytes(StandardCharsets.UTF_8));
            }

            @Override
            protected int flush(List<RecordData> records, String version, String sourceUrl,
                                long lastLine, long skippedLines) {
                flushedRecords.addAndGet(records.size());
                return records.size();
            }
        };

        PublicDictionaryImporter.ImportReport report = importer.importDataset(SOURCE, VERSION);

        assertEquals(2, report.linesReadThisRun());
        assertEquals(4, report.totalLinesRead());
        assertEquals(2, flushedRecords.get());
    }
}