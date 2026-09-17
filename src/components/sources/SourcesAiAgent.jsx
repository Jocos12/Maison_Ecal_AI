import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Download, FileText, Loader2, Send, User } from 'lucide-react';
import { api } from '../../api/client.js';
import {
  filterSourcesOpportunities,
  mecalFitScore,
  opportunityToJob
} from '../../utils/sourcesFilterUtils.js';
import { platformPillClass } from '../../utils/opportunityUi.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';

const STARTER = {
  role: 'assistant',
  content:
    'Bonjour ! Je suis l\'agent Sources M-ECAL. Je peux vous aider à :\n\n' +
    '• Filtrer les offres dont l\'échéance n\'est pas encore passée\n' +
    '• Proposer les missions logistique les plus adaptées à Maison Ecal\n' +
    '• Générer un CV et une lettre de motivation professionnels\n' +
    '• Préparer une candidature pour une offre sélectionnée\n\n' +
    'Que souhaitez-vous faire ?'
};

const QUICK = [
  'Offres avec échéance encore valide',
  'Top offres pour M-ECAL',
  'Offres emploi logistique RDC',
  'Comment postuler efficacement ?'
];

export default function SourcesAiAgent({ opportunities = [], onFiltered }) {
  const [messages, setMessages] = useState([STARTER]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [filters, setFilters] = useState({ deadlineActive: false, mecalFitOnly: false });
  const [filtered, setFiltered] = useState([]);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [profile, setProfile] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/api/job-assistant/profile').then(({ data }) => setProfile(data?.profile)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, filtered]);

  const applyFilters = useCallback(
    (nextFilters) => {
      const merged = { ...filters, ...nextFilters };
      setFilters(merged);
      const list = filterSourcesOpportunities(opportunities, merged);
      setFiltered(list);
      onFiltered?.(list);
      return list;
    },
    [filters, opportunities, onFiltered]
  );

  const pushAssistant = (content, extra = {}) => {
    setMessages((m) => [...m, { role: 'assistant', content, ...extra }]);
  };

  const handleLocalIntent = (text) => {
    const t = text.toLowerCase();

    if (/échéance|echeance|date limite|pas encore pass|valide|actif/.test(t)) {
      const list = applyFilters({ deadlineActive: true });
      return (
        `**${list.length} offre(s)** avec échéance encore valide (ou sans date).\n\n` +
        (list.length
          ? 'Sélectionnez une offre ci-dessous pour générer CV/lettre ou demander « Postuler pour moi ».'
          : 'Aucune offre ne correspond. Élargissez la recherche ou lancez une collecte Agent IA.')
      );
    }

    if (/m-ecal|maison ecal|cadr|pertinen|top|meilleur/.test(t)) {
      const list = applyFilters({ mecalFitOnly: true, deadlineActive: true });
      return (
        `**Top ${list.length} offre(s)** les plus alignées avec M-ECAL (score veille + échéance valide).\n\n` +
        list
          .slice(0, 5)
          .map((o, i) => `${i + 1}. ${o.title} (${Math.round(mecalFitScore(o))}%)`)
          .join('\n')
      );
    }

    if (/emploi|recrut|poste|postuler/.test(t) && !/génér|generer|cv|lettre/.test(t)) {
      const list = applyFilters({ employmentOnly: true, deadlineActive: true });
      return `**${list.length} offre(s)** emploi/recrutement logistique RDC avec échéance valide.`;
    }

    return null;
  };

  const generateDocuments = async (opp) => {
    const job = opportunityToJob(opp);
    if (!profile?.fullName || !profile?.skills) {
      toast.error('Complétez votre profil dans Assistant Emploi (nom, compétences, expérience).');
      pushAssistant(
        'Pour générer un CV et une lettre, complétez d\'abord **Mon profil** dans l\'Assistant Emploi, puis revenez ici.'
      );
      return;
    }

    setTyping(true);
    try {
      const [cvRes, letterRes] = await Promise.all([
        api.post('/api/job-assistant/generate-document', { type: 'cv', job, profile }),
        api.post('/api/job-assistant/generate-document', { type: 'letter', job, profile })
      ]);
      const base = import.meta.env.VITE_API_URL || '';
      pushAssistant(
        `Documents générés pour **${opp.title}** :\n\n` +
          `• CV : ${cvRes.data.fileName || 'cv.pdf'}\n` +
          `• Lettre : ${letterRes.data.fileName || 'lettre.pdf'}\n\n` +
          'Téléchargez les PDF ci-dessous. Pour l\'envoi automatique, confirmez dans Assistant Emploi.',
        {
          downloads: [
            { label: 'Télécharger CV', url: `${base}${cvRes.data.downloadUrl}` },
            { label: 'Télécharger lettre', url: `${base}${letterRes.data.downloadUrl}` }
          ]
        }
      );
      toast.success('CV et lettre générés');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Génération impossible');
      pushAssistant('La génération a échoué (quota IA ou profil incomplet). Réessayez via Assistant Emploi.');
    } finally {
      setTyping(false);
    }
  };

  const sendMessage = async (text, { appendUser = true } = {}) => {
    const message = text.trim();
    if (!message || typing) return;

    if (appendUser) {
      setMessages((m) => [...m, { role: 'user', content: message }]);
      setInput('');
    }

    const local = handleLocalIntent(message);
    if (local) {
      pushAssistant(local);
      return;
    }

    if (/génér|generer|cv|lettre/.test(message.toLowerCase()) && selectedOpp) {
      await generateDocuments(selectedOpp);
      return;
    }

    if (/postuler pour moi|postule pour moi|candidature/.test(message.toLowerCase())) {
      if (!selectedOpp) {
        pushAssistant('Sélectionnez d\'abord une offre dans la liste filtrée, puis redemandez « Postuler pour moi ».');
        return;
      }
      await generateDocuments(selectedOpp);
      pushAssistant(
        `Candidature préparée pour **${selectedOpp.title}**.\n\n` +
          'Étapes suivantes :\n1. Vérifiez les PDF générés\n2. Ouvrez la source officielle\n3. Envoyez via Assistant Emploi si e-mail disponible'
      );
      return;
    }

    setTyping(true);
    try {
      const { data } = await api.post('/api/job-assistant/rdc-offers/chat', {
        offer: selectedOpp || undefined,
        offers: filtered.length ? filtered.slice(0, 12) : opportunities.slice(0, 12),
        messages: [...messages, { role: 'user', content: message }],
        message
      });
      pushAssistant(data.reply || 'Réponse indisponible.', { jobs: data.jobs });
    } catch {
      pushAssistant('Agent temporairement indisponible. Utilisez les filtres rapides ci-dessus.');
    } finally {
      setTyping(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white shadow-lg dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-950">
      <header className="flex items-center gap-3 border-b border-violet-100 bg-violet-600/10 px-5 py-4 dark:border-violet-900">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Agent IA — Sources & Candidatures</h2>
          <p className="text-xs text-slate-500">Filtres intelligents · CV · Lettres · M-ECAL</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={typing}
            onClick={() => sendMessage(q)}
            className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' ? (
              <Bot className="mt-1 h-4 w-4 shrink-0 text-violet-600" />
            ) : null}
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <AgentMarkdown text={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.downloads?.map((d) => (
                <a
                  key={d.url}
                  href={d.url}
                  className="mt-2 mr-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Download className="h-3 w-3" />
                  {d.label}
                </a>
              ))}
            </div>
            {msg.role === 'user' ? <User className="mt-1 h-4 w-4 text-slate-400" /> : null}
          </div>
        ))}
        {typing ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Réflexion…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {filtered.length > 0 ? (
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="mb-2 text-xs font-bold uppercase text-slate-500">
            Offres filtrées ({filtered.length})
          </p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {filtered.slice(0, 8).map((opp) => (
              <button
                key={opp._id}
                type="button"
                onClick={() => {
                  setSelectedOpp(opp);
                  toast.success('Offre sélectionnée');
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  selectedOpp?._id === opp._id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40'
                    : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <span className="line-clamp-1 font-semibold text-slate-800 dark:text-slate-100">
                  {opp.title}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${platformPillClass(opp.platform)}`}>
                  {Math.round(mecalFitScore(opp))}%
                </span>
              </button>
            ))}
          </div>
          {selectedOpp ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => generateDocuments(selectedOpp)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                CV + Lettre
              </button>
              <button
                type="button"
                onClick={() => sendMessage('Postuler pour moi', { appendUser: true })}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                Postuler pour moi
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="border-t border-slate-200 p-4 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex. Montre les offres M-ECAL avec échéance valide…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            disabled={typing}
          />
          <button
            type="submit"
            disabled={typing || !input.trim()}
            className="rounded-xl bg-violet-600 px-4 py-3 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
