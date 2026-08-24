import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, CheckCircle2, Download, Library as LibraryIcon, LoaderCircle, PauseCircle, RefreshCw, Search, Volume2 } from 'lucide-react';

type Summary = { id: string; term: string; partOfSpeech: string; senseCount: number };
type Entry = {
  id: string;
  term: string;
  partOfSpeech: string;
  senses: { id: string; definition: string; position: number }[];
  forms: { id: string; form: string; tags: string }[];
  sounds: { id: string; ipa: string; audioUrl: string }[];
  source: { name: string; version: string; license: string; attribution: string };
};
type ImportStatus = {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
  version: string;
  linesProcessed: number;
  importedEntries: number;
  totalLines: number | null;
  skippedLines: number;
  errorMessage?: string;
  checkpointUpdatedAt: string | null;
};

type ImportMetrics = {
  linesPerSecond: number | null;
  etaSeconds: number | null;
  checkpointAgeSeconds: number | null;
};

function useDebounce(value: string, delay: number) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setResult(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return result;
}

export function PublicDictionaryPage({ endpoint = '/api/public-dictionary', title = 'Inglês, palavra por palavra.', eyebrow = 'DICIONÁRIO PÚBLICO' }: { endpoint?: string; title?: string; eyebrow?: string }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const debouncedQuery = useDebounce(query, 250);
  const results = useQuery<Summary[]>({
    queryKey: [endpoint, 'search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`${endpoint}?query=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Falha na pesquisa');
      return response.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });
  const entry = useQuery<Entry>({
    queryKey: [endpoint, 'entry', selectedId],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/${selectedId}`);
      if (!response.ok) throw new Error('Falha ao carregar verbete');
      return response.json();
    },
    enabled: Boolean(selectedId),
  });
  const importStatus = useQuery<ImportStatus>({
    queryKey: ['public-dictionary', 'import-status'],
    queryFn: async () => {
      const response = await fetch('/api/public-dictionary/import/status');
      if (!response.ok) throw new Error('Não foi possível consultar o progresso.');
      return response.json();
    },
    refetchInterval: (query) => query.state.data?.status === 'RUNNING' ? 2500 : false,
    refetchOnMount: 'always',
  });
  const [importState, setImportState] = useState<'idle' | 'starting' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const previousCheckpoint = useRef<{ lines: number; at: number } | null>(null);
  const [importMetrics, setImportMetrics] = useState<ImportMetrics>({
    linesPerSecond: null,
    etaSeconds: null,
    checkpointAgeSeconds: null,
  });
  const startImport = async () => {
    setImportState('starting');
    setImportMessage('');
    try {
      const response = await fetch('/api/public-dictionary/import', { method: 'POST' });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || 'Não foi possível iniciar a importação.');
      setImportMessage(body.message || 'Importação iniciada. Você pode continuar usando o dicionário.');
      await queryClient.invalidateQueries({ queryKey: ['public-dictionary', 'import-status'] });
    } catch (error) {
      setImportState('error');
      setImportMessage(error instanceof Error ? error.message : 'Não foi possível iniciar a importação.');
    }
  };
  const status = importStatus.data;
  useEffect(() => {
    if (!status?.checkpointUpdatedAt) {
      previousCheckpoint.current = null;
      setImportMetrics({ linesPerSecond: null, etaSeconds: null, checkpointAgeSeconds: null });
      return;
    }

    const checkpointAt = Date.parse(status.checkpointUpdatedAt);
    if (!Number.isFinite(checkpointAt)) return;
    const previous = previousCheckpoint.current;
    const elapsedSeconds = previous ? (checkpointAt - previous.at) / 1000 : 0;
    const linesDelta = previous ? status.linesProcessed - previous.lines : 0;
    const linesPerSecond = elapsedSeconds > 0 && linesDelta > 0 ? linesDelta / elapsedSeconds : null;
    const remainingLines = status.totalLines === null ? null : Math.max(0, status.totalLines - status.linesProcessed);
    setImportMetrics({
      linesPerSecond,
      etaSeconds: linesPerSecond && remainingLines !== null ? remainingLines / linesPerSecond : null,
      checkpointAgeSeconds: Math.max(0, (Date.now() - checkpointAt) / 1000),
    });
    previousCheckpoint.current = { lines: status.linesProcessed, at: checkpointAt };
  }, [status]);

  const formatDuration = (seconds: number) => {
    const rounded = Math.max(1, Math.round(seconds));
    if (rounded < 60) return `${rounded}s`;
    const minutes = Math.floor(rounded / 60);
    const remainingSeconds = rounded % 60;
    if (minutes < 60) return `${minutes}min${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes ? ` ${remainingMinutes}min` : ''}`;
  };
  const formatRate = (linesPerSecond: number) => `${Math.round(linesPerSecond).toLocaleString('pt-BR')} linhas/s`;
  const statusLabels: Record<ImportStatus['status'], string> = {
    IDLE: 'Ainda não importado',
    RUNNING: 'Importação em andamento',
    PAUSED: 'Importação pausada',
    COMPLETED: 'Importação concluída',
    ERROR: 'Importação interrompida com erro',
  };
  const progress = status?.totalLines ? Math.min(100, Math.round((status.linesProcessed / status.totalLines) * 100)) : null;

  return (
    <div className="page fade-up">
      <div className="top-row">
        <div>
          <div className="eyebrow">{eyebrow === 'DICIONÁRIO PÚBLICO' ? 'Fonte aberta' : eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="lead">{eyebrow === 'DICIONÁRIO PÚBLICO' ? 'Pesquise a base aberta localmente importada. Ela é separada das suas referências pessoais e pode servir de ponto de partida para novos cards.' : 'Pesquise traduções públicas de inglês para português do Brasil.'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="badge processing"><BookOpen size={14} /> Wiktionary / Wiktextract</div>
          <button className="button button-secondary" onClick={() => void startImport()} disabled={importState === 'starting'}>
            {importState === 'starting' ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />} Baixar dicionário completo
          </button>
        </div>
      </div>
      {importMessage && <div className={importState === 'error' ? 'error-state' : 'notice'} style={{ marginTop: 22 }} role="status">{importMessage}</div>}
      <div className="settings-card mt-6" aria-live="polite">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {status?.status === 'RUNNING' ? <LoaderCircle className="spin text-[hsl(var(--primary))]" size={20} /> :
              status?.status === 'COMPLETED' ? <CheckCircle2 className="text-emerald-600" size={20} /> :
              status?.status === 'ERROR' ? <AlertTriangle className="text-red-600" size={20} /> :
              <PauseCircle className="text-[hsl(var(--muted-foreground))]" size={20} />}
            <div>
              <h2 className="font-semibold m-0">{status ? statusLabels[status.status] : 'Consultando importação…'}</h2>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))] m-0 mt-1">
                {status ? `${status.linesProcessed.toLocaleString('pt-BR')} linhas processadas · ${status.importedEntries.toLocaleString('pt-BR')} verbetes · ${status.skippedLines.toLocaleString('pt-BR')} ignoradas` : 'O último checkpoint será carregado.'}
              </p>
            </div>
          </div>
          <button className="button button-secondary" onClick={() => void importStatus.refetch()} disabled={importStatus.isFetching} title="Atualizar progresso">
            <RefreshCw size={14} className={importStatus.isFetching ? 'spin' : ''} /> Atualizar
          </button>
        </div>
         {status?.totalLines ? <div className="mt-5">
          <div className="flex justify-between text-[12px] mb-2"><span>Progresso</span><strong>{progress}%</strong></div>
          <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2 mb-0">Checkpoint: {status.linesProcessed.toLocaleString('pt-BR')} de {status.totalLines.toLocaleString('pt-BR')} linhas</p>
           {status.status === 'RUNNING' && importMetrics.etaSeconds !== null && importMetrics.linesPerSecond !== null
             ? <p className="text-[12px] text-[hsl(var(--primary))] mt-2 mb-0">Velocidade média: {formatRate(importMetrics.linesPerSecond)} · faltam aproximadamente {formatDuration(importMetrics.etaSeconds)}</p>
             : status.status === 'RUNNING'
               ? <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-2 mb-0">Aguardando o próximo checkpoint para calcular o tempo restante.</p>
               : null}
         </div> : status?.status === 'RUNNING' ? <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-4 mb-0">Calculando o total do arquivo; o checkpoint continua sendo salvo durante a carga.</p> : null}
         {status?.status === 'RUNNING' && importMetrics.checkpointAgeSeconds !== null && importMetrics.checkpointAgeSeconds >= 10 && <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-4 mb-0">Último checkpoint há {formatDuration(importMetrics.checkpointAgeSeconds)}. A importação pode estar processando um lote grande.</p>}
        {status?.status === 'ERROR' && <div className="error-state mt-4" role="alert">{status.errorMessage || 'A importação falhou. Atualize para consultar novamente ou tente iniciar de novo.'}</div>}
        {importStatus.isError && <div className="error-state mt-4" role="alert">Falha de rede ou banco ao consultar o progresso. Tente atualizar novamente.</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 mt-12 items-start">
        <div className="flex flex-col gap-4">
          <div className="field" style={{ marginTop: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar palavra..." style={{ paddingLeft: 38 }} />
            </div>
          </div>
          <div className="flex flex-col gap-2 min-h-[300px]">
            {!debouncedQuery.trim() ? (
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] p-2 leading-relaxed">Digite uma palavra para pesquisar na base aberta instalada no servidor.</p>
            ) : results.isLoading ? (
              <LoaderCircle className="spin mx-auto mt-8" size={20} />
            ) : results.isError ? (
              <p className="notice">A base pública ainda não foi importada ou não está disponível.</p>
            ) : results.data?.length === 0 ? (
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] p-2">Nenhum verbete encontrado.</p>
            ) : results.data?.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex flex-col items-start w-full p-3 rounded-xl border text-left transition-all ${selectedId === item.id ? 'bg-[hsl(var(--card))] border-[hsl(var(--primary)/0.4)]' : 'bg-transparent border-transparent hover:bg-[hsl(var(--card)/0.6)] hover:border-[hsl(var(--border))]'}`}>
                <span className="text-[15px] font-semibold">{item.term}</span>
                <span className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">{item.partOfSpeech || 'classe não informada'}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60 mt-2">{item.senseCount} sentido{item.senseCount === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card flex flex-col min-h-[500px]">
          {!selectedId ? (
            <div className="empty-state m-auto border-0 bg-transparent shadow-none w-full">
              <LibraryIcon size={32} className="mx-auto mb-4 text-[hsl(var(--primary))]" />
              <h3 className="text-lg font-semibold mb-2">Consulte uma palavra</h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] max-w-[300px] mx-auto">A base pública fica disponível para consulta sem misturar o conteúdo das suas obras particulares.</p>
            </div>
          ) : entry.isLoading ? (
            <LoaderCircle className="spin m-auto" size={24} />
          ) : entry.isError ? (
            <div className="error-state m-auto w-full"><h3>O verbete não abriu</h3><p>Não foi possível carregar os detalhes desta palavra.</p></div>
          ) : entry.data ? (
            <div className="flex flex-col h-full fade-up">
              <div className="border-b border-[hsl(var(--border))] pb-5 mb-6">
                <h2 className="text-4xl font-serif tracking-tight m-0 mb-3 text-[hsl(var(--primary))]">{entry.data.term}</h2>
                <span className="badge processing">{entry.data.partOfSpeech || 'classe não informada'}</span>
              </div>
              <div className="mb-8">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Sentidos</h3>
                <div className="flex flex-col gap-4">
                  {entry.data.senses.map((sense) => <div key={sense.id} className="pl-4 border-l-2 border-[hsl(var(--primary)/0.3)]"><p className="text-[15px] leading-relaxed m-0">{sense.definition}</p></div>)}
                </div>
              </div>
              {entry.data.forms.length > 0 && <div className="mb-8"><h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Formas</h3><div className="flex flex-wrap gap-2">{entry.data.forms.map((form) => <span key={form.id} className="badge">{form.form}{form.tags ? ` · ${form.tags.replaceAll('|', ', ')}` : ''}</span>)}</div></div>}
              {entry.data.sounds.length > 0 && <div className="mb-8"><h3 className="text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Pronúncia</h3><div className="flex flex-col gap-2">{entry.data.sounds.map((sound) => <div key={sound.id} className="flex items-center gap-3 text-[13px]"><Volume2 size={15} className="text-[hsl(var(--primary))]" /><span>{sound.ipa || 'áudio disponível'}</span>{sound.audioUrl && <a href={sound.audioUrl} target="_blank" rel="noreferrer" className="text-[hsl(var(--primary))]">ouvir áudio</a>}</div>)}</div></div>}
              <div className="mt-auto pt-5 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                <strong>{entry.data.source.name}</strong> · versão {entry.data.source.version}<br />{entry.data.source.attribution}<br />{entry.data.source.license}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}