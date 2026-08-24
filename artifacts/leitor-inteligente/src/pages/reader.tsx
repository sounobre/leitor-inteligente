import { ArrowLeft, Check, ChevronLeft, ChevronRight, List, RefreshCw, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { clampChapter, getChapterProgress, getInitialChapterIndex, getRestoredOffset, loadReaderBook } from './reader-logic';

type Chapter = { id: string; position: number; title: string; content: string; wordCount: number };
type Book = { id: string; title: string; author: string; progress: number; readingChapter: number; readingOffset: number; chapters: Chapter[] };
type VocabularyWord = { term: string; normalizedTerm: string; occurrences: number; chapters: number[]; cardCreated: boolean };

export function ReaderPage() {
  const [, params] = useRoute('/read/:bookId');
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const wordRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPosition = useRef<{ chapter: number; offset: number; progress: number } | null>(null);
  const restoredPosition = useRef<string | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [vocabularyQuery, setVocabularyQuery] = useState('');
  const [selectedVocabulary, setSelectedVocabulary] = useState<string[]>([]);
  const [vocabularyMessage, setVocabularyMessage] = useState('');
  useEffect(() => {
    loadReaderBook<Book>(params?.bookId ?? '')
      .then((data: Book) => {
        setBook(data);
        setChapter(getInitialChapterIndex(data.readingChapter, data.chapters?.length ?? 0));
      })
      .catch(() => setBook(null));
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [params?.bookId]);
  useEffect(() => {
    if (!params?.bookId) return;
    fetch(`/api/books/${encodeURIComponent(params.bookId)}/vocabulary?limit=100`)
      .then((response) => response.ok ? response.json() as Promise<VocabularyWord[]> : Promise.reject(new Error('vocabulary')))
      .then(setVocabulary)
      .catch(() => setVocabularyMessage('Não foi possível carregar o vocabulário deste livro.'));
  }, [params?.bookId]);
  useEffect(() => {
    const flushPosition = () => {
      if (!book || !pendingPosition.current) return;
      void fetch(`/api/books/${encodeURIComponent(book.id)}/reading-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPosition.current),
        keepalive: true,
      });
    };
    window.addEventListener('pagehide', flushPosition);
    return () => window.removeEventListener('pagehide', flushPosition);
  }, [book]);
  const current = book?.chapters?.[chapter];
  const words = useMemo(() => current?.content.trim().split(/\s+/).filter(Boolean) ?? [], [current]);
  const persistPosition = (nextChapter: number, offset: number, progress: number, immediate = false) => {
    if (!book) return;
    pendingPosition.current = { chapter: nextChapter, offset, progress };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const save = () => {
      const position = pendingPosition.current;
      if (!position) return;
      setSaveState('saving');
      fetch(`/api/books/${encodeURIComponent(book.id)}/reading-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position),
      }).then((response) => {
        if (!response.ok) throw new Error(`Falha ao salvar posição: ${response.status}`);
        if (pendingPosition.current === position) {
          pendingPosition.current = null;
          setSaveState('saved');
        }
      }).catch(() => {
        if (pendingPosition.current === position) setSaveState('failed');
      });
    };
    if (immediate) save();
    else saveTimer.current = setTimeout(save, 450);
  };
  useEffect(() => {
    if (!book || !current || restoredPosition.current === `${book.id}:${chapter}`) return;
    restoredPosition.current = `${book.id}:${chapter}`;
    const offset = getRestoredOffset(book.readingChapter, book.readingOffset, chapter, words.length);
    if (offset > 0) {
      requestAnimationFrame(() => wordRefs.current[offset]?.scrollIntoView({ block: 'center', behavior: 'auto' }));
    }
  }, [book, chapter, current, words.length]);
  useEffect(() => {
    const onScroll = () => {
      if (!book || !current || words.length === 0) return;
      const viewportMiddle = window.innerHeight * 0.35;
      let visibleOffset = 0;
      for (let index = 0; index < words.length; index += 1) {
        const element = wordRefs.current[index];
        if (element && element.getBoundingClientRect().top <= viewportMiddle) visibleOffset = index;
        else if (element) break;
      }
      const progress = getChapterProgress(chapter, visibleOffset, words.length, book.chapters.length);
      persistPosition(chapter + 1, visibleOffset, progress);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [book, chapter, current, words.length]);
  const go = (next: number) => {
    if (!book) return;
    const index = clampChapter(next, book.chapters.length);
    setChapter(index);
    const progress = Math.round(((index + 1) / book.chapters.length) * 100);
    persistPosition(index + 1, 0, progress, true);
  };
  const visibleVocabulary = vocabulary.filter((word) => word.term.toLocaleLowerCase().includes(vocabularyQuery.toLocaleLowerCase().trim()));
  const toggleVocabulary = (term: string) => setSelectedVocabulary((items) => items.includes(term) ? items.filter((item) => item !== term) : [...items, term]);
  const createVocabularyCards = async () => {
    if (!book || selectedVocabulary.length === 0) return;
    const response = await fetch(`/api/books/${encodeURIComponent(book.id)}/vocabulary/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ normalizedTerms: selectedVocabulary }) });
    if (!response.ok) { setVocabularyMessage('Não foi possível criar os cards.'); return; }
    const data = await response.json() as { created: number };
    setVocabulary((items) => items.map((word) => selectedVocabulary.includes(word.normalizedTerm) ? { ...word, cardCreated: true } : word));
    setSelectedVocabulary([]);
    setVocabularyMessage(`${data.created} card${data.created === 1 ? '' : 's'} criado${data.created === 1 ? '' : 's'} para estudo.`);
  };
  if (!book) return <div className="page"><div className="empty-state"><h2>Não foi possível abrir este livro</h2><p>Verifica se ele está disponível na biblioteca.</p><Link href="/library" className="button button-primary">Voltar à biblioteca</Link></div></div>;
   const saveLabel = saveState === 'saved' ? 'posição salva' : saveState === 'saving' ? 'salvando posição…' : saveState === 'failed' ? 'posição não enviada' : 'leitura offline no navegador';
   return <div className="page fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
     <div className="top-row"><div><Link href="/library" className="text-link"><ArrowLeft size={15}/> Biblioteca</Link><div className="eyebrow" style={{ marginTop: 22 }}>leitura em andamento</div><h1 className="page-title">{book.title}</h1><p className="lead">{book.author} · {book.progress}% concluído</p></div><span className={`badge ${saveState === 'failed' ? 'save-failed' : ''}`}>{saveLabel}</span></div>
     {saveState === 'failed' && <div className="save-warning" role="alert"><span>A última posição ficou pendente. Tente enviar novamente para continuar de onde parou.</span><button className="button button-small button-quiet" onClick={() => { if (pendingPosition.current) persistPosition(pendingPosition.current.chapter, pendingPosition.current.offset, pendingPosition.current.progress, true); }}><RefreshCw size={14}/> Tentar novamente</button></div>}
    <div className="reader-layout" style={{ marginTop: 34, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }}>
      <aside className="panel" style={{ alignSelf: 'start', position: 'sticky', top: 24 }}><div className="section-head"><h2><List size={16}/> Índice</h2></div>{book.chapters.map((item, index) => <button key={item.id} className={`filter ${index === chapter ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={() => go(index)}>{index + 1}. {item.title || 'Capítulo'}</button>)}</aside>
       <main className="reader-content panel"><div className="eyebrow">capítulo {chapter + 1} de {book.chapters.length}</div><h2 style={{ fontSize: 34, margin: '8px 0 24px' }}>{current?.title || 'Leitura'}</h2><div className="reader-prose">{words.map((word, index) => <span key={`${index}-${word}`} ref={(element) => { wordRefs.current[index] = element; }}>{word} </span>)}</div><div className="reader-controls"><button className="button button-secondary" disabled={chapter === 0} onClick={() => go(chapter - 1)}><ChevronLeft size={16}/> Anterior</button><span>{current?.wordCount ?? words.length} palavras <Save size={13}/></span><button className="button button-primary" disabled={chapter >= book.chapters.length - 1} onClick={() => go(chapter + 1)}>Próximo <ChevronRight size={16}/></button></div></main>
    </div>
     <section className="panel" style={{ marginTop: 28 }} aria-labelledby="book-vocabulary-title">
       <div className="section-head"><div><div className="eyebrow">vocabulário do livro</div><h2 id="book-vocabulary-title">Todas as palavras, sem repetição</h2><p className="lead">{vocabulary.length} palavras únicas encontradas nos capítulos.</p></div><button className="button button-primary" disabled={selectedVocabulary.length === 0} onClick={() => void createVocabularyCards()}><Check size={15}/> Criar {selectedVocabulary.length || ''} card{selectedVocabulary.length === 1 ? '' : 's'}</button></div>
       <div className="search-field" style={{ margin: '18px 0' }}><Search size={15}/><input value={vocabularyQuery} onChange={(event) => setVocabularyQuery(event.target.value)} placeholder="Buscar uma palavra do livro" aria-label="Buscar no vocabulário do livro" /></div>
       {vocabularyMessage && <p role="status" className="lead">{vocabularyMessage}</p>}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>{visibleVocabulary.map((word) => <button key={word.normalizedTerm} type="button" onClick={() => !word.cardCreated && toggleVocabulary(word.normalizedTerm)} disabled={word.cardCreated} className={`filter ${selectedVocabulary.includes(word.normalizedTerm) ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }} title={`${word.occurrences} ocorrência${word.occurrences === 1 ? '' : 's'} · capítulo${word.chapters.length === 1 ? '' : 's'} ${word.chapters.join(', ')}`}><span>{word.term}</span><small>{word.cardCreated ? 'card' : word.occurrences} </small></button>)}</div>
       {visibleVocabulary.length === 0 && <p className="lead">Nenhuma palavra encontrada.</p>}
     </section>
  </div>;
}