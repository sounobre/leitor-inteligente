import { Check, ChevronRight, Flame, LockKeyhole, Play, Star, Trophy, Zap } from 'lucide-react';
import { useState } from 'react';

const lessons = [
  { number: 1, title: 'Primeiros passos', subtitle: 'Cumprimentos e apresentações', state: 'done', color: 'mint' },
  { number: 2, title: 'Vida cotidiana', subtitle: 'Rotinas e horários', state: 'current', color: 'yellow' },
  { number: 3, title: 'Conversas reais', subtitle: 'Perguntas e respostas', state: 'locked', color: 'blue' },
  { number: 4, title: 'No mundo', subtitle: 'Viagens, lugares e direções', state: 'locked', color: 'coral' },
];

export function TestPage() {
  const [selected, setSelected] = useState(2);
  const activeLesson = lessons.find((lesson) => lesson.number === selected) ?? lessons[1];

  return (
    <div className="page test-page fade-up">
      <div className="test-topbar">
        <div>
          <div className="eyebrow">CENTRO DE PRÁTICA</div>
          <h1 className="page-title">Teste <em>o que aprendeu.</em></h1>
          <p className="lead">Uma trilha curta para transformar leitura em memória. Complete uma lição por dia, no seu ritmo.</p>
        </div>
        <div className="test-streak"><Flame size={20} fill="currentColor" /><strong>7</strong><span>dias seguidos</span></div>
      </div>

      <section className="test-hero">
        <div className="test-hero-copy">
          <span className="test-pill"><Zap size={14} fill="currentColor" /> lição do dia</span>
          <h2>Vida cotidiana</h2>
          <p>Fale sobre a sua rotina usando frases que você já encontrou nas suas leituras.</p>
          <div className="test-hero-meta"><span><Star size={15} fill="currentColor" /> +10 XP</span><span>5 min</span><span>5 exercícios</span></div>
          <button className="button test-start" onClick={() => setSelected(2)}><Play size={16} fill="currentColor" /> Começar lição</button>
        </div>
        <div className="test-hero-art" aria-hidden="true"><div className="test-cloud cloud-one" /><div className="test-cloud cloud-two" /><div className="test-sun" /><div className="test-hill hill-back" /><div className="test-hill hill-front" /><div className="test-character">✦</div></div>
      </section>

      <div className="test-layout">
        <section className="test-path">
          <div className="section-head"><div><div className="eyebrow">SUA TRILHA</div><h2>Inglês para ler melhor</h2></div><span className="test-progress-label">1 de 4 completas</span></div>
          <div className="test-progress-track"><div /></div>
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <button key={lesson.number} className={`lesson-row ${selected === lesson.number ? 'selected' : ''} ${lesson.state}`} onClick={() => lesson.state !== 'locked' && setSelected(lesson.number)} disabled={lesson.state === 'locked'}>
                <span className={`lesson-icon ${lesson.color}`}>{lesson.state === 'done' ? <Check size={18} strokeWidth={3} /> : lesson.state === 'locked' ? <LockKeyhole size={17} /> : lesson.number}</span>
                <span className="lesson-copy"><strong>{lesson.title}</strong><small>{lesson.subtitle}</small></span>
                <span className="lesson-action">{lesson.state === 'done' ? 'revisar' : lesson.state === 'locked' ? 'bloqueada' : 'continuar'} <ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        </section>
        <aside className="test-sidebar">
          <div className="test-xp-card"><div className="test-card-heading"><Trophy size={18} /><span>Seu progresso</span></div><strong>120 <small>XP</small></strong><div className="test-xp-bar"><div style={{ width: '68%' }} /></div><p>Mais 55 XP para alcançar o próximo nível.</p></div>
          <div className="test-tip-card"><span className="test-tip-mark">✦</span><strong>Uma dica para hoje</strong><p>Leia a frase em voz alta antes de olhar a tradução. Seu cérebro aprende melhor quando tenta primeiro.</p></div>
        </aside>
      </div>
      <div className="test-selection-note"><span className="eyebrow">PRÓXIMA LIÇÃO</span><strong>{activeLesson.title}</strong><span>{activeLesson.subtitle}</span></div>
    </div>
  );
}