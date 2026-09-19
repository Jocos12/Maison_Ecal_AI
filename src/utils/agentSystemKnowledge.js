const SIDEBAR = [
  { path: '/dashboard', label: 'Tableau de bord', desc: 'Vue d\'ensemble : stats, opportunités récentes, activité veille.' },
  { path: '/opportunities', label: 'Opportunités', desc: 'Liste des offres logistique RDC collectées. Filtres, scores IA, postuler.' },
  { path: '/applications', label: 'Candidatures', desc: 'Suivi des candidatures (brouillon, soumis, en attente, entretien, gagné, refusé).' },
  { path: '/sources', label: 'Sources de Veille', desc: 'Plateformes surveillées (ProfilRDC, ReliefWeb, UNjobs…) et collecte.' },
  { path: '/categories', label: 'Catégories', desc: 'Classification des opportunités par type de service.' },
  { path: '/agent', label: 'Agent IA', desc: 'Collecte automatique et logs de veille.' },
  { path: '/assistant-emploi', label: 'Assistant Emploi', desc: 'Recherche emploi, profil, CV, lettres, conversations.' },
  { path: '/assistant-emploi?section=linkedin', label: 'LinkedIn RDC', desc: 'Recherches LinkedIn par métier logistique en RDC.' },
  { path: '/messaging', label: 'Messagerie Gmail', desc: 'Emails clients, opportunités, intégration Gmail.' },
  { path: '/marketing', label: 'Marketing', desc: 'Contenus et suggestions marketing M-ECAL.' },
  { path: '/analytics', label: 'Analytiques', desc: 'Graphiques : collectes, candidatures, messages, sources.' },
  { path: '/alerts', label: 'Alertes & Notifications', desc: 'Alertes jobs logistiques, email, WhatsApp, navigateur.' },
  { path: '/archive', label: 'Archive', desc: 'Opportunités archivées.' },
  { path: '/settings', label: 'Paramètres', desc: 'Profil organisation, langue, Gmail, alertes.' },
  { path: '/admin/users', label: 'Utilisateurs', desc: 'Gérer les comptes, CRUD, validation et activité récente (admin).' }
];

function normalizeSnapshot(snapshot = {}) {
  return {
    stats: snapshot.stats || {},
    platforms: snapshot.platforms || [],
    sources: snapshot.sources || [],
    applicationsByStatus: snapshot.applicationsByStatus || {},
    gmail: snapshot.gmail || { connected: false, unread: 0, total: 0 },
    user: snapshot.user || null,
    recentOpportunities: snapshot.recentOpportunities || [],
    pendingUserApprovals: snapshot.stats?.pendingUserApprovals ?? 0
  };
}

export function buildSystemContext({
  opportunities = [],
  applications = [],
  profile = null,
  pathname = '',
  opportunityTotal = null,
  statsDbTotal = null,
  snapshot = null
} = {}) {
  const snap = normalizeSnapshot(snapshot);
  const navList = SIDEBAR.map((s) => `• ${s.label} (${s.path}), ${s.desc}`).join('\n');
  return {
    currentPage: pathname,
    opportunityCount: snap.stats.opportunitiesActive ?? statsDbTotal ?? opportunityTotal ?? opportunities.length,
    opportunityTotal: snap.stats.opportunitiesActive ?? statsDbTotal ?? opportunityTotal ?? opportunities.length,
    statsDbTotal: snap.stats.opportunitiesActive ?? statsDbTotal,
    applicationCount: snap.stats.applicationsTotal ?? applications.length,
    profileComplete: Boolean(profile?.fullName),
    navList,
    opportunities,
    snapshot: snap,
    gmailUnread: snap.gmail.unread,
    gmailConnected: snap.gmail.connected,
    platforms: snap.platforms,
    sources: snap.sources,
    applicationsByStatus: snap.applicationsByStatus,
    recentOpportunities: snap.recentOpportunities
  };
}

