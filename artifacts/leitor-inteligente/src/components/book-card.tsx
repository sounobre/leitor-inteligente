import { ArrowUpRight, BookOpenText, Clock3 } from 'lucide-react';
import { Link } from 'wouter';

export type BookShape = { id: string; title: string; author: string; sourceType: string; status: string; level: string; progress: number; coverColor: string; updatedAt: string };

export function BookCard({ book }: { book: BookShape }) {
  const statusLabel = book.status === 'PROCESSING' ? 'A preparar' : book.status === 'DRAFT' ? 'Rascunho' : `${book.progress}% lido`;
  return (
    <Link href={`/study/${book.id}`} className="book-card fade-up" data-testid={`card-book-${book.id}`}>
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
  );
}

export function BookMeta({ book }: { book: BookShape }) {
  return <div className="mini-meta"><span><BookOpenText size={13} />{book.level || 'Intermédio'}</span><span><Clock3 size={13} /> leitura guiada</span></div>;
}