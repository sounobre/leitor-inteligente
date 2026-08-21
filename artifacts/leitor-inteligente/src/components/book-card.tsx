import { ArrowUpRight, BookOpenText, Clock3, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

export type BookShape = { id: string; title: string; author: string; sourceType: string; status: string; level: string; progress: number; coverColor: string; updatedAt: string };

export function BookCard({ book, onDelete }: { book: BookShape; onDelete?: (book: BookShape) => void }) {
  const statusLabel = book.status === 'PROCESSING' ? 'A preparar' : book.status === 'DRAFT' ? 'Rascunho' : `${book.progress}% lido`;
  return (
    <div className="book-card fade-up" data-testid={`card-book-${book.id}`}>
      <Link href={`/study/${book.id}`} className="book-card-link">
        <div className="book-cover" style={{ background: book.coverColor || '#5064f5' }}>
          <span className="badge">{book.sourceType === 'ARTICLE' ? 'ARTIGO' : 'EPUB'}</span>
          <span className="cover-title">{book.title}</span>
        </div>
        <div className="book-info">
          <h3>{book.title}</h3>
          <p>{book.author}</p>
          <div className="book-foot">
            <span className={book.status === 'PROCESSING' ? 'badge processing' : 'badge'}>{statusLabel}</span>
            <span><ArrowUpRight size={13} /></span>
          </div>
        </div>
      </Link>
      {onDelete && <button
        type="button"
        className="book-delete"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); onDelete(book); }}
        aria-label={`Apagar ${book.title}`}
        title="Apagar da biblioteca"
        data-testid={`button-delete-book-${book.id}`}
      >
        <Trash2 size={15} />
      </button>}
    </div>
  );
}

export function BookMeta({ book }: { book: BookShape }) {
  return <div className="mini-meta"><span><BookOpenText size={13} />{book.level || 'Intermédio'}</span><span><Clock3 size={13} /> leitura guiada</span></div>;
}