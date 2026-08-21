import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/pages/dashboard';
import { LibraryPage } from '@/pages/library';
import { SettingsPage } from '@/pages/settings';
import { StudyPage } from '@/pages/study';
import { FantasyTrailPage } from '@/pages/trails/fantasy';
import { SpecialistsPage } from '@/pages/specialists';
import { FANTASY_TRAIL_ROUTE, SPECIALISTS_ROUTE } from '@/routes';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/library" component={LibraryPage} />
          <Route path={FANTASY_TRAIL_ROUTE} component={FantasyTrailPage} />
          <Route path={SPECIALISTS_ROUTE} component={SpecialistsPage} />
          <Route path="/study/:bookId" component={StudyPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
