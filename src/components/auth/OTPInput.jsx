import { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils.js';

/** `value` / `onChange`: string of 0–6 digits only */
export default function OTPInput({ value, onChange, disabled, error }) {
  const cells = 6;
  const digits = (value || '').replace(/\D/g, '').slice(0, cells);
  const refs = useRef([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, cells);
  }, [cells]);

  const chars = Array.from({ length: cells }, (_, i) => digits[i] || '');

  const commit = (nextDigits) => {
    onChange(nextDigits.replace(/\D/g, '').slice(0, cells));
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, cells);
    commit(text);
    const pos = Math.min(text.length, cells - 1);
    refs.current[pos]?.focus();
  };

  const onChangeCell = (idx, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const ch = raw.slice(-1) || '';
    const arr = digits.padEnd(cells, ' ').split('');
    arr[idx] = ch || ' ';
    const next = arr.join('').replace(/\s/g, '');
    commit(next);
    if (ch && idx < cells - 1) refs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (chars[idx]) {
        const arr = digits.padEnd(cells, ' ').split('');
        arr[idx] = ' ';
        commit(arr.join('').replace(/\s/g, ''));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const arr = digits.padEnd(cells, ' ').split('');
        arr[idx - 1] = ' ';
        commit(arr.join('').replace(/\s/g, ''));
      }
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < cells - 1) refs.current[idx + 1]?.focus();
  };

  return (
    <div className="mlogin-otp" onPaste={onPaste}>
      {Array.from({ length: cells }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          disabled={disabled}
          value={chars[idx]}
          aria-label={`${idx + 1} / ${cells}`}
          onChange={(e) => onChangeCell(idx, e)}
          onKeyDown={(e) => onKeyDown(idx, e)}
          className={cn(
            'mlogin-otp-cell',
            chars[idx] && 'mlogin-otp-cell--filled',
            error && 'mlogin-otp-cell--error'
          )}
        />
      ))}
    </div>
  );
}
