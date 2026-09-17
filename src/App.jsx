import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext.jsx';
import { I18nProvider } from './context/I18nContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { VoiceModeProvider } from './context/VoiceModeContext.jsx';
import { PrivateLayout } from './layouts/PrivateLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import VerifyOTPPage from './pages/auth/VerifyOTPPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import PendingApprovalPage from './pages/auth/PendingApprovalPage.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Opportunities from './pages/Opportunities.jsx';
import StrictMecal from './pages/StrictMecal.jsx';
import Applications from './pages/Applications.jsx';
import Settings from './pages/Settings.jsx';
import Sources from './pages/Sources.jsx';
import Categories from './pages/Categories.jsx';
import Agent from './pages/Agent.jsx';
import Analytics from './pages/Analytics.jsx';
import Alerts from './pages/Alerts.jsx';
import Archive from './pages/Archive.jsx';
import Messaging from './pages/Messaging.jsx';
import Marketing from './pages/Marketing.jsx';
import JobAssistant from './pages/JobAssistant.jsx';
import I18nUserSync from './components/I18nUserSync.jsx';

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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route element={<PrivateLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/strict-mecal" element={<StrictMecal />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/agent" element={<Agent />} />
              <Route path="/assistant-emploi" element={<JobAssistant />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </BrowserRouter>
          </VoiceModeProvider>
        </I18nProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
