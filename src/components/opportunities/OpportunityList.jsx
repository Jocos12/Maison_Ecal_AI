import OpportunityCard from './OpportunityCard.jsx';

export default function OpportunityList({ items, onOpen, viewMode = 'cards' }) {
  if (!items?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-500 dark:border-slate-700">
        —
      </p>
    );
  }
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {items.map((opp, i) => (
          <OpportunityCard key={opp._id} opp={opp} onOpen={onOpen} compact index={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((opp, i) => (
        <OpportunityCard key={opp._id} opp={opp} onOpen={onOpen} index={i} />
      ))}
    </div>
  );
}