export function wantsGmailQuestion(message = '') {
  const m = message.toLowerCase();
  if (/offre|opportunit|candidature|postul|cv|lettre/.test(m) && !/mail|email|gmail|messagerie/.test(m)) {
    return false;
  }
  return (
    (/combien|nombre|total|how many/.test(m) &&
      /email|mail|gmail|message|messagerie|inbox|boîte/.test(m)) ||
    (/non lu|non lus|unread|non lue/.test(m) && /mail|email|message|gmail|messagerie/.test(m)) ||
    /messagerie gmail|emails?\s+non/.test(m)
  );
}

export function wantsApplicationsQuestion(message = '') {
  const m = message.toLowerCase();
  return (
    (/combien|nombre|total|statut|état|liste/.test(m) && /candidature|postulation|dossier/.test(m)) ||
    /mes candidatures|suivi candidature/.test(m)
  );
}

export function wantsPlatformStats(message = '') {
  const m = message.toLowerCase();
  return (
    (/combien|nombre|total|liste|plateforme|source|reliefweb|unjobs|profilrdc|linkedin/.test(m) &&
      /plateforme|source|reliefweb|unjobs|profilrdc|collect|veille/.test(m)) ||
    /offres?\s+par\s+plateforme|répartition.*offre/.test(m)
  );
}

export function wantsListOffers(message = '') {
  const m = message.toLowerCase();
  if (wantsGmailQuestion(message) || wantsApplicationsQuestion(message)) return false;
  return (
    (/liste|affiche|montre|donne|quelles?|énumère/.test(m) && /offre|opportunit/.test(m)) ||
    /offres?\s+(disponible|actuelle|recente|récente|en ligne|trouv)/.test(m)
  );
}

export function wantsSystemQuestion(message = '') {
  const m = message.toLowerCase();
  if (wantsGmailQuestion(message) || wantsOpportunityCount(message) || wantsApplicationsQuestion(message)) {
    return false;
  }
  return (
    /sidebar|menu|navigation|page\s|quel(le)?s?\s+(page|menu|section)|comment (aller|accéder|utiliser)|où (est|trouver)|c'est quoi|qu'est-ce que|explique.*(système|plateforme|m-ecal|mecal)|fonctionne.*(app|système)|tableau de bord|candidatures|analytiques|alertes|messagerie|paramètres|sources de veille|assistant emploi|validation compte|admin/i.test(
      m
    ) && !/génér|cv|lettre|postul|offre logistique en rdc/i.test(m)
  );
}

export function wantsOpportunityCount(message = '') {
  const m = message.toLowerCase();
  if (wantsGmailQuestion(message) || wantsApplicationsQuestion(message)) return false;
  return (
    (/combien|nombre|total|nombres?\s+exact|how many|count/.test(m) &&
      /offre|opportunit/.test(m)) ||
    (/page.*opportunit|opportunit.*page|dans la page/.test(m) &&
      /combien|nombre|total|exact|offres?\s+(qui|il y a|se trouv)/.test(m))
  );
}

export function wantsBestOfferOnPage(message = '') {
  const m = message.toLowerCase();
  if (wantsOpportunityCount(message) || wantsGmailQuestion(message)) return false;
  return (
    /meilleur(e|s)?\s+offre|top\s+\d*\s*offre|quelle offre.*(choisir|priorit|recommand)/.test(m) ||
    (/parmi.*(opportunit|offre)/.test(m) && /meilleur|top|choisir|recommand|priorit/.test(m))
  );
}

export function answerGmailQuestion(ctx = {}) {
  const snap = ctx.snapshot || {};
  const gmail = snap.gmail || { connected: ctx.gmailConnected, unread: ctx.gmailUnread, total: 0 };

  if (!gmail.connected) {
    return (
      `📧 **Messagerie Gmail**\n\n` +
      `Gmail n'est pas encore connecté à M-ECAL.\n\n` +
      `👉 Allez dans **Paramètres** (\`/settings\`) → onglet **Intégrations**, ou ouvrez **Messagerie Gmail** (\`/messaging\`) pour connecter votre compte.\n\n` +
      `Une fois connecté, je pourrai vous indiquer le nombre exact d'e-mails non lus.`
    );
  }

  return (
    `📧 **Messagerie Gmail, M-ECAL**\n\n` +
    `• **${gmail.unread ?? 0}** e-mail(s) **non lu(s)**\n` +
    `• **${gmail.total ?? 0}** message(s) récents chargés (échantillon)\n\n` +
    `👉 Ouvrez **Messagerie Gmail** (\`/messaging\`) pour lire et répondre.\n` +
    `Le badge rouge dans le menu gauche affiche aussi ce nombre.`
  );
}

