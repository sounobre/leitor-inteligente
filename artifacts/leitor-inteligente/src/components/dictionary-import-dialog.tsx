import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function DictionaryImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [isbn, setIsbn] = useState('');
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ importedEntries: number; skippedLines: number; warnings: string[] } | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle(''); setPublisher(''); setIsbn(''); setFileName(''); setContent(''); setIsPrivate(false); setError(''); setResult(null);
  };
  
  const close = () => { 
    if (!isPending) { 
      reset(); 
      onClose(); 
    } 
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.epub')) { 
      setError('Escolha um arquivo .epub válido.'); 
      return; 
    }
    if (file.size > 50 * 1024 * 1024) { 
      setError('A obra de referência deve ter no máximo 50 MB.'); 
      return; 
    }
    setError('');
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    
    const reader = new FileReader();
    reader.onload = () => { 
      setContent(typeof reader.result === 'string' ? reader.result : ''); 
    };
    reader.onerror = () => setError('Não foi possível ler este ficheiro.');
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content) { setError('Selecione um arquivo EPUB.'); return; }
    if (!title.trim()) { setError('Informe um nome para este dicionário.'); return; }
    if (!isPrivate) { setError('Confirme que este arquivo é para uso pessoal e privado.'); return; }
    
    setError('');
    setIsPending(true);
    
    try {
      const response = await fetch('/api/dictionaries/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          publisher: publisher.trim() || undefined,
          isbn: isbn.trim() || undefined,
          fileName,
          content,
          privateAcknowledged: isPrivate,
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Falha ao importar o dicionário.');
      
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['dictionaries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-head">
          <div>
            <h2 id="import-title">Importar dicionário</h2>
            <p>Adicione suas obras de referência privadas à sua coleção pessoal.</p>
          </div>
          <button className="modal-close" onClick={close} disabled={isPending}>
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div style={{ marginTop: '24px', textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', letterSpacing: '-0.03em' }}>Dicionário importado</h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
              Foram extraídos {result.importedEntries} verbetes da obra de referência.
            </p>
            <button className="button button-primary" onClick={close}>Fechar janela</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: '24px' }}>
            <div className="field">
              <label>Arquivo EPUB</label>
              <input ref={fileRef} type="file" accept=".epub" hidden onChange={e => chooseFile(e.target.files?.[0])} />
              <button type="button" className="button button-quiet" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> {fileName || 'Escolher obra de referência (EPUB)'}
              </button>
            </div>
            <div className="field">
              <label>Título</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="O nome do dicionário" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label>Editora <span>(opcional)</span></label>
                <input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Ex: Oxford" />
              </div>
              <div className="field">
                <label>ISBN <span>(opcional)</span></label>
                <input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="Ex: 978-..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '24px', padding: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
              <button 
                type="button" 
                role="checkbox" 
                aria-checked={isPrivate}
                onClick={() => setIsPrivate(!isPrivate)}
                style={{ flex: '0 0 20px', height: '20px', border: isPrivate ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))', borderRadius: '5px', background: isPrivate ? 'hsl(var(--primary))' : 'hsl(var(--background))', color: 'hsl(var(--primary-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginTop: '2px', transition: 'all 0.2s' }}
              >
                {isPrivate && <Check size={14} strokeWidth={3} />}
              </button>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'hsl(var(--foreground))' }}>
                <strong>Uso pessoal e privado</strong>
                <p style={{ margin: '4px 0 0', color: 'hsl(var(--muted-foreground))' }}>
                  Declaro que possuo uma cópia legítima desta obra e que a importação se destina exclusivamente ao meu estudo pessoal.
                </p>
              </div>
            </div>

            {error && <div className="notice" style={{ marginTop: '16px' }}>{error}</div>}
            
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="button button-quiet" onClick={close} disabled={isPending}>Cancelar</button>
              <button type="submit" className="button button-primary" disabled={isPending || (!isPrivate && !error)}>
                {isPending ? <><LoaderCircle size={15} className="spin" /> Importando e indexando...</> : 'Importar para uso privado'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
