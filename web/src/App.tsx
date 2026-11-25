import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { LandingPage } from './pages/LandingPage';
import { AccessPage } from './pages/AccessPage';
import { RunnerPage } from './pages/RunnerPage';
import { ResultPage } from './pages/ResultPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { CoursesPage } from './pages/admin/CoursesPage';
import { ExamsPage } from './pages/admin/ExamsPage';
import { ExamEditorPage } from './pages/admin/ExamEditorPage';
import { AttemptsPage } from './pages/admin/AttemptsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-500">
        در حال بارگذاری…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/access/:code" element={<AccessPage />} />
        <Route path="/run/:attemptId" element={<RunnerPage />} />
        <Route path="/result/:attemptId" element={<ResultPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/:id" element={<ExamEditorPage />} />
        <Route path="attempts" element={<AttemptsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
