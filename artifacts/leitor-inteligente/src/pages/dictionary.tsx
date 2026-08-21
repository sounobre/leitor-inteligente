import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Book, Plus, LoaderCircle, Sparkles, Library as LibraryIcon } from 'lucide-react';
import { DictionaryImportDialog } from '@/components/dictionary-import-dialog';
import { defaults } from '@/pages/settings';
import type { Preferences } from '@/pages/settings';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const getSettings = (): Preferences => {
  if (typeof window === 'undefined') return defaults;
  const stored = window.localStorage.getItem('leitor-inteligente-settings');
  return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
};

type SearchResult = {
  id: string;
  headword?: string;
  term: string;
  translation?: string;
  partOfSpeech?: string;
  usageLabels?: string[];
  sourceTitle: string;
  exampleCount: number;
};

type DictionaryEntry = {
  id: string;
  headword?: string;
  term: string;
  translation?: string;
  partOfSpeech?: string;
  usageLabels?: string[];
  source?: { title: string; publisher?: string };
  senses?: { id: string; definition: string; translation?: string }[];
  examples?: { id: string; sentence: string; translation?: string; explanation?: string; createdAt: string }[];
  cards?: { id: string; term: string; translation?: string; exampleId?: string }[];
};

export function DictionaryPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading: searchLoading, isError: searchError } = useQuery<SearchResult[]>({
    queryKey: ['dictionaries', 'search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/dictionaries?query=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Falha na pesquisa');
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0
  });

  const { data: entry, isLoading: entryLoading, isError: entryError } = useQuery<DictionaryEntry>({
    queryKey: ['dictionaries', 'entry', selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/dictionaries/${selectedId}`);
      if (!res.ok) throw new Error('Falha ao carregar verbete');
      return res.json();
    },
    enabled: !!selectedId
  });

  const generateExample = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('Nenhum termo selecionado');
      const prefs = getSettings();
      const endpoint = prefs.provider === 'ollama' ? prefs.endpoint : 'http://localhost:11434';
      const model = prefs.provider === 'ollama' ? prefs.model : 'llama3.2';
      
      const res = await fetch(`/api/dictionaries/${selectedId}/examples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', endpoint, model })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Falha ao gerar exemplo localmente.');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['dictionaries', 'entry', selectedId], (old: DictionaryEntry | undefined) => {
        if (!old) return old;
        return {
          ...old,
          examples: [...(old.examples || []), data]
        };
      });
    }
  });

  const [addingCardId, setAddingCardId] = useState<string | null>(null);
  const addCard = useMutation({
    mutationFn: async (exampleId: string) => {
      if (!selectedId) throw new Error('Nenhum termo selecionado');
      const res = await fetch(`/api/dictionaries/${selectedId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exampleId })
      });
      if (!res.ok) throw new Error('Falha ao criar cartão');
      return res.json();
    },
    onMutate: (exampleId) => setAddingCardId(exampleId),
    onSuccess: (data) => {
      queryClient.setQueryData(['dictionaries', 'entry', selectedId], (old: DictionaryEntry | undefined) => {
        if (!old) return old;
        return {
          ...old,
          cards: [...(old.cards || []), data]
        };
      });
    },
    onSettled: () => setAddingCardId(null)
  });

  return (
    <div className="page fade-up">
      <div className="top-row">
        <div>
          <div className="eyebrow">Dicionário Pessoal</div>
          <h1 className="page-title">Suas <em>palavras.</em></h1>
          <p className="lead">Consulte suas referências privadas e transforme dúvidas em conhecimento duradouro, sem depender de servidores externos.</p>
        </div>
        <button className="button button-primary" onClick={() => setImportOpen(true)}>
          <Book size={16} /> Importar dicionário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 mt-12 items-start">
        {/* Left Column: Search */}
        <div className="flex flex-col gap-4">
          <div className="field" style={{ marginTop: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar termo..."
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 min-h-[300px]">
            {debouncedQuery.trim().length === 0 ? (
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-2 p-2 leading-relaxed">
                Digite um termo para pesquisar nas suas obras de referência indexadas.
              </p>
            ) : searchLoading ? (
              <div className="flex justify-center p-8 text-[hsl(var(--muted-foreground))]">
                <LoaderCircle className="spin" size={20} />
              </div>
            ) : searchError ? (
              <p className="text-[13px] text-[hsl(var(--destructive))] p-2">
                Não foi possível realizar a pesquisa.
              </p>
            ) : searchResults?.length === 0 ? (
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-2 p-2">
                Nenhum verbete encontrado para "{debouncedQuery}".
              </p>
            ) : (
              searchResults?.map((res) => (
                <button
                  key={res.id}
                  onClick={() => setSelectedId(res.id)}
                  className={`flex flex-col items-start w-full p-3 rounded-xl border text-left transition-all ${
                    selectedId === res.id 
                      ? 'bg-[hsl(var(--card))] border-[hsl(var(--primary)/0.4)] shadow-[0_4px_12px_hsl(var(--primary)/0.05)]' 
                      : 'bg-transparent border-transparent hover:bg-[hsl(var(--card)/0.6)] hover:border-[hsl(var(--border))]'
                  }`}
                >
                   {res.headword && <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{res.headword}:</span>}
                   <span className={`text-[15px] font-semibold ${selectedId === res.id ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                    {res.term}
                  </span>
                   {res.usageLabels?.length ? (
                     <span className="text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                       {res.usageLabels.join(' · ')}
                     </span>
                   ) : null}
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-2 w-full">
                    {res.partOfSpeech && <em className="text-[hsl(var(--muted-foreground))]">{res.partOfSpeech}</em>}
                    <span className="truncate">{res.translation}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60 shrink-0">
                      {res.sourceTitle}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Entry Details */}
        <div className="settings-card flex flex-col min-h-[500px] md:sticky md:top-6">
          {!selectedId ? (
            <div className="empty-state m-auto border-0 bg-transparent shadow-none w-full">
              <LibraryIcon size={32} className="mx-auto mb-4 text-[hsl(var(--primary))]" />
              <h3 className="text-lg font-semibold mb-2">O que você procura hoje?</h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] max-w-[280px] mx-auto leading-relaxed">
                Pesquise um termo à esquerda para consultar sua definição no seu acervo privado.
              </p>
            </div>
          ) : entryLoading ? (
            <div className="flex-1 flex flex-col gap-6">
              <div className="skeleton h-[80px] w-full" />
              <div className="skeleton h-[120px] w-full" />
              <div className="skeleton h-[200px] w-full" />
            </div>
          ) : entryError ? (
            <div className="error-state m-auto w-full">
              <h3 className="text-base font-semibold mb-2">O verbete não abriu</h3>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Ocorreu um erro ao carregar os detalhes desta palavra.</p>
            </div>
          ) : entry ? (
            <div className="flex flex-col h-full fade-up">
              <div className="flex items-end justify-between border-b border-[hsl(var(--border))] pb-5 mb-6">
                <div>
                  {entry.headword && (
                    <div className="text-[12px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
                      {entry.headword}:
                    </div>
                  )}
                  <h1 className="text-4xl font-serif tracking-tight m-0 mb-3 text-[hsl(var(--primary))]">{entry.term}</h1>
                  <div className="flex items-center gap-3">
                    {entry.partOfSpeech && (
                      <span className="badge processing">{entry.partOfSpeech}</span>
                    )}
                    {entry.usageLabels?.map(label => (
                      <span key={label} className="badge">{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {entry.senses && entry.senses.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4 m-0">Sentidos principais</h3>
                  <div className="flex flex-col gap-4">
                    {entry.senses.map((sense) => (
                      <div key={sense.id} className="pl-4 border-l-2 border-[hsl(var(--primary)/0.3)]">
                        <p className="text-[15px] leading-relaxed m-0 text-[hsl(var(--foreground))]">{sense.definition}</p>
                        {sense.translation && (
                          <p className="text-[13px] font-medium text-[hsl(var(--muted-foreground))] mt-2 m-0">{sense.translation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] m-0">Exemplos em contexto</h3>
                  <button 
                    className="button button-quiet button-small"
                    onClick={() => generateExample.mutate()}
                    disabled={generateExample.isPending}
                  >
                    {generateExample.isPending ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}
                    Gerar localmente
                  </button>
                </div>

                {generateExample.isError && (
                  <div className="notice mb-4">
                    {generateExample.error?.message || 'Falha ao ligar ao modelo local.'}
                  </div>
                )}

                {entry.examples && entry.examples.length > 0 ? (
                  <div className="grid gap-4">
                    {entry.examples.map(ex => (
                      <div key={ex.id} className="study-item">
                        <p className="item-example m-0 mb-3 font-serif text-[17px] text-[hsl(var(--foreground))]">"{ex.sentence}"</p>
                        {ex.translation && (
                          <p className="text-[13px] font-medium m-0 mb-2">{ex.translation}</p>
                        )}
                        {ex.explanation && (
                          <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed m-0 mb-4">{ex.explanation}</p>
                        )}
                        <div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">
                          {entry.cards?.some(c => c.exampleId === ex.id) ? (
                            <span className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--primary))] flex items-center gap-1">
                              <Book size={12} /> Cartão criado
                            </span>
                          ) : (
                            <button 
                              className="button button-quiet button-small"
                              onClick={() => addCard.mutate(ex.id)}
                              disabled={addingCardId === ex.id}
                            >
                              {addingCardId === ex.id ? <LoaderCircle size={12} className="spin" /> : <Plus size={12} />}
                              Adicionar a cartão
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-[hsl(var(--border))] rounded-2xl text-center">
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))] m-0">
                      Ainda não existem exemplos de uso. Pede ao modelo local para gerar uma frase com esta palavra.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <DictionaryImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
