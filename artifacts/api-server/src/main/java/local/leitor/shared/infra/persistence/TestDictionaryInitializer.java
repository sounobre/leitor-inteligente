package local.leitor.shared.infra.persistence;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class TestDictionaryInitializer {
    private final JdbcTemplate jdbc;
    public TestDictionaryInitializer(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @PostConstruct
    void ensureSchemaAndSeed() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS dictionary_test_sources (id TEXT PRIMARY KEY, title TEXT NOT NULL, publisher TEXT NOT NULL DEFAULT '', isbn TEXT NOT NULL DEFAULT '', source_type TEXT NOT NULL DEFAULT 'TEST', is_private BOOLEAN NOT NULL DEFAULT FALSE, entry_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        jdbc.execute("CREATE TABLE IF NOT EXISTS dictionary_test_entries (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES dictionary_test_sources(id) ON DELETE CASCADE, headword TEXT NOT NULL DEFAULT '', term TEXT NOT NULL, normalized_term TEXT NOT NULL, translation TEXT NOT NULL, part_of_speech TEXT NOT NULL DEFAULT 'vocabulário', usage_labels TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(source_id, normalized_term))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS dictionary_test_senses (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES dictionary_test_entries(id) ON DELETE CASCADE, definition TEXT NOT NULL, translation TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 1)");
        jdbc.execute("CREATE TABLE IF NOT EXISTS dictionary_test_examples (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES dictionary_test_entries(id) ON DELETE CASCADE, sentence TEXT NOT NULL, translation TEXT NOT NULL, explanation TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'ollama', model TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        jdbc.execute("CREATE TABLE IF NOT EXISTS dictionary_test_study_cards (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES dictionary_test_entries(id) ON DELETE CASCADE, example_id TEXT REFERENCES dictionary_test_examples(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_dictionary_test_entries_term ON dictionary_test_entries (normalized_term)");
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM dictionary_test_sources WHERE id = 'english-core-vocabulary'", Integer.class);
        if (count == null || count == 0) {
            jdbc.update("INSERT INTO dictionary_test_sources (id, title, publisher, source_type, is_private, entry_count) VALUES ('english-core-vocabulary', 'Vocabulário de teste', 'Leitor Inteligente', 'TEST', FALSE, ?)", SEED.trim().lines().count());
        }
        SEED.trim().lines().forEach(line -> {
            String[] parts = line.split("\\t", 3);
            String id = "test-" + parts[0].toLowerCase().replaceAll("[^a-z0-9]+", "-");
            jdbc.update("""
                INSERT INTO dictionary_test_entries (id, source_id, term, normalized_term, translation, part_of_speech)
                VALUES (?, 'english-core-vocabulary', ?, ?, ?, 'vocabulário')
                ON CONFLICT (source_id, normalized_term) DO UPDATE SET translation = EXCLUDED.translation
                """, id, parts[0], parts[0].toLowerCase(), parts[1]);
            jdbc.update("""
                INSERT INTO dictionary_test_senses (id, entry_id, definition, translation, position)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT (id) DO UPDATE SET translation = EXCLUDED.translation
                """, id + "-sense", id, parts[0], parts[1]);
        });
        jdbc.update("UPDATE dictionary_test_sources SET entry_count = ? WHERE id = 'english-core-vocabulary'", SEED.trim().lines().count());
    }

    private static final String SEED = """
a\tum, uma
abandon\tabandonar
ability\thabilidade, capacidade
able\tcapaz
abortion\taborto
about\tsobre, aproximadamente
above\tacima
abroad\tno exterior
absence\tausência
absolute\tabsoluto
absolutely\tabsolutamente
absorb\tabsorver
abuse\tabuso, abusar
academic\tacadêmico
accept\taceitar
access\tacesso, acessar
accident\tacidente
accompany\tacompanhar
accomplish\trealizar, concluir
according\tde acordo
account\tconta, relato
accurate\tpreciso
accuse\tacusar
achieve\talcançar
achievement\trealização
acid\tácido
acknowledge\treconhecer
acquire\tadquirir
across\tatravés de, do outro lado
act\tagir, ato
action\tação
active\tativo
activist\tativista
activity\tatividade
actor\tator
actress\tatriz
actual\treal
actually\tna verdade
ad\tanúncio
adapt\tadaptar
add\tadicionar
addition\tadição
additional\tadicional
address\tendereço, abordar
adequate\tadequado
adjust\tajustar
adjustment\tajuste
administration\tadministração
administrator\tadministrador
admire\tadmirar
admission\tadmissão
admit\tadmitir
adolescent\tadolescente
adopt\tadotar
adult\tadulto
advance\tavanço, avançar
advanced\tavançado
advantage\tvantagem
adventure\taventura
advertising\tpublicidade
advice\tconselho
advise\taconselhar
adviser\tconselheiro
advocate\tdefender, defensor
affair\tassunto, caso
affect\tafetar
afford\tpoder pagar
afraid\tcom medo
African\tafricano
African-American\tafro-americano
after\tdepois
afternoon\ttarde
again\tnovamente
against\tcontra
age\tidade, envelhecer
agency\tagência
agenda\tagenda
agent\tagente
aggressive\tagressivo
ago\thá, atrás
agree\tconcordar
agreement\tacordo
agricultural\tagrícola
ah\tah
ahead\tà frente
aid\tajuda, auxiliar
aide\tassessor
AIDS\tAIDS
aim\tobjetivo, visar
air\tar
aircraft\taeronave
airline\tcompanhia aérea
airport\taeroporto
album\tálbum
alcohol\tálcool
alive\tvivo
all\ttodo, todos
alliance\taliança
allow\tpermitir
ally\taliado
almost\tquase
alone\tsozinho
along\tao longo de
already\tjá
also\ttambém
alter\talterar
alternative\talternativa
although\tembora
always\tsempre
AM\tmanhã, AM
amazing\tincrível
American\tamericano
among\tentre
amount\tquantidade
analysis\tanálise
analyst\tanalista
analyze\tanalisar
ancient\tantigo
and\te
anger\traiva, irritar
angle\tângulo
angry\tzangado
animal\tanimal
anniversary\taniversário
announce\tanunciar
annual\tanual
another\toutro
answer\tresposta, responder
anticipate\tantecipar
anxiety\tansiedade
any\tqualquer
anybody\tqualquer pessoa
anymore\tmais, já não
anyone\tqualquer um
anything\tqualquer coisa
anyway\tde qualquer forma
anywhere\tem qualquer lugar
apart\tseparado
apartment\tapartamento
apparent\taparente
apparently\taparentemente
appeal\tapelo, recorrer
appear\taparecer
appearance\taparência
apple\tmaçã
application\taplicação, candidatura
apply\taplicar, candidatar-se
appoint\tnomear
appointment\tcompromisso
appreciate\tapreciar, valorizar
approach\tabordagem, aproximar-se
appropriate\tapropriado
approval\taprovação
approve\taprovar
approximately\taproximadamente
Arab\tárabe
architect\tarquiteto
area\tárea
argue\tdiscutir, argumentar
argument\targumento, discussão
arise\tsurgir
arm\tbraço, armar
armed\tarmado
army\texército
around\tao redor, aproximadamente
arrange\torganizar
arrangement\tarranjo, acordo
arrest\tprender, prisão
arrival\tchegada
arrive\tchegar
art\tarte
article\tartigo
artist\tartista
artistic\tartístico
""";
}