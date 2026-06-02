import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';

function categorizeEmail(email) {
  const from = (email.from || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const body = (email.body || '').toLowerCase();
  const text = `${from} ${subject} ${snippet} ${body}`;

  if (
    text.includes('offre') ||
    text.includes('appel à') ||
    text.includes('appel a') ||
    text.includes('consultance') ||
    text.includes('formation') ||
    text.includes('logistique') ||
    text.includes('marché') ||
    text.includes('marche') ||
    text.includes('contrat') ||
    text.includes('proposition') ||
    text.includes('devis') ||
    text.includes('partenariat') ||
    text.includes('collaboration') ||
    text.includes('projet') ||
    text.includes('service') ||
    text.includes('mission') ||
    text.includes('reliefweb') ||
    text.includes('ungm') ||
    text.includes('devex') ||
    text.includes('afdb') ||
    text.includes('worldbank') ||
    text.includes('procurement')
  ) {
    return { category: 'client', label: 'Client / Opportunité', shortLabel: 'Client', color: 'red', priority: 1 };
  }

  if (
    from.includes('openai') ||
    from.includes('google') ||
    from.includes('microsoft') ||
    from.includes('apple') ||
    from.includes('amazon') ||
    from.includes('chatgpt') ||
    text.includes('verify') ||
    text.includes('confirmer') ||
    text.includes('your account') ||
    text.includes('votre compte')
  ) {
    return { category: 'apps', label: 'Applications', shortLabel: 'App', color: 'yellow', priority: 3 };
  }

  if (
    from.includes('facebook') ||
    from.includes('facebookmail') ||
    from.includes('meta') ||
    from.includes('instagram') ||
    from.includes('twitter') ||
    from.includes('linkedin') ||
    from.includes('youtube') ||
    from.includes('tiktok') ||
    text.includes('notification') ||
    text.includes('vous avez')
  ) {
    return { category: 'social', label: 'Réseaux sociaux', shortLabel: 'Social', color: 'blue', priority: 4 };
  }

  if (
    from.includes('noreply') ||
    from.includes('no-reply') ||
    from.includes('newsletter') ||
    from.includes('marketing') ||
    from.includes('promo') ||
    from.includes('offer') ||
    text.includes('unsubscribe') ||
    text.includes('désabonner') ||
    text.includes('desabonner') ||
    text.includes('deal') ||
    text.includes('discount')
  ) {
    return { category: 'promo', label: 'Promotions', shortLabel: 'Promo', color: 'gray', priority: 5 };
  }

  if (
    !from.includes('noreply') &&
    !from.includes('no-reply') &&
    !from.includes('notification') &&
    !from.includes('automated') &&
    !from.includes('donotreply')
  ) {
    return { category: 'personnel', label: 'Personnel', shortLabel: 'Perso', color: 'orange', priority: 2 };
  }

  return { category: 'autre', label: 'Autre', shortLabel: 'Autre', color: 'gray', priority: 6 };
}

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'Tous les emails', icon: '📥' },
  { id: 'client', label: 'Clients / Opportunités', icon: '🔴', color: 'red', group: 'PRIORITAIRES' },
  { id: 'personnel', label: 'Personnel', icon: '🟠', color: 'orange' },
  { id: 'apps', label: 'Applications', icon: '🟡', color: 'yellow', group: 'AUTRES' },
  { id: 'social', label: 'Réseaux sociaux', icon: '🔵', color: 'blue' },
  { id: 'promo', label: 'Promotions', icon: '⚪', color: 'gray' },
  { id: 'autre', label: 'Autre', icon: '⚫', color: 'gray' }
];

const PAGE_SIZE = 15;
const GMAIL_CACHE_KEY = 'mecal_gmail_messages_cache';
const GMAIL_COUNT_KEY = 'mecal_gmail_count';

function isUnread(email) {
  return Boolean(email.unread || email.isRead === false);
}

function normalizeEmail(email) {
  return { ...email, isRead: !isUnread(email) };
}

function truncate(value = '', max = 60) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

