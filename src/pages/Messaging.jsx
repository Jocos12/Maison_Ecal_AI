import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Bot,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Folder,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import { api } from '../api/client.js';
import { useUiLocale } from '../hooks/useUiLocale.js';

const DEFAULT_MAILBOX = 'maisonecal@gmail.com';
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

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
    return { category: 'client', priority: 1 };
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
    return { category: 'apps', priority: 3 };
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
    return { category: 'social', priority: 4 };
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
    return { category: 'promo', priority: 5 };
  }

  if (
    !from.includes('noreply') &&
    !from.includes('no-reply') &&
    !from.includes('notification') &&
    !from.includes('automated') &&
    !from.includes('donotreply')
  ) {
    return { category: 'personnel', priority: 2 };
  }

  return { category: 'autre', priority: 6 };
}

/** Colours and icon of each category: red for clients, orange for personal, amber for apps, blue for social, grey for the rest. */
const CAT_STYLE = {
  all: { icon: Inbox, tile: 'bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200', avatar: 'bg-[#24478a]', badge: '' },
  client: {
    icon: Users,
    tile: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
    avatar: 'bg-red-600',
    badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
  },
  personnel: {
    icon: User,
    tile: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
    avatar: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900'
  },
  apps: {
    icon: Briefcase,
    tile: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    avatar: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900'
  },
  social: {
    icon: Share2,
    tile: 'bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200',
    avatar: 'bg-[#24478a]',
    badge: 'bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600'
  },
  promo: {
    icon: Tag,
    tile: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
    avatar: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600'
  },
  autre: {
    icon: Folder,
    tile: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
    avatar: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600'
  }
};

