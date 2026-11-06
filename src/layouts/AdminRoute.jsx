import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

/**
 * Pages réservées aux administrateurs (utilisateurs, journal d'audit).
 * Le backend refuse déjà les données aux autres rôles ; ici on évite simplement
 * d'afficher une page vide ou en erreur : redirection vers le tableau de bord.
 */
export function AdminRoute() {
  const { user, authLoading } = useApp();
  if (authLoading) return null;
  const isAdmin = user && ['Admin', 'admin'].includes(user.role);
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
