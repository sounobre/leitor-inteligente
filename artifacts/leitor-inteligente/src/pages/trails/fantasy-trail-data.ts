export type Level = 'Essencial' | 'Aprofundamento' | 'Desafio';

export interface TrailItem {
  id: string;
  term: string;
  meaning: string;
  example: string;
  explanation: string;
  level: Level;
}

export interface TrailSection {
  id: string;
  title: string;
  description: string;
  items: TrailItem[];
}

export type FantasySubgenre = 'geral' | 'epica' | 'urbana' | 'sombria' | 'contos';

export interface FantasySubgenreOption {
  id: FantasySubgenre;
  label: string;
  description: string;
}

export const fantasySubgenres: FantasySubgenreOption[] = [
  { id: 'geral', label: 'Fantasia geral', description: 'Uma base ampla para diferentes universos fantásticos.' },
  { id: 'epica', label: 'Fantasia épica', description: 'Escala, alianças, dever e linguagem de jornadas grandiosas.' },
  { id: 'urbana', label: 'Fantasia urbana', description: 'Cidade, cotidiano, segredo e convivência entre o comum e o fantástico.' },
  { id: 'sombria', label: 'Fantasia sombria', description: 'Ameaça, presságio, sobrevivência e consequências difíceis.' },
  { id: 'contos', label: 'Contos de fadas', description: 'Encantamento, regras simbólicas, astúcia e transformação.' },
];

type Grammar = 'noun' | 'verb' | 'modifier' | 'phrase';
type Seed = { term: string; meaning: string; grammar?: Grammar };

const sections: Array<Omit<TrailSection, 'items'> & { grammar: Grammar; seeds: Seed[] }> = [
  {
    id: 'fundamentos',
    title: 'Fundamentos da fantasia',
    description: 'Vocabulário de mundos, povos, artefatos e jornadas que aparece em muitos universos fantásticos.',
    grammar: 'noun',
    seeds: [
      ['realm', 'reino, domínio'], ['kingdom', 'reino'], ['empire', 'império'], ['province', 'província'],
      ['borderland', 'região fronteiriça'], ['homeland', 'terra natal'], ['wilderness', 'região selvagem'],
      ['settlement', 'povoado'], ['stronghold', 'fortaleza'], ['citadel', 'cidadela'], ['outpost', 'posto avançado'],
      ['village', 'aldeia'], ['clan', 'clã'], ['tribe', 'tribo'], ['lineage', 'linhagem'], ['folk', 'povo'],
      ['creature', 'criatura'], ['beast', 'fera'], ['giant', 'gigante'], ['spirit', 'espírito'],
      ['artifact', 'artefato'], ['relic', 'relíquia'], ['heirloom', 'herança de família'], ['quest', 'jornada, missão'],
      ['hamlet', 'vilarejo'], ['encampment', 'acampamento'], ['crossroads', 'encruzilhada'],
      ['ruin', 'ruína'], ['watchtower', 'torre de vigia'], ['gatehouse', 'portaria fortificada'], ['causeway', 'calçada elevada'],
      ['caravan', 'caravana'], ['pilgrimage', 'peregrinação'], ['expedition', 'expedição'], ['fellowship', 'companhia, grupo unido'],
      ['companion', 'companheiro'], ['traveler', 'viajante'], ['wanderer', 'andarilho'], ['shapeshifter', 'metamorfo'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'atmosfera',
    title: 'Atmosfera e descrição',
    description: 'Adjetivos, imagens e substantivos para perceber o lugar, o clima e o peso do tempo.',
    grammar: 'modifier',
    seeds: [
      ['ancient', 'antigo, milenar'], ['forgotten', 'esquecido'], ['hallowed', 'sagrado'], ['haunted', 'assombrado'],
      ['eerie', 'estranho, sinistro'], ['uncanny', 'inexplicável, inquietante'], ['bleak', 'sombrio, desolado'],
      ['windswept', 'varrido pelo vento'], ['mossy', 'coberto de musgo'], ['crumbling', 'em ruínas'],
      ['overgrown', 'tomado pela vegetação'], ['shimmering', 'cintilante'], ['flickering', 'bruxuleante'],
      ['glimmering', 'brilhando suavemente'], ['murky', 'turvo, nebuloso'], ['mist', 'névoa, neblina'],
      ['gloom', 'penumbra'], ['twilight', 'crepúsculo'], ['dawn', 'amanhecer'], ['moonlit', 'iluminado pela lua'],
      ['echo', 'eco'], ['silence', 'silêncio'], ['scent', 'aroma, cheiro'], ['shadow', 'sombra'],
      ['damp', 'úmido'], ['brittle', 'quebradiço'], ['ashen', 'acinzentado como cinza'], ['radiant', 'radiante'],
      ['somber', 'solene, sombrio'], ['restless', 'inquieto'], ['hushed', 'silencioso, abafado'], ['luminous', 'luminoso'],
      ['drizzle', 'garoa'], ['downpour', 'chuva torrencial'], ['frost', 'geada'], ['thunder', 'trovão'],
      ['haze', 'bruma'], ['shiver', 'arrepio'], ['glow', 'brilho'], ['crackle', 'crepitação'],
    ].map(([term, meaning]) => ({ term, meaning }))
      .map(seed => ['mist', 'gloom', 'twilight', 'dawn', 'echo', 'silence', 'scent', 'shadow'].includes(seed.term)
        ? { ...seed, grammar: 'noun' as const }
        : seed),
  },
  {
    id: 'acao',
    title: 'Ação e movimento',
    description: 'Verbos e expressões para acompanhar deslocamento, confronto, fuga e tensão física.',
    grammar: 'verb',
    seeds: [
      ['wield', 'empunhar, manejar'], ['draw', 'sacar, puxar'], ['raise', 'erguer'], ['strike', 'golpear'],
      ['parry', 'aparar'], ['dodge', 'esquivar-se'], ['lunge', 'avançar com um golpe'], ['clash', 'chocar-se'],
      ['grapple', 'agarrar-se, lutar corpo a corpo'], ['seize', 'agarrar, tomar'], ['shatter', 'estilhaçar'],
      ['breach', 'romper, abrir uma brecha'], ['charge', 'avançar, investir'], ['retreat', 'recuar'],
      ['flee', 'fugir'], ['pursue', 'perseguir'], ['wander', 'vagar'], ['stumble', 'tropeçar'],
      ['creep', 'avançar sorrateiramente'], ['stride', 'caminhar a passos largos'], ['rush', 'correr, avançar depressa'],
      ['veer', 'desviar-se'], ['surge', 'irromper, avançar'], ['withstand', 'resistir'],
      ['advance', 'avançar'], ['approach', 'aproximar-se'], ['circle', 'rodear'], ['encounter', 'encontrar, deparar-se com'],
      ['evade', 'evitar, escapar de'], ['guard', 'proteger, vigiar'], ['leap', 'saltar'], ['mount', 'montar, subir'],
      ['plunge', 'mergulhar, lançar-se'], ['recoil', 'recuar bruscamente'], ['scramble', 'escalar com dificuldade'],
      ['slip', 'escorregar'], ['sprint', 'disparar, correr'], ['track', 'seguir rastros'], ['unleash', 'liberar, desencadear'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'poder',
    title: 'Poder e hierarquia',
    description: 'Tratamentos, alianças e conflitos sociais para ler quem fala, quem decide e quem obedece.',
    grammar: 'noun',
    seeds: [
      ['sovereign', 'soberano'], ['monarch', 'monarca'], ['heir', 'herdeiro'], ['council', 'conselho'],
      ['court', 'corte'], ['noble', 'nobre'], ['vassal', 'vassalo'], ['lordship', 'senhorio'],
      ['title', 'título, posição'], ['rank', 'patente, posição'], ['authority', 'autoridade'], ['command', 'comando'],
      ['decree', 'decreto'], ['edict', 'edito'], ['oath', 'juramento'], ['allegiance', 'lealdade'],
      ['duty', 'dever'], ['betrayal', 'traição'], ['treason', 'traição contra o Estado'], ['defiance', 'desafio, rebeldia'],
      ['envoy', 'enviado diplomático'], ['guard', 'guarda'], ['sentinel', 'sentinela'], ['commoner', 'plebeu'],
      ['regent', 'regente'], ['chieftain', 'chefe de clã'], ['matriarch', 'matriarca'], ['consort', 'consorte'],
      ['advisor', 'conselheiro'], ['delegate', 'delegado'], ['ambassador', 'embaixador'], ['herald', 'arauto'],
      ['retinue', 'comitiva'], ['household', 'casa, séquito'], ['banner', 'estandarte'], ['insignia', 'insígnia'],
      ['protocol', 'protocolo'], ['tribute', 'tributo'], ['concession', 'concessão'], ['succession', 'sucessão'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'magia',
    title: 'Magia, causa e consequência',
    description: 'Palavras para entender regras, rituais, limites, transformações e o preço de um poder.',
    grammar: 'noun',
    seeds: [
      ['spell', 'feitiço'], ['incantation', 'encantamento'], ['ritual', 'ritual'], ['charm', 'encanto'],
      ['curse', 'maldição'], ['blessing', 'bênção'], ['enchantment', 'encantamento'], ['ward', 'proteção mágica'],
      ['rune', 'runa'], ['sigil', 'sigilo'], ['relic', 'relíquia'], ['talisman', 'talismã'],
      ['essence', 'essência'], ['force', 'força'], ['power', 'poder'], ['source', 'fonte'],
      ['sacrifice', 'sacrifício'], ['toll', 'preço, custo'], ['consequence', 'consequência'], ['threshold', 'limiar'],
      ['awakening', 'despertar'], ['binding', 'vinculação, atamento'], ['transformation', 'transformação'], ['summoning', 'invocação'],
      ['apparition', 'aparição'], ['breach', 'ruptura, abertura'], ['conduit', 'canal, condutor'], ['component', 'componente'],
      ['distill', 'destilar, concentrar'], ['invoke', 'invocar'], ['manifest', 'manifestar'], ['nullify', 'anular'],
      ['offering', 'oferenda'], ['reagent', 'reagente'], ['residue', 'resíduo'], ['seal', 'selo, selar'],
      ['vessel', 'recipiente, receptáculo'], ['volatile', 'volátil'], ['constraint', 'restrição'], ['aftereffect', 'efeito posterior'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'estranho',
    title: 'O estranho e o inexplicável',
    description: 'Estruturas de dúvida, percepção e descoberta gradual para narrar o que não se explica de imediato.',
    grammar: 'phrase',
    seeds: [
      ['as if', 'como se'], ['perhaps', 'talvez'], ['seemingly', 'aparentemente'], ['somehow', 'de algum modo'],
      ['elsewhere', 'em outro lugar'], ['nowhere', 'lugar nenhum'], ['beyond', 'além de'], ['within', 'dentro de'],
      ['presence', 'presença'], ['absence', 'ausência'], ['omen', 'presságio'], ['sign', 'sinal'],
      ['vision', 'visão'], ['dream', 'sonho'], ['glimpse', 'vislumbre'], ['trace', 'vestígio'],
      ['whisper', 'sussurro'], ['rumor', 'rumor'], ['resemblance', 'semelhança'], ['reflection', 'reflexo'],
      ['distortion', 'distorção'], ['mystery', 'mistério'], ['wonder', 'assombro'], ['dread', 'pavor'],
      ['appear', 'parecer, aparecer'], ['seem', 'parecer'], ['strange', 'estranho'], ['unfamiliar', 'desconhecido'],
      ['suddenly', 'de repente'], ['apparently', 'aparentemente'], ['uncertain', 'incerto'], ['unlikely', 'improvável'],
      ['conceivably', 'possivelmente'], ['invisible', 'invisível'], ['unnoticed', 'despercebido'],
      ['hunch', 'pressentimento'], ['suspicion', 'suspeita'], ['explanation', 'explicação'], ['revelation', 'revelação'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'metaforas',
    title: 'Metáforas e termos inventados',
    description: 'Pistas linguísticas para inferir palavras novas e sentir imagens que não devem ser traduzidas ao pé da letra.',
    grammar: 'phrase',
    seeds: [
      ['context clue', 'pista de contexto'], ['compound word', 'palavra composta'], ['proper name', 'nome próprio'],
      ['capital letter', 'letra maiúscula'], ['title', 'título'], ['epithet', 'epíteto'], ['nickname', 'apelido'],
      ['image', 'imagem'], ['comparison', 'comparação'], ['simile', 'símile'], ['metaphor', 'metáfora'],
      ['symbol', 'símbolo'], ['thread', 'fio condutor'], ['weight', 'peso'], ['edge', 'limite, borda'],
      ['heart', 'centro, essência'], ['root', 'raiz'], ['seed', 'semente'], ['veil', 'véu'],
      ['wound', 'ferida'], ['breath', 'fôlego'], ['hunger', 'fome, desejo intenso'], ['shadow', 'sombra'],
      ['light', 'luz'], ['fire', 'fogo'], ['stone', 'pedra'], ['river', 'rio'],
      ['iron', 'ferro'], ['silver', 'prata'], ['cinder', 'brasa, cinza'], ['ember', 'brasa'],
      ['misty', 'enevoado'], ['bitter', 'amargo, intenso'], ['hollow', 'oco, vazio'], ['warmth', 'calor'],
      ['chill', 'frio, calafrio'], ['thrum', 'zumbido, vibração contínua'], ['pulse', 'pulsação'],
      ['burden', 'fardo'], ['current', 'corrente, fluxo'], ['knotted', 'atado, intrincado'], ['fracture', 'fratura'],
    ].map(([term, meaning]) => ({ term, meaning })),
  },
  {
    id: 'vozes',
    title: 'Vozes do mundo',
    description: 'Expressões de fala, registro e intenção para reconhecer humor, formalidade e tensão nos diálogos.',
    grammar: 'verb',
    seeds: [
      ['indeed', 'de fato'], ['hence', 'por isso, daqui'], ['therefore', 'portanto'], ['alas', 'ah, infelizmente'],
      ['nay', 'não, pelo contrário'], ['farewell', 'adeus'], ['welcome', 'bem-vindo'], ['begone', 'vá embora'],
      ['mercy', 'misericórdia'], ['pardon', 'perdão'], ['swear', 'jurar'], ['plead', 'implorar'],
      ['warn', 'avisar'], ['demand', 'exigir'], ['reveal', 'revelar'], ['conceal', 'esconder'],
      ['mutter', 'murmurar'], ['whisper', 'sussurrar'], ['boast', 'vangloriar-se'], ['mock', 'zombar'],
      ['bargain', 'negociar'], ['agree', 'concordar'], ['refuse', 'recusar'], ['promise', 'prometer'],
      ['harken', 'escutar com atenção'], ['behold', 'contemplar, eis'], ['grant', 'conceder'], ['request', 'solicitar'],
      ['insist', 'insistir'], ['proclaim', 'proclamar'], ['announce', 'anunciar'], ['confess', 'confessar'],
      ['inquire', 'indagar'], ['answer', 'responder'], ['interrupt', 'interromper'], ['murmur', 'murmurar'],
      ['threaten', 'ameaçar'], ['reassure', 'tranquilizar'], ['consent', 'consentir'], ['object', 'opor-se'],
    ].map(([term, meaning]) => ({ term, meaning }))
      .map(seed => ['indeed', 'hence', 'therefore', 'alas', 'nay', 'farewell', 'welcome', 'begone', 'mercy', 'pardon'].includes(seed.term)
        ? { ...seed, grammar: 'phrase' as const }
        : seed),
  },
];

type SectionDefinition = Omit<TrailSection, 'items'> & { grammar: Grammar; seeds: Seed[] };

const subgenreSeeds: Record<Exclude<FantasySubgenre, 'geral'>, SectionDefinition[]> = {
  epica: [
    {
      id: 'escala-epica', title: 'Escala e destino', grammar: 'noun',
      description: 'Vocabulário para territórios vastos, legados e decisões que afetam muitos povos.',
      seeds: [
        ['continent', 'continente'], ['frontier', 'fronteira'], ['dynasty', 'dinastia'], ['legion', 'legião'],
        ['banner', 'estandarte'], ['lineage', 'linhagem'], ['heirloom', 'herança de família'], ['prophecy', 'profecia'],
        ['legacy', 'legado'], ['realm', 'reino, domínio'], ['expedition', 'expedição'], ['stronghold', 'fortaleza'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'aliancas-epicas', title: 'Alianças e juramentos', grammar: 'phrase',
      description: 'Formas de reconhecer pactos, negociações e lealdades em contextos formais.',
      seeds: [
        ['forge an alliance', 'formar uma aliança'], ['honor a vow', 'honrar um voto'], ['swear allegiance', 'jurar lealdade'],
        ['call a council', 'convocar um conselho'], ['bear witness', 'dar testemunho'], ['claim the throne', 'reivindicar o trono'],
        ['keep the peace', 'manter a paz'], ['break ranks', 'romper fileiras'], ['in the name of', 'em nome de'],
        ['by royal decree', 'por decreto real'], ['stand together', 'permanecer unido'], ['yield authority', 'ceder autoridade'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'campanhas-epicas', title: 'Campanhas e travessias', grammar: 'verb',
      description: 'Ações para acompanhar deslocamentos longos, resistência e mudanças de estratégia.',
      seeds: [
        ['march', 'marchar'], ['cross', 'atravessar'], ['besiege', 'sitiar'], ['defend', 'defender'],
        ['rally', 'reunir, mobilizar'], ['scout', 'explorar, fazer reconhecimento'], ['encircle', 'cercar'],
        ['surrender', 'render-se'], ['reinforce', 'reforçar'], ['withdraw', 'retirar-se'], ['endure', 'suportar'],
        ['conquer', 'conquistar'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'mitos-epicos', title: 'Mito e legado', grammar: 'modifier',
      description: 'Adjetivos e imagens para perceber antiguidade, grandeza e memória coletiva.',
      seeds: [
        ['legendary', 'lendário'], ['ancestral', 'ancestral'], ['mighty', 'poderoso'], ['far-reaching', 'de amplo alcance'],
        ['unbroken', 'ininterrupto'], ['sacred', 'sagrado'], ['forgotten', 'esquecido'], ['everlasting', 'duradouro'],
        ['fateful', 'decisivo, fatídico'], ['majestic', 'majestoso'], ['timeworn', 'desgastado pelo tempo'], ['monumental', 'monumental'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
  ],
  urbana: [
    {
      id: 'cidade-urbana', title: 'Cidade e cotidiano', grammar: 'noun',
      description: 'Palavras para ruas, serviços e rotinas onde o extraordinário pode passar despercebido.',
      seeds: [
        ['alley', 'beco'], ['rooftop', 'telhado, terraço'], ['subway', 'metrô'], ['block', 'quarteirão'],
        ['district', 'bairro, distrito'], ['landmark', 'ponto de referência'], ['neighborhood', 'vizinhança'],
        ['commuter', 'pessoa que se desloca diariamente'], ['landlord', 'locador'], ['shift', 'turno de trabalho'],
        ['doorway', 'entrada, vão da porta'], ['streetlight', 'poste de iluminação'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'segredos-urbanos', title: 'Segredo e investigação', grammar: 'phrase',
      description: 'Construções para seguir pistas, desconfiar de aparências e revelar camadas ocultas.',
      seeds: [
        ['keep a low profile', 'manter discrição'], ['follow a lead', 'seguir uma pista'], ['cover up', 'encobrir'],
        ['under the radar', 'fora do radar'], ['word on the street', 'o que se comenta na rua'], ['off the record', 'em caráter não oficial'],
        ['look into', 'investigar'], ['let slip', 'deixar escapar'], ['in plain sight', 'à vista de todos'],
        ['double life', 'vida dupla'], ['hidden passage', 'passagem escondida'], ['false identity', 'identidade falsa'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'confrontos-urbanos', title: 'Encontros e movimento', grammar: 'verb',
      description: 'Verbos para perseguições, encontros inesperados e mudanças rápidas de direção.',
      seeds: [
        ['hail', 'chamar, acenar para'], ['tail', 'seguir discretamente'], ['duck', 'abaixar-se, esquivar-se'],
        ['bolt', 'sair correndo'], ['blend in', 'misturar-se'], ['sneak', 'esgueirar-se'],
        ['swerve', 'desviar bruscamente'], ['corner', 'encurralar'], ['stake out', 'vigiar um local'],
        ['cut through', 'atravessar por'], ['turn up', 'aparecer, surgir'], ['vanish', 'desaparecer'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'limiar-urbano', title: 'O comum e o impossível', grammar: 'modifier',
      description: 'Qualificadores para notar o contraste entre uma rotina reconhecível e algo fora do normal.',
      seeds: [
        ['ordinary', 'comum'], ['offbeat', 'incomum, excêntrico'], ['unseen', 'não visto'], ['mundane', 'mundano'],
        ['glitchy', 'com falhas estranhas'], ['out-of-place', 'fora de lugar'], ['familiar', 'familiar'],
        ['impossible', 'impossível'], ['untraceable', 'impossível de rastrear'], ['overheard', 'ouvido por acaso'],
        ['neon-lit', 'iluminado por néon'], ['after-hours', 'fora do horário comum'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
  ],
  sombria: [
    {
      id: 'ameaca-sombria', title: 'Ameaça e presságio', grammar: 'noun',
      description: 'Vocabulário para sinais inquietantes, perigo crescente e sensação de vulnerabilidade.',
      seeds: [
        ['menace', 'ameaça'], ['warning', 'aviso'], ['omen', 'presságio'], ['plague', 'praga'],
        ['blight', 'devastação, praga'], ['scar', 'cicatriz'], ['wound', 'ferida'], ['trap', 'armadilha'],
        ['aftermath', 'consequência, rescaldo'], ['remnant', 'remanescente'], ['shackle', 'grilhão'], ['hunger', 'fome'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'sobrevivencia-sombria', title: 'Sobrevivência e limite', grammar: 'verb',
      description: 'Ações que expressam cautela, perda de controle, resistência e escolhas sob pressão.',
      seeds: [
        ['endure', 'suportar'], ['withhold', 'reter'], ['recoil', 'recuar bruscamente'], ['flinch', 'recuar por reflexo'],
        ['stagger', 'cambalear'], ['wither', 'murchar, definhar'], ['suppress', 'reprimir'], ['yield', 'ceder'],
        ['risk', 'arriscar'], ['haunt', 'assombrar'], ['outlast', 'sobreviver a'], ['deteriorate', 'deteriorar-se'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'ambiente-sombrio', title: 'Ruína e desconforto', grammar: 'modifier',
      description: 'Imagens para reconhecer decadência, silêncio pesado e beleza ameaçadora.',
      seeds: [
        ['stifling', 'sufocante'], ['forsaken', 'abandonado'], ['decayed', 'decaído'], ['tainted', 'contaminado'],
        ['desolate', 'desolado'], ['claustrophobic', 'claustrofóbico'], ['dreadful', 'aterrorizante'],
        ['ominous', 'ameaçador'], ['noxious', 'nocivo'], ['bloodless', 'sem vida'], ['unforgiving', 'implacável'],
        ['foul', 'repulsivo, desagradável'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'culpa-sombria', title: 'Culpa e consequência', grammar: 'phrase',
      description: 'Expressões para entender responsabilidade, dúvida moral e efeitos que permanecem.',
      seeds: [
        ['at a cost', 'a um custo'], ['no way back', 'sem volta'], ['pay the price', 'pagar o preço'],
        ['carry the blame', 'carregar a culpa'], ['come undone', 'desmoronar'], ['too late', 'tarde demais'],
        ['in cold blood', 'a sangue-frio'], ['by any means', 'por todos os meios'], ['face the truth', 'encarar a verdade'],
        ['bound to fail', 'destinado a falhar'], ['nothing left', 'não restar nada'], ['if only', 'se ao menos'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
  ],
  contos: [
    {
      id: 'encanto-contos', title: 'Encanto e transformação', grammar: 'noun',
      description: 'Palavras para reconhecer encantamentos, mudanças de forma e objetos com valor simbólico.',
      seeds: [
        ['enchantment', 'encantamento'], ['wish', 'desejo'], ['wand', 'varinha'], ['mirror', 'espelho'],
        ['slipper', 'sapato leve'], ['riddle', 'enigma'], ['giant', 'gigante'], ['troll', 'troll'],
        ['fountain', 'fonte'], ['spindle', 'roca'], ['cottage', 'chalé'], ['feast', 'banquete'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'regras-contos', title: 'Regras e promessas', grammar: 'phrase',
      description: 'Fórmulas para perceber condições, proibições e promessas que organizam um mundo simbólico.',
      seeds: [
        ['once upon a time', 'era uma vez'], ['long ago', 'há muito tempo'], ['if you wish', 'se você desejar'],
        ['on one condition', 'com uma condição'], ['keep your promise', 'cumprir sua promessa'], ['break the spell', 'quebrar o encanto'],
        ['three times', 'três vezes'], ['at midnight', 'à meia-noite'], ['in disguise', 'disfarçado'],
        ['make a bargain', 'fazer um acordo'], ['tell the truth', 'dizer a verdade'], ['never look back', 'nunca olhar para trás'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'astucia-contos', title: 'Astúcia e travessura', grammar: 'verb',
      description: 'Verbos para acompanhar personagens que negociam, escondem intenções ou viram o jogo.',
      seeds: [
        ['outwit', 'ser mais esperto que'], ['trick', 'enganar'], ['disguise', 'disfarçar'], ['tempt', 'tentar, seduzir'],
        ['bargain', 'negociar'], ['escape', 'escapar'], ['transform', 'transformar'], ['bewitch', 'enfeitiçar'],
        ['rescue', 'resgatar'], ['discover', 'descobrir'], ['guess', 'adivinhar'], ['grant', 'conceder'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
    {
      id: 'imagens-contos', title: 'Imagens e moral', grammar: 'modifier',
      description: 'Qualificadores para tons de maravilhamento, cautela e mudança de fortuna.',
      seeds: [
        ['enchanted', 'encantado'], ['clever', 'esperto'], ['kind-hearted', 'bondoso'], ['wicked', 'malvado'],
        ['mysterious', 'misterioso'], ['magical', 'mágico'], ['grateful', 'grato'], ['lonely', 'solitário'],
        ['brave', 'corajoso'], ['curious', 'curioso'], ['humble', 'humilde'], ['unexpected', 'inesperado'],
      ].map(([term, meaning]) => ({ term, meaning })),
    },
  ],
};

const indefiniteArticle = (term: string) => /^[aeiou]/i.test(term.trim()) ? 'an' : 'a';

const formFactories: Record<Grammar, Array<(term: string) => string>> = {
  noun: [
    term => term, term => `the ancient ${term}`, term => `a forgotten ${term}`,
    term => `the ${term} within`, term => `beyond the ${term}`, term => `to seek the ${term}`,
    term => `to protect the ${term}`, term => `the ${term}'s edge`, term => `a ${term}-bound vow`,
    term => `stories of ${term}`, term => `the ${term} beneath`, term => `when ${term} returns`,
  ],
  verb: [
    term => term, term => `to ${term} again`, term => `to ${term} at once`,
    term => `to ${term} without warning`, term => `learning to ${term}`, term => `refusing to ${term}`,
    term => `a chance to ${term}`, term => `the need to ${term}`, term => `a way to ${term}`,
    term => `watching someone ${term}`, term => `daring to ${term}`, term => `never ${term}`,
  ],
  modifier: [
    term => term, term => `${indefiniteArticle(term)} ${term} silence`, term => `${indefiniteArticle(term)} ${term} tower`,
    term => `the ${term} air`, term => `${indefiniteArticle(term)} ${term} path`, term => `the ${term} valley`,
    term => `${indefiniteArticle(term)} ${term} glow`, term => `the ${term} stone`, term => `${indefiniteArticle(term)} ${term} voice`,
    term => `the ${term} horizon`, term => `${indefiniteArticle(term)} ${term} feeling`, term => `the ${term} night`,
  ],
  phrase: [
    term => term, term => `the phrase "${term}"`, term => `the meaning of "${term}"`,
    term => `a clue in "${term}"`, term => `the tone of "${term}"`, term => `a sentence with "${term}"`,
    term => `the image behind "${term}"`, term => `a repeated "${term}"`, term => `the sound of "${term}"`,
    term => `a context for "${term}"`, term => `the force of "${term}"`, term => `when "${term}" returns`,
  ],
};

const levels: Level[] = ['Essencial', 'Essencial', 'Aprofundamento', 'Essencial', 'Aprofundamento', 'Desafio'];

const exampleTemplates = [
  (term: string) => `At first light, the map marked "${term}" beyond the last familiar road.`,
  (term: string) => `The narrator chose "${term}" while describing a place no traveler knew well.`,
  (term: string) => `A careful reader can connect "${term}" with the action in the next sentence.`,
  (term: string) => `The guide repeated "${term}" so the group would not miss an important clue.`,
  (term: string) => `The quiet surroundings made "${term}" feel more threatening than expected.`,
  (term: string) => `In this sentence, "${term}" suggests change without explaining its cause.`,
  (term: string) => `The speaker used "${term}" to sound formal while addressing the council.`,
  (term: string) => `The meaning of "${term}" becomes clearer when the nearby verb is considered.`,
  (term: string) => `A thin line of light made "${term}" visible from across the valley.`,
  (term: string) => `The description returns to "${term}" after the weather shifts.`,
  (term: string) => `The writer links "${term}" to a physical sensation rather than a name.`,
  (term: string) => `You can infer "${term}" by comparing the speaker's words with their response.`,
];

const explanationTemplates = [
  (meaning: string) => `Use como pista de ${meaning}. Antes de traduzir, observe o que acontece nas frases próximas.`,
  (meaning: string) => `Ajuda a reconhecer ${meaning} no fluxo da leitura. O contexto costuma confirmar a interpretação.`,
  (meaning: string) => `Expressão útil para entender ${meaning} sem interromper a cena para procurar cada palavra.`,
  (meaning: string) => `Ao encontrar esta forma, procure imagens, verbos e reações que esclareçam ${meaning}.`,
  (meaning: string) => `Uma boa escolha para anotar ${meaning} e depois comparar com outros usos do mesmo padrão.`,
  (meaning: string) => `Leia a frase inteira: o valor de ${meaning} vem mais da relação entre as palavras do que de uma tradução isolada.`,
  (meaning: string) => `Pode sinalizar ${meaning} em uma descrição. Repare se o tom do trecho é de tensão, maravilhamento ou cautela.`,
  (meaning: string) => `Guarde esta construção para reconhecer ${meaning} em passagens diferentes, mesmo quando o cenário muda.`,
  (meaning: string) => `Funciona como vocabulário de apoio para ${meaning}; não pressupõe nenhum livro, personagem ou enredo.`,
  (meaning: string) => `Quando reaparecer, relacione-a a ${meaning} e confira se as palavras vizinhas reforçam essa leitura.`,
  (meaning: string) => `Um padrão recorrente para ampliar seu repertório de ${meaning} sem depender de uma obra específica.`,
  (meaning: string) => `A leitura fica mais fluida quando você reconhece ${meaning} pelo conjunto da cena, em vez de traduzir palavra por palavra.`,
];

const meaningForForm = (seed: Seed, formIndex: number): string => {
  const meaning = seed.meaning;
  const grammar = seed.grammar;

  if (formIndex === 0) return meaning;

  if (grammar === 'noun') {
    const nounTranslations = [
      `${meaning} de tempos antigos`,
      `${meaning} que caiu no esquecimento`,
      `o interior de ${meaning}`,
      `além de ${meaning}`,
      `buscar ${meaning}`,
      `proteger ${meaning}`,
      `a extremidade de ${meaning}`,
      `um voto ligado a ${meaning}`,
      `histórias sobre ${meaning}`,
      `o que existe sob ${meaning}`,
      `quando ${meaning} retorna`,
    ];
    return nounTranslations[formIndex - 1] ?? meaning;
  }

  if (grammar === 'verb') {
    const verbTranslations = [
      `voltar a ${meaning}`,
      `${meaning} imediatamente`,
      `${meaning} sem aviso`,
      `aprender a ${meaning}`,
      `recusar-se a ${meaning}`,
      `uma chance de ${meaning}`,
      `a necessidade de ${meaning}`,
      `uma maneira de ${meaning}`,
      `ver alguém ${meaning}`,
      `ousar ${meaning}`,
      `nunca ${meaning}`,
    ];
    return verbTranslations[formIndex - 1] ?? meaning;
  }

  if (grammar === 'modifier') {
    const modifierTranslations = [
      `um silêncio ${meaning}`,
      `uma torre ${meaning}`,
      `o ar ${meaning}`,
      `um caminho ${meaning}`,
      `o vale ${meaning}`,
      `um brilho ${meaning}`,
      `a pedra ${meaning}`,
      `uma voz ${meaning}`,
      `o horizonte ${meaning}`,
      `uma sensação ${meaning}`,
      `a noite ${meaning}`,
    ];
    return modifierTranslations[formIndex - 1] ?? meaning;
  }

  const phraseTranslations = [
    `a expressão “${meaning}”`,
    `o significado de “${meaning}”`,
    `uma pista em “${meaning}”`,
    `o tom de “${meaning}”`,
    `uma frase com “${meaning}”`,
    `a imagem por trás de “${meaning}”`,
    `uma repetição de “${meaning}”`,
    `o som de “${meaning}”`,
    `um contexto para “${meaning}”`,
    `a força de “${meaning}”`,
    `quando “${meaning}” reaparece`,
  ];
  return phraseTranslations[formIndex - 1] ?? meaning;
};

const buildTrailSections = (sectionDefinitions: SectionDefinition[]): TrailSection[] => sectionDefinitions.map((section, sectionIndex) => ({
  id: section.id,
  title: section.title,
  description: section.description,
  items: section.seeds.flatMap((seed, seedIndex) => formFactories[seed.grammar ?? section.grammar].map((makeTerm, formIndex) => {
    const term = makeTerm(seed.term);
    const level = levels[(seedIndex + formIndex + sectionIndex) % levels.length];
    const itemMeaning = meaningForForm({ ...seed, grammar: seed.grammar ?? section.grammar }, formIndex);
    return {
      id: `${section.id}-${seedIndex}-${formIndex}`,
      term,
      meaning: itemMeaning,
      example: exampleTemplates[formIndex](term),
      explanation: explanationTemplates[formIndex](itemMeaning),
      level,
    };
  })),
}));

export const fantasyData: TrailSection[] = buildTrailSections(sections);

export const fantasyCatalogs: Record<FantasySubgenre, TrailSection[]> = {
  geral: fantasyData,
  epica: buildTrailSections(subgenreSeeds.epica),
  urbana: buildTrailSections(subgenreSeeds.urbana),
  sombria: buildTrailSections(subgenreSeeds.sombria),
  contos: buildTrailSections(subgenreSeeds.contos),
};

export const getFantasyCatalog = (subgenre: FantasySubgenre): TrailSection[] => fantasyCatalogs[subgenre];

export const fantasyItemCount = fantasyData.reduce((total, section) => total + section.items.length, 0);