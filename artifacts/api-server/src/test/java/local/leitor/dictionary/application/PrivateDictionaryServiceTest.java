package local.leitor.dictionary.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
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
        assertEquals("amends", result.entries().getFirst().headword());
        assertEquals("make amends (to some­one) (for something / for doing something)", result.entries().getFirst().definition());
        assertEquals("fazer algo para compensar, reparar um erro.", result.entries().getFirst().translation());
    }

    @Test
    void keepsUsageLabelsSeparateFromTranslationAndSkipsExampleBlocks() {
        var result = PrivateDictionaryService.parseEntries("""
            back: be on someone’s back
            inf
            criticar ou importunar alguém constantemente, pegar no pé de alguém.
            Jason left his old job because his boss was always on his back
            / O Jason largou o antigo emprego porque o chefe sempre pegava no seu pé.
            back-seat: be a back-seat driver
            1
            ser um passageiro que insiste em dizer ao motorista como dirigir.
            I hate back-seat drivers
            / Eu odeio gente que insiste em dizer como devo dirigir.
            2
            ser alguém que quer estar no controle de algo cuja responsabilidade não é sua, ser palpiteiro.
            I hate it when I’m working on a project and too many back-seat drivers gather around me
            / Eu odeio quando estou trabalhando num projeto e muitos palpiteiros se juntam ao meu redor.
            """);

        assertEquals(2, result.entries().size());
        var back = result.entries().getFirst();
        assertEquals("be on someone’s back", back.term());
        assertEquals(List.of("inf"), back.usageLabels());
        assertEquals(1, back.senses().size());
        assertEquals("criticar ou importunar alguém constantemente, pegar no pé de alguém.", back.translation());

        var backSeat = result.entries().get(1);
        assertEquals("be a back-seat driver", backSeat.term());
        assertEquals(2, backSeat.senses().size());
        assertEquals(1, backSeat.senses().getFirst().position());
        assertEquals(2, backSeat.senses().get(1).position());
        assertEquals("ser um passageiro que insiste em dizer ao motorista como dirigir.", backSeat.senses().getFirst().translation());
        assertEquals("ser alguém que quer estar no controle de algo cuja responsabilidade não é sua, ser palpiteiro.", backSeat.senses().get(1).translation());
    }

    @Test
    void ignoresTheDictionaryUsageLegendAsAnEntry() {
        var result = PrivateDictionaryService.parseEntries("""
            Informações essenciais sobre a expressão idiomática são registradas em forma abreviada:
            Amer inglês americano
            Brit inglês britânico
            back: be on someone’s back
            inf
            criticar ou importunar alguém constantemente.
            """);

        assertEquals(1, result.entries().size());
        assertEquals("be on someone’s back", result.entries().getFirst().term());
        assertEquals(List.of("inf"), result.entries().getFirst().usageLabels());
    }

    @Test
    void recognizesPhrasalVerbUsageLabels() {
        var result = PrivateDictionaryService.parseEntries("""
            break down: break down
            vt+vi
            gír
            parar de funcionar, falhar; desmontar.
            The old car broke down. / O carro velho parou de funcionar.
            """);

        assertEquals(1, result.entries().size());
        assertEquals("break down", result.entries().getFirst().term());
        assertEquals(List.of("gír", "vt+vi"), result.entries().getFirst().usageLabels());
        assertEquals("parar de funcionar, falhar; desmontar.", result.entries().getFirst().translation());
    }
}