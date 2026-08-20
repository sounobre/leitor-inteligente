import { Check, Database, LoaderCircle, RefreshCw, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

const storageKey = 'leitor-inteligente-settings';
export type Preferences = { endpoint: string; model: string; level: string; dailyGoal: string; showPronunciation: boolean; gentleReminders: boolean };
export const defaults: Preferences = { endpoint: 'http://localhost:11434', model: 'llama3.2', level: 'B1 · Intermédio', dailyGoal: '25', showPronunciation: true, gentleReminders: true };

export function SettingsPage() {
  const [settings, setSettings] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  const [connection, setConnection] = useState<'checking' | 'ok' | 'error'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);
  useEffect(() => { const raw = window.localStorage.getItem(storageKey); if (raw) setSettings({ ...defaults, ...JSON.parse(raw) }); }, []);
  useEffect(() => {
    let cancelled = false;
    setConnection('checking');
    setLoadingModels(true);
    if (!settings.endpoint.trim()) {
      setModels([]);
      setConnection('error');
      setLoadingModels(false);
      return () => { cancelled = true; };
    }
    fetch(`/api/ollama/models?endpoint=${encodeURIComponent(settings.endpoint.trim())}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Ollama unavailable');
        const payload = await response.json() as { models?: Array<{ name?: string }> };
        if (cancelled) return;
        setModels((payload.models ?? []).map((model) => model.name ?? '').filter(Boolean));
        setConnection('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setModels([]);
        setConnection('error');
      })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [settings.endpoint, modelsRefreshKey]);
  const refreshModels = () => setModelsRefreshKey((current) => current + 1);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const save = (event: FormEvent) => { event.preventDefault(); window.localStorage.setItem(storageKey, JSON.stringify(settings)); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  return <div className="page fade-up">
    <div className="eyebrow">o teu método</div><h1 className="page-title">Preferências <em>calmas.</em></h1><p className="lead">Ajusta o ambiente de estudo ao teu ritmo. Estas escolhas ficam contigo, neste dispositivo.</p>
    <form onSubmit={save} className="settings-grid">
       <section className="settings-card wide"><h2>Motor de preparação</h2><p>Ollama corre localmente para que o plano de cada livro seja teu — e só teu.</p><div className="field"><label htmlFor="ollama-endpoint">Endereço local</label><input id="ollama-endpoint" value={settings.endpoint} onChange={(event) => update('endpoint', event.target.value)} data-testid="input-ollama-endpoint" /></div><div className="field"><label htmlFor="ollama-model">Modelo instalado</label><div style={{ display: 'flex', gap: 8 }}><select id="ollama-model" value={settings.model} onChange={(event) => update('model', event.target.value)} disabled={loadingModels || models.length === 0} data-testid="select-ollama-model" style={{ flex: 1 }}><option value="">{loadingModels ? 'A procurar modelos…' : models.length === 0 ? 'Nenhum modelo encontrado' : 'Escolhe um modelo'}</option>{settings.model && !models.includes(settings.model) && <option value={settings.model}>{settings.model} (guardado)</option>}{models.map((model) => <option key={model} value={model}>{model}</option>)}</select><button type="button" className="button button-quiet" onClick={refreshModels} aria-label="Atualizar modelos" title="Atualizar modelos" data-testid="button-refresh-ollama-models" disabled={loadingModels}>{loadingModels ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}</button></div><span className="field-hint">{models.length > 0 ? `${models.length} modelo${models.length === 1 ? '' : 's'} encontrado${models.length === 1 ? '' : 's'} na tua instalação do Ollama.` : 'Instala um modelo com “ollama pull nome-do-modelo” e atualiza.'}</span></div><div className="connection"><span className={`connection-dot ${connection === 'ok' ? 'ok' : ''}`} />{connection === 'checking' ? 'a verificar ligação…' : connection === 'ok' ? 'O Ollama local respondeu agora.' : 'Não foi possível ligar ao Ollama.'}</div></section>
      <section className="settings-card"><h2>Ritmo de leitura</h2><p>Pequenas decisões que tornam o estudo sustentável.</p><div className="field"><label htmlFor="study-level">Nível de inglês</label><select id="study-level" value={settings.level} onChange={(event) => update('level', event.target.value)} data-testid="select-study-level"><option>A2 · Elementar</option><option>B1 · Intermédio</option><option>B2 · Intermédio alto</option><option>C1 · Avançado</option></select></div><div className="field"><label htmlFor="daily-goal">Minutos por dia</label><input id="daily-goal" type="number" min="5" max="180" value={settings.dailyGoal} onChange={(event) => update('dailyGoal', event.target.value)} data-testid="input-daily-goal" /></div></section>
      <section className="settings-card"><h2>Sinais de atenção</h2><p>Escolhe o que queres ter à vista durante uma sessão.</p><div className="setting-row"><div><strong>Mostrar pronúncia</strong><span>O som antes da tradução.</span></div><button type="button" className={`switch ${settings.showPronunciation ? 'on' : ''}`} onClick={() => update('showPronunciation', !settings.showPronunciation)} aria-pressed={settings.showPronunciation} data-testid="button-toggle-pronunciation" /></div><div className="setting-row"><div><strong>Lembretes gentis</strong><span>Uma nota quando a leitura pedir companhia.</span></div><button type="button" className={`switch ${settings.gentleReminders ? 'on' : ''}`} onClick={() => update('gentleReminders', !settings.gentleReminders)} aria-pressed={settings.gentleReminders} data-testid="button-toggle-reminders" /></div></section>
      <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}><button type="submit" className="button button-primary" data-testid="button-save-settings">{saved ? <><Check size={15} /> Guardado neste dispositivo</> : <><Save size={15} /> Guardar preferências</>}</button></div>
    </form>
    <div className="routine-grid" style={{ marginTop:42 }}><div className="routine-card"><div className="routine-top"><Database size={18} /><span>local</span></div><h3>Os teus dados ficam perto</h3><p>O endereço do Ollama é guardado apenas no armazenamento local deste navegador.</p></div><div className="routine-card"><div className="routine-top"><SlidersHorizontal size={18} /><span>ritmo</span></div><h3>Menos pressão, mais contexto</h3><p>O plano adapta a quantidade de itens ao teu objetivo diário.</p></div><div className="routine-card"><div className="routine-top"><Sparkles size={18} /><span>foco</span></div><h3>Curiosidade é o guia</h3><p>Não precisas de reconhecer tudo para pertencer a uma história.</p></div></div>
  </div>;
}