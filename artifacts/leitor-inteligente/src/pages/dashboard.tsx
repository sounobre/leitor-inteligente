import { ArrowRight, BookOpen, Check, Flame, Library, Sparkles, Timer, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { getGetDashboardQueryKey, useGetDashboard, getListBooksQueryKey, useListBooks } from '@workspace/api-client-react';
import { ImportDialog } from '@/components/import-dialog';
import { BookMeta } from '@/components/book-card';

function LoadingDashboard() {
  return <div className="page"><div className="skeleton" style={{ height:12, width:115 }} /><div className="skeleton" style={{ height:64, width:'58%', marginTop:14 }} /><div className="skeleton" style={{ height:18, width:320, marginTop:13 }} /><div className="stats-grid"><div className="skeleton" style={{ height:132 }} /><div className="skeleton" style={{ height:132 }} /><div className="skeleton" style={{ height:132 }} /></div></div>;
}

export function DashboardPage() {
  const [importOpen, setImportOpen] = useState(false);
  const dashboard = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const books = useListBooks({ query: { queryKey: getListBooksQueryKey() } });

  if (dashboard.isLoading) return <LoadingDashboard />;
  if (dashboard.isError) return <div className="page"><div className="error-state" data-testid="status-dashboard-error"><h3>O teu espaço está a descansar</h3><p>Não conseguimos carregar o teu progresso neste momento.</p><button className="button button-primary" onClick={() => dashboard.refetch()} data-testid="button-retry-dashboard">Tentar novamente</button></div></div>;

  const data = dashboard.data;
  const current = data?.currentBook;
  const bookList = Array.isArray(books.data) ? books.data : [];
  const recent = bookList.filter((book) => book.id !== current?.id).slice(0, 3);
  return (
    <div className="page fade-up">
      <div className="top-row">
        <div><div className="eyebrow">terça-feira · 12 de março</div><h1 className="page-title">Olá, <em>Inês.</em><br />Vamos ler um pouco?</h1><p className="lead">Uma leitura atenta começa antes da primeira página. Hoje, prepara o ouvido para o inglês de <strong>{current?.title || 'uma nova história'}</strong>.</p></div>
        <button className="button button-accent" onClick={() => setImportOpen(true)} data-testid="button-open-import-dashboard"><BookOpen size={16} /> Adicionar leitura</button>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-label">minutos hoje</span><span className="stat-number" data-testid="text-minutes-today">{data?.minutesToday ?? 0}</span><span className="stat-note">de 25 recomendados</span><span className="stat-orbit" /></div>
        <div className="stat-card"><span className="stat-label">sequência</span><span className="stat-number" data-testid="text-streak">{data?.streak ?? 0}<small style={{ fontSize:18, letterSpacing:'-.02em' }}> dias</small></span><span className="stat-note"><Flame size={13} style={{ verticalAlign:'-2px' }} /> continua acesa</span></div>
        <div className="stat-card"><span className="stat-label">palavras aprendidas</span><span className="stat-number" data-testid="text-words-learned">{data?.wordsLearned ?? 0}</span><span className="stat-note"><TrendingUp size={13} style={{ verticalAlign:'-2px' }} /> no teu ritmo</span></div>
      </div>
      <div className="section-head"><h2>A leitura de agora</h2>{current && <Link href="/library" className="section-link" data-testid="link-dashboard-library">Ver biblioteca <ArrowRight size={13} style={{ verticalAlign:'-2px' }} /></Link>}</div>
      {current ? (
        <div className="current-card">
          <div className="cover" style={{ background: current.coverColor || '#5064f5' }}><span className="cover-title">{current.title}</span><small>{current.sourceType === 'ARTICLE' ? 'artigo' : 'epub'} · {current.level}</small></div>
          <div className="current-info"><div className="eyebrow">em progresso</div><h3 data-testid="text-current-book-title">{current.title}</h3><p>{current.author}</p><div className="progress-row"><span>progresso da leitura</span><span data-testid="text-current-progress">{current.progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width:`${Math.min(100, Math.max(0, current.progress))}%` }} /></div><div className="current-actions"><Link href={`/study/${current.id}`} className="button button-primary" data-testid="link-continue-study">Continuar estudo <ArrowRight size={15} /></Link><BookMeta book={current} /></div></div>
        </div>
      ) : (
        <div className="empty-state"><Library size={28} /><h3>A tua mesa está à espera</h3><p>Importa um livro ou artigo e começamos por encontrar as palavras que merecem atenção.</p><button className="button button-primary" onClick={() => setImportOpen(true)} data-testid="button-open-import-empty">Importar primeira leitura</button></div>
      )}
      <div className="section-head"><h2>O pequeno ritual de hoje</h2><span className="eyebrow" style={{ color:'hsl(var(--muted-foreground))' }}>3 gestos, sem pressa</span></div>
      <div className="routine-grid">
        <div className={`routine-card ${Number(data?.minutesToday ?? 0) >= 10 ? 'done' : ''}`}><div className="routine-top"><Timer size={18} /><span>{Number(data?.minutesToday ?? 0) >= 10 ? <Check size={17} /> : '01'}</span></div><h3>Ouve o texto</h3><p>10 minutos a ler sem parar para traduzir.</p></div>
        <div className="routine-card"><div className="routine-top"><Sparkles size={18} /><span>02</span></div><h3>Escolhe 5 palavras</h3><p>As que voltaram a aparecer. As que te fizeram parar.</p></div>
        <div className="routine-card"><div className="routine-top"><BookOpen size={18} /><span>03</span></div><h3>Volta ao contexto</h3><p>Repara como cada expressão muda a cena.</p></div>
      </div>
      {recent.length > 0 && <><div className="section-head"><h2>Vistas recentemente</h2><Link href="/library" className="section-link" data-testid="link-dashboard-library-recent">Toda a biblioteca <ArrowRight size={13} style={{ verticalAlign:'-2px' }} /></Link></div><div className="library-grid">{recent.map((book) => <Link key={book.id} href={`/study/${book.id}`} className="book-card" data-testid={`card-recent-book-${book.id}`}><div className="book-cover" style={{ background: book.coverColor || '#5064f5' }}><span className="cover-title">{book.title}</span></div><div className="book-info"><h3>{book.title}</h3><p>{book.author}</p></div></Link>)}</div></>}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}