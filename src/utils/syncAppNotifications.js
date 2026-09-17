import { api } from '../api/client.js';
import { getNotifySnapshot, setNotifySnapshot, upsertNotification } from './notificationStore.js';
import { isJobWatchEnabled } from './jobWatchStore.js';

function isLogisticsJobOpportunity(opp) {
  const title = `${opp.title || ''} ${opp.description || ''}`.toLowerCase();
  const isJob =
    opp.aiAnalysis?.type === 'offre_emploi' ||
    opp.aiAnalysis?.est_emploi === true ||
    /recrut|emploi|poste|vacance|consultant|logisticien|magasinier|chauffeur|supply|procurement|warehouse/i.test(
      title
    );
  const isRdc =
    opp.locationStatus === 'rdc_confirme' || opp.aiAnalysis?.pays_confirme_rdc === 'true';
  return isJob && isRdc;
}

function jobPlatformLabel(opp) {
  const p = opp.platform || '';
  if (/linkedin/i.test(opp.sourceUrl || '')) return 'LinkedIn';
  return p || 'Veille en ligne';
}

export async function syncAppNotifications() {
  try {
    const [statsRes, agentRes, oppRes] = await Promise.all([
      api.get('/api/stats'),
      api.get('/api/agent/status'),
      api.get('/api/opportunities', { params: { limit: 40, page: 1 } }).catch(() => ({ data: { data: [] } }))
    ]);

    const stats = statsRes.data || {};
    const agent = agentRes.data || {};
    const opportunities = oppRes.data?.data || [];
    const prev = getNotifySnapshot();

    if (prev.knownOppIds?.length) {
      const known = new Set(prev.knownOppIds);
      for (const opp of opportunities) {
        if (!known.has(opp._id)) {
          const isJob = isLogisticsJobOpportunity(opp);
          upsertNotification({
            id: `opp-item-${opp._id}`,
            title: isJob ? `Nouvel emploi logistique RDC (${jobPlatformLabel(opp)})` : 'Nouvelle opportunité',
            body: opp.title || 'Une nouvelle offre a été ajoutée à la veille.',
            href: isJob ? '/assistant-emploi?section=linkedin' : '/opportunities',
            type: isJob ? 'emploi-rdc' : 'opportunities'
          });
        }
      }
    }

    if (isJobWatchEnabled() && prev.knownJobOppIds?.length) {
      const knownJobs = new Set(prev.knownJobOppIds);
      for (const opp of opportunities) {
        if (!knownJobs.has(opp._id) && isLogisticsJobOpportunity(opp)) {
          upsertNotification({
            id: `job-watch-${opp._id}`,
            title: `🔔 Emploi logistique RDC — ${jobPlatformLabel(opp)}`,
            body: opp.title || 'Nouvelle offre détectée par la veille M-ECAL.',
            href: '/assistant-emploi?section=linkedin',
            type: 'emploi-rdc'
          });
        }
      }
    }

    if (typeof stats.newThisWeek === 'number' && stats.newThisWeek > (prev.newThisWeek ?? -1)) {
      const delta = stats.newThisWeek - (prev.newThisWeek ?? 0);
      if (delta > 0 && prev.newThisWeek !== undefined) {
        upsertNotification({
          id: `opp-week-${stats.newThisWeek}`,
          title: `${delta} nouvelle(s) opportunité(s) cette semaine`,
          body: `${stats.newThisWeek} opportunité(s) logistique RDC détectée(s) sur les 7 derniers jours.`,
          href: '/opportunities',
          type: 'opportunities'
        });
      }
    }

    if (stats.closingSoon > 0 && stats.closingSoon !== prev.closingSoon) {
      upsertNotification({
        id: `opp-closing-${stats.closingSoon}`,
        title: `${stats.closingSoon} échéance(s) proche(s)`,
        body: 'Des opportunités arrivent à échéance dans les 7 prochains jours.',
        href: '/opportunities?status=urgent',
        type: 'opportunities'
      });
    }

    const lastSearchAt = agent.lastSearchAt || agent.lastSummary?.finishedAt || null;
    if (lastSearchAt && lastSearchAt !== prev.lastAgentSearchAt) {
      const summary = agent.lastSummary;
      if (prev.lastAgentSearchAt) {
        const saved = summary?.saved ?? 0;
        const skipped = summary?.skipped ?? 0;
        upsertNotification({
          id: `agent-run-${lastSearchAt}`,
          title: agent.active ? 'Collecte Agent IA en cours' : 'Collecte Agent IA terminée',
          body: agent.active
            ? 'Une recherche automatique est en cours sur les sources de veille.'
            : `Dernière collecte : ${saved} sauvegardée(s), ${skipped} filtrée(s).`,
          href: '/agent',
          type: 'agent'
        });
      }
    }

    if (stats.scrapeFailed) {
      upsertNotification({
        id: `scrape-error-${stats.scrapeWatch?.lastErrorAt || stats.lastScrapeAt}`,
        title: 'Collecte en erreur',
        body: stats.scrapeWatch?.lastErrorMessage || 'Un run de veille s’est terminé en échec.',
        href: '/dashboard',
        type: 'veille-error'
      });
    } else if (stats.lastScrapeAt && stats.lastScrapeAt !== prev.lastScrapeAt && prev.lastScrapeAt) {
      upsertNotification({
        id: `scrape-${stats.lastScrapeAt}`,
        title: 'Veille mise à jour',
        body: 'De nouvelles données de veille sont disponibles.',
        href: '/dashboard',
        type: 'veille'
      });
    }

    setNotifySnapshot({
      newThisWeek: stats.newThisWeek ?? 0,
      closingSoon: stats.closingSoon ?? 0,
      lastScrapeAt: stats.lastScrapeAt || null,
      lastAgentSearchAt: lastSearchAt,
      agentActive: Boolean(agent.active),
      knownOppIds: opportunities.map((o) => o._id).filter(Boolean),
      knownJobOppIds: opportunities.filter(isLogisticsJobOpportunity).map((o) => o._id).filter(Boolean)
    });
  } catch {
    /* non bloquant */
  }
}