function decodeHtml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getSenderName(emailOrFrom = '') {
  const email = typeof emailOrFrom === 'object' ? emailOrFrom : { from: emailOrFrom };
  const from = decodeHtml(email.from || '').trim();
  const match = from.match(/^"?([^"<@]+)"?\s*</);
  let raw = (match?.[1] || from.split('<')[0] || '').trim().replace(/^"|"$/g, '');
  if (!raw && from.includes('@')) raw = from.split('@')[0].replace(/[._-]+/g, ' ');
  const fingerprint = `${from} ${email.subject || ''} ${email.snippet || ''} ${email.body || ''}`.toLowerCase();
  if (!raw && fingerprint.includes('facebook')) raw = 'Facebook';
  if (!raw && fingerprint.includes('google')) raw = 'Google';
  if (!raw && fingerprint.includes('openai')) raw = 'OpenAI';
  if (!raw && fingerprint.includes('linkedin')) raw = 'LinkedIn';
  return raw || 'Expéditeur inconnu';
}

function getSenderEmail(from = '') {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim();
}

function getInitials(emailOrFrom = '') {
  const name = getSenderName(emailOrFrom);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return 'hier';
  if (days < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFullDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildEmailSrcDoc(body = '', snippet = '') {
  const content = body || snippet || '';
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  const safeText = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 18px; color: #111827; font: 14px/1.6 Arial, sans-serif; overflow-wrap: anywhere; word-break: break-word; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-family: inherit; }
      img { max-width: 100%; height: auto; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>${looksHtml ? content : `<pre>${safeText}</pre>`}</body>
</html>`;
}

function stripHtml(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getReadableEmailText(email) {
  const body = email?.body || email?.snippet || '';
  const text = /<\/?[a-z][\s\S]*>/i.test(body) ? stripHtml(body) : body;
  return text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getEmailParagraphClass(paragraph = '') {
  const trimmed = paragraph.trim();
  if (/^(on .+ wrote:|le .+ a écrit\s*:)/i.test(trimmed)) return 'email-quote-heading';
  if (trimmed.startsWith('>')) return 'email-quoted-text';
  return '';
}

function cleanEmailParagraph(paragraph = '') {
  return paragraph
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
}

function getConversationParts(email, myEmail = '') {
  const text = getReadableEmailText(email).join('\n\n');
  if (!text) return [];

  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parts = [];
  let current = {
    owner: 'client',
    title: `Message de ${getSenderName(email)}`,
    lines: []
  };

  const pushCurrent = () => {
    const body = current.lines.map((line) => line.replace(/^>\s?/, '')).join('\n').trim();
    if (!body) return;
    parts.push({ ...current, body });
  };

  for (const line of lines) {
    const isHeading = /^(on .+ wrote:|le .+ a écrit\s*:)/i.test(line);
    if (isHeading) {
      pushCurrent();
      const fingerprint = `${line} ${myEmail}`.toLowerCase();
      const owner =
        fingerprint.includes('m-ecal') ||
        fingerprint.includes('maisonecal') ||
        (myEmail && line.toLowerCase().includes(myEmail.toLowerCase()))
          ? 'me'
          : 'client';
      current = {
        owner,
        title: owner === 'me' ? 'Ancien message M-ECAL' : `Ancien message de ${getSenderName(email)}`,
        meta: line,
        lines: []
      };
      continue;
    }
    current.lines.push(line);
  }

  pushCurrent();
  return parts;
}

export default function Messaging() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(GMAIL_CACHE_KEY) || '[]').map(normalizeEmail);
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, configured: true });
  const [loading, setLoading] = useState(true);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sendingCompose, setSendingCompose] = useState(false);

  const publishGmailCount = (items) => {
    const count = items.length;
    localStorage.setItem(GMAIL_COUNT_KEY, String(count));
    window.dispatchEvent(new CustomEvent('mecal:gmail-count', { detail: count }));
  };

  const load = async () => {
    setLoading(messages.length === 0);
    try {
      const { data: status } = await api.get('/api/gmail/status');
      setGmailStatus(status);
      if (!status.connected) {
        setMessages([]);
        sessionStorage.removeItem(GMAIL_CACHE_KEY);
        publishGmailCount([]);
        return;
      }
      setRefreshingMessages(true);
      const { data } = await api.get('/api/gmail/messages?maxResults=30');
      setGmailStatus({ connected: data.connected, configured: data.configured, userEmail: data.userEmail });
      const nextMessages = (data.messages || []).map(normalizeEmail);
      setMessages(nextMessages);
      sessionStorage.setItem(GMAIL_CACHE_KEY, JSON.stringify(nextMessages));
      publishGmailCount(nextMessages);
    } catch (e) {
      if (e.response?.status === 429) {
        toast.error('Gmail reçoit trop de requêtes. Réessayez dans quelques secondes.');
      } else {
        toast.error(e.response?.data?.message || 'Impossible de vérifier Gmail');
      }
    } finally {
      setRefreshingMessages(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') toast.success('Gmail connecté');
    if (params.get('gmail_error') === 'not_configured') {
      toast.error('Gmail OAuth non configuré — vérifiez backend/.env');
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search, showUnreadOnly]);

  const open = async (message) => {
    const { data } = await api.get(`/api/gmail/messages/${message.id}`);
    const fullEmail = normalizeEmail({ ...message, ...data });
    setSelected(fullEmail);
    setSuggestions(null);
    setReplyText('');
    setReplyMode(false);
    if (isUnread(fullEmail)) markAsRead(fullEmail.id, false);
  };

  const generateAIReply = async (email = selected) => {
    if (!email) return;
    setLoadingAi(true);
    try {
      const { data } = await api.post('/api/ai/email-reply', {
        from: email.from,
        senderName: getSenderName(email),
        subject: email.subject,
        body: email.body || email.snippet,
        snippet: email.snippet,
        receivedAt: email.date,
        category: categorizeEmail(email).category
      });
      setSuggestions(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'IA indisponible');
    } finally {
      setLoadingAi(false);
    }
  };

  const sendReply = async (body) => {
    if (!selected || !body?.trim()) return;
    await api.post(`/api/gmail/reply/${selected.id}`, {
      to: selected.from,
      subject: selected.subject,
      body
    });
    toast.success('Réponse envoyée depuis Gmail');
    setReplyMode(false);
    setReplyText('');
  };

  const sendNewMessage = async () => {
    if (!compose.to.trim() || !compose.subject.trim() || !compose.body.trim()) {
      toast.error('Ajoutez un destinataire, un sujet et un message.');
      return;
    }
    setSendingCompose(true);
    try {
      await api.post('/api/gmail/send', compose);
      toast.success('Message envoyé');
      setComposeOpen(false);
      setCompose({ to: '', subject: '', body: '' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Impossible d’envoyer le message');
    } finally {
      setSendingCompose(false);
    }
  };

  const markAsRead = async (id, notify = true) => {
    await api.put(`/api/gmail/read/${id}`);
    setMessages((items) => items.map((item) => (item.id === id ? { ...item, unread: false, isRead: true } : item)));
    setSelected((item) => (item?.id === id ? { ...item, unread: false, isRead: true } : item));
    if (notify) toast.success('Email marqué comme lu');
  };

  const archiveEmail = async (id) => {
    try {
      await api.put(`/api/gmail/archive/${id}`);
      setMessages((items) => {
        const nextItems = items.filter((item) => item.id !== id);
        sessionStorage.setItem(GMAIL_CACHE_KEY, JSON.stringify(nextItems));
        publishGmailCount(nextItems);
        return nextItems;
      });
      setSelected(null);
      toast.success('Email archivé');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Archivage indisponible');
    }
  };

  const deleteEmail = async (id) => {
    if (!window.confirm('Supprimer cet email de Gmail ?')) return;
    try {
      await api.delete(`/api/gmail/messages/${id}`);
      setMessages((items) => {
        const nextItems = items.filter((item) => item.id !== id);
        sessionStorage.setItem(GMAIL_CACHE_KEY, JSON.stringify(nextItems));
        publishGmailCount(nextItems);
        return nextItems;
      });
      setSelected(null);
      toast.success('Email supprimé');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Suppression indisponible');
    }
  };

  const connectGmail = async () => {
    try {
      const { data } = await api.get('/api/gmail/auth-url');
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      toast.error('URL OAuth Gmail indisponible');
    } catch (e) {
      const hint = e.response?.data?.hint;
      const diag = e.response?.data?.diagnostics;
      toast.error(e.response?.data?.message || 'Impossible de démarrer Gmail OAuth');
      if (hint) toast(hint, { duration: 6000 });
      if (diag?.clientId === 'placeholder' || diag?.clientSecret === 'placeholder') {
        toast('Remplacez REMPLACER_PAR_* par vos identifiants Google dans backend/.env', { duration: 8000 });
      }
    }
  };

  const categoryCounts = useMemo(() => {
    return messages.reduce(
      (acc, email) => {
        const cat = categorizeEmail(email).category;
        acc[cat] = (acc[cat] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0 }
    );
  }, [messages]);

  const filteredEmails = useMemo(() => {
    return messages
      .filter((email) => {
        if (filter !== 'all' && categorizeEmail(email).category !== filter) return false;
        if (showUnreadOnly && !isUnread(email)) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          email.subject?.toLowerCase().includes(q) ||
          email.from?.toLowerCase().includes(q) ||
          email.snippet?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const pa = categorizeEmail(a).priority;
        const pb = categorizeEmail(b).priority;
        if (pa !== pb) return pa - pb;
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }, [messages, filter, search, showUnreadOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmails = filteredEmails.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedCategory = selected ? categorizeEmail(selected) : null;
  const canUseAiReply = selectedCategory && ['client', 'personnel'].includes(selectedCategory.category);
  const conversationParts = selected ? getConversationParts(selected, gmailStatus.userEmail) : [];

  return (
    <div className="messaging-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Messagerie Gmail</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {gmailStatus.connected
              ? `Connecté à ${gmailStatus.userEmail || 'Gmail'}`
              : 'Gmail non connecté. Connectez le compte pour afficher les emails.'}
          </p>
        </div>
        <div className="flex gap-2">
          {gmailStatus.connected && (
            <button onClick={() => setComposeOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
              ✉️ Nouveau message
            </button>
          )}
          {!gmailStatus.connected && (
            <button onClick={connectGmail} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white">
              Connecter Gmail
            </button>
          )}
          <button onClick={load} disabled={refreshingMessages} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">
            {refreshingMessages ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Vérification de Gmail...</p>}
      {!loading && !gmailStatus.configured && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          Ajoutez `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` et `GMAIL_REDIRECT_URI` dans `backend/.env`, puis redémarrez le backend.
        </div>
      )}
      {!loading && gmailStatus.configured && !gmailStatus.connected && (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Connecter maisonecal@gmail.com</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Le token OAuth2 n’est pas encore enregistré dans MongoDB. Cliquez sur le bouton ci-dessous pour ouvrir Google OAuth, puis revenez automatiquement ici.
          </p>
          <button onClick={connectGmail} className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold text-white">
            Connecter Gmail
          </button>
        </div>
      )}

      {gmailStatus.connected && (
        <div className="messaging-shell">
          <aside className="filters-panel glass-panel">
            <h3>Boîte de réception</h3>
            <div className="filters-list">
              {CATEGORY_OPTIONS.map((option) => (
                <div key={option.id}>
                  {option.group && <div className="separator">{option.group}</div>}
                  <button
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className={filter === option.id ? 'active' : ''}
                  >
                    <span>{option.icon} {option.label}</span>
                    <span className={`count ${option.color ? `badge-${option.color}` : ''}`}>
                      {categoryCounts[option.id] || 0}
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <div className="search-box">
              <input
                value={search}
                placeholder="🔍 Rechercher..."
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
              />
              Non lus seulement
            </label>
          </aside>

          <aside className="email-list glass-panel">
            <div className="list-header">
              <div>
                <h2>{filter === 'all' ? 'Tous les emails' : CATEGORY_OPTIONS.find((c) => c.id === filter)?.label}</h2>
                <p>
                  {filteredEmails.length} message(s)
                  {filteredEmails.length > PAGE_SIZE ? ` · page ${currentPage}/${totalPages}` : ''}
                </p>
              </div>
              <button type="button" onClick={load}>Actualiser</button>
            </div>

            <div className="email-list-scroll">
              {filteredEmails.length === 0 && (
                <div className="empty-list">Aucun email ne correspond aux filtres.</div>
              )}
              {paginatedEmails.map((email) => {
                const cat = categorizeEmail(email);
                const unread = isUnread(email);
                return (
                  <button
                    type="button"
                    key={email.id}
                    className={`email-item ${unread ? 'unread' : ''} ${selected?.id === email.id ? 'selected' : ''}`}
                    onClick={() => open(email)}
                  >
                    <div className={`avatar avatar-${cat.color}`}>{getInitials(email)}</div>
                    <div className="email-content">
                      <div className="email-header">
                        <span className="sender">{getSenderName(email)}</span>
                        <span className="time">{formatRelativeTime(email.date)}</span>
                      </div>
                      <div className="subject">{truncate(email.subject || '(Sans objet)', 40)}</div>
                      <div className="preview">{truncate(email.snippet || '', 60)}</div>
                      <div className="email-footer">
                        <span className={`category-badge badge-${cat.color}`}>{cat.label}</span>
                        {unread && <span className="unread-dot" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredEmails.length > PAGE_SIZE && (
              <div className="pagination-controls">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  ← Previous
                </button>
                <span>{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredEmails.length)} / {filteredEmails.length}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </aside>

          <section className="email-reader glass-panel">
            {selected && selectedCategory ? (
              <>
                <div className="reader-header">
                  <div className="reader-title-row">
                    <div>
                      <p className="reader-date-top">{formatFullDate(selected.date)}</p>
                      <h2>{selected.subject || '(Sans objet)'}</h2>
                    </div>
                    <span className={`category-badge-lg badge-${selectedCategory.color}`}>{selectedCategory.label}</span>
                  </div>
                  <div className="email-meta">
                    <div className="sender-info">
                      <div className={`avatar-lg avatar-${selectedCategory.color}`}>{getInitials(selected)}</div>
                      <div>
                        <p className="sender-name">{getSenderName(selected)}</p>
                        <p className="sender-email">{getSenderEmail(selected.from)}</p>
                        <p className="email-date">{formatFullDate(selected.date)}</p>
                      </div>
                    </div>
                    <div className="reader-actions">
                      <button type="button" onClick={() => markAsRead(selected.id)}>✅ Marquer lu</button>
                      <button type="button" onClick={() => archiveEmail(selected.id)}>📁 Archiver</button>
                      <button type="button" onClick={() => deleteEmail(selected.id)}>🗑️ Supprimer</button>
                    </div>
                  </div>
                </div>

                <div className="reader-body">
                  {conversationParts.length ? (
                    <article className="email-message-card conversation-card">
                      <div className="email-message-meta">
                        <div className={`avatar avatar-${selectedCategory.color}`}>{getInitials(selected)}</div>
                        <div>
                          <strong>{getSenderName(selected)}</strong>
                          <span>{formatFullDate(selected.date)}</span>
                        </div>
                      </div>
                      <div className="conversation-thread">
                        {conversationParts.map((part, index) => (
                          <section key={`${selected.id}-${index}`} className={`conversation-bubble ${part.owner === 'me' ? 'bubble-me' : 'bubble-client'}`}>
                            <div className="bubble-head">
                              <span>{part.owner === 'me' ? 'M-ECAL' : getSenderName(selected)}</span>
                              {part.meta && <small>{part.meta}</small>}
                            </div>
                            <p>{cleanEmailParagraph(part.body)}</p>
                          </section>
                        ))}
                      </div>
                    </article>
                  ) : selected.body ? (
                    <iframe srcDoc={buildEmailSrcDoc(selected.body, selected.snippet)} className="email-iframe" title="email-content" sandbox="allow-same-origin" />
                  ) : (
                    <p>{selected.snippet}</p>
                  )}
                </div>

                {canUseAiReply && (
                  <div className="ai-reply-section">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => generateAIReply(selected)}
                        className="btn-ai disabled:opacity-60"
                        disabled={loadingAi}
                      >
                        {loadingAi ? 'Génération...' : '🤖 Générer réponse IA'}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                        onClick={() => {
                          setReplyMode(true);
                          setReplyText('');
                        }}
                      >
                        Répondre manuellement
                      </button>
                    </div>

                    {suggestions && (
                      <div className="suggestions-grid">
                        {suggestions.analyse_client && (
                          <div className="suggestion-card suggestion-analysis">
                            <h4>Analyse du message client</h4>
                            {suggestions.source && <small>Source IA : {suggestions.source === 'claude' ? 'Claude / Agent IA' : 'fallback local'}</small>}
                            <p>{suggestions.analyse_client}</p>
                            {suggestions.action_suggeree && <span>Action suggérée : {suggestions.action_suggeree}</span>}
                          </div>
                        )}
                        {[
                          ['reponse_courte', 'Réponse courte'],
                          ['reponse_complete', 'Réponse complète']
                        ].map(([key, title]) => (
                          <div key={key} className="suggestion-card">
                            <h4>{title}</h4>
                            <p>{suggestions[key]}</p>
                            <div className="suggestion-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyText(suggestions[key] || '');
                                  setReplyMode(true);
                                }}
                              >
                                ✅ Préparer
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyText(suggestions[key] || '');
                                  setReplyMode(true);
                                }}
                              >
                                ✏️ Modifier
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyMode && (
                      <div className="reply-editor">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={8}
                          placeholder="Écrire votre réponse..."
                        />
                        <div className="reply-footer">
                          <span>De: {gmailStatus.userEmail || 'maisonecal@gmail.com'}</span>
                          <div>
                            <button type="button" onClick={() => setReplyMode(false)}>Annuler</button>
                            <button type="button" onClick={() => sendReply(replyText)} className="btn-send">📤 Envoyer</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-reader">
                <div className="empty-icon">📧</div>
                <h3>Sélectionnez un email</h3>
                <p>Cliquez sur un message pour le lire</p>
              </div>
            )}
          </section>
        </div>
      )}

      {composeOpen && (
        <div className="compose-backdrop" role="dialog" aria-modal="true">
          <div className="compose-modal glass-panel">
            <div className="compose-header">
              <div>
                <h2>Nouveau message</h2>
                <p>Envoyer depuis {gmailStatus.userEmail || 'maisonecal@gmail.com'}</p>
              </div>
              <button type="button" onClick={() => setComposeOpen(false)}>×</button>
            </div>
            <div className="compose-form">
              <label>
                Destinataire
                <input
                  type="email"
                  value={compose.to}
                  onChange={(e) => setCompose((value) => ({ ...value, to: e.target.value }))}
                  placeholder="exemple@domaine.com"
                />
              </label>
              <label>
                Sujet
                <input
                  value={compose.subject}
                  onChange={(e) => setCompose((value) => ({ ...value, subject: e.target.value }))}
                  placeholder="Objet du message"
                />
              </label>
              <label>
                Message
                <textarea
                  rows={10}
                  value={compose.body}
                  onChange={(e) => setCompose((value) => ({ ...value, body: e.target.value }))}
                  placeholder="Écrivez votre message..."
                />
              </label>
            </div>
            <div className="compose-footer">
              <button type="button" onClick={() => setComposeOpen(false)}>Annuler</button>
              <button type="button" className="btn-send" onClick={sendNewMessage} disabled={sendingCompose}>
                {sendingCompose ? 'Envoi...' : '📤 Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
