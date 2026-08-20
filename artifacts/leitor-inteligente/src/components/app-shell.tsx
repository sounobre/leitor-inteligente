import { BookOpen, Compass, Library, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';

const navItems = [
  { href: '/', label: 'Visão geral', icon: Compass },
  { href: '/library', label: 'Biblioteca', icon: Library },
  { href: '/settings', label: 'Preferências', icon: Settings2 },
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
  const isActive = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">O teu espaço</div>
        <nav aria-label="Navegação principal">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${isActive(href) ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <strong>Um livro de cada vez.</strong>
          <span>Prepara a leitura. Repara no que antes passava despercebido.</span>
          <div className="connection">
            <span className={`connection-dot ${health.data?.status === 'ok' ? 'ok' : ''}`} />
            {health.data?.status === 'ok' ? 'motor de estudo ligado' : 'a verificar o motor'}
          </div>
        </div>
      </aside>
      <header className="mobile-header">
        <Brand />
        <nav className="mobile-nav" aria-label="Navegação móvel">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-label={label} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={18} />
            </Link>
          ))}
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}