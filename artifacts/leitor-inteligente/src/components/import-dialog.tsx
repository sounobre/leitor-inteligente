import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText, Globe2, LoaderCircle, Upload, X } from 'lucide-react';
import { getListBooksQueryKey, getGetDashboardQueryKey } from '@workspace/api-client-react';
import type { ImportBookRequest, Book } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getSettings } from '@/pages/settings';

type SourceType = 'EPUB' | 'ARTICLE';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState<SourceType>('EPUB');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState('');
  const [isPending, setIsPending] = useState(false);

  if (!open) return null;

  const reset = () => {
    setTitle(''); setAuthor(''); setContent(''); setFileName(''); setError(''); setStage(''); setSourceType('EPUB');
  };
  const close = () => { if (!isPending) { reset(); onClose(); } };
  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.epub')) { setError('Escolhe um ficheiro .epub válido.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('O EPUB deve ter no máximo 50 MB.'); return; }
    setError('');
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    const reader = new FileReader();
    reader.onload = () => { setContent(typeof reader.result === 'string' ? reader.result : ''); setStage('Ficheiro lido. Pronto para extrair capítulos.'); };
    reader.onerror = () => setError('Não foi possível ler este ficheiro.');
    reader.readAsDataURL(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError(sourceType === 'EPUB' ? 'Escolhe um ficheiro EPUB e dá-lhe um nome.' : 'Coloca o endereço do artigo e dá-lhe um nome.');
      return;
    }
    setError('');
    const settings = getSettings();
    if (!settings.endpoint.trim() || !settings.model.trim()) { setError('Define o provedor e o modelo em Preferências.'); return; }
    const providerName = settings.provider === 'openrouter' ? 'OpenRouter' : 'Ollama';
    setStage(sourceType === 'EPUB' ? `A enviar para ${providerName} e preparar…` : `A preparar com ${providerName}…`);
    setIsPending(true);
    const request: ImportBookRequest = { title: title.trim(), author: author.trim() || 'Autor desconhecido', sourceType, content: content.trim(), ollamaEndpoint: settings.endpoint.trim(), ollamaModel: settings.model.trim(), provider: settings.provider, ...(sourceType === 'EPUB' ? { fileName } : {}) };
    void streamPreparation(request);
  };

  const streamPreparation = async (request: ImportBookRequest) => {
    try {
      const response = await fetch('/api/books/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request),
      });
      if (!response.ok || !response.body) throw new Error('Não foi possível iniciar a preparação.');
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += result.value;
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6)) as { stage?: string; completedChunks?: number; totalChunks?: number; activity?: string; message?: string; title?: string };
          if (event.includes('event: progress')) {
            if (payload.totalChunks) {
              const remaining = payload.totalChunks - (payload.completedChunks ?? 0);
              const activity = payload.activity ? `${payload.activity}. ` : '';
              setStage(`${activity}A preparar: ${payload.completedChunks ?? 0} de ${payload.totalChunks} etapas concluídas (${remaining} restantes). O modelo ainda está a trabalhar…`);
            } else setStage('A extrair capítulos antes de preparar os blocos… O processo está em andamento.');
          } else if (event.includes('event: error')) {
            throw new Error(payload.message || 'A preparação falhou durante um dos blocos.');
          } else if (event.includes('event: complete')) {
            setStage('Preparação concluída.');
            await queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
            await queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            setIsPending(false);
            reset();
            onClose();
          }
        }
      }
    } catch (caughtError) {
      setStage('');
      setError(caughtError instanceof Error ? caughtError.message : 'A importação não correu como esperado. Tenta novamente.');
      setIsPending(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-head">
          <div><h2 id="import-title">Abrir uma nova leitura</h2><p>Preparamos o terreno para que as primeiras páginas fluam.</p></div>
          <button className="modal-close" onClick={close} aria-label="Fechar janela" data-testid="button-close-import"><X size={20} /></button>
        </div>
        <div className="source-choice">
          <button className={`source-option ${sourceType === 'EPUB' ? 'selected' : ''}`} onClick={() => setSourceType('EPUB')} type="button" data-testid="button-source-epub">
            <FileText size={17} /><strong>Ficheiro EPUB</strong><span>Um livro que tens contigo</span>
          </button>
          <button className={`source-option ${sourceType === 'ARTICLE' ? 'selected' : ''}`} onClick={() => setSourceType('ARTICLE')} type="button" data-testid="button-source-article">
            <Globe2 size={17} /><strong>Artigo na web</strong><span>Um texto para ler devagar</span>
          </button>
        </div>
        <form onSubmit={submit}>
          {sourceType === 'EPUB' ? (
            <div className="field">
              <label htmlFor="book-file">Ficheiro</label>
               <input ref={fileRef} id="book-file" type="file" accept=".epub" hidden onChange={(event) => chooseFile(event.target.files?.[0])} data-testid="input-book-file" />
              <button type="button" className="button button-quiet" onClick={() => fileRef.current?.click()} data-testid="button-choose-file">
                <Upload size={15} /> {fileName || 'Escolher EPUB'}
              </button>
            </div>
          ) : (
            <div className="field"><label htmlFor="article-url">Endereço do artigo</label><input id="article-url" value={content} onChange={(event) => setContent(event.target.value)} placeholder="https://..." data-testid="input-article-url" /></div>
          )}
          <div className="field"><label htmlFor="book-title">Título</label><input id="book-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O nome do livro ou artigo" data-testid="input-book-title" /></div>
          <div className="field"><label htmlFor="book-author">Autor <span>(opcional)</span></label><input id="book-author" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Quem escreveu?" data-testid="input-book-author" /></div>
            {stage && <div className="import-progress" role="status" data-testid="status-import-progress"><LoaderCircle size={15} className={isPending ? 'spin' : ''} /> {stage}</div>}
           {error && <div className="notice" role="alert" data-testid="status-import-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="button button-quiet" onClick={close} data-testid="button-cancel-import">Cancelar</button>
             <button type="submit" className="button button-primary" disabled={isPending} data-testid="button-submit-import">
               {isPending ? <><LoaderCircle size={15} className="spin" /> A preparar…</> : 'Importar e preparar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}