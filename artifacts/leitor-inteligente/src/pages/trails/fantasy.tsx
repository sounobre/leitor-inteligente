import { useState, useMemo } from 'react';
import { ChevronLeft, Search, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import {
  fantasyCatalogs,
  fantasyData,
  fantasySubgenres,
  type FantasySubgenre,
  type Level,
} from '@/pages/trails/fantasy-trail-data';

export { fantasyData };
export { fantasyCatalogs, fantasySubgenres };
export const FANTASY_LEVELS = ['Essencial', 'Aprofundamento', 'Desafio'] as const;

export function filterFantasySections(level: Level | 'Todos', subgenre: FantasySubgenre = 'geral') {
  return fantasyCatalogs[subgenre]
    .map(section => ({
      ...section,
      items: section.items.filter(item => level === 'Todos' || item.level === level),
    }))
    .filter(section => section.items.length > 0);
}

export function FantasyTrailPage() {
  const [subgenre, setSubgenre] = useState<FantasySubgenre>('geral');
  const [filterLevel, setFilterLevel] = useState<Level | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);

  const filteredSections = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return fantasyCatalogs[subgenre].map(section => ({
      ...section,
      items: section.items.filter(item => {
        const matchesLevel = filterLevel === 'Todos' || item.level === filterLevel;
        const matchesSearch = !normalizedSearch || [item.term, item.meaning, item.explanation]
          .some(value => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
        return matchesLevel && matchesSearch;
      })
    })).filter(section => section.items.length > 0);
  }, [filterLevel, search, subgenre]);

  const visibleSections = useMemo(() => {
    const sectionCount = filteredSections.length;
    const perSection = sectionCount ? Math.floor(visibleCount / sectionCount) : 0;
    const remainder = sectionCount ? visibleCount % sectionCount : 0;
    return filteredSections.map((section, index) => {
      const sectionLimit = perSection + (index < remainder ? 1 : 0);
      const items = section.items.slice(0, sectionLimit);
      return { ...section, items };
    }).filter(section => section.items.length > 0);
  }, [filteredSections, visibleCount]);

  const matchingCount = filteredSections.reduce((total, section) => total + section.items.length, 0);
  const shownCount = visibleSections.reduce((total, section) => total + section.items.length, 0);
  const resetTrailView = (next: () => void) => {
    setVisibleCount(60);
    next();
  };

  return (
    <div className="page fade-up">
      <Link href="/library" className="button button-quiet button-small" style={{ marginBottom: 28, display: 'inline-flex' }} data-testid="link-back-library">
        <ChevronLeft size={14} /> Voltar à Biblioteca
      </Link>
      
      <div className="trail-hero">
        <div className="trail-hero-content" style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'hsl(var(--primary))' }}>
            <Sparkles size={14} /> Trilha de Gênero
          </div>
          <h1>Fantasia</h1>
          <p>Prepare-se para reinos distantes, magia esquecida e palavras que moldam novos mundos. Escolha uma variação para concentrar a preparação no tipo de atmosfera que você quer explorar, sempre sem spoilers ou detalhes de uma obra específica.</p>
          <div className="trail-hero-meta">
            <strong>{(fantasyCatalogs[subgenre].reduce((total, section) => total + section.items.length, 0)).toLocaleString('pt-BR')} cartões disponíveis</strong>
            <span>Conteúdo geral de gênero, separado da preparação dos seus livros.</span>
          </div>
        </div>
      </div>

      <div className="trail-subgenre-picker">
        <label htmlFor="fantasy-subgenre">Variação da trilha</label>
        <select
          id="fantasy-subgenre"
          value={subgenre}
          onChange={(event) => resetTrailView(() => {
            setSubgenre(event.target.value as FantasySubgenre);
            setFilterLevel('Todos');
            setSearch('');
          })}
          data-testid="select-fantasy-subgenre"
        >
          {fantasySubgenres.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <p>{fantasySubgenres.find(option => option.id === subgenre)?.description}</p>
      </div>

      <div className="trail-search-wrap">
        <Search size={17} aria-hidden="true" />
        <label htmlFor="fantasy-trail-search">Buscar na trilha</label>
        <input
          id="fantasy-trail-search"
          type="search"
          value={search}
          onChange={(event) => resetTrailView(() => setSearch(event.target.value))}
          placeholder="Ex.: reino, névoa, juramento"
          data-testid="input-search-fantasy-trail"
        />
        {search && <button className="trail-search-clear" onClick={() => resetTrailView(() => setSearch(''))}>Limpar</button>}
      </div>

      <div className="trail-level-filters" role="tablist" aria-label="Filtrar por nível">
        {(['Todos', ...FANTASY_LEVELS] as const).map(level => (
          <button 
            key={level}
            className={`trail-level-filter ${filterLevel === level ? 'active' : ''}`}
            onClick={() => resetTrailView(() => setFilterLevel(level))}
            role="tab"
            aria-selected={filterLevel === level}
            data-testid={`filter-level-${level.toLowerCase()}`}
          >
            {level === 'Todos' ? 'Todos os níveis' : level}
          </button>
        ))}
      </div>

      <div className="trail-content">
         {filteredSections.length === 0 ? (
          <div className="trail-empty fade-up">
            Nenhum cartão foi encontrado para esta busca e nível. Tente outro termo ou filtro.
          </div>
        ) : (
          <>
          <div className="trail-result-count" role="status">
            Mostrando {shownCount.toLocaleString('pt-BR')} de {matchingCount.toLocaleString('pt-BR')} cartões
          </div>
          {visibleSections.map((section, idx) => (
            <div className="trail-section-block" key={`${subgenre}-${section.id}`} style={{ animationDelay: `${idx * 0.08}s` }}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              <div className="study-list">
                {section.items.map(item => (
                  <div className="trail-item-card" key={item.id} data-testid={`card-term-${item.id}`}>
                    <div className="trail-item-header">
                      <div>
                        <div className="trail-item-term">{item.term}</div>
                      </div>
                      <span className={`trail-item-level ${item.level.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                        {item.level}
                      </span>
                    </div>
                    <div className="trail-item-meaning">{item.meaning}</div>
                    <div className="trail-item-example">"{item.example}"</div>
                    <div className="trail-item-explanation">{item.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
          }
          {shownCount < matchingCount && (
            <button className="button button-primary trail-load-more" onClick={() => setVisibleCount((count) => count + 60)}>
              Carregar mais cartões
            </button>
          )}
          </>
        )}
      </div>
    </div>
  );
}
