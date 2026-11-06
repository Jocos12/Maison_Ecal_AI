import { Component } from 'react';

/**
 * Filet de sécurité : si un écran plante, on affiche un message avec deux
 * actions (recharger / revenir au tableau de bord) au lieu d'une page blanche.
 * `resetKey` (le chemin courant) efface l'erreur quand on change de page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Après un déploiement, un ancien onglet peut réclamer un fichier de page qui
    // n'existe plus : un seul rechargement automatique récupère la nouvelle version.
    const isChunkError = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(
      String(error?.message || '')
    );
    if (isChunkError && !sessionStorage.getItem('mecal_chunk_reload')) {
      sessionStorage.setItem('mecal_chunk_reload', '1');
      window.location.reload();
      return;
    }
    console.error('Erreur d’affichage :', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Une erreur est survenue</h2>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
            Cette page n’a pas pu s’afficher. Vous pouvez la recharger ou revenir au tableau de bord.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Recharger
            </button>
            <a
              href="/dashboard"
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Tableau de bord
            </a>
          </div>
        </div>
      </div>
    );
  }
}
