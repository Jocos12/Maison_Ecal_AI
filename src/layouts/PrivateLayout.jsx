import { Outlet, Navigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { Loader2 } from 'lucide-react';

export function PrivateLayout() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-blue-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col mecal-hero-bg">
      <Navbar />
      <div className="flex flex-1 max-w-[1600px] mx-auto w-full min-h-0">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-8 overflow-x-auto text-slate-900 dark:text-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