const CATEGORY_OPTIONS = [
  { id: 'all' },
  { id: 'client', group: 'groupPriority' },
  { id: 'personnel' },
  { id: 'apps', group: 'groupOthers' },
  { id: 'social' },
  { id: 'promo' },
  { id: 'autre' }
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

function decodeHtml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getSenderName(emailOrFrom = '', unknown = 'Expéditeur inconnu') {
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
  return raw || unknown;
}

function getSenderEmail(from = '') {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim();
}

function getInitials(emailOrFrom = '') {
  const name = getSenderName(emailOrFrom);
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function formatRelativeTime(dateValue, t, locale) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return t('messagingPage.timeNow');
  if (minutes < 60) return t('messagingPage.timeMinutes', { count: minutes });
  if (hours < 24) return t('messagingPage.timeHours', { count: hours });
  if (days === 1) return t('messagingPage.timeYesterday');
  if (days < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function formatFullDate(dateValue, t, locale) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return t('messagingPage.unknownDate');
  return date.toLocaleString(locale, {
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
  const safeText = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 18px; color: #111827; font: 14px/1.6 Arial, sans-serif; overflow-wrap: anywhere; word-break: break-word; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-family: inherit; }
      img { max-width: 100%; height: auto; }
      a { color: #24478a; }
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
  let current = { owner: 'client', lines: [] };

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
      current = { owner, meta: line, lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  pushCurrent();
  return parts;
}

function Avatar({ email, category, size = 'h-10 w-10 text-sm' }) {
  return (
    <span className={`grid flex-none place-items-center rounded-full font-bold text-white ${size} ${CAT_STYLE[category]?.avatar || 'bg-slate-500'}`} aria-hidden="true">
      {getInitials(email)}
    </span>
  );
}

function CategoryBadge({ category, t }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ring-1 ${CAT_STYLE[category]?.badge}`}>
      {t(`messagingPage.cat.${category}`)}
    </span>
  );
}

export default function Messaging() {
  const { t, dateLocale } = useUiLocale();
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
  const readerRef = useRef(null);

  const publishGmailCount = (items) => {
    const count = items.filter(isUnread).length;
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
      if (e.response?.status === 401 && e.response?.data?.connected === false) {
        setGmailStatus({
          connected: false,
          configured: e.response?.data?.configured ?? true,
          userEmail: e.response?.data?.userEmail
        });
        setMessages([]);
        sessionStorage.removeItem(GMAIL_CACHE_KEY);
        publishGmailCount([]);
        toast.error(e.response?.data?.message || t('messagingPage.toastExpired'));
        return;
      }
      if (e.response?.status === 400 || e.response?.status === 502) {
        toast.error(e.response?.data?.message || t('messagingPage.toastLoadError'));
        return;
      }
      if (e.response?.status === 429) {
        toast.error(t('messagingPage.toastTooMany'));
      } else {
        toast.error(e.response?.data?.message || t('messagingPage.toastLoadFail'));
      }
    } finally {
      setRefreshingMessages(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('gmail_error');
    if (params.get('gmail') === 'connected') toast.success(t('messagingPage.toastConnected'));
    if (oauthError === 'not_configured') toast.error(t('messagingPage.toastNotConfigured'));
    else if (oauthError === 'access_denied') toast.error(t('messagingPage.toastOauthDenied'));
    else if (oauthError) toast.error(t('messagingPage.toastOauthCallback'));
    // the message is shown once: the address goes back to a clean one so a reload does not repeat it
    if (params.has('gmail') || oauthError) window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search, showUnreadOnly]);

  useEffect(() => {
    readerRef.current?.scrollTo?.({ top: 0 });
  }, [selected?.id]);

  const open = async (message) => {
    try {
      const { data } = await api.get(`/api/gmail/messages/${message.id}`);
      const fullEmail = normalizeEmail({ ...message, ...data });
      setSelected(fullEmail);
      setSuggestions(null);
      setReplyText('');
      setReplyMode(false);
      if (isUnread(fullEmail)) markAsRead(fullEmail.id, false);
    } catch (e) {
      toast.error(e.response?.data?.message || t('messagingPage.toastOpenFail'));
    }
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
      toast.error(e.response?.data?.message || t('messagingPage.toastAiFail'));
    } finally {
      setLoadingAi(false);
    }
  };

  const sendReply = async (body) => {
    if (!selected || !body?.trim()) return;
    try {
      await api.post(`/api/gmail/reply/${selected.id}`, {
        to: selected.from,
        subject: selected.subject,
        body
      });
      toast.success(t('messagingPage.toastReplySent'));
      setReplyMode(false);
      setReplyText('');
    } catch (e) {
      toast.error(e.response?.data?.message || t('messagingPage.toastReplyFail'));
    }
  };

  const sendNewMessage = async () => {
    if (!compose.to.trim() || !compose.subject.trim() || !compose.body.trim()) {
      toast.error(t('messagingPage.composeInvalid'));
      return;
    }
    setSendingCompose(true);
    try {
      await api.post('/api/gmail/send', compose);
      toast.success(t('messagingPage.toastSent'));
      setComposeOpen(false);
      setCompose({ to: '', subject: '', body: '' });
    } catch (e) {
      toast.error(e.response?.data?.message || t('messagingPage.toastSendFail'));
    } finally {
      setSendingCompose(false);
    }
  };

  const markAsRead = async (id, notify = true) => {
    try {
      await api.put(`/api/gmail/read/${id}`);
      setMessages((items) => items.map((item) => (item.id === id ? { ...item, unread: false, isRead: true } : item)));
      setSelected((item) => (item?.id === id ? { ...item, unread: false, isRead: true } : item));
      if (notify) toast.success(t('messagingPage.toastMarked'));
    } catch (e) {
      if (notify) toast.error(e.response?.data?.message || t('messagingPage.toastReadFail'));
    }
  };

  const removeFromList = (id) => {
    setMessages((items) => {
      const nextItems = items.filter((item) => item.id !== id);
      sessionStorage.setItem(GMAIL_CACHE_KEY, JSON.stringify(nextItems));
      publishGmailCount(nextItems);
      return nextItems;
    });
    setSelected(null);
  };

  const archiveEmail = async (id) => {
    try {
      await api.put(`/api/gmail/archive/${id}`);
      removeFromList(id);
      toast.success(t('messagingPage.toastArchived'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('messagingPage.toastArchiveFail'));
    }
  };

  const deleteEmail = async (id) => {
    if (!window.confirm(t('messagingPage.confirmDelete'))) return;
    try {
      await api.delete(`/api/gmail/messages/${id}`);
      removeFromList(id);
      toast.success(t('messagingPage.toastDeleted'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('messagingPage.toastDeleteFail'));
    }
  };

  const connectGmail = async () => {
    try {
      const { data } = await api.get('/api/gmail/auth-url');
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      toast.error(t('messagingPage.toastOauthMissing'));
    } catch (e) {
      const hint = e.response?.data?.hint;
      const diag = e.response?.data?.diagnostics;
      toast.error(e.response?.data?.message || t('messagingPage.toastOauthFail'));
      if (hint) toast(hint, { duration: 6000 });
      if (diag?.clientId === 'placeholder' || diag?.clientSecret === 'placeholder') {
        toast(t('messagingPage.toastPlaceholders'), { duration: 8000 });
      }
    }
  };

  const categoryCounts = useMemo(
    () =>
      messages.reduce(
        (acc, email) => {
          const cat = categorizeEmail(email).category;
          acc[cat] = (acc[cat] || 0) + 1;
          acc.all += 1;
          return acc;
        },
        { all: 0 }
      ),
    [messages]
  );

  const unreadCount = useMemo(() => messages.filter(isUnread).length, [messages]);

  const filteredEmails = useMemo(
    () =>
      messages
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
        }),
    [messages, filter, search, showUnreadOnly]
  );

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmails = filteredEmails.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedCategory = selected ? categorizeEmail(selected).category : null;
  const canUseAiReply = selectedCategory && ['client', 'personnel'].includes(selectedCategory);
  const conversationParts = selected ? getConversationParts(selected, gmailStatus.userEmail) : [];
  const mailbox = gmailStatus.userEmail || DEFAULT_MAILBOX;
  const unknownSender = t('messagingPage.unknownSender');
  const inputClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <div className="page-shell space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-red-600 text-white shadow-sm">
            <Mail className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white">
              {t('pages.messaging.title')}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span
                className={`h-2 w-2 flex-none rounded-full ${gmailStatus.connected ? 'bg-emerald-500' : 'bg-slate-400'}`}
                aria-hidden="true"
              />
              {gmailStatus.connected
                ? t('messagingPage.connectedTo', { email: gmailStatus.userEmail || t('messagingPage.connectedGeneric') })
                : t('messagingPage.notConnected')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {gmailStatus.connected ? (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] ${FOCUS}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t('messagingPage.newMessage')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={load}
            disabled={refreshingMessages}
            className={`inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white disabled:opacity-60 dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshingMessages ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshingMessages ? t('messagingPage.refreshing') : t('messagingPage.refresh')}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('messagingPage.checking')}
        </p>
      ) : null}

      {!loading && !gmailStatus.configured ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {t('messagingPage.notConfigured')}
        </div>
      ) : null}

      {/* Not connected yet: what will happen, and a preview of what the inbox will look like */}
      {!loading && gmailStatus.configured && !gmailStatus.connected ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            <div className="p-6 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                {t('messagingPage.notConnectedBadge')}
              </span>
              <h2 className="mt-4 break-words text-2xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-3xl dark:text-white">
                {t('messagingPage.connectTitle', { email: DEFAULT_MAILBOX })}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('messagingPage.connectText')}</p>

              <ol className="mt-8 space-y-0">
                {['step1', 'step2', 'step3'].map((key, i, all) => (
                  <li key={key} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < all.length - 1 ? (
                      <span className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                    ) : null}
                    <span className="relative grid h-8 w-8 flex-none place-items-center rounded-full bg-[#24478a] text-sm font-bold text-white ring-4 ring-white dark:ring-slate-900">
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{t(`messagingPage.${key}`)}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{t(`messagingPage.${key}Hint`)}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={connectGmail}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
                >
                  {t('messagingPage.connect')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="flex max-w-xs items-start gap-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                  {t('messagingPage.secureNote')}
                </p>
              </div>
            </div>

            <aside className="relative overflow-hidden bg-[#24478a] p-6 text-white md:p-8">
              <span className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[28px] border-white/5" aria-hidden="true" />
              <span className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full border-[22px] border-white/5" aria-hidden="true" />
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('messagingPage.previewTitle')}</p>

                {/* Decorative sample of the inbox: shapes only, no real data */}
                <div className="mt-4 space-y-1 rounded-2xl bg-white p-2 shadow-xl" aria-hidden="true">
                  {[
                    ['client', 'bg-red-600', 'w-3/5', true],
                    ['personnel', 'bg-orange-500', 'w-2/5', true],
                    ['apps', 'bg-amber-500', 'w-1/2', false]
                  ].map(([cat, avatar, width, unread]) => (
                    <div key={cat} className="flex items-start gap-3 rounded-xl px-3 py-2.5 odd:bg-slate-50">
                      <span className={`h-9 w-9 flex-none rounded-full ${avatar}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`h-2.5 rounded-full bg-slate-800 ${width}`} />
                          {unread ? <span className="h-2 w-2 flex-none rounded-full bg-[#24478a]" /> : null}
                        </div>
                        <span className="mt-2 block h-2 w-full rounded-full bg-slate-200" />
                        <span className="mt-1.5 block h-2 w-4/5 rounded-full bg-slate-200" />
                        <span className="mt-2 inline-block">
                          <CategoryBadge category={cat} t={t} />
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-bold text-white">
                    <Bot className="h-4 w-4 flex-none" />
                    {t('messagingPage.aiGenerate')}
                  </div>
                </div>

                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('messagingPage.benefitsTitle')}</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    [Tag, 'benefit1'],
                    [Bot, 'benefit2'],
                    [Send, 'benefit3']
                  ].map(([BenefitIcon, key]) => (
                    <li key={key} className="flex items-start gap-3 text-[13px] leading-snug text-blue-50">
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-white/15">
                        <BenefitIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="pt-0.5">{t(`messagingPage.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {gmailStatus.connected ? (
        <section className="flex h-[calc(100vh-14rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {/* Categories */}
          <aside className="hidden w-60 flex-none flex-col border-r border-slate-200 bg-slate-50 lg:flex dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('messagingPage.inbox')}</p>
              {unreadCount ? (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">{unreadCount}</span>
              ) : null}
            </div>
            <nav className="historique-scroll min-h-0 flex-1 px-3 pb-4">
              {CATEGORY_OPTIONS.map((option) => {
                const style = CAT_STYLE[option.id];
                const CatIcon = style.icon;
                const active = filter === option.id;
                return (
                  <div key={option.id}>
                    {option.group ? (
                      <p className="px-2 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {t(`messagingPage.${option.group}`)}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setFilter(option.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`mb-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition ${FOCUS} ${
                        active
                          ? 'bg-[#24478a] text-white shadow-sm'
                          : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${active ? 'bg-white/15 text-white' : style.tile}`}>
                        <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 break-words leading-snug">{t(`messagingPage.cat.${option.id}`)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
                        {categoryCounts[option.id] || 0}
                      </span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* List */}
          <div
            className={`min-w-0 flex-col border-slate-200 lg:w-[23rem] lg:flex-none lg:border-r dark:border-slate-700 ${
              selected ? 'hidden lg:flex' : 'flex w-full'
            }`}
          >
            <div className="shrink-0 space-y-3 border-b border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap gap-1.5 lg:hidden">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={filter === option.id}
                    onClick={() => setFilter(option.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${FOCUS} ${
                      filter === option.id
                        ? 'border-[#24478a] bg-[#24478a] text-white'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {t(`messagingPage.cat.${option.id}`)}
                    <span className="tabular-nums opacity-80">{categoryCounts[option.id] || 0}</span>
                  </button>
                ))}
              </div>
              <label className="relative block">
                <span className="sr-only">{t('messagingPage.search')}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  value={search}
                  placeholder={t('messagingPage.search')}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#24478a] focus:bg-white focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('messagingPage.countMessages', { count: filteredEmails.length })}
                  {filteredEmails.length > PAGE_SIZE ? ` · ${t('messagingPage.pageOf', { page: currentPage, total: totalPages })}` : ''}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showUnreadOnly}
                  onClick={() => setShowUnreadOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 ${FOCUS} rounded-lg`}
                >
                  {t('messagingPage.unreadOnly')}
                  <span className={`relative h-5 w-9 flex-none rounded-full transition ${showUnreadOnly ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true">
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${showUnreadOnly ? 'left-[1.125rem]' : 'left-0.5'}`} />
                  </span>
                </button>
              </div>
            </div>

            <div className="historique-scroll min-h-0 flex-1">
              {filteredEmails.length === 0 ? (
                <p className="px-6 py-14 text-center text-sm text-slate-500">{t('messagingPage.noMatch')}</p>
              ) : null}
              {paginatedEmails.map((email) => {
                const cat = categorizeEmail(email).category;
                const unread = isUnread(email);
                const active = selected?.id === email.id;
                return (
                  <button
                    type="button"
                    key={email.id}
                    onClick={() => open(email)}
                    className={`relative flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition dark:border-slate-800 ${FOCUS} ${
                      active ? 'bg-[#eef3fb] dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {active ? <span className="absolute inset-y-0 left-0 w-1 bg-[#24478a]" aria-hidden="true" /> : null}
                    <Avatar email={email} category={cat} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`break-words text-sm leading-snug ${unread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
                          {getSenderName(email, unknownSender)}
                        </span>
                        <span className="flex-none whitespace-nowrap text-[11px] text-slate-400">
                          {formatRelativeTime(email.date, t, dateLocale)}
                        </span>
                      </span>
                      <span className={`mt-0.5 block break-words text-[13px] leading-snug ${unread ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {email.subject || t('messagingPage.noSubject')}
                      </span>
                      {email.snippet ? (
                        <span className="mt-0.5 line-clamp-2 block break-words text-xs leading-snug text-slate-500 dark:text-slate-400">{email.snippet}</span>
                      ) : null}
                      <span className="mt-2 flex items-center gap-2">
                        <CategoryBadge category={cat} t={t} />
                        {unread ? <span className="h-2 w-2 rounded-full bg-[#24478a]" aria-hidden="true" /> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredEmails.length > PAGE_SIZE ? (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#24478a] transition hover:bg-[#eef3fb] disabled:opacity-40 dark:text-blue-200 ${FOCUS}`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {t('messagingPage.prev')}
                </button>
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredEmails.length)} / {filteredEmails.length}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#24478a] transition hover:bg-[#eef3fb] disabled:opacity-40 dark:text-blue-200 ${FOCUS}`}
                >
                  {t('messagingPage.next')}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Reader */}
          <div className={`min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}>
            {selected && selectedCategory ? (
              <>
                <header className="shrink-0 border-b border-slate-200 p-4 md:p-5 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={`mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#24478a] hover:underline lg:hidden dark:text-blue-300 ${FOCUS} rounded`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('messagingPage.back')}
                  </button>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 break-words text-lg font-bold leading-snug text-slate-950 dark:text-white">
                      {selected.subject || t('messagingPage.noSubject')}
                    </h2>
                    <CategoryBadge category={selectedCategory} t={t} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar email={selected} category={selectedCategory} size="h-11 w-11 text-sm" />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-slate-900 dark:text-white">{getSenderName(selected, unknownSender)}</p>
                        <p className="break-all text-xs text-slate-500 dark:text-slate-400">{getSenderEmail(selected.from)}</p>
                        <p className="text-xs text-slate-400">{formatFullDate(selected.date, t, dateLocale)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => markAsRead(selected.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('messagingPage.markRead')}
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveEmail(selected.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('messagingPage.archive')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEmail(selected.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('messagingPage.delete')}
                      </button>
                    </div>
                  </div>
                </header>

                <div ref={readerRef} className="historique-scroll min-h-0 flex-1 space-y-5 p-4 md:p-5">
                  {conversationParts.length ? (
                    <div className="space-y-3">
                      {conversationParts.map((part, index) => (
                        <section
                          key={`${selected.id}-${index}`}
                          className={`max-w-3xl rounded-2xl border p-4 ${
                            part.owner === 'me'
                              ? 'ml-auto border-[#c9d8f1] bg-[#eef3fb] dark:border-slate-600 dark:bg-slate-800'
                              : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className={`text-xs font-bold ${part.owner === 'me' ? 'text-[#24478a] dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
                              {part.owner === 'me' ? 'M-ECAL' : getSenderName(selected, unknownSender)}
                            </span>
                            {part.meta ? <small className="break-words text-[11px] text-slate-400">{part.meta}</small> : null}
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                            {cleanEmailParagraph(part.body)}
                          </p>
                        </section>
                      ))}
                    </div>
                  ) : selected.body ? (
                    <iframe
                      srcDoc={buildEmailSrcDoc(selected.body, selected.snippet)}
                      className="h-[28rem] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700"
                      title="email-content"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{selected.snippet}</p>
                  )}

                  {canUseAiReply ? (
                    <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => generateAIReply(selected)}
                          disabled={loadingAi}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-700/30 disabled:opacity-60"
                        >
                          {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
                          {loadingAi ? t('messagingPage.aiGenerating') : t('messagingPage.aiGenerate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyMode(true);
                            setReplyText('');
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          {t('messagingPage.manualReply')}
                        </button>
                      </div>

                      {suggestions ? (
                        <div className="grid gap-3">
                          {suggestions.analyse_client ? (
                            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/60 dark:bg-slate-800/60">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('messagingPage.analysisTitle')}</h4>
                              {suggestions.source ? (
                                <small className="mt-0.5 block text-[11px] text-slate-500">
                                  {t('messagingPage.aiSource', {
                                    source: suggestions.source === 'claude' ? t('messagingPage.sourceClaude') : t('messagingPage.sourceLocal')
                                  })}
                                </small>
                              ) : null}
                              <p className="mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{suggestions.analyse_client}</p>
                              {suggestions.action_suggeree ? (
                                <p className="mt-2 break-words text-xs font-semibold text-violet-800 dark:text-violet-200">
                                  {t('messagingPage.suggestedAction', { action: suggestions.action_suggeree })}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {[
                            ['reponse_courte', 'shortReply'],
                            ['reponse_complete', 'fullReply']
                          ].map(([key, titleKey]) => (
                            <div key={key} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t(`messagingPage.${titleKey}`)}</h4>
                              <p className="mt-2 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{suggestions[key]}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyText(suggestions[key] || '');
                                    setReplyMode(true);
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-lg bg-[#24478a] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1c3a72] ${FOCUS}`}
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('messagingPage.prepare')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyText(suggestions[key] || '');
                                    setReplyMode(true);
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:text-slate-200 ${FOCUS}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('messagingPage.edit')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {replyMode ? (
                        <div className="rounded-xl border border-slate-300 bg-white p-3 focus-within:border-[#24478a] focus-within:ring-4 focus-within:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={8}
                            placeholder={t('messagingPage.replyPlaceholder')}
                            className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                            <span className="break-all text-xs text-slate-500">{t('messagingPage.from', { email: mailbox })}</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setReplyMode(false)}
                                className={`rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 ${FOCUS}`}
                              >
                                {t('messagingPage.cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => sendReply(replyText)}
                                className={`inline-flex items-center gap-1.5 rounded-lg bg-[#24478a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1c3a72] ${FOCUS}`}
                              >
                                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('messagingPage.send')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="grid h-20 w-20 place-items-center rounded-3xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800 dark:text-blue-200">
                  <MailOpen className="h-10 w-10" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('messagingPage.selectEmail')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('messagingPage.selectHint')}</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {composeOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <header className="flex shrink-0 items-start gap-3 bg-[#24478a] px-5 py-4 text-white">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-[#24478a]">
                <Pencil className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold">{t('messagingPage.composeTitle')}</h2>
                <p className="mt-0.5 break-all text-xs text-blue-100">{t('messagingPage.composeFrom', { email: mailbox })}</p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label={t('messagingPage.close')}
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15 transition hover:rotate-90 hover:bg-red-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {t('messagingPage.to')}
                <input
                  type="email"
                  value={compose.to}
                  onChange={(e) => setCompose((value) => ({ ...value, to: e.target.value }))}
                  placeholder={t('messagingPage.toPlaceholder')}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {t('messagingPage.subject')}
                <input
                  value={compose.subject}
                  onChange={(e) => setCompose((value) => ({ ...value, subject: e.target.value }))}
                  placeholder={t('messagingPage.subjectPlaceholder')}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {t('messagingPage.message')}
                <textarea
                  rows={9}
                  value={compose.body}
                  onChange={(e) => setCompose((value) => ({ ...value, body: e.target.value }))}
                  placeholder={t('messagingPage.bodyPlaceholder')}
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className={`rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 ${FOCUS}`}
              >
                {t('messagingPage.cancel')}
              </button>
              <button
                type="button"
                onClick={sendNewMessage}
                disabled={sendingCompose}
                className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
              >
                {sendingCompose ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {sendingCompose ? t('messagingPage.sending') : t('messagingPage.send')}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
