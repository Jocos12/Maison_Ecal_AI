export const CATEGORY_BORDER = {
  formation: 'border-l-emerald-500',
  formation_chauffeurs: 'border-l-lime-500',
  consultance: 'border-l-blue-500',
  inventaire: 'border-l-amber-500',
  inventaire_actifs: 'border-l-orange-500',
  inventaire_general: 'border-l-yellow-500',
  etude_marche: 'border-l-violet-500',
  assistance: 'border-l-slate-500'
};

export const CATEGORY_BADGE = {
  formation: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  formation_chauffeurs: 'bg-lime-100 text-lime-800 border-lime-200',
  consultance: 'bg-blue-100 text-blue-800 border-blue-200',
  inventaire: 'bg-amber-100 text-amber-800 border-amber-200',
  inventaire_actifs: 'bg-orange-100 text-orange-800 border-orange-200',
  inventaire_general: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  etude_marche: 'bg-violet-100 text-violet-800 border-violet-200',
  assistance: 'bg-slate-100 text-slate-700 border-slate-200'
};

export const PLATFORM_PILL = {
  ProfilRDC: 'bg-orange-100 text-orange-800 ring-orange-200',
  ARMP: 'bg-red-100 text-red-800 ring-red-200',
  ReliefWeb: 'bg-sky-100 text-sky-800 ring-sky-200',
  UNjobs: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  UNGM: 'bg-blue-100 text-blue-800 ring-blue-200',
  DevEx: 'bg-teal-100 text-teal-800 ring-teal-200',
  AchatPublicRDC: 'bg-rose-100 text-rose-800 ring-rose-200',
  HDX: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  WorldBank: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  AfDB: 'bg-lime-100 text-lime-800 ring-lime-200',
  Other: 'bg-slate-100 text-slate-700 ring-slate-200'
};

export function isRdcOpportunity(opp) {
  return (
    opp?.locationStatus === 'rdc_confirme' ||
    opp?.aiAnalysis?.pays_confirme_rdc === 'true' ||
    opp?.locationStatus !== 'hors_rdc'
  );
}

export function platformPillClass(platform) {
  return PLATFORM_PILL[platform] || PLATFORM_PILL.Other;
}
