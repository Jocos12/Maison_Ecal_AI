const URL_RE = /(https?:\/\/[^\s<>")\]]+)/g;
const BOLD_RE = /(\*\*[^*]+\*\*)/g;

export function tokenizeRichText(text = '') {
  const tokens = [];
  const parts = String(text).split(BOLD_RE);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      tokens.push({ type: 'bold', text: part.slice(2, -2) });
      continue;
    }
    let last = 0;
    let match;
    const sub = part;
    URL_RE.lastIndex = 0;
    while ((match = URL_RE.exec(sub)) !== null) {
      if (match.index > last) {
        tokens.push({ type: 'text', text: sub.slice(last, match.index) });
      }
      const href = match[0].replace(/[.,;:!?)]+$/, '');
      tokens.push({ type: 'link', text: href, href });
      last = match.index + match[0].length;
    }
    if (last < sub.length) {
      tokens.push({ type: 'text', text: sub.slice(last) });
    }
  }

  return tokens;
}

export function RichTextContent({ text, linkClassName, invertLinks = false }) {
  const tokens = tokenizeRichText(text);
  const linkCls =
    linkClassName ||
    (invertLinks
      ? 'break-all font-medium text-blue-100 underline decoration-blue-200/60 hover:text-white'
      : 'break-all font-medium text-blue-600 underline decoration-blue-400/50 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300');

  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'bold') {
          return (
            <strong key={i} className="font-semibold">
              {t.text}
            </strong>
          );
        }
        if (t.type === 'link') {
          return (
            <a
              key={i}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
              onClick={(e) => e.stopPropagation()}
            >
              {t.text}
            </a>
          );
        }
        return <span key={i}>{t.text}</span>;
      })}
    </>
  );
}
