import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { useEventStream } from './hooks/useEventStream';
import { useKiosk } from './hooks/useKiosk';
import { useLayoutTier } from './hooks/useLayoutTier';
import { PublicLayout } from './layout/PublicLayout';
import { LayoutContext } from './layout/TierContext';
import { NerdStatsPage } from './pages/NerdStatsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { SeatingPage } from './pages/SeatingPage';
import { TournamentsPage } from './pages/TournamentsPage';

// The admin area is only needed by organisers, so it's loaded on demand.
const AdminApp = lazy(() => import('./admin/AdminApp'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 2, refetchOnWindowFocus: true },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function Shell() {
  const kiosk = useKiosk();
  const tier = useLayoutTier(kiosk);
  useEventStream();
  return (
    <LayoutContext.Provider value={{ tier, kiosk }}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="turniere" element={<TournamentsPage />} />
          <Route path="sitzplan" element={<SeatingPage />} />
          <Route path="stats" element={<NerdStatsPage />} />
        </Route>
        <Route
          path="admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutContext.Provider>
  );
}
