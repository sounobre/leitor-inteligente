import { BookMarked, BookOpen, FilePlus2, Library as LibraryIcon, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getListBooksQueryKey, useListBooks } from '@workspace/api-client-react';
import { BookCard } from '@/components/book-card';
import { ImportDialog } from '@/components/import-dialog';
import { FANTASY_TRAIL_CARD, SPECIALISTS_CARD } from '@/routes';

type Filter = 'all' | 'reading' | 'ready';

export function LibraryPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const books = useListBooks({ query: { queryKey: getListBooksQueryKey() } });
  const bookList = Array.isArray(books.data) ? books.data : [];
  const filtered = useMemo(() => bookList.filter((book) => filter === 'all' || (filter === 'reading' ? book.progress > 0 && book.progress < 100 : book.progress >= 100)), [bookList, filter]);
  const deleteBook = async (book: (typeof bookList)[number]) => {
    if (!window.confirm(`Apagar "${book.title}" da biblioteca? Esta ação remove o livro e os seus materiais de estudo.`)) return;
    setDeleteError('');
    setDeletingId(book.id);
    try {
      const response = await fetch(`/api/books/${encodeURIComponent(book.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível apagar esta leitura.');
      await queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível apagar esta leitura.');
    } finally {
      setDeletingId(null);
    }
  };

  return <div className="page fade-up">
    <div className="top-row"><div><div className="eyebrow">sua estante</div><h1 className="page-title">Biblioteca <em>viva.</em></h1><p className="lead">Cada livro aqui tem um próximo passo. Escolha uma leitura, abra o plano e deixe o inglês se aproximar.</p></div><button className="button button-primary" onClick={() => setImportOpen(true)} data-testid="button-open-import-library"><FilePlus2 size={16} /> Importar leitura</button></div>

    <div className="section-head" style={{ marginTop: '42px', marginBottom: '17px' }}>
      <h2>Trilhas de exploração</h2>
    </div>
    <div className="trails-grid">
      <Link href={FANTASY_TRAIL_CARD.href} className="trail-card" data-testid="link-trail-fantasy">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--primary))' }}>
          <Sparkles size={16} />
          <span style={{ font: '10px var(--app-font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Gênero literário</span>
        </div>
        <h3 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.04em' }}>{FANTASY_TRAIL_CARD.title}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
          {FANTASY_TRAIL_CARD.description}
        </p>
      </Link>
      <Link href={SPECIALISTS_CARD.href} className="trail-card" data-testid="link-specialists">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--primary))' }}>
          <BookMarked size={16} />
          <span style={{ font: '10px var(--app-font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Estudo guiado</span>
        </div>
        <h3 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.04em' }}>{SPECIALISTS_CARD.title}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
          {SPECIALISTS_CARD.description}
        </p>
      </Link>
    </div>

    <div className="section-head" style={{ marginTop: '42px', marginBottom: '17px' }}>
      <h2>Suas leituras</h2>
    </div>
    <div className="filter-row" role="tablist" aria-label="Filtrar biblioteca">
      {([['all','Tudo'],['reading','Em leitura'],['ready','Terminados']] as [Filter,string][]).map(([value,label]) => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value} data-testid={`button-filter-${value}`}>{label}</button>)}
    </div>
    {books.isLoading ? <div className="library-grid">{[1,2,3].map((item) => <div key={item} className="skeleton" style={{ height:310 }} />)}</div> :
      books.isError ? <div className="error-state" style={{ marginTop:30 }} data-testid="status-library-error"><h3>A estante não abriu</h3><p>Houve um problema ao carregar suas leituras.</p><button className="button button-primary" onClick={() => books.refetch()} data-testid="button-retry-library"><RefreshCw size={14} /> Tentar novamente</button></div> :
      filtered.length > 0 ? <div className="library-grid">{filtered.map((book) => <BookCard key={book.id} book={book} onDelete={deletingId === book.id ? undefined : deleteBook} />)}</div> :
      <div className="empty-state" style={{ marginTop:30 }} data-testid="status-library-empty"><LibraryIcon size={31} /><h3>{filter === 'all' ? 'Ainda não há livros na estante' : 'Nenhuma leitura neste recorte'}</h3><p>{filter === 'all' ? 'Começa com um EPUB ou um artigo que te dê vontade de voltar amanhã.' : 'Experimenta outro filtro ou escolhe uma nova leitura para continuar.'}</p>{filter === 'all' && <button className="button button-primary" onClick={() => setImportOpen(true)} data-testid="button-open-import-empty-library"><BookOpen size={15} /> Abrir primeira leitura</button>}</div>}
    {deleteError && <div className="error-state" style={{ marginTop:20 }} role="alert">{deleteError}</div>}
    <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
  </div>;
}