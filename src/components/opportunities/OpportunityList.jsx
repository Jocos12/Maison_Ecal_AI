import OpportunityCard from './OpportunityCard.jsx';

export default function OpportunityList({ items, onOpen, viewMode = 'cards' }) {
  if (!items?.length) {
    return <p className="text-slate-500 text-center py-12">—</p>;
  }
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {items.map((opp) => (
          <OpportunityCard key={opp._id} opp={opp} onOpen={onOpen} compact />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((opp) => (
        <OpportunityCard key={opp._id} opp={opp} onOpen={onOpen} />
      ))}
    </div>
  );
}
