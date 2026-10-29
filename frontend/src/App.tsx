import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
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
import { AIInsightsPage } from './pages/AIInsightsPage';
import { ImprovementsPage } from './pages/ImprovementsPage';
import { SettingsPage } from './pages/SettingsPage';
import { InternshipsPage } from './pages/InternshipsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200 w-full bg-[#0B0D12] relative overflow-x-hidden">
      {/* Background layer: subtle teal top glow, soft warm bottom glow, faint dotted texture, and circular arcs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Faint dotted texture */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top subtle teal ambient lighting */}
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-teal-500/[0.08] rounded-full blur-[120px]" />

        {/* Bottom soft warm glow */}
        <div className="absolute -bottom-[160px] left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-amber-500/[0.09] rounded-full blur-[120px]" />

        {/* Thin circular arc patterns matching reference */}
        {/* Upper Convex-Down Arc */}
        <div className="w-[1280px] h-[1280px] rounded-full border border-white/[0.045] absolute left-1/2 -translate-x-1/2 -top-[940px]" />
        {/* Lower Convex-Up Arc */}
        <div className="w-[1280px] h-[1280px] rounded-full border border-white/[0.045] absolute left-1/2 -translate-x-1/2 -bottom-[940px]" />
        {/* Central Orbital Halo */}
        <div className="w-[800px] h-[800px] rounded-full border border-white/[0.03] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        {/* Secondary Inner Circular Accent */}
        <div className="w-[1100px] h-[1100px] rounded-full border border-white/[0.015] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <Navbar />
      <AuthDrawer />

      <main className="flex-1 w-full max-w-full flex flex-col relative z-10">
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
            path="/progress"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
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
            path="/ai-insights"
            element={<AIInsightsPage />}
          />
          <Route
            path="/improvements"
            element={<ImprovementsPage />}
          />
          <Route
            path="/internships"
            element={
              <ProtectedRoute>
                <InternshipsPage />
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

      {!isLandingPage && (
        <footer className="border-t border-[#232736]/70 bg-[#0B0D12]/80 backdrop-blur-md py-3.5 px-4 text-center text-xs text-slate-400 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <span className="font-semibold text-white">DevProfile AI</span>
            <span>&bull;</span>
            <span>Intelligent GitHub Profile &amp; Repository Analysis</span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AnalysisProvider>
          <Router>
            <AppLayout />
          </Router>
        </AnalysisProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};


export default App;