export function answerApplicationsQuestion(ctx = {}) {
  const byStatus = ctx.applicationsByStatus || ctx.snapshot?.applicationsByStatus || {};
  const total = ctx.applicationCount ?? Object.values(byStatus).reduce((a, b) => a + b, 0);
  const lines = Object.entries(byStatus).map(([status, n]) => `• **${status}** : ${n}`);

  return (
    `📋 **Vos candidatures M-ECAL**\n\n` +
    `• **${total}** candidature(s) au total\n` +
    (lines.length ? `\n**Par statut :**\n${lines.join('\n')}\n` : '') +
    `\n👉 Suivez-les dans **Candidatures** (\`/applications\`).\n` +
    `Dites « analyse mes candidatures » pour un résumé détaillé.`
  );
}

export function answerPlatformStats(ctx = {}) {
  const platforms = ctx.platforms?.length ? ctx.platforms : ctx.snapshot?.platforms || [];
  const sources = ctx.sources?.length ? ctx.sources : ctx.snapshot?.sources || [];
  const total = ctx.statsDbTotal ?? ctx.opportunityCount ?? 0;

  if (!platforms.length) {
    return (
      `🌐 **Sources & plateformes**\n\n` +
      `Aucune offre indexée pour le moment.\n` +
      `Lancez une collecte via **Sources de veille** (\`/sources\`).\n\n` +
      `**Assistant Emploi** consulte aussi : ReliefWeb, MediaCongo, UNjobnet, Coordination Sud, Impact Pool.`
    );
  }

  const platformLines = platforms
    .slice(0, 12)
    .map((p) => `• **${p.name}** : ${p.count} offre(s)`)
    .join('\n');

  const sourceLines = sources
    .slice(0, 8)
    .map((s) => `• ${s.name || s.platform}${s.lastScrapeAt ? ` (dernière collecte : ${new Date(s.lastScrapeAt).toLocaleDateString('fr-FR')})` : ''}`)
    .join('\n');

  return (
    `🌐 **Offres par plateforme, veille M-ECAL**\n\n` +
    `**${total}** opportunité(s) actives en base.\n\n` +
    `**Répartition :**\n${platformLines}\n\n` +
    (sourceLines ? `**Sources actives :**\n${sourceLines}\n\n` : '') +
    `Les offres proviennent de ProfilRDC, ReliefWeb, UNjobs, et autres sources configurées.\n` +
    `👉 **Sources de veille** (\`/sources\`) pour lancer ou planifier une collecte.`
  );
}

export function answerListOffers(ctx = {}) {
  const recent = ctx.recentOpportunities?.length
    ? ctx.recentOpportunities
    : (ctx.opportunities || []).slice(0, 15);

  if (!recent.length) {
    return (
      `Aucune offre disponible pour le moment.\n\n` +
      `Lancez une collecte via **Sources de veille** (\`/sources\`) ou demandez « cherche des offres logistique RDC ».`
    );
  }

  const list = recent
    .slice(0, 10)
    .map((o, i) => {
      const score = o.score != null ? Math.round(Number(o.score) * (Number(o.score) <= 1 ? 100 : 1)) : 'n/d';
      return `${i + 1}. **${o.title}**\n   🏢 ${o.organization || o.platform || 'n/d'} · 📍 ${o.ville || 'RDC'} · score ${score}`;
    })
    .join('\n\n');

  const total = ctx.statsDbTotal ?? ctx.opportunityCount ?? recent.length;

  return (
    `📋 **Offres disponibles, M-ECAL** (${total} en base)\n\n` +
    `${list}\n\n` +
    `👉 Liste complète : **Opportunités** (\`/opportunities\`)\n` +
    `Dites « quelle est la meilleure offre ? » ou « postule pour l'offre 1 ».`
  );
}

