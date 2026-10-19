import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthDrawer } from './components/AuthDrawer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { HistoryPage } from './pages/HistoryPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span className="text-xs text-slate-400">Verifying session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      <Navbar />
      <AuthDrawer />

      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-800/80 bg-navy-950 py-8 px-4 text-center text-xs text-slate-400 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="font-semibold text-white">DevProfile AI</span>
          <span>&bull;</span>
          <span>FastAPI + SQLite/PostgreSQL Database</span>
          <span>&bull;</span>
          <span>Argon2 Security &amp; GitHub OAuth</span>
          <span>&bull;</span>
          <span>Groq Cloud LLaMA-3 + Deterministic Scoring</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Engineered for College Placement Drives &amp; Technical Interviews. Persistent History &amp; Progress Tracking Active.
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
};

export default App;
