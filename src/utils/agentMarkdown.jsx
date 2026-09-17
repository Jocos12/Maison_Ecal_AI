/**
 * Rendu Markdown léger (sans dépendance npm) pour le widget agent.
 * Titres, gras, listes, liens, tableaux GFM simples.
 */
import { Link } from 'react-router-dom';

function inlineParts(text = '', keyPrefix = 'i') {
  const nodes = [];
  const re =
    /(\*\*[^*]+?\*\*|_[^_\n]+?_|\*[^*\n]+?\*|`[^`]+?`|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\))/g;
  let last = 0;
  let match;
  let n = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`${keyPrefix}-${n++}`}>{text.slice(last, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-${n++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
      nodes.push(
        <em key={`${keyPrefix}-${n++}`} className="italic text-inherit">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2 && !token.startsWith('**')) {
      nodes.push(
        <em key={`${keyPrefix}-${n++}`} className="italic text-inherit">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={`${keyPrefix}-${n++}`} className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-700">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const href = match[3];
      const isInternal = href.startsWith('/');
      const cls =
        'font-medium text-blue-600 underline decoration-blue-400/50 hover:text-blue-800 dark:text-blue-400';
      nodes.push(
        isInternal ? (
          <Link
            key={`${keyPrefix}-${n++}`}
            to={href}
            className={cls}
            onClick={(e) => e.stopPropagation()}
          >
            {match[2]}
          </Link>
        ) : (
          <a
            key={`${keyPrefix}-${n++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`break-all ${cls}`}
            onClick={(e) => e.stopPropagation()}
          >
            {match[2]}
          </a>
        )
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<span key={`${keyPrefix}-${n++}`}>{text.slice(last)}</span>);
  }
  return nodes;
}

function isHrLine(line = '') {
  return /^(?:-{3,}|\*{3,}|_{3,})$/.test(String(line).trim());
}

function isTableSeparator(line = '') {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(String(line));
}

function splitRow(line = '') {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function parseBlocks(src = '') {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (isHrLine(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (isTableSeparator(lines[i + 1] || '') && line.includes('|')) {
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      blocks.push({ type: 'heading', level, text: line.replace(/^#{1,3}\s+/, '') });
      i += 1;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*•]\s+/, '');
        i += 1;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^#{1,3}\s+/.test(lines[i]) &&
          !/^\s*[-*•]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^```/.test(lines[i]) &&
          !isHrLine(lines[i])
        ) {
          item = `${item} ${lines[i].trim()}`;
          i += 1;
        }
        items.push(item);
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*\d+\.\s+/, '');
        i += 1;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^#{1,3}\s+/.test(lines[i]) &&
          !/^\s*[-*•]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^```/.test(lines[i]) &&
          !isHrLine(lines[i]) &&
          !(isTableSeparator(lines[i + 1] || '') && lines[i].includes('|'))
        ) {
          item = `${item} ${lines[i].trim()}`;
          i += 1;
        }
        items.push(item);
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !isHrLine(lines[i])
    ) {
      if (isTableSeparator(lines[i + 1] || '') && lines[i].includes('|')) break;
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

export function AgentMarkdown({ text, invert = false }) {
  const blocks = parseBlocks(text);
  return (
    <div
      className={`agent-md max-w-full break-words text-sm leading-relaxed [overflow-wrap:anywhere] ${
        invert ? 'agent-md-invert' : ''
      }`}
    >
      {blocks.map((block, idx) => {
        if (block.type === 'hr') {
          return (
            <hr
              key={idx}
              className="my-4 border-0 border-t border-slate-300 dark:border-slate-600"
            />
          );
        }
        if (block.type === 'heading') {
          const cls = 'mb-2 mt-3 font-semibold first:mt-0';
          if (block.level === 1) {
            return (
              <h2 key={idx} className={`${cls} text-base`}>
                {inlineParts(block.text, `h1-${idx}`)}
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3 key={idx} className={`${cls} text-[15px]`}>
                {inlineParts(block.text, `h2-${idx}`)}
              </h3>
            );
          }
          return (
            <h4 key={idx} className={`${cls} text-sm`}>
              {inlineParts(block.text, `h3-${idx}`)}
            </h4>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="mb-2 list-disc space-y-1 pl-4 last:mb-0">
              {block.items.map((item, j) => (
                <li key={j}>{inlineParts(item, `ul-${idx}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">
              {block.items.map((item, j) => (
                <li key={j}>{inlineParts(item, `ol-${idx}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'table') {
          const [header, ...body] = block.rows;
          return (
            <div key={idx} className="-mx-1 mb-2 max-w-full overflow-x-auto">
              <table className="min-w-[16rem] border-collapse text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-700/60">
                  <tr>
                    {(header || []).map((cell, j) => (
                      <th
                        key={j}
                        className="whitespace-nowrap border border-slate-200 px-2 py-1 font-semibold dark:border-slate-600"
                      >
                        {inlineParts(cell, `th-${idx}-${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="border border-slate-200 px-2 py-1 align-top dark:border-slate-600"
                        >
                          {inlineParts(cell, `td-${idx}-${r}-${j}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={idx}
              className="mb-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100"
            >
              {block.text}
            </pre>
          );
        }
        return (
          <p key={idx} className="mb-2 last:mb-0">
            {inlineParts(block.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}
