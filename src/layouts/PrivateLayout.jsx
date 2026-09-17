import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { Loader2 } from 'lucide-react';
import { syncAppNotifications } from '../utils/syncAppNotifications.js';
import { pollMatchAlerts } from '../utils/pollMatchAlerts.js';
import { getAlertSettings, startAlertScheduler } from '../services/alertService.js';
import AIAgentFloat from '../components/agent/AIAgentFloat.jsx';
import VoiceModeListener from '../components/voice/VoiceModeListener.jsx';
import ApplicationConfirmGate from '../components/voice/ApplicationConfirmGate.jsx';

export function PrivateLayout() {
  const { user, authLoading } = useApp();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isJobAssistant =
    location.pathname === '/assistant-emploi' &&
    !new URLSearchParams(location.search).get('section');

  useEffect(() => {
    if (!user?.id) return undefined;
    syncAppNotifications().catch(() => {});
    pollMatchAlerts().catch(() => {});
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollMatchAlerts().catch(() => {});
      }
    }, 45 * 1000);
    const syncInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncAppNotifications().catch(() => {});
      }
    }, 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncAppNotifications().catch(() => {});
        pollMatchAlerts().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(pollInterval);
      window.clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const settings = getAlertSettings();
    if (settings.enabled === false) return undefined;
    const alertInterval = startAlertScheduler(settings);
    return () => {
      if (alertInterval) window.clearInterval(alertInterval);
    };
  }, [user?.id]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-blue-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mecal-hero-bg flex h-screen flex-col overflow-hidden">
      <Navbar onMenuToggle={() => setMobileNavOpen((v) => !v)} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 overflow-hidden">
        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Fermer le menu"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}
        <Sidebar variant={mobileNavOpen ? 'mobile' : 'desktop'} onNavigate={() => setMobileNavOpen(false)} />
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col p-4 text-slate-900 md:p-8 dark:text-slate-100 ${
            isJobAssistant ? 'overflow-hidden' : 'overflow-x-auto overflow-y-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
      <AIAgentFloat />
      <VoiceModeListener />
      <ApplicationConfirmGate />
    </div>
  );
}