export function answerOpportunityCount(ctx = {}) {
  const snap = ctx.snapshot || {};
  const stats = snap.stats || {};
  const { opportunities = [], applications = [], opportunityTotal, statsDbTotal } = ctx;
  const loaded = opportunities.length;
  const totalDb = stats.opportunitiesActive ?? statsDbTotal ?? opportunityTotal ?? loaded;

  const withScore = opportunities.filter(
    (o) => (o.aiAnalysis?.score ?? o.aiRelevanceScore ?? 0) > 0
  ).length;
  const jobs = opportunities.filter(
    (o) =>
      o?.aiAnalysis?.type === 'offre_emploi' ||
      o?.aiAnalysis?.est_emploi === true ||
      /recrut|emploi|consultant|poste|vacance/i.test(o?.title || '')
  ).length;
  const verified = opportunities.filter(
    (o) => o?.locationStatus === 'rdc_confirme' || o?.aiAnalysis?.pays_confirme_rdc === 'true'
  ).length;

  const platformHint =
    snap.platforms?.length > 0
      ? `\n**Plateformes :** ${snap.platforms.slice(0, 5).map((p) => `${p.name} (${p.count})`).join(', ')}`
      : '';

  const loadedNote =
    loaded > 0 && totalDb > loaded
      ? `\n• _(Échantillon analysé : ${loaded} sur ${totalDb} en base)_`
      : '';

  return (
    `📊 **Nombre d'offres, M-ECAL**\n\n` +
    `• **${totalDb}** offre(s) actives en base\n` +
    `• **${stats.opportunitiesArchived ?? 0}** archivée(s)\n` +
    `• **${verified}** confirmée(s) RDC (échantillon chargé)\n` +
    `• **${jobs}** emploi / recrutement\n` +
    `• **${withScore}** avec score IA` +
    loadedNote +
    platformHint +
    `\n\n**Candidatures :** ${applications.length ?? stats.applicationsTotal ?? 0}\n` +
    `**Page actuelle :** \`${ctx.currentPage || '/opportunities'}\`\n\n` +
    `👉 **Opportunités** (\`/opportunities\`) · Dites « liste les offres » ou « meilleure offre ».`
  );
}

export function answerFromAgentContext(message, ctx = {}) {
  if (wantsGmailQuestion(message)) return answerGmailQuestion(ctx);
  if (wantsApplicationsQuestion(message)) return answerApplicationsQuestion(ctx);
  if (wantsPlatformStats(message)) return answerPlatformStats(ctx);
  if (wantsListOffers(message)) return answerListOffers(ctx);
  if (wantsOpportunityCount(message)) return answerOpportunityCount(ctx);
  if (wantsSystemQuestion(message)) return answerSystemQuestion(message, ctx);
  return null;
}

function findNavItem(message) {
  const m = message.toLowerCase();
  return SIDEBAR.find(
    (s) =>
      m.includes(s.label.toLowerCase()) ||
      m.includes(s.path.replace('/', '')) ||
      (s.path.includes('linkedin') && /linkedin/.test(m)) ||
      (s.path.includes('admin') && /validation|approuv|inscription|compte/.test(m))
  );
}

