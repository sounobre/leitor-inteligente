import { Check, Cloud, Database, Download, LoaderCircle, RefreshCw, Save, SlidersHorizontal, Sparkles, Upload, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

export const storageKey = 'leitor-inteligente-settings';
const defaultEndpoints: Record<AiProvider, string> = { ollama: 'http://localhost:11434', openrouter: 'https://openrouter.ai/api/v1' };
export type AiProvider = 'ollama' | 'openrouter';
export type SpeechAccent = 'en-US' | 'en-GB';
export type Preferences = { provider: AiProvider; endpoint: string; model: string; level: string; dailyGoal: string; showPronunciation: boolean; gentleReminders: boolean; speechAccent: SpeechAccent };
export const defaults: Preferences = { provider: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3.2', level: 'B1 · Intermédio', dailyGoal: '25', showPronunciation: true, gentleReminders: true, speechAccent: 'en-US' };
export const preferencesExportVersion = 1;
const preferenceKeys = ['provider', 'endpoint', 'model', 'level', 'dailyGoal', 'showPronunciation', 'gentleReminders', 'speechAccent'] as const;
type PreferencesExport = { version: typeof preferencesExportVersion; preferences: Preferences };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateImportedPreferences(value: unknown): { valid: true; preferences: Preferences } | { valid: false; error: string } {
  if (!isRecord(value) || value.version !== preferencesExportVersion || !isRecord(value.preferences)) {
    return { valid: false, error: 'Este ficheiro não é uma exportação de preferências reconhecida.' };
  }
  const imported = value.preferences;
  const keys = Object.keys(imported);
  if (keys.length !== preferenceKeys.length || keys.some((key) => !preferenceKeys.includes(key as typeof preferenceKeys[number]))) {
    return { valid: false, error: 'O ficheiro tem campos incompatíveis ou está incompleto.' };
  }
  if (imported.provider !== 'ollama' && imported.provider !== 'openrouter') {
    return { valid: false, error: 'O ficheiro indica um motor de preparação inválido.' };
  }
  if (typeof imported.endpoint !== 'string' || typeof imported.model !== 'string' || typeof imported.level !== 'string' || typeof imported.dailyGoal !== 'string') {
    return { valid: false, error: 'O ficheiro tem valores de texto incompatíveis.' };
  }
  if (typeof imported.showPronunciation !== 'boolean' || typeof imported.gentleReminders !== 'boolean') {
    return { valid: false, error: 'O ficheiro tem opções de atenção incompatíveis.' };
  }
  if (imported.speechAccent !== 'en-US' && imported.speechAccent !== 'en-GB') {
    return { valid: false, error: 'O ficheiro indica um sotaque inválido.' };
  }
  return { valid: true, preferences: imported as Preferences };
}

export function getSettings(storage?: Pick<Storage, 'getItem'>): Preferences {
  try {
    const stored = (storage ?? window.localStorage).getItem(storageKey);
    if (!stored) return defaults;
    return { ...defaults, ...JSON.parse(stored) as Partial<Preferences> };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: Preferences, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? window.localStorage).setItem(storageKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

const providerCopy: Record<AiProvider, { title: string; description: string; endpointLabel: string; endpointHint: string; connectionOk: string; connectionError: string }> = {
  ollama: {
    title: 'Ollama local',
    description: 'Usa um modelo instalado no teu computador. O texto não sai da tua máquina.',
    endpointLabel: 'Endereço local',
    endpointHint: 'Instala um modelo com “ollama pull nome-do-modelo” e atualiza.',
    connectionOk: 'O Ollama local respondeu agora.',
    connectionError: 'Não foi possível ligar ao Ollama.',
  },
  openrouter: {
    title: 'OpenRouter',
    description: 'Usa um modelo online com a chave OPENROUTER_API_KEY guardada nos Secrets do Replit.',
    endpointLabel: 'Endpoint do OpenRouter',
    endpointHint: 'A chave fica apenas nos Secrets do Replit; escolha abaixo um modelo disponível na tua conta.',
    connectionOk: 'O catálogo do OpenRouter respondeu agora.',
    connectionError: 'Não foi possível ligar ao OpenRouter. Confirma o segredo OPENROUTER_API_KEY.',
  },
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [connection, setConnection] = useState<'checking' | 'ok' | 'error'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);
  const [importPreview, setImportPreview] = useState<Preferences | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const copy = providerCopy[settings.provider];

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConnection('checking');
    setLoadingModels(true);
    const route = settings.provider === 'ollama' ? '/api/ollama/models' : '/api/openrouter/models';
    const endpoint = settings.endpoint.trim();
    if (!endpoint) {
      setModels([]); setConnection('error'); setLoadingModels(false);
      return () => { cancelled = true; };
    }
    fetch(`${route}?endpoint=${encodeURIComponent(endpoint)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Model catalog unavailable');
        const payload = await response.json() as { models?: Array<{ name?: string }> };
        if (cancelled) return;
        setModels((payload.models ?? [])
          .map((model) => model.name ?? '')
          .filter(Boolean)
          .sort((left, right) => Number(right.endsWith(':free')) - Number(left.endsWith(':free')) || left.localeCompare(right)));
        setConnection('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setModels([]); setConnection('error');
      })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [settings.provider, settings.endpoint, modelsRefreshKey]);

  const refreshModels = () => setModelsRefreshKey((current) => current + 1);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const changeProvider = (provider: AiProvider) => setSettings((old) => ({
    ...old,
    provider,
    endpoint: defaultEndpoints[provider],
  }));
  const exportPreferences = () => {
    const payload: PreferencesExport = { version: preferencesExportVersion, preferences: settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leitor-inteligente-preferencias.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  const readImportFile = async (file: File) => {
    setImportError('');
    setImportSuccess(false);
    if (file.size > 1024 * 1024) {
      setImportError('O ficheiro é demasiado grande. Escolhe um JSON com menos de 1 MB.');
      return;
    }
    try {
      const result = validateImportedPreferences(JSON.parse(await file.text()) as unknown);
      if (!result.valid) {
        setImportError(result.error);
        return;
      }
      setImportPreview(result.preferences);
    } catch {
      setImportError('Não foi possível ler o ficheiro. Escolhe um JSON válido de preferências.');
    }
  };
  const applyImportedPreferences = () => {
    if (!importPreview) return;
    setImporting(true);
    if (!saveSettings(importPreview)) {
      setStorageError(true);
      setImporting(false);
      return;
    }
    setSettings(importPreview);
    setImportPreview(null);
    setImportSuccess(true);
    setImporting(false);
    window.setTimeout(() => setImportSuccess(false), 3000);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    setStorageError(false);
    if (!saveSettings(settings)) {
      setStorageError(true);
      setSaved(false);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return <div className="page fade-up">
    <div className="eyebrow">o teu método</div><h1 className="page-title">Preferências <em>calmas.</em></h1><p className="lead">Ajusta o ambiente de estudo ao teu ritmo. Estas escolhas ficam contigo, neste dispositivo.</p>
    <section className="settings-card preferences-transfer">
      <div><h2>Guardar e recuperar</h2><p>Exporta estas escolhas para um ficheiro ou recupera-as noutro navegador.</p></div>
      <div className="transfer-actions">
        <button type="button" className="button button-quiet" onClick={exportPreferences} data-testid="button-export-settings"><Download size={15} /> Exportar JSON</button>
        <label className="button button-quiet" data-testid="button-import-settings"><Upload size={15} /> Importar JSON<input type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImportFile(file); event.target.value = ''; }} /></label>
      </div>
      {importError && <div className="transfer-message transfer-error" role="alert" data-testid="status-settings-import-error">{importError}</div>}
      {importSuccess && <div className="transfer-message transfer-success" role="status" data-testid="status-settings-import-success">Preferências importadas e guardadas neste dispositivo.</div>}
    </section>
    <form onSubmit={save} className="settings-grid">
      <section className="settings-card wide">
        <h2>Motor de preparação</h2><p>Escolhe entre a tua instalação local e um modelo online disponível através do OpenRouter.</p>
        <div className="source-choice" style={{ marginTop: 18 }}>
          <button type="button" className={`source-option ${settings.provider === 'ollama' ? 'selected' : ''}`} onClick={() => changeProvider('ollama')} data-testid="button-provider-ollama"><Database size={17} /><strong>Local · Ollama</strong><span>Modelo instalado no computador</span></button>
          <button type="button" className={`source-option ${settings.provider === 'openrouter' ? 'selected' : ''}`} onClick={() => changeProvider('openrouter')} data-testid="button-provider-openrouter"><Cloud size={17} /><strong>Online · OpenRouter</strong><span>Modelo disponível na tua chave</span></button>
        </div>
        <div className="field"><label htmlFor="ai-endpoint">{copy.endpointLabel}</label><input id="ai-endpoint" value={settings.endpoint} onChange={(event) => update('endpoint', event.target.value)} data-testid="input-ai-endpoint" /></div>
        <div className="field"><label htmlFor="ai-model">Modelo</label><div style={{ display: 'flex', gap: 8 }}><select id="ai-model" value={settings.model} onChange={(event) => update('model', event.target.value)} disabled={loadingModels || models.length === 0} data-testid="select-ai-model" style={{ flex: 1 }}><option value="">{loadingModels ? 'A procurar modelos…' : models.length === 0 ? 'Nenhum modelo encontrado' : 'Escolhe um modelo'}</option>{settings.model && !models.includes(settings.model) && <option value={settings.model}>{settings.model} (guardado)</option>}{models.map((model) => <option key={model} value={model}>{model.endsWith(':free') ? 'Gratuito · ' : ''}{model}</option>)}</select><button type="button" className="button button-quiet" onClick={refreshModels} aria-label="Atualizar modelos" title="Atualizar modelos" data-testid="button-refresh-ai-models" disabled={loadingModels}>{loadingModels ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}</button></div><span className="field-hint">{models.length > 0 ? `${models.length} modelo${models.length === 1 ? '' : 's'} encontrado${models.length === 1 ? '' : 's'} para ${copy.title}.${settings.provider === 'openrouter' ? ' Os gratuitos aparecem primeiro.' : ''}` : copy.endpointHint}</span></div>
        <div className="connection"><span className={`connection-dot ${connection === 'ok' ? 'ok' : ''}`} />{connection === 'checking' ? 'a verificar ligação…' : connection === 'ok' ? copy.connectionOk : copy.connectionError}</div>
      </section>
      <section className="settings-card"><h2>Ritmo de leitura</h2><p>Pequenas decisões que tornam o estudo sustentável.</p><div className="field"><label htmlFor="study-level">Nível de inglês</label><select id="study-level" value={settings.level} onChange={(event) => update('level', event.target.value)} data-testid="select-study-level"><option>A2 · Elementar</option><option>B1 · Intermédio</option><option>B2 · Intermédio alto</option><option>C1 · Avançado</option></select></div><div className="field"><label htmlFor="daily-goal">Minutos por dia</label><input id="daily-goal" type="number" min="5" max="180" value={settings.dailyGoal} onChange={(event) => update('dailyGoal', event.target.value)} data-testid="input-daily-goal" /></div></section>
      <section className="settings-card"><h2>Sinais de atenção</h2><p>Escolhe o que queres ter à vista durante uma sessão.</p><div className="setting-row"><div><strong>Mostrar pronúncia</strong><span>O som antes da tradução.</span></div><button type="button" className={`switch ${settings.showPronunciation ? 'on' : ''}`} onClick={() => update('showPronunciation', !settings.showPronunciation)} aria-pressed={settings.showPronunciation} data-testid="button-toggle-pronunciation" /></div><div className="field"><label htmlFor="speech-accent">Sotaque da pronúncia</label><select id="speech-accent" value={settings.speechAccent} onChange={(event) => update('speechAccent', event.target.value as SpeechAccent)} data-testid="select-speech-accent"><option value="en-US">Americano (EUA)</option><option value="en-GB">Britânico (Reino Unido)</option></select><span className="field-hint">Escolhe a variante usada ao ouvir os cartões.</span></div><div className="setting-row"><div><strong>Lembretes gentis</strong><span>Uma nota quando a leitura pedir companhia.</span></div><button type="button" className={`switch ${settings.gentleReminders ? 'on' : ''}`} onClick={() => update('gentleReminders', !settings.gentleReminders)} aria-pressed={settings.gentleReminders} data-testid="button-toggle-reminders" /></div></section>
      <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}><button type="submit" className="button button-primary" data-testid="button-save-settings">{saved ? <><Check size={15} /> Guardado neste dispositivo</> : <><Save size={15} /> Guardar preferências</>}</button></div>
    </form>
    {storageError && <div className="error-state" style={{ marginTop: 20 }} role="alert" data-testid="status-settings-storage-error">Não foi possível guardar as preferências neste dispositivo. Verifica as permissões de armazenamento do navegador e tenta novamente.</div>}
    {importPreview && <div className="modal-backdrop" role="presentation"><div className="modal import-preferences-modal" role="dialog" aria-modal="true" aria-labelledby="import-preferences-title">
      <button type="button" className="modal-close" onClick={() => setImportPreview(null)} aria-label="Fechar pré-visualização"><X size={18} /></button>
      <div className="eyebrow">pré-visualização</div><h2 id="import-preferences-title">Rever preferências</h2><p>Confirma as escolhas abaixo antes de as aplicar neste dispositivo.</p>
      <dl className="import-summary">
        <div><dt>Motor</dt><dd>{importPreview.provider === 'ollama' ? 'Local · Ollama' : 'Online · OpenRouter'}</dd></div>
        <div><dt>Modelo</dt><dd>{importPreview.model}</dd></div>
        <div><dt>Nível</dt><dd>{importPreview.level}</dd></div>
        <div><dt>Minutos por dia</dt><dd>{importPreview.dailyGoal}</dd></div>
        <div><dt>Pronúncia</dt><dd>{importPreview.showPronunciation ? 'Visível' : 'Oculta'} · {importPreview.speechAccent === 'en-US' ? 'Americano' : 'Britânico'}</dd></div>
        <div><dt>Lembretes</dt><dd>{importPreview.gentleReminders ? 'Ativados' : 'Desativados'}</dd></div>
      </dl>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setImportPreview(null)}>Cancelar</button><button type="button" className="button button-primary" onClick={applyImportedPreferences} disabled={importing} data-testid="button-apply-import">{importing ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Aplicar preferências</button></div>
    </div></div>}
    <div className="routine-grid" style={{ marginTop:42 }}><div className="routine-card"><div className="routine-top"><Database size={18} /><span>local</span></div><h3>Ollama fica contigo</h3><p>Escolhe a opção local quando quiseres preparar a leitura sem enviar o texto para um serviço online.</p></div><div className="routine-card"><div className="routine-top"><Cloud size={18} /><span>online</span></div><h3>OpenRouter no preview</h3><p>Usa um modelo online quando o computador com Ollama não estiver acessível.</p></div><div className="routine-card"><div className="routine-top"><Sparkles size={18} /><span>foco</span></div><h3>Curiosidade é o guia</h3><p>Não precisas de reconhecer tudo para pertencer a uma história.</p></div></div>
  </div>;
}