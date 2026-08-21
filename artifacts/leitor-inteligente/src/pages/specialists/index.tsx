import { useMemo, useState } from 'react';
import { BookMarked, Check, CheckCircle2, ChevronLeft, Circle, Info, Search } from 'lucide-react';
import { Link } from 'wouter';
import {
  filterSpecialistItems,
  getReviewStatus,
  loadReviewStatuses,
  saveReviewStatuses,
  specialistsData,
  type ReviewStatus,
  type ReviewStatusMap,
  type SpecialistItem,
  type StudyLevel,
} from './specialist-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const levels: Array<StudyLevel | 'Todos'> = ['Todos', 'Essencial', 'Aprofundamento', 'Desafio'];
const reviews: Array<ReviewStatus | 'Todos'> = ['Todos', 'Pendente', 'Estudado', 'Dominado'];

const nextReviewStatus: Record<ReviewStatus, ReviewStatus> = {
  Pendente: 'Estudado',
  Estudado: 'Dominado',
  Dominado: 'Pendente',
};

function statusClass(status: ReviewStatus) {
  return status.toLocaleLowerCase('pt-BR');
}

export function SpecialistsPage() {
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(specialistsData[0].id);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<StudyLevel | 'Todos'>('Todos');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | 'Todos'>('Todos');
  const [reviewStatuses, setReviewStatuses] = useState<ReviewStatusMap>(() => (
    typeof window === 'undefined' ? {} : loadReviewStatuses(window.localStorage)
  ));
  const [selectedItem, setSelectedItem] = useState<SpecialistItem | null>(null);

  const activeSpecialist = specialistsData.find((specialist) => specialist.id === selectedSpecialistId) ?? specialistsData[0];
  const items = useMemo(
    () => filterSpecialistItems(activeSpecialist, search, level, reviewFilter, reviewStatuses),
    [activeSpecialist, level, reviewFilter, reviewStatuses, search],
  );
  const studiedCount = activeSpecialist.items.filter((item) => getReviewStatus(item.id, reviewStatuses) !== 'Pendente').length;

  const selectSpecialist = (id: string) => {
    setSelectedSpecialistId(id);
    setSearch('');
    setLevel('Todos');
    setReviewFilter('Todos');
  };

  const advanceReviewStatus = (itemId: string) => {
    setReviewStatuses((current) => {
      const next = { ...current, [itemId]: nextReviewStatus[getReviewStatus(itemId, current)] };
      saveReviewStatuses(next, window.localStorage);
      return next;
    });
  };

  return (
    <div className="page specialists-page fade-up">
      <Link href="/library" className="button button-quiet button-small specialists-back-link">
        <ChevronLeft size={14} /> Voltar à Biblioteca
      </Link>

      <header className="specialists-hero">
        <div className="eyebrow"><BookMarked size={14} /> Áreas de estudo</div>
        <h1>Aprenda por <em>especialidade.</em></h1>
        <p>Estude um padrão de cada vez. Cada especialista apresenta exemplos naturais, explicações em português do Brasil e campos que fazem sentido para aquele tipo de inglês.</p>
        <div className="specialists-hero-meta">
          <strong>{specialistsData.length} especialistas disponíveis</strong>
          <span>Progresso salvo neste navegador.</span>
        </div>
      </header>

      <section className="specialist-picker" aria-label="Escolher especialista">
        {specialistsData.map((specialist) => (
          <button
            key={specialist.id}
            className={`specialist-picker-item ${activeSpecialist.id === specialist.id ? 'active' : ''}`}
            onClick={() => selectSpecialist(specialist.id)}
            aria-pressed={activeSpecialist.id === specialist.id}
            data-testid={`specialist-${specialist.id}`}
          >
            <span>{specialist.title}</span>
            <small>{specialist.items.length}</small>
          </button>
        ))}
      </section>

      <section className="specialist-workspace">
        <aside className="specialist-summary">
          <div className="specialist-summary-title">
            <span className="eyebrow">Especialista selecionado</span>
            <h2>{activeSpecialist.title}</h2>
            <p>{activeSpecialist.summary}</p>
          </div>
          <div className="specialist-progress">
            <div><span>Progresso</span><strong>{studiedCount}/{activeSpecialist.items.length}</strong></div>
            <div className="progress-track" aria-label={`${studiedCount} de ${activeSpecialist.items.length} itens estudados`}>
              <div className="progress-fill" style={{ width: `${activeSpecialist.items.length ? (studiedCount / activeSpecialist.items.length) * 100 : 0}%` }} />
            </div>
            <small>Marque um item como estudado e depois como dominado ao revisar.</small>
          </div>
        </aside>

        <div className="specialist-catalog">
          <div className="specialist-toolbar">
            <div className="trail-search-wrap specialist-search">
              <Search size={17} aria-hidden="true" />
              <label htmlFor="specialist-search">Buscar no especialista</label>
              <input
                id="specialist-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar termo, tradução ou explicação"
                data-testid="input-specialist-search"
              />
              {search && <button className="trail-search-clear" onClick={() => setSearch('')}>Limpar</button>}
            </div>
            <div className="specialist-filter-group" aria-label="Filtrar catálogo">
              <label>
                <span>Nível</span>
                <select value={level} onChange={(event) => setLevel(event.target.value as StudyLevel | 'Todos')} data-testid="select-specialist-level">
                  {levels.map((option) => <option key={option} value={option}>{option === 'Todos' ? 'Todos os níveis' : option}</option>)}
                </select>
              </label>
              <label>
                <span>Revisão</span>
                <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewStatus | 'Todos')} data-testid="select-specialist-review">
                  {reviews.map((option) => <option key={option} value={option}>{option === 'Todos' ? 'Todos os estados' : option}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="specialist-result-count" role="status">
            Mostrando {items.length} de {activeSpecialist.items.length} {activeSpecialist.itemNoun}
          </div>

          {items.length === 0 ? (
            <div className="trail-empty">Nenhum item corresponde aos filtros. Tente buscar outro termo ou remover um filtro.</div>
          ) : (
            <>
              <div className="specialist-table-wrap">
                <table className="specialist-table">
                  <thead>
                    <tr>
                      <th>Inglês</th>
                      <th>Português</th>
                      {activeSpecialist.columns.map((column) => <th key={column.key}>{column.label}</th>)}
                      <th>Exemplo</th>
                      <th>Nível</th>
                      <th>Revisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const status = getReviewStatus(item.id, reviewStatuses);
                      return (
                        <tr key={item.id} onClick={() => setSelectedItem(item)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedItem(item)}>
                          <td><strong>{item.term}</strong><button className="specialist-detail-link">Ver detalhes</button></td>
                          <td>{item.translation}</td>
                          {activeSpecialist.columns.map((column) => <td key={column.key}>{item.details[column.key]}</td>)}
                          <td className="specialist-example-cell">“{item.example}”</td>
                          <td><span className={`trail-item-level ${item.level.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{item.level}</span></td>
                          <td>
                            <button
                              className={`specialist-status ${statusClass(status)}`}
                              onClick={(event) => { event.stopPropagation(); advanceReviewStatus(item.id); }}
                              aria-label={`Alterar status de ${item.term}: ${status}`}
                            >
                              {status === 'Pendente' ? <Circle size={14} /> : status === 'Estudado' ? <CheckCircle2 size={14} /> : <Check size={14} />}
                              {status}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="specialist-mobile-list">
                {items.map((item) => {
                  const status = getReviewStatus(item.id, reviewStatuses);
                  return (
                    <article className="specialist-mobile-card" key={item.id} onClick={() => setSelectedItem(item)}>
                      <div className="specialist-mobile-card-head">
                        <div><h3>{item.term}</h3><p>{item.translation}</p></div>
                        <button className={`specialist-status ${statusClass(status)}`} onClick={(event) => { event.stopPropagation(); advanceReviewStatus(item.id); }}>
                          {status === 'Pendente' ? <Circle size={14} /> : status === 'Estudado' ? <CheckCircle2 size={14} /> : <Check size={14} />}
                          {status}
                        </button>
                      </div>
                      <dl>
                        {activeSpecialist.columns.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{item.details[column.key]}</dd></div>)}
                      </dl>
                      <blockquote>“{item.example}”</blockquote>
                      <footer><span className={`trail-item-level ${item.level.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{item.level}</span><span>Ver detalhes</span></footer>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="specialist-detail-dialog">
            <DialogHeader>
              <div className="specialist-dialog-topline"><span className="eyebrow">{activeSpecialist.title}</span><span className={`trail-item-level ${selectedItem.level.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{selectedItem.level}</span></div>
              <DialogTitle>{selectedItem.term}</DialogTitle>
              <DialogDescription>{selectedItem.translation}</DialogDescription>
            </DialogHeader>
            <div className="specialist-detail-content">
              <div className="specialist-detail-explanation"><Info size={16} /><p>{selectedItem.explanation}</p></div>
              <blockquote>“{selectedItem.example}”</blockquote>
              <dl>
                {activeSpecialist.columns.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{selectedItem.details[column.key]}</dd></div>)}
              </dl>
              <button className="button button-primary" onClick={() => advanceReviewStatus(selectedItem.id)}>
                <CheckCircle2 size={16} /> Status: {getReviewStatus(selectedItem.id, reviewStatuses)}
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}