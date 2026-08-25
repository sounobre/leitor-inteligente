import { BookMarked, BookOpen, Compass, Library, NotebookText, Search, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';

const navItems = [
  { href: '/', label: 'Visão geral', group: 'Comece aqui', icon: Compass },
  { href: '/library', label: 'Biblioteca', group: 'Comece aqui', icon: Library },
  { href: '/specialists', label: 'Especialistas', group: 'Estude melhor', icon: BookMarked },
  { href: '/dictionary', label: 'Dicionário', group: 'Estude melhor', icon: NotebookText },
  { href: '/public-dictionary', label: 'Dicionário público', group: 'Consulte', icon: Search },
  { href: '/dictionary-en-ptbr', label: 'Dicionário EN–PT-BR', group: 'Consulte', icon: Search },
  { href: '/settings', label: 'Preferências', group: 'Seu espaço', icon: Settings2 },
];

function Brand() {
  return (
    <Link href="/" className="brand" data-testid="link-brand">
      <span className="brand-mark"><BookOpen size={18} strokeWidth={2.3} /></span>
      <span className="brand-name">leitor <em>inteligente</em></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const isActive = (href: string) => href === '/'
    ? location === '/'
    : location === href || location.startsWith(`${href}/`);
  const testIdFor = (prefix: string, label: string) => `${prefix}-${label.toLowerCase().replaceAll(' ', '-').replaceAll('–', '-')}`;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand />
          <div className="reading-rhythm" aria-label="Ritmo de leitura: quatro dias nesta semana">
            <div className="rhythm-head">
              <span>Ritmo de leitura</span>
              <strong>4 dias</strong>
            </div>
            <div className="rhythm-track" aria-hidden="true"><span /></div>
            <p>Um pouco hoje deixa o próximo capítulo mais perto.</p>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Navegação principal">
          {navItems.map(({ href, label, group, icon: Icon }, index) => (
            <div className={`nav-group nav-group-${group.toLowerCase().replaceAll(' ', '-')}`} key={href}>
              {(index === 0 || navItems[index - 1].group !== group) && <div className="nav-label">{group}</div>}
              <Link
                href={href}
                className={`nav-link ${isActive(href) ? 'active' : ''}`}
                aria-current={isActive(href) ? 'page' : undefined}
                data-testid={testIdFor('link-nav', label)}
              >
                <span className="nav-icon"><Icon size={17} strokeWidth={1.9} /></span>
                <span className="nav-copy">{label}</span>
                {isActive(href) && <span className="nav-active-mark" aria-hidden="true" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-note">
            <strong>Um livro de cada vez.</strong>
            <span>Leia com contexto, sem descobrir a história antes da hora.</span>
          </div>
          <div className="connection">
            <span className={`connection-dot ${health.data?.status === 'ok' ? 'ok' : ''}`} />
            {health.data?.status === 'ok' ? 'motor de estudo ligado' : 'verificando o motor'}
          </div>
        </div>
      </aside>
      <header className="mobile-header">
        <div className="mobile-top">
          <Brand />
          <span className="mobile-rhythm"><i aria-hidden="true" /> 4 dias</span>
        </div>
        <nav className="mobile-nav" aria-label="Navegação móvel">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? 'active' : ''}
              aria-current={isActive(href) ? 'page' : undefined}
              data-testid={testIdFor('link-mobile', label)}
            >
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}