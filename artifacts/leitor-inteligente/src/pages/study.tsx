import { ArrowLeft, Check, CheckCircle2, Headphones, RefreshCw, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { getGetBookQueryKey, useGetBook } from '@workspace/api-client-react';

type Tab = 'vocabulary' | 'idioms' | 'phrasalVerbs';
const tabLabels: Record<Tab, string> = { vocabulary: 'Vocabulário', idioms: 'Idiomas', phrasalVerbs: 'Phrasal verbs' };
const intros: Record<Tab, string> = {
  vocabulary: 'Palavras que dão textura à história. Não precisas de as decorar hoje — reconhecê-las outra vez já é progresso.',
  idioms: 'Expressões que não se traduzem palavra por palavra. Guarda a intenção, não apenas o significado.',
  phrasalVerbs: 'Pequenos verbos com movimento. São o pulso do inglês do dia a dia.',
};

export function StudyPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId || '';
  const book = useGetBook(bookId, { query: { enabled: Boolean(bookId), queryKey: getGetBookQueryKey(bookId) } });
  const [tab, setTab] = useState<Tab>('vocabulary');
  const [reviewed, setReviewed] = useState<string[]>([]);
  const activeItems = useMemo(() => book.data?.plan?.[tab] ?? [], [book.data, tab]);
  const reviewedCount = reviewed.length;
  const toggleReview = (term: string) => setReviewed((items) => items.includes(term) ? items.filter((item) => item !== term) : [...items, term]);
  const pronounce = (term: string) => { if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(term)); };

  if (book.isLoading) return <div className="page"><div className="skeleton" style={{ height:80, width:'70%' }} /><div className="skeleton" style={{ height:48, width:420, marginTop:40 }} /><div className="study-list" style={{ marginTop:22 }}><div className="skeleton" style={{ height:220 }} /><div className="skeleton" style={{ height:220 }} /></div></div>;
  if (book.isError || !book.data) return <div className="page"><div className="error-state" data-testid="status-study-error"><h3>Esta leitura não está disponível</h3><p>Talvez tenha mudado de lugar. A tua biblioteca sabe onde procurar.</p><Link href="/library" className="button button-primary" data-testid="link-study-error-library">Voltar à biblioteca</Link></div></div>;

  const detail = book.data;
  return <div className="page fade-up">
    <div className="study-head"><div><Link href="/library" className="section-link" data-testid="link-back-library"><ArrowLeft size={13} style={{ verticalAlign:'-2px' }} /> Biblioteca</Link><div className="study-bookline" style={{ marginTop:17 }}><div className="study-cover" style={{ background:detail.coverColor || '#5064f5' }}>{detail.title}</div><div><h1 data-testid="text-study-book-title">{detail.title}</h1><p>{detail.author} · plano para nível {detail.level}</p></div></div></div><div className="study-meta"><div>{reviewedCount} de {activeItems.length} revistos</div><div className="progress-track" style={{ width:150 }}><div className="progress-fill" style={{ width:`${activeItems.length ? reviewedCount / activeItems.length * 100 : 0}%` }} /></div></div></div>
    <div className="study-tabs" role="tablist" aria-label="Categorias de estudo">{(Object.keys(tabLabels) as Tab[]).map((key) => <button key={key} className={`study-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} role="tab" aria-selected={tab === key} data-testid={`button-study-tab-${key}`}>{tabLabels[key]} <span>({detail.plan?.[key]?.length ?? 0})</span></button>)}</div>
    <div className="study-intro" data-testid="text-study-intro">{intros[tab]}</div>
    {activeItems.length === 0 ? <div className="empty-state"><Headphones size={28} /><h3>Ainda não há itens aqui</h3><p>Este plano ainda está a ganhar forma. Experimenta outra categoria enquanto isso.</p></div> :
      <div className="study-list">{activeItems.map((item) => { const isReviewed = reviewed.includes(item.term); return <article key={item.term} className={`study-item ${isReviewed ? 'reviewed' : ''}`} data-testid={`card-study-item-${item.term.replaceAll(' ','-')}`}><div className="item-top"><div><div className="term">{item.term}</div><div className="pronunciation">{item.pronunciation}</div></div><button className="icon-button" onClick={() => pronounce(item.term)} aria-label={`Ouvir ${item.term}`} data-testid={`button-pronounce-${item.term.replaceAll(' ','-')}`}><Volume2 size={15} /></button></div><div className="item-meaning">{item.meaning}</div><div className="item-example">“{item.example}”</div><div className="item-bottom"><span className="difficulty">{item.difficulty}</span><button className={`icon-button ${isReviewed ? 'reviewed' : ''}`} onClick={() => toggleReview(item.term)} aria-label={isReviewed ? `Desmarcar ${item.term}` : `Marcar ${item.term} como revisto`} data-testid={`button-review-${item.term.replaceAll(' ','-')}`}>{isReviewed ? <Check size={15} /> : <CheckCircle2 size={15} />}</button></div></article>; })}</div>}
    <div style={{ marginTop:28, display:'flex', justifyContent:'center' }}><button className="button button-quiet button-small" onClick={() => setReviewed([])} data-testid="button-reset-study"><RefreshCw size={14} /> Recomeçar esta categoria</button></div>
  </div>;
}