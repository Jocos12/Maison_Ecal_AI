import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext.jsx';
import { I18nProvider } from './context/I18nContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { VoiceModeProvider } from './context/VoiceModeContext.jsx';
import { PrivateLayout } from './layouts/PrivateLayout.jsx';
import { AdminRoute } from './layouts/AdminRoute.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import VerifyOTPPage from './pages/auth/VerifyOTPPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import PendingApprovalPage from './pages/auth/PendingApprovalPage.jsx';
import I18nUserSync from './components/I18nUserSync.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import PageLoader from './components/common/PageLoader.jsx';

// Pages chargées à la demande : seul l'écran ouvert est téléchargé.
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const AuditJournal = lazy(() => import('./pages/AuditJournal.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Opportunities = lazy(() => import('./pages/Opportunities.jsx'));
const StrictMecal = lazy(() => import('./pages/StrictMecal.jsx'));
const Applications = lazy(() => import('./pages/Applications.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Sources = lazy(() => import('./pages/Sources.jsx'));
const Nrc = lazy(() => import('./pages/Nrc.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Agent = lazy(() => import('./pages/Agent.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const Archive = lazy(() => import('./pages/Archive.jsx'));
const Messaging = lazy(() => import('./pages/Messaging.jsx'));
const Marketing = lazy(() => import('./pages/Marketing.jsx'));
const Contracts = lazy(() => import('./pages/Contracts.jsx'));
const Lifecycle = lazy(() => import('./pages/Lifecycle.jsx'));
const JobAssistant = lazy(() => import('./pages/JobAssistant.jsx'));

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <I18nProvider>
          <VoiceModeProvider>
          <I18nUserSync />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1e293b', color: '#fff' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
            }}
          />
          <AppRoutes />
          </BrowserRouter>
          </VoiceModeProvider>
        </I18nProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route element={<PrivateLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/strict-mecal" element={<StrictMecal />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/nrc" element={<Nrc />} />
              <Route path="/veille" element={<Nrc wide />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/agent" element={<Agent />} />
              <Route path="/assistant-emploi" element={<JobAssistant />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/contrats" element={<Contracts />} />
              <Route path="/cycle" element={<Lifecycle />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/settings" element={<Settings />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/journal" element={<AuditJournal />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
