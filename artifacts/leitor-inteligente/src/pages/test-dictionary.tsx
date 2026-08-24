import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Beaker, Book, Library as LibraryIcon, LoaderCircle, Plus, Search, Sparkles } from 'lucide-react';
import { getSettings } from '@/pages/settings';

type Summary = { id: string; term: string; translation: string; partOfSpeech: string; exampleCount: number };
type Entry = Summary & {
  senses: { id: string; definition: string; translation: string }[];
  examples: { id: string; sentence: string; translation: string; explanation: string }[];
  cards: { id: string; exampleId?: string; term: string; translation: string }[];
};
function useDebounce(value: string, delay: number) {
  const [result, setResult] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setResult(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return result;
}

export function TestDictionaryPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 250);
  const client = useQueryClient();
  const results = useQuery<Summary[]>({
    queryKey: ['test-dictionary', 'search', debouncedQuery],
    queryFn: async () => { const response = await fetch(`/api/test-dictionary?query=${encodeURIComponent(debouncedQuery)}`); if (!response.ok) throw new Error('Falha na pesquisa'); return response.json(); },
    enabled: true,
  });
  const entry = useQuery<Entry>({
    queryKey: ['test-dictionary', 'entry', selectedId],
    queryFn: async () => { const response = await fetch(`/api/test-dictionary/${selectedId}`); if (!response.ok) throw new Error('Falha ao carregar palavra'); return response.json(); },
    enabled: Boolean(selectedId),
  });
  const generate = useMutation({
    mutationFn: async () => {
      if (!entry.data) throw new Error('Selecione uma palavra');
      const settings = getSettings();
      const endpoint = settings.endpoint || 'http://localhost:11434';
      const model = settings.model || 'llama3.2';
      const prompt = [
        'Create one original neutral English example for a language-study card.',
        'Use the exact word naturally. Return only valid JSON with sentence, translation and explanation.',
        'Translation and explanation must be Brazilian Portuguese. Sentence maximum: 18 words.',
        `Word: ${entry.data.term}`, `Translation hint: ${entry.data.translation}`,
      ].join('\n');
      let local: { response?: string; error?: string };
      try {
        const response = await fetch(`${endpoint.replace(/\/+$/, '')}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, format: 'json', prompt }) });
        local = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(local.error || `Ollama respondeu HTTP ${response.status}.`);
      } catch (error) {
        if (error instanceof TypeError) throw new Error('Não foi possível acessar o Ollama local. Confirme que ele está aberto no computador.');
        throw error;
      }
      const generated = JSON.parse(local.response || '{}');
      const response = await fetch(`/api/test-dictionary/${selectedId}/examples`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...generated, model }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || body.message || 'Falha ao salvar exemplo.'); }
      return response.json();
    },
    onSuccess: (data) => client.setQueryData(['test-dictionary', 'entry', selectedId], (old: Entry | undefined) => old ? { ...old, examples: [data, ...old.examples] } : old),
  });
  const addCard = useMutation({
    mutationFn: async (exampleId: string) => {
      const response = await fetch(`/api/test-dictionary/${selectedId}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exampleId }) });
      if (!response.ok) throw new Error('Falha ao criar cartão');
      return response.json();
    },
    onSuccess: (data) => client.setQueryData(['test-dictionary', 'entry', selectedId], (old: Entry | undefined) => old ? { ...old, cards: [data, ...old.cards] } : old),
  });

  return <div className="page fade-up">
    <div className="top-row">
      <div><div className="eyebrow">Laboratório de cards</div><h1 className="page-title">Dicionário <em>de teste.</em></h1><p className="lead">Um espaço seguro para experimentar layouts, exemplos e cartões sem tocar nas suas referências privadas.</p></div>
      <div className="badge processing"><Beaker size={14} /> {results.data?.length ?? 0} palavras visíveis</div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 mt-12 items-start">
      <div className="flex flex-col gap-4">
        <div className="field" style={{ marginTop: 0 }}><div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar palavra..." style={{ paddingLeft: 38 }} /></div></div>
        <div className="flex flex-col gap-2 min-h-[300px]">
          {results.isLoading ? <LoaderCircle className="spin mx-auto mt-8" size={20} /> : results.isError ? <p className="notice">Não foi possível realizar a pesquisa.</p> : results.data?.length === 0 ? <p className="text-[13px] text-[hsl(var(--muted-foreground))] p-2">Nenhuma palavra encontrada.</p> : results.data?.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex flex-col items-start w-full p-3 rounded-xl border text-left transition-all ${selectedId === item.id ? 'bg-[hsl(var(--card))] border-[hsl(var(--primary)/0.4)]' : 'bg-transparent border-transparent hover:bg-[hsl(var(--card)/0.6)] hover:border-[hsl(var(--border))]'}`}><span className="text-[15px] font-semibold">{item.term}</span><span className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">{item.translation}</span><span className="text-[10px] uppercase tracking-wider opacity-60 mt-2">{item.exampleCount} exemplo{item.exampleCount === 1 ? '' : 's'}</span></button>)}
        </div>
      </div>
      <div className="settings-card flex flex-col min-h-[500px]">
        {!selectedId ? <div className="empty-state m-auto border-0 bg-transparent shadow-none w-full"><LibraryIcon size={32} className="mx-auto mb-4 text-[hsl(var(--primary))]" /><h3 className="text-lg font-semibold mb-2">Escolha uma palavra</h3><p className="text-[13px] text-[hsl(var(--muted-foreground))] max-w-[300px] mx-auto">Aqui você pode testar a apresentação dos cards sem alterar o dicionário pessoal.</p></div> : entry.isLoading ? <LoaderCircle className="spin m-auto" size={24} /> : entry.data ? <div className="flex flex-col h-full fade-up"><div className="border-b border-[hsl(var(--border))] pb-5 mb-6"><div className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">vocabulário de teste</div><h2 className="text-4xl font-serif tracking-tight m-0 mb-3 text-[hsl(var(--primary))]">{entry.data.term}</h2><div className="flex items-center gap-3"><span className="badge processing">{entry.data.partOfSpeech}</span><span className="text-[14px] text-[hsl(var(--muted-foreground))]">{entry.data.translation}</span></div></div><div className="mb-8"><h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Sentido para teste</h3>{entry.data.senses.map(sense => <div key={sense.id} className="pl-4 border-l-2 border-[hsl(var(--primary)/0.3)]"><p className="text-[15px] leading-relaxed m-0">{sense.translation}</p></div>)}</div><div className="mb-4 flex-1"><div className="flex items-center justify-between mb-4"><h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] m-0">Exemplos em contexto</h3><button className="button button-quiet button-small" onClick={() => generate.mutate()} disabled={generate.isPending}><Sparkles size={14} /> {generate.isPending ? 'Gerando...' : 'Gerar localmente'}</button></div>{generate.isError && <div className="notice mb-4">{generate.error instanceof Error ? generate.error.message : 'Falha ao gerar exemplo.'}</div>}{entry.data.examples.length ? <div className="grid gap-4">{entry.data.examples.map(example => <div key={example.id} className="study-item"><p className="item-example m-0 mb-3 font-serif text-[17px]">“{example.sentence}”</p><p className="text-[13px] font-medium m-0 mb-2">{example.translation}</p><p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed m-0 mb-4">{example.explanation}</p><div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">{entry.data.cards.some(card => card.exampleId === example.id) ? <span className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--primary))]"><Book size={12} /> Cartão criado</span> : <button className="button button-quiet button-small" onClick={() => addCard.mutate(example.id)}><Plus size={12} /> Adicionar a cartão</button>}</div></div>)}</div> : <div className="p-6 border border-dashed border-[hsl(var(--border))] rounded-2xl text-center"><p className="text-[13px] text-[hsl(var(--muted-foreground))] m-0">Gere um exemplo para testar a composição do cartão.</p></div>}</div></div> : null}
      </div>
    </div>
  </div>;
}