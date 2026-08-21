package local.leitor.dictionary.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PrivateDictionaryServiceTest {
    @Test
    void parsesInlineAndTwoLineDictionaryEntries() {
        var result = PrivateDictionaryService.parseEntries("""
            break the ice — quebrar o gelo; iniciar uma conversa
            look after
            cuidar de; tomar conta de
            Este é apenas um título de seção
            """);

        assertEquals(2, result.entries().size());
        assertEquals("break the ice", result.entries().getFirst().term());
        assertEquals("look after", result.entries().get(1).term());
        assertEquals("expressão", result.entries().getFirst().partOfSpeech());
    }

    @Test
    void limitsTheParsedTranslationToCardFriendlyLength() {
        String longDefinition = "x".repeat(200);
        var result = PrivateDictionaryService.parseEntries("turn up — " + longDefinition);

        assertEquals(1, result.entries().size());
        assertTrue(result.entries().getFirst().translation().endsWith("…"));
        assertTrue(result.entries().getFirst().translation().length() <= 160);
    }

    @Test
    void parsesTheHtmlTextShapeWithSectionMarkerTranslationAndExample() {
        var result = PrivateDictionaryService.parseEntries("""
            i
            icing: be the icing on the cake
            ser um benefício ou bônus a mais.
            First prize was good enough and the prize money was just icing on the cake! / O primeiro prêmio já estava bom.
            item: be an item
            estar envolvido em relação amorosa, estar junto (formando um casal).
            Have you heard? Dave and Francine are an item. / Você está sabendo?
            """);

        assertEquals(2, result.entries().size());
        assertEquals("be the icing on the cake", result.entries().getFirst().term());
        assertEquals("be the icing on the cake", result.entries().getFirst().definition());
        assertEquals("ser um benefício ou bônus a mais.", result.entries().getFirst().translation());
        assertEquals("be an item", result.entries().get(1).term());
    }

    @Test
    void promotesTheAlphabeticalHeadwordToTheActualExpression() {
        var result = PrivateDictionaryService.parseEntries("""
            amends: make amends (to some­one) (for something / for doing something)
            fazer algo para compensar, reparar um erro.
            Maybe John is just trying to make amends for what he did to Susan in the past. / Talvez o John esteja apenas tentando compensar o que fez.
            """);

        assertEquals(1, result.entries().size());
        assertEquals("make amends", result.entries().getFirst().term());
        assertEquals("make amends (to some­one) (for something / for doing something)", result.entries().getFirst().definition());
        assertEquals("fazer algo para compensar, reparar um erro.", result.entries().getFirst().translation());
    }
}