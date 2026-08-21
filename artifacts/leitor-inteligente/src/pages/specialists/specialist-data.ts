export type StudyLevel = 'Essencial' | 'Aprofundamento' | 'Desafio';
export type ReviewStatus = 'Pendente' | 'Estudado' | 'Dominado';

export interface SpecialistColumn { key: string; label: string; }

export interface SpecialistItem {
  id: string;
  term: string;
  translation: string;
  example: string;
  explanation: string;
  level: StudyLevel;
  details: Record<string, string>;
}

export interface SpecialistDefinition {
  id: string;
  title: string;
  summary: string;
  itemNoun: string;
  columns: SpecialistColumn[];
  items: SpecialistItem[];
}

const entry = (
  id: string, term: string, translation: string, example: string, explanation: string,
  level: StudyLevel, details: Record<string, string>,
): SpecialistItem => ({ id, term, translation, example, explanation, level, details });

export const specialistsData: SpecialistDefinition[] = [
  {
    id: 'vocabulary', title: 'Vocabulário', itemNoun: 'palavras',
    summary: 'Palavras importantes para reconhecer significado, classe gramatical e relações de sentido durante a leitura.',
    columns: [{ key: 'classe', label: 'Classe' }, { key: 'uso', label: 'Uso em contexto' }],
    items: [
      entry('vocabulary-realm', 'realm', 'reino, domínio', 'The old realm was protected by mountains and a narrow sea.', 'Pode ser um território governado, mas também um domínio abstrato, como “the realm of memory”.', 'Essencial', { classe: 'Substantivo', uso: 'Mundo, poder e território' }),
      entry('vocabulary-glimpse', 'glimpse', 'vislumbre; breve olhada', 'She caught a glimpse of a lantern between the trees.', 'Indica algo percebido por pouco tempo ou apenas parcialmente.', 'Aprofundamento', { classe: 'Substantivo / verbo', uso: 'Percepção rápida' }),
      entry('vocabulary-kin', 'kin', 'parentes; pessoas do mesmo povo', 'He returned to his kin after many years away.', 'É mais literário que “family” e pode indicar laço de sangue ou pertencimento a um grupo.', 'Aprofundamento', { classe: 'Substantivo coletivo', uso: 'Família e pertencimento' }),
      entry('vocabulary-hush', 'hush', 'silêncio; mandar calar', 'A hush fell over the audience when the lights went out.', 'Como substantivo, indica um silêncio repentino; como verbo ou interjeição, pode pedir silêncio.', 'Essencial', { classe: 'Substantivo / verbo', uso: 'Silêncio repentino' }),
      entry('vocabulary-looming', 'looming', 'iminente; que se aproxima de modo ameaçador', 'The looming deadline forced the team to review its priorities.', 'Pode descrever algo que parece grande ou ameaçador por estar prestes a acontecer.', 'Aprofundamento', { classe: 'Adjetivo / particípio', uso: 'Ameaça ou urgência' }),
      entry('vocabulary-resilient', 'resilient', 'resiliente; capaz de se recuperar', 'The resilient community rebuilt the bridge after the storm.', 'Descreve quem ou o que consegue suportar dificuldades e se recuperar delas.', 'Desafio', { classe: 'Adjetivo', uso: 'Resistência e recuperação' }),
    ],
  },
  {
    id: 'phrasal-verbs', title: 'Phrasal verbs', itemNoun: 'phrasal verbs',
    summary: 'Verbos com partículas que mudam de sentido e merecem ser estudados como uma unidade.',
    columns: [{ key: 'separabilidade', label: 'Separabilidade' }, { key: 'sentido', label: 'Sentido no contexto' }],
    items: [
      entry('phrasal-set-out', 'set out', 'partir; começar uma jornada', 'They set out before sunrise to cross the valley.', 'Use para o início de uma viagem, tarefa ou tentativa.', 'Essencial', { separabilidade: 'Inseparável', sentido: 'Iniciar deslocamento ou plano' }),
      entry('phrasal-give-in', 'give in', 'ceder', 'After hours of debate, the council finally gave in.', 'Indica aceitar algo depois de resistência ou pressão.', 'Aprofundamento', { separabilidade: 'Inseparável', sentido: 'Parar de resistir' }),
      entry('phrasal-fend-off', 'fend off', 'repelir; afastar', 'The guards fended off the wolves with burning branches.', 'Usado para afastar fisicamente ou evitar uma ameaça.', 'Desafio', { separabilidade: 'Separável', sentido: 'Impedir aproximação ou efeito' }),
      entry('phrasal-carry-on', 'carry on', 'continuar', 'Despite the interruption, the speaker carried on with the explanation.', 'Indica que uma ação prossegue, mesmo depois de uma pausa ou dificuldade.', 'Essencial', { separabilidade: 'Inseparável', sentido: 'Dar continuidade' }),
      entry('phrasal-look-into', 'look into', 'investigar; examinar', 'The committee promised to look into the missing records.', 'Use quando alguém examina uma questão para descobrir mais informações.', 'Aprofundamento', { separabilidade: 'Inseparável', sentido: 'Investigar um assunto' }),
      entry('phrasal-wear-out', 'wear out', 'desgastar; deixar exausto', 'The long climb wore out everyone in the group.', 'Pode indicar desgaste físico de um objeto ou cansaço extremo de uma pessoa.', 'Desafio', { separabilidade: 'Separável', sentido: 'Causar desgaste ou exaustão' }),
    ],
  },
  {
    id: 'idioms', title: 'Expressões idiomáticas', itemNoun: 'expressões',
    summary: 'Expressões cujo sentido natural vai além da tradução palavra por palavra.',
    columns: [{ key: 'sentidoNatural', label: 'Sentido natural' }, { key: 'registro', label: 'Registro' }],
    items: [
      entry('idiom-blessing', 'a blessing in disguise', 'algo ruim que acaba trazendo benefício', 'Losing the map was a blessing in disguise: they found a safer road.', 'A expressão não fala de uma bênção literal; destaca um benefício percebido depois.', 'Aprofundamento', { sentidoNatural: 'Benefício escondido em um revés', registro: 'Neutro' }),
      entry('idiom-over-head', 'be in over your head', 'estar em situação difícil demais', 'She realized she was in over her head when the spell began to change.', 'Use quando a pessoa assumiu algo que ultrapassa sua capacidade ou experiência.', 'Aprofundamento', { sentidoNatural: 'Enfrentar algo maior do que consegue lidar', registro: 'Informal' }),
      entry('idiom-on-edge', 'be on edge', 'estar tenso, inquieto', 'Everyone was on edge after the distant bells stopped ringing.', 'Descreve nervosismo persistente, não uma posição física.', 'Essencial', { sentidoNatural: 'Estar sob tensão', registro: 'Neutro' }),
      entry('idiom-break-the-ice', 'break the ice', 'quebrar o gelo; iniciar uma conversa', 'A simple question helped break the ice at the unfamiliar gathering.', 'Refere-se a tornar uma situação social menos tensa, não a quebrar gelo de verdade.', 'Essencial', { sentidoNatural: 'Diminuir a tensão inicial', registro: 'Informal' }),
      entry('idiom-read-between-lines', 'read between the lines', 'ler nas entrelinhas', 'You have to read between the lines to understand the polite refusal.', 'Indica perceber uma mensagem implícita além das palavras explícitas.', 'Aprofundamento', { sentidoNatural: 'Inferir o que não foi dito diretamente', registro: 'Neutro' }),
      entry('idiom-storm-in-teacup', 'a storm in a teacup', 'tempestade em copo d’água', 'The disagreement was just a storm in a teacup and soon everyone laughed.', 'Descreve um conflito exagerado em relação à sua importância real.', 'Desafio', { sentidoNatural: 'Grande agitação por um problema pequeno', registro: 'Britânico / informal' }),
    ],
  },
  {
    id: 'collocations', title: 'Collocations', itemNoun: 'combinações',
    summary: 'Combinações naturais de palavras que aparecem juntas com frequência no inglês.',
    columns: [{ key: 'padrao', label: 'Padrão' }, { key: 'palavraChave', label: 'Palavra-chave' }],
    items: [
      entry('collocation-oath', 'swear an oath', 'fazer um juramento', 'Before the gate opened, each guard had to swear an oath.', 'O inglês prefere esta combinação a alternativas literais como “make an oath”.', 'Essencial', { padrao: 'Verbo + substantivo', palavraChave: 'oath' }),
      entry('collocation-silence', 'heavy silence', 'silêncio pesado', 'A heavy silence settled over the room after the message arrived.', '“Heavy” transmite tensão emocional ou desconforto no ambiente.', 'Aprofundamento', { padrao: 'Adjetivo + substantivo', palavraChave: 'silence' }),
      entry('collocation-power', 'wield power', 'exercer poder', 'Few people knew how to wield power without fear.', '“Wield” também é usado para empunhar uma arma; aqui trata poder como algo que se maneja.', 'Desafio', { padrao: 'Verbo + substantivo', palavraChave: 'power' }),
      entry('collocation-decision', 'make a decision', 'tomar uma decisão', 'The group had to make a decision before the tide changed.', '“Make” é o verbo mais natural nessa combinação, e não uma tradução direta de “take”.', 'Essencial', { padrao: 'Verbo + substantivo', palavraChave: 'decision' }),
      entry('collocation-deeply-concerned', 'deeply concerned', 'profundamente preocupado', 'The caretaker was deeply concerned about the damaged roof.', '“Deeply” combina naturalmente com estados e sentimentos fortes, dando mais intensidade.', 'Aprofundamento', { padrao: 'Advérbio + adjetivo', palavraChave: 'concerned' }),
      entry('collocation-meet-demand', 'meet a demand', 'atender a uma demanda', 'The small workshop struggled to meet the sudden demand for repairs.', 'A combinação indica conseguir satisfazer uma necessidade ou expectativa.', 'Desafio', { padrao: 'Verbo + substantivo', palavraChave: 'demand' }),
    ],
  },
  {
    id: 'language-chunks', title: 'Blocos de linguagem', itemNoun: 'estruturas',
    summary: 'Estruturas prontas que ajudam a compreender uma frase inteira sem traduzir palavra por palavra.',
    columns: [{ key: 'funcao', label: 'Função' }, { key: 'completar', label: 'Como completar' }],
    items: [
      entry('chunk-no-sign', 'there was no sign of…', 'não havia sinal de…', 'There was no sign of the messenger by nightfall.', 'Apresenta uma ausência que o contexto pode tornar importante.', 'Essencial', { funcao: 'Descrever ausência', completar: 'Pessoa, objeto ou acontecimento' }),
      entry('chunk-edge', 'at the edge of…', 'na beira de…', 'A small house stood at the edge of the forest.', 'Marca limite espacial e também pode ser usado de modo figurado.', 'Essencial', { funcao: 'Localizar no espaço', completar: 'Lugar, área ou limite' }),
      entry('chunk-only-to', 'only to find…', 'apenas para descobrir…', 'They opened the chest only to find a handful of dust.', 'Mostra resultado inesperado, frequentemente frustrante.', 'Aprofundamento', { funcao: 'Indicar surpresa', completar: 'Verbo no infinitivo' }),
      entry('chunk-it-was-not-until', 'it was not until…that…', 'foi somente…que…', 'It was not until dusk that the path became visible.', 'Dá ênfase ao momento em que algo finalmente acontece ou é percebido.', 'Aprofundamento', { funcao: 'Enfatizar momento', completar: 'Tempo + oração principal' }),
      entry('chunk-as-if', 'as if…', 'como se…', 'He spoke as if he had rehearsed every answer.', 'Introduz uma comparação ou impressão; o tempo verbal pode sugerir hipótese ou distância.', 'Desafio', { funcao: 'Criar comparação', completar: 'Oração com sujeito e verbo' }),
      entry('chunk-in-the-distance', 'in the distance…', 'ao longe…', 'In the distance, a line of lights marked the harbor.', 'Situa um elemento afastado no espaço e ajuda a organizar a imagem descrita.', 'Essencial', { funcao: 'Ampliar o cenário', completar: 'Elemento visível ou audível' }),
    ],
  },
  {
    id: 'narrative-verbs', title: 'Verbos narrativos', itemNoun: 'verbos',
    summary: 'Verbos que mostram movimento, fala, percepção e reação com mais nuance do que opções genéricas.',
    columns: [{ key: 'nuance', label: 'Nuance' }, { key: 'acao', label: 'Ação sugerida' }],
    items: [
      entry('narrative-loom', 'loom', 'surgir de modo ameaçador', 'A dark tower loomed above the riverbank.', 'Sugere algo grande, próximo ou inevitável, geralmente com tom de ameaça.', 'Aprofundamento', { nuance: 'Presença crescente', acao: 'Aparecer imponente' }),
      entry('narrative-mutter', 'mutter', 'resmungar; falar baixo', '“We should leave,” he muttered without looking up.', 'Mostra fala baixa, pouco clara ou contrariada.', 'Essencial', { nuance: 'Fala contida', acao: 'Dizer em voz baixa' }),
      entry('narrative-beckon', 'beckon', 'fazer sinal para chamar', 'The guide beckoned them toward the hidden door.', 'Normalmente envolve um gesto que convida alguém a se aproximar ou seguir.', 'Desafio', { nuance: 'Convite silencioso', acao: 'Chamar com gesto' }),
      entry('narrative-stammer', 'stammer', 'gaguejar', 'She stammered an apology when she realized the mistake.', 'Mostra uma fala interrompida ou hesitante, geralmente ligada a nervosismo ou emoção.', 'Essencial', { nuance: 'Hesitação na fala', acao: 'Falar com interrupções' }),
      entry('narrative-scan', 'scan', 'examinar rapidamente com os olhos', 'He scanned the noticeboard for a familiar name.', 'Indica olhar de modo rápido e sistemático em busca de uma informação.', 'Aprofundamento', { nuance: 'Busca visual', acao: 'Percorrer com os olhos' }),
      entry('narrative-recoil', 'recoil', 'recuar bruscamente', 'The horse recoiled from the sudden flash of light.', 'Sugere um recuo involuntário causado por medo, surpresa ou repulsa.', 'Desafio', { nuance: 'Reação instintiva', acao: 'Afastar-se de repente' }),
    ],
  },
  {
    id: 'atmosphere', title: 'Descrição e atmosfera', itemNoun: 'descrições',
    summary: 'Palavras e combinações para perceber clima, sensação e imagens que definem o tom de uma cena.',
    columns: [{ key: 'efeito', label: 'Efeito' }, { key: 'sentido', label: 'Sentido predominante' }],
    items: [
      entry('atmosphere-silence', 'an eerie silence', 'um silêncio sinistro', 'An eerie silence filled the corridor after the music stopped.', '“Eerie” cria a sensação de algo estranho, inexplicável ou desconfortável.', 'Essencial', { efeito: 'Tensão e estranhamento', sentido: 'Audição' }),
      entry('atmosphere-torchlight', 'flickering torchlight', 'luz bruxuleante de tocha', 'Flickering torchlight moved across the stone walls.', '“Flickering” indica uma luz que oscila, reforçando instabilidade ou incerteza.', 'Aprofundamento', { efeito: 'Instabilidade visual', sentido: 'Visão' }),
      entry('atmosphere-stale', 'stale air', 'ar abafado, sem renovação', 'Stale air clung to the room beneath the stairs.', 'Descreve ar parado; pode sugerir abandono, confinamento ou desconforto.', 'Desafio', { efeito: 'Desconforto físico', sentido: 'Cheiro e tato' }),
      entry('atmosphere-warm-glow', 'a warm glow', 'um brilho acolhedor', 'A warm glow from the windows softened the empty street.', '“Warm” pode indicar sensação emocional além de temperatura, criando conforto e proximidade.', 'Essencial', { efeito: 'Acolhimento', sentido: 'Visão e emoção' }),
      entry('atmosphere-distant-rumble', 'a distant rumble', 'um estrondo distante', 'A distant rumble rolled across the hills before the rain began.', 'Sugere um som grave e afastado, muitas vezes associado a uma mudança que se aproxima.', 'Aprofundamento', { efeito: 'Expectativa e apreensão', sentido: 'Audição' }),
      entry('atmosphere-brittle-cold', 'brittle cold', 'frio cortante', 'Brittle cold made every metal surface painful to touch.', 'A imagem transmite um frio intenso e seco, com sensação de rigidez e fragilidade.', 'Desafio', { efeito: 'Aspereza física', sentido: 'Tato' }),
    ],
  },
  {
    id: 'register-tone', title: 'Registro e tom', itemNoun: 'marcas de linguagem',
    summary: 'Pistas para reconhecer formalidade, época, intenção e emoção na maneira como alguém se expressa.',
    columns: [{ key: 'registro', label: 'Registro' }, { key: 'intencao', label: 'Intenção' }],
    items: [
      entry('register-begone', 'begone', 'vá embora', '“Begone from this place,” the keeper said.', 'Forma imperativa arcaica. Hoje aparece mais em fantasia, teatro ou humor deliberadamente solene.', 'Desafio', { registro: 'Arcaico e solene', intencao: 'Expulsar ou ordenar' }),
      entry('register-perhaps', 'perhaps', 'talvez', 'Perhaps the bridge will still be standing at dawn.', 'É uma forma um pouco mais cuidadosa e literária que “maybe”.', 'Essencial', { registro: 'Neutro a levemente formal', intencao: 'Expressar incerteza' }),
      entry('register-indeed', 'indeed', 'de fato; realmente', '“Indeed,” she said, “the road is dangerous.”', 'Pode confirmar algo, dar ênfase ou soar formal, dependendo da entonação.', 'Aprofundamento', { registro: 'Formal ou enfático', intencao: 'Confirmar ou enfatizar' }),
      entry('register-lad', 'lad', 'rapaz; garoto', 'The old sailor called the apprentice “lad” with an affectionate smile.', 'É informal e tradicionalmente britânico; pode soar familiar, dependendo de quem fala e do contexto.', 'Essencial', { registro: 'Informal e britânico', intencao: 'Tratar com familiaridade' }),
      entry('register-therefore', 'therefore', 'portanto; por isso', 'The road was flooded; therefore, the delivery was delayed.', 'Marca uma conclusão de modo explícito e costuma aparecer em textos formais ou argumentativos.', 'Aprofundamento', { registro: 'Formal', intencao: 'Apresentar consequência' }),
      entry('register-might-i', 'might I…?', 'seria que eu poderia…?', 'Might I ask why the meeting was postponed?', 'É uma forma muito polida e formal de fazer uma pergunta ou pedir permissão.', 'Desafio', { registro: 'Muito formal e polido', intencao: 'Pedir informação ou permissão' }),
    ],
  },
  {
    id: 'false-cognates', title: 'Falsos cognatos', itemNoun: 'armadilhas',
    summary: 'Palavras parecidas com o português que costumam levar a interpretações incorretas.',
    columns: [{ key: 'parece', label: 'Parece significar' }, { key: 'atencao', label: 'Atenção' }],
    items: [
      entry('false-actually', 'actually', 'na verdade; de fato', 'He actually knew the route, but he kept it secret.', 'Não significa “atualmente”. Para isso, use “currently” ou “nowadays”.', 'Essencial', { parece: 'Atualmente', atencao: 'Corrige ou contrasta expectativa' }),
      entry('false-eventually', 'eventually', 'por fim; finalmente', 'Eventually, the rain stopped and the road cleared.', 'Não significa “eventualmente” no sentido de “talvez”.', 'Essencial', { parece: 'Talvez, ocasionalmente', atencao: 'Indica resultado após tempo' }),
      entry('false-sensible', 'sensible', 'sensato; razoável', 'It was sensible to wait until morning.', 'Não significa “sensível”; para isso, use “sensitive”.', 'Aprofundamento', { parece: 'Sensível', atencao: 'Avalia bom julgamento' }),
      entry('false-library', 'library', 'biblioteca', 'The university library stays open until midnight during exams.', 'Não significa “livraria”; para loja de livros, use “bookshop” ou “bookstore”.', 'Essencial', { parece: 'Livraria', atencao: 'Lugar de consulta e empréstimo' }),
      entry('false-pretend', 'pretend', 'fingir', 'The child pretended not to hear the question.', 'Não significa “pretender” no sentido de ter a intenção de fazer algo; nesse caso, use “intend”.', 'Aprofundamento', { parece: 'Pretender, ter intenção', atencao: 'Simular uma situação' }),
      entry('false-event', 'event', 'evento; acontecimento', 'The public lecture was a well-organized event.', 'Não significa “eventualmente”; essa ideia pode ser expressa por “eventually”.', 'Desafio', { parece: 'Eventualmente', atencao: 'Ocasião ou acontecimento' }),
    ],
  },
  {
    id: 'word-formation', title: 'Formação de palavras', itemNoun: 'padrões',
    summary: 'Prefixos, sufixos e raízes que ajudam a inferir palavras desconhecidas durante a leitura.',
    columns: [{ key: 'estrutura', label: 'Estrutura' }, { key: 'pista', label: 'Pista de leitura' }],
    items: [
      entry('formation-unknown', 'unknown', 'desconhecido', 'They followed an unknown path beyond the farm.', 'O prefixo “un-” frequentemente nega ou inverte o sentido da palavra-base.', 'Essencial', { estrutura: 'un- + known', pista: '“Não conhecido”' }),
      entry('formation-endless', 'endless', 'sem fim; interminável', 'The travelers crossed an endless field of grass.', 'O sufixo “-less” indica ausência ou falta de algo.', 'Essencial', { estrutura: 'end + -less', pista: '“Sem fim”' }),
      entry('formation-misunderstand', 'misunderstand', 'entender mal', 'He misunderstood the warning and took the wrong road.', 'O prefixo “mis-” sugere erro ou inadequação na ação.', 'Aprofundamento', { estrutura: 'mis- + understand', pista: '“Entender de modo errado”' }),
      entry('formation-reconsider', 'reconsider', 'reconsiderar', 'She reconsidered the route after checking the weather forecast.', 'O prefixo “re-” pode indicar repetição ou retorno a uma ação, como pensar novamente.', 'Essencial', { estrutura: 're- + consider', pista: '“Considerar novamente”' }),
      entry('formation-careless', 'careless', 'descuidado', 'A careless error changed the total on the receipt.', 'O sufixo “-less” indica ausência: “careless” é alguém sem cuidado.', 'Aprofundamento', { estrutura: 'care + -less', pista: '“Sem cuidado”' }),
      entry('formation-hopeful', 'hopeful', 'esperançoso', 'The hopeful message encouraged the volunteers to continue.', 'O sufixo “-ful” indica presença ou abundância da ideia expressa pela base.', 'Desafio', { estrutura: 'hope + -ful', pista: '“Cheio de esperança”' }),
    ],
  },
];