export function answerSystemQuestion(message, ctx = {}) {
  const m = message.toLowerCase();
  const nav = findNavItem(message);
  const snap = ctx.snapshot || {};

  if (/validation|approuv|inscription|compte.*(attente|pending)/.test(m)) {
    const pending = snap.stats?.pendingUserApprovals ?? 0;
    const isAdmin = ['Admin', 'admin'].includes(snap.user?.role || '');
    if (isAdmin) {
      return (
        `**Validation des comptes**\n\n` +
        `• **${pending}** inscription(s) en attente\n\n` +
        `👉 **Validation comptes** (\`/admin/users\`) pour approuver ou rejeter les nouveaux utilisateurs.`
      );
    }
    return (
      `**Inscriptions M-ECAL**\n\n` +
      `Les nouveaux comptes doivent être validés par un administrateur avant la première connexion.\n` +
      `Contactez votre responsable M-ECAL si votre compte est en attente.`
    );
  }

  if (nav) {
    return (
      `**${nav.label}** (\`${nav.path}\`)\n\n` +
      `${nav.desc}\n\n` +
      `👉 Ouvrez cette page depuis le menu gauche ou allez sur \`${nav.path}\`.`
    );
  }

  if (/sidebar|menu|navigation/.test(m)) {
    const groups = [
      '**Principal** : Tableau de bord, Opportunités, Candidatures',
      '**Veille & IA** : Sources, Catégories, Agent IA',
      '**Emploi** : Assistant Emploi, LinkedIn RDC',
      '**Communication** : Messagerie Gmail, Marketing',
      '**Analyse** : Analytiques, Alertes',
      '**Données** : Archive, Paramètres',
      '**Admin** : Validation comptes (superadmin)'
    ];
    return (
      `**Menu M-ECAL (sidebar)**\n\n` +
      groups.join('\n') +
      `\n\n**Page actuelle :** \`${ctx.currentPage || '/'}\`\n` +
      `**Offres en base :** ${ctx.opportunityCount ?? 'n/d'} · **Candidatures :** ${ctx.applicationCount ?? 'n/d'}\n` +
      `**Gmail non lus :** ${ctx.gmailUnread ?? 'n/d'}\n\n` +
      `L'icône 🤖 en bas à droite ouvre l'agent IA sur toutes les pages.`
    );
  }

  if (/agent ia|icône|robot|flottant/.test(m)) {
    return (
      `**Agent IA flottant (🤖)**\n\n` +
      `Disponible sur **toutes les pages**. Je connais votre système M-ECAL en temps réel :\n` +
      `• Offres par plateforme (ProfilRDC, ReliefWeb, UNjobs…)\n` +
      `• Candidatures et statuts\n` +
      `• E-mails Gmail non lus\n` +
      `• Sources de veille et collectes\n` +
      `• CV, lettres, postuler\n\n` +
      `Exemples : « combien d'emails non lus ? », « liste les offres », « combien de candidatures ? »`
    );
  }

  if (/télécharg|download|pdf/.test(m)) {
    return (
      `**Télécharger un PDF (CV / lettre)**\n\n` +
      `1. Importez votre CV via le bouton **+** dans l'agent IA\n` +
      `2. Demandez « Génère mon CV » ou « Lettre de motivation »\n` +
      `3. Cliquez **📥 Télécharger le PDF** sous la réponse`
    );
  }

  if (/alerte|notification/.test(m)) {
    return (
      `**Alertes & Notifications** (\`/alerts\`)\n\n` +
      `Surveille les nouveaux jobs logistiques.\n` +
      `Canaux : email, WhatsApp, navigateur · Fréquence configurable.`
    );
  }

  return (
    `**M-ECAL, Agent système**\n\n` +
    `Je peux répondre sur **tout votre système** :\n` +
    `• 📊 Offres : combien, liste, par plateforme, meilleure offre\n` +
    `• 📧 Gmail : e-mails non lus\n` +
    `• 📋 Candidatures et statuts\n` +
    `• 🧭 Navigation (menu, pages)\n` +
    `• 🔍 Recherche emploi RDC : ReliefWeb, MediaCongo, UNjobnet, Coordination Sud, Impact Pool\n\n` +
    `**État actuel :** ${ctx.opportunityCount ?? 0} offre(s), ${ctx.applicationCount ?? 0} candidature(s), ${ctx.gmailUnread ?? '?'} email(s) non lu(s).\n\n` +
    `Posez une question précise !`
  );
}

export function formatSystemContextForAI(ctx = {}) {
  const snap = ctx.snapshot || {};
  const platforms = (snap.platforms || ctx.platforms || [])
    .map((p) => `${p.name}: ${p.count}`)
    .join(', ');
  return (
    `Page: ${ctx.currentPage || '/'}\n` +
    `Offres actives base: ${ctx.opportunityCount}\n` +
    `Candidatures: ${ctx.applicationCount}\n` +
    `Gmail connecté: ${ctx.gmailConnected ? 'oui' : 'non'}, non lus: ${ctx.gmailUnread ?? 0}\n` +
    `Plateformes: ${platforms || 'n/d'}\n` +
    `Sources actives: ${snap.stats?.sourcesActive ?? snap.sources?.length ?? 0}\n` +
    `${ctx.navList || ''}`
  );
}
