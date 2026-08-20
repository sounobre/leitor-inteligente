import { BookOpen, FilePlus2, Library as LibraryIcon, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getListBooksQueryKey, useListBooks } from '@workspace/api-client-react';
import { BookCard } from '@/components/book-card';
import { ImportDialog } from '@/components/import-dialog';

type Filter = 'all' | 'reading' | 'ready';

export function LibraryPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [importOpen, setImportOpen] = useState(false);
  const books = useListBooks({ query: { queryKey: getListBooksQueryKey() } });
  const filtered = useMemo(() => (books.data ?? []).filter((book) => filter === 'all' || (filter === 'reading' ? book.progress > 0 && book.progress < 100 : book.progress >= 100)), [books.data, filter]);

  return <div className="page fade-up">
    <div className="top-row"><div><div className="eyebrow">a tua estante</div><h1 className="page-title">Biblioteca <em>viva.</em></h1><p className="lead">Cada livro aqui tem um próximo passo. Escolhe uma leitura, abre o plano e deixa o inglês aproximar-se.</p></div><button className="button button-primary" onClick={() => setImportOpen(true)} data-testid="button-open-import-library"><FilePlus2 size={16} /> Importar leitura</button></div>
    <div className="filter-row" role="tablist" aria-label="Filtrar biblioteca">
      {([['all','Tudo'],['reading','Em leitura'],['ready','Terminados']] as [Filter,string][]).map(([value,label]) => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value} data-testid={`button-filter-${value}`}>{label}</button>)}
    </div>
    {books.isLoading ? <div className="library-grid">{[1,2,3].map((item) => <div key={item} className="skeleton" style={{ height:310 }} />)}</div> :
      books.isError ? <div className="error-state" style={{ marginTop:30 }} data-testid="status-library-error"><h3>A estante não abriu</h3><p>Houve um problema a carregar as tuas leituras.</p><button className="button button-primary" onClick={() => books.refetch()} data-testid="button-retry-library"><RefreshCw size={14} /> Tentar novamente</button></div> :
      filtered.length > 0 ? <div className="library-grid">{filtered.map((book) => <BookCard key={book.id} book={book} />)}</div> :
      <div className="empty-state" style={{ marginTop:30 }} data-testid="status-library-empty"><LibraryIcon size={31} /><h3>{filter === 'all' ? 'Ainda não há livros na estante' : 'Nenhuma leitura neste recorte'}</h3><p>{filter === 'all' ? 'Começa com um EPUB ou um artigo que te dê vontade de voltar amanhã.' : 'Experimenta outro filtro ou escolhe uma nova leitura para continuar.'}</p>{filter === 'all' && <button className="button button-primary" onClick={() => setImportOpen(true)} data-testid="button-open-import-empty-library"><BookOpen size={15} /> Abrir primeira leitura</button>}</div>}
    <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
  </div>;
}