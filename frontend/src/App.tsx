import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/auth/RouteGuards';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageSpinner } from './components/ui/Spinner';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { ScheduledPage, SentPage } from './pages/FolderPages';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// The editor bundle is the heaviest dependency, so Compose is code-split.
const ComposePage = lazy(() => import('./pages/ComposePage').then((module) => ({ default: module.ComposePage })));

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path="/compose"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <ComposePage />
            </Suspense>
          }
        />
        <Route element={<AppLayout />}>
          <Route path="/scheduled" element={<ScheduledPage />} />
          <Route path="/sent" element={<SentPage />} />
          <Route path="/emails/:id" element={<EmailDetailPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/scheduled" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
