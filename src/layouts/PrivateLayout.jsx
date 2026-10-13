import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar.jsx';
import SidebarDock from '../components/layout/SidebarDock.jsx';
import FloatingDock from '../components/layout/FloatingDock.jsx';
import { useSidebarDock } from '../hooks/useSidebarDock.js';
import { useApp } from '../context/AppContext.jsx';
import { Loader2 } from 'lucide-react';
import { syncAppNotifications } from '../utils/syncAppNotifications.js';
import { pollMatchAlerts } from '../utils/pollMatchAlerts.js';
import { getAlertSettings, startAlertScheduler } from '../services/alertService.js';
import VoiceModeListener from '../components/voice/VoiceModeListener.jsx';
import ApplicationConfirmGate from '../components/voice/ApplicationConfirmGate.jsx';

export function PrivateLayout() {
  const { user, authLoading } = useApp();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dock = useSidebarDock();
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
    <div className="mecal-hero-bg flex h-screen overflow-hidden">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <SidebarDock dock={dock} mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setMobileNavOpen((v) => !v)} />
        <div className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 overflow-hidden">
          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col text-slate-900 dark:text-slate-100 ${
              isJobAssistant ? 'overflow-hidden p-3 md:p-4' : 'overflow-x-auto overflow-y-auto p-4 md:p-8'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>
      <FloatingDock />
      <VoiceModeListener />
      <ApplicationConfirmGate />
    </div>
  );
}
