import { Check, Cloud, Database, LoaderCircle, RefreshCw, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

const storageKey = 'leitor-inteligente-settings';
const defaultEndpoints: Record<AiProvider, string> = { ollama: 'http://localhost:11434', openrouter: 'https://openrouter.ai/api/v1' };
export type AiProvider = 'ollama' | 'openrouter';
export type Preferences = { provider: AiProvider; endpoint: string; model: string; level: string; dailyGoal: string; showPronunciation: boolean; gentleReminders: boolean };
export const defaults: Preferences = { provider: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3.2', level: 'B1 · Intermédio', dailyGoal: '25', showPronunciation: true, gentleReminders: true };

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
  const [connection, setConnection] = useState<'checking' | 'ok' | 'error'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);
  const copy = providerCopy[settings.provider];

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
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
  const save = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return <div className="page fade-up">
    <div className="eyebrow">o teu método</div><h1 className="page-title">Preferências <em>calmas.</em></h1><p className="lead">Ajusta o ambiente de estudo ao teu ritmo. Estas escolhas ficam contigo, neste dispositivo.</p>
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
      <section className="settings-card"><h2>Sinais de atenção</h2><p>Escolhe o que queres ter à vista durante uma sessão.</p><div className="setting-row"><div><strong>Mostrar pronúncia</strong><span>O som antes da tradução.</span></div><button type="button" className={`switch ${settings.showPronunciation ? 'on' : ''}`} onClick={() => update('showPronunciation', !settings.showPronunciation)} aria-pressed={settings.showPronunciation} data-testid="button-toggle-pronunciation" /></div><div className="setting-row"><div><strong>Lembretes gentis</strong><span>Uma nota quando a leitura pedir companhia.</span></div><button type="button" className={`switch ${settings.gentleReminders ? 'on' : ''}`} onClick={() => update('gentleReminders', !settings.gentleReminders)} aria-pressed={settings.gentleReminders} data-testid="button-toggle-reminders" /></div></section>
      <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}><button type="submit" className="button button-primary" data-testid="button-save-settings">{saved ? <><Check size={15} /> Guardado neste dispositivo</> : <><Save size={15} /> Guardar preferências</>}</button></div>
    </form>
    <div className="routine-grid" style={{ marginTop:42 }}><div className="routine-card"><div className="routine-top"><Database size={18} /><span>local</span></div><h3>Ollama fica contigo</h3><p>Escolhe a opção local quando quiseres preparar a leitura sem enviar o texto para um serviço online.</p></div><div className="routine-card"><div className="routine-top"><Cloud size={18} /><span>online</span></div><h3>OpenRouter no preview</h3><p>Usa um modelo online quando o computador com Ollama não estiver acessível.</p></div><div className="routine-card"><div className="routine-top"><Sparkles size={18} /><span>foco</span></div><h3>Curiosidade é o guia</h3><p>Não precisas de reconhecer tudo para pertencer a uma história.</p></div></div>
  </div>;
}