export const REVIEW_STORAGE_KEY = 'leitor-inteligente:specialist-review-statuses';
export type ReviewStatusMap = Record<string, ReviewStatus>;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'Pendente' || value === 'Estudado' || value === 'Dominado';
}

export function loadReviewStatuses(storage?: StorageLike): ReviewStatusMap {
  if (!storage) return {};
  try {
    const value = storage.getItem(REVIEW_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) as unknown : {};
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, status]) => isReviewStatus(status)),
    ) as ReviewStatusMap;
  } catch { return {}; }
}

export function saveReviewStatuses(statuses: ReviewStatusMap, storage?: StorageLike) {
  try { storage?.setItem(REVIEW_STORAGE_KEY, JSON.stringify(statuses)); } catch { /* Browser storage can be unavailable. */ }
}

export function getReviewStatus(itemId: string, statuses: ReviewStatusMap): ReviewStatus {
  return isReviewStatus(statuses[itemId]) ? statuses[itemId] : 'Pendente';
}

export function filterSpecialistItems(
  specialist: SpecialistDefinition, query: string, level: StudyLevel | 'Todos',
  review: ReviewStatus | 'Todos', statuses: ReviewStatusMap,
) {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  return specialist.items.filter((studyItem) => {
    const searchable = [studyItem.term, studyItem.translation, studyItem.example, studyItem.explanation, ...Object.values(studyItem.details)]
      .join(' ').toLocaleLowerCase('pt-BR');
    return (!normalized || searchable.includes(normalized))
      && (level === 'Todos' || studyItem.level === level)
      && (review === 'Todos' || getReviewStatus(studyItem.id, statuses) === review);
  });
}