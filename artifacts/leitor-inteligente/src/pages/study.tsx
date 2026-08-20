import { ArrowLeft, Check, CheckCircle2, Headphones, RefreshCw, Volume2, Eye, ChevronDown } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { getGetBookQueryKey, useGetBook } from '@workspace/api-client-react';
import type { StudyItem, VisualStudyCard, SemanticMap } from '@workspace/api-client-react';

const intros: Record<string, string> = {
  visualCards: 'Imagens mentais e técnicas para ancorar vocabulário de forma duradoura. Sem spoilers, apenas associações limpas.',
  linguisticDecks: 'Estruturas e conceitos agrupados por propósito. Domina o estilo antes de entrar na história.',
  semanticMap: 'A arquitetura temática. Explora como os conceitos e ideias principais se interligam.',
  vocabulary: 'Palavras que dão textura à história. Não precisas de as decorar hoje — reconhecê-las outra vez já é progresso.',
  idioms: 'Expressões que não se traduzem palavra por palavra. Guarda a intenção, não apenas o significado.',
  phrasalVerbs: 'Pequenos verbos com movimento. São o pulso do inglês do dia a dia.',
};

function StudyItemCard({ item, isReviewed, toggleReview, pronounce, showExample = false }: {
  item: StudyItem | VisualStudyCard;
  isReviewed: boolean;
  toggleReview: (term: string) => void;
  pronounce: (term: string) => void;
  showExample?: boolean;
}) {
  const isVisual = 'visualCue' in item;
  const canShowExample = isVisual || showExample;

  return (
    <article className={`study-item ${isReviewed ? 'reviewed' : ''}`} data-testid={`card-study-item-${item.term.replaceAll(' ', '-')}`}>
      <div className="item-top">
        <div>
          <div className="term">{item.term}</div>
          <div className="pronunciation">{item.pronunciation}</div>
        </div>
        <button className="icon-button" onClick={() => pronounce(item.term)} aria-label={`Ouvir ${item.term}`} data-testid={`button-pronounce-${item.term.replaceAll(' ', '-')}`}>
          <Volume2 size={15} />
        </button>
      </div>
      <div className="item-meaning">{item.meaning}</div>
      {canShowExample && <div className="item-example">{item.example}</div>}

      {isVisual && (item as VisualStudyCard).visualCue && (
         <div className="visual-cue-box">
            <div className="cue-label"><Eye size={12} /> Dica Visual</div>
            <div className="cue-text">{(item as VisualStudyCard).visualCue}</div>
            {(item as VisualStudyCard).technique && <div className="cue-technique">{(item as VisualStudyCard).technique}</div>}
         </div>
      )}

      <div className="item-bottom">
        <span className="difficulty">{item.difficulty}</span>
        <button className={`icon-button ${isReviewed ? 'reviewed' : ''}`} onClick={() => toggleReview(item.term)} aria-label={isReviewed ? `Desmarcar ${item.term}` : `Marcar ${item.term} como explorado`} data-testid={`button-review-${item.term.replaceAll(' ', '-')}`}>
          {isReviewed ? <Check size={15} /> : <CheckCircle2 size={15} />}
        </button>
      </div>
    </article>
  )
}

function SemanticMapViz({ map }: { map: SemanticMap }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const size = 360;
  const radius = 120;
  const center = size / 2;

  const positionedNodes = useMemo(() => {
    return map.nodes.map((node, i) => {
      const angle = (i / Math.max(map.nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      return {
        ...node,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      };
    });
  }, [map.nodes]);

  const activeNodeData = activeNode ? positionedNodes.find(n => n.id === activeNode) : null;

  return (
    <div className="semantic-map-container fade-up">
       <div className="semantic-map-svg-wrap">
         <div style={{ position: 'relative', width: size, height: size }}>
           <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
              {map.connections.map((conn, i) => {
                 const from = positionedNodes.find(n => n.id === conn.fromId);
                 const to = positionedNodes.find(n => n.id === conn.toId);
                 if (!from || !to) return null;
                 const isActive = activeNode === from.id || activeNode === to.id;
                  const isFaded = activeNode && !isActive;
                  return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                          className={`map-line ${isActive ? 'active' : ''} ${isFaded ? 'faded' : ''}`} />
              })}
           </svg>
           {positionedNodes.map(node => {
               const isActive = activeNode === node.id;
               const isConnected = activeNode && map.connections.some(c => (c.fromId === activeNode && c.toId === node.id) || (c.toId === activeNode && c.fromId === node.id));
               const isFaded = activeNode && !isActive && !isConnected;

               return (
                  <div key={node.id}
                      className={`map-node-html ${isActive ? 'active' : ''} ${isFaded ? 'faded' : ''}`}
                      onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                      style={{
                        left: node.x,
                        top: node.y,
                      }}>
                   <div className="node-dot" />
                   <div className="node-label-html">{node.label}</div>
                 </div>
               )
           })}
         </div>
       </div>
       <div className="semantic-map-info">
          {activeNodeData ? (
             <div className="node-detail fade-up">
                <h3>{activeNodeData.label}</h3>
                <p>{activeNodeData.description}</p>

                {map.connections.filter(c => c.fromId === activeNode || c.toId === activeNode).length > 0 && (
                  <div className="node-connections">
                    <h4>Ligações</h4>
                    <ul>
                      {map.connections.map((c, i) => {
                         if (c.fromId === activeNode) {
                           const to = positionedNodes.find(n => n.id === c.toId);
                           return <li key={i}>→ <strong>{to?.label}</strong>: {c.relationship}</li>
                         }
                         if (c.toId === activeNode) {
                           const from = positionedNodes.find(n => n.id === c.fromId);
                           return <li key={i}>← <strong>{from?.label}</strong>: {c.relationship}</li>
                         }
                         return null;
                      })}
                    </ul>
                  </div>
                )}
             </div>
          ) : (
             <div className="node-detail empty fade-up">
                <p>Clica num nó para explorar o conceito e as suas ligações semânticas de forma abstrata e sem spoilers.</p>
             </div>
          )}
       </div>
    </div>
  )
}

export function StudyPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId || '';
  const book = useGetBook(bookId, { query: { enabled: Boolean(bookId), queryKey: getGetBookQueryKey(bookId) } });

  const detail = book.data;
  const plan = detail?.plan;

  const availableTabs = useMemo(() => {
    if (!plan) return [];
    const tabs: { id: string; label: string; count?: number }[] = [];

    // New fields
    if (plan.visualCards && plan.visualCards.length > 0) tabs.push({ id: 'visualCards', label: 'Cartões Visuais', count: plan.visualCards.length });
    if (plan.linguisticDecks && plan.linguisticDecks.length > 0) {
       const itemCount = plan.linguisticDecks.reduce((acc, d) => acc + d.items.length, 0);
       tabs.push({ id: 'linguisticDecks', label: 'Decks Linguísticos', count: itemCount });
    }
    if (plan.semanticMap && plan.semanticMap.nodes.length > 0) tabs.push({ id: 'semanticMap', label: 'Mapa Semântico' });

    // Fallback if none of the above are populated
    if (tabs.length === 0) {
      if (plan.vocabulary) tabs.push({ id: 'vocabulary', label: 'Vocabulário', count: plan.vocabulary.length });
      if (plan.idioms) tabs.push({ id: 'idioms', label: 'Idiomas', count: plan.idioms.length });
      if (plan.phrasalVerbs) tabs.push({ id: 'phrasalVerbs', label: 'Phrasal verbs', count: plan.phrasalVerbs.length });
    }
    return tabs;
  }, [plan]);

  const [tab, setTab] = useState<string>('');
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [openDeck, setOpenDeck] = useState<string | null>(null);

  // Set default tab on load
  useEffect(() => {
    if (availableTabs.length > 0 && (!tab || !availableTabs.find(t => t.id === tab))) {
      setTab(availableTabs[0].id);
    }
  }, [availableTabs, tab]);

  useEffect(() => {
    if (tab === 'linguisticDecks' && plan?.linguisticDecks?.length && !openDeck) {
      setOpenDeck(plan.linguisticDecks[0].id);
    }
  }, [tab, plan, openDeck]);

  const toggleReview = (term: string) => setReviewed((items) => items.includes(term) ? items.filter((item) => item !== term) : [...items, term]);
  const pronounce = (term: string) => { if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(term)); };

  const { activeItems, totalReviewable } = useMemo(() => {
    if (tab === 'visualCards') return { activeItems: plan?.visualCards || [], totalReviewable: plan?.visualCards?.length || 0 };
    if (tab === 'linguisticDecks') {
       const items = plan?.linguisticDecks?.flatMap(d => d.items) || [];
       return { activeItems: items, totalReviewable: items.length };
    }
    if (tab === 'semanticMap') {
       return { activeItems: [], totalReviewable: 0 };
    }
    // legacy
     const items = (plan?.[tab as 'vocabulary' | 'idioms' | 'phrasalVerbs'] ?? []) as StudyItem[];
    return { activeItems: items, totalReviewable: items.length };
  }, [plan, tab]);

  const reviewedCount = useMemo(() => {
     return activeItems.filter((item: StudyItem | VisualStudyCard) => reviewed.includes(item.term)).length;
  }, [activeItems, reviewed]);

  if (book.isLoading) return <div className="page"><div className="skeleton" style={{ height:80, width:'70%' }} /><div className="skeleton" style={{ height:48, width:420, marginTop:40 }} /><div className="study-list" style={{ marginTop:22 }}><div className="skeleton" style={{ height:220 }} /><div className="skeleton" style={{ height:220 }} /></div></div>;
  if (book.isError || !detail || !plan) return <div className="page"><div className="error-state" data-testid="status-study-error"><h3>Esta leitura não está disponível</h3><p>Talvez tenha mudado de lugar. A tua biblioteca sabe onde procurar.</p><Link href="/library" className="button button-primary" data-testid="link-study-error-library">Voltar à biblioteca</Link></div></div>;

  return (
    <div className="page fade-up">
      <div className="study-head">
        <div>
          <Link href="/library" className="section-link" data-testid="link-back-library">
            <ArrowLeft size={13} style={{ verticalAlign:'-2px' }} /> Biblioteca
          </Link>
          <div className="study-bookline" style={{ marginTop:17 }}>
            <div className="study-cover" style={{ background:detail.coverColor || '#5064f5' }}>{detail.title}</div>
            <div>
              <h1 data-testid="text-study-book-title">{detail.title}</h1>
              <p>{detail.author} · plano para nível {detail.level}</p>
            </div>
          </div>
        </div>
        <div className="study-meta">
          {totalReviewable > 0 ? (
            <>
              <div>{reviewedCount} de {totalReviewable} explorados</div>
              <div className="progress-track" style={{ width:150 }}>
                <div className="progress-fill" style={{ width:`${totalReviewable ? (reviewedCount / totalReviewable) * 100 : 0}%` }} />
              </div>
            </>
          ) : (
             <div style={{ color: 'hsl(var(--muted-foreground))' }}>
               {tab === 'semanticMap' ? 'Exploração livre' : ''}
             </div>
          )}
        </div>
      </div>

      <div className="study-tabs" role="tablist" aria-label="Categorias de estudo">
        {availableTabs.map((t) => (
          <button
            key={t.id}
            className={`study-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            data-testid={`button-study-tab-${t.id}`}
          >
            {t.label} {t.count !== undefined && <span>({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="study-intro" data-testid="text-study-intro">{intros[tab] || ''}</div>

      <div className="study-content-area" style={{ marginTop: 24 }}>
        {tab === 'semanticMap' && plan.semanticMap && (
           <SemanticMapViz map={plan.semanticMap} />
        )}

        {tab === 'linguisticDecks' && plan.linguisticDecks && (
           <div className="decks-container">
             {plan.linguisticDecks.map(deck => {
                const isOpen = openDeck === deck.id;
                const deckReviewedCount = deck.items.filter(i => reviewed.includes(i.term)).length;

                return (
                   <div key={deck.id} className={`deck-group ${isOpen ? 'open' : ''}`}>
                      <button className="deck-header" onClick={() => setOpenDeck(isOpen ? null : deck.id)}>
                        <div className="deck-header-info">
                          <h3 className="deck-title">{deck.title}</h3>
                          <div className="deck-purpose">{deck.purpose}</div>
                        </div>
                        <div className="deck-header-meta">
                          <div className="deck-progress">
                            {deckReviewedCount} / {deck.items.length}
                          </div>
                          <ChevronDown size={18} className="deck-chevron" />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="deck-content fade-up">
                          <div className="study-list">
                            {deck.items.map(item => (
                                <StudyItemCard key={item.term} item={item} isReviewed={reviewed.includes(item.term)} toggleReview={toggleReview} pronounce={pronounce} showExample />
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                );
             })}
           </div>
        )}

        {['visualCards', 'vocabulary', 'idioms', 'phrasalVerbs'].includes(tab) && (
           activeItems.length === 0 ? (
             <div className="empty-state">
                <Headphones size={28} />
                <h3>Ainda não há itens aqui</h3>
                <p>Este plano ainda está a ganhar forma. Experimenta outra categoria enquanto isso.</p>
             </div>
           ) : (
             <div className="study-list">
                {activeItems.map((item: StudyItem | VisualStudyCard) => (
                  <StudyItemCard key={item.term} item={item} isReviewed={reviewed.includes(item.term)} toggleReview={toggleReview} pronounce={pronounce} showExample={tab === 'visualCards'} />
               ))}
             </div>
           )
        )}
      </div>

      {tab !== 'semanticMap' && activeItems.length > 0 && (
        <div style={{ marginTop:28, display:'flex', justifyContent:'center' }}>
          <button className="button button-quiet button-small" onClick={() => setReviewed([])} data-testid="button-reset-study">
             <RefreshCw size={14} /> Limpar marcações
          </button>
        </div>
      )}
    </div>
  );
}
