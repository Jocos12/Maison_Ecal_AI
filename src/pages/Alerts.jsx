import Settings from './Settings.jsx';

export default function Alerts() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Alertes & Notifications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configurez les e-mails, WhatsApp, mots-clés et fréquences de notification.
        </p>
      </div>
      <Settings compact />
    </div>
  );
}
