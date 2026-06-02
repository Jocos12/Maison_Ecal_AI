import { useMemo, useState } from 'react';
import { useOpportunities } from '../hooks/useOpportunities.js';
import OpportunityList from '../components/opportunities/OpportunityList.jsx';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';

export default function Archive() {
  const [modal, setModal] = useState(null);
  const params = useMemo(() => ({ archived: true, limit: 50 }), []);
  const { items, loading, reload } = useOpportunities(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Archive</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Opportunités archivées, expirées et historique de veille.
        </p>
      </div>
      {loading ? <p className="text-slate-500">Chargement...</p> : <OpportunityList items={items} onOpen={setModal} viewMode="list" />}
      {modal && <OpportunityModal opp={modal} onClose={() => setModal(null)} onCreated={reload} />}
    </div>
  );
}
