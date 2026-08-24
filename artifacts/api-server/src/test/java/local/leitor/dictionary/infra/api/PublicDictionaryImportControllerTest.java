package local.leitor.dictionary.infra.api;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import local.leitor.dictionary.application.PublicDictionaryImporter;

@WebMvcTest(PublicDictionaryImportController.class)
class PublicDictionaryImportControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockBean
    private PublicDictionaryImporter importer;

    @Autowired
    private PublicDictionaryImportController controller;

    @Test
    void exposesRunningCheckpoint() throws Exception {
        assertStatus("RUNNING", 420, 12, 800L, 3, null, true);
    }

    @Test
    void exposesPausedCheckpointAfterAProcessRestart() throws Exception {
        assertStatus("PAUSED", 420, 12, 800L, 3, null, false);
    }

    @Test
    void exposesImportErrorAndItsMessage() throws Exception {
        assertStatus("ERROR", 420, 12, 800L, 3, "falha na fonte", false);
    }

    @Test
    void exposesCompletedCheckpoint() throws Exception {
        assertStatus("COMPLETED", 800, 25, 800L, 3, null, false);
    }

    private void assertStatus(String state, long lines, long entries, Long total, long skipped,
                              String error, boolean running) throws Exception {
        ReflectionTestUtils.setField(controller, "running", new java.util.concurrent.atomic.AtomicBoolean(running));
        given(importer.status()).willReturn(new PublicDictionaryImporter.ImportStatus(
            state, "test-release", lines, entries, total, skipped, error));

        var request = mvc.perform(get("/api/public-dictionary/import/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(state))
            .andExpect(jsonPath("$.running").value(running))
            .andExpect(jsonPath("$.version").value("test-release"))
            .andExpect(jsonPath("$.linesProcessed").value(lines))
            .andExpect(jsonPath("$.importedEntries").value(entries))
            .andExpect(jsonPath("$.totalLines").value(total))
            .andExpect(jsonPath("$.skippedLines").value(skipped));
        if (error != null) request.andExpect(jsonPath("$.errorMessage").value(error));
    }
}