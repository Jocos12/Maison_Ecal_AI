import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom drop-down list (replaces the native <select>) with the floating-label look of the auth fields.
 * Follows the "select-only combobox" pattern: click, Enter, Space or arrow keys open it,
 * arrows/Home/End move, Enter or Space picks, Escape and outside clicks close it.
 * `options`: [{ value, label }]
 */
export default function NeoSelect({ id, label, value, onChange, options }) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const [active, setActive] = useState(selectedIndex);
  const listId = `${id}-list`;
  const labelId = `${id}-label`;

  const openList = useCallback(() => {
    setActive(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  const closeList = useCallback(() => setOpen(false), []);

  const pick = (index) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) pick(active);
        else openList();
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closeList();
        }
        break;
      case 'Tab':
        closeList();
        break;
      default:
    }
  };

  return (
    <div ref={rootRef} className="mlogin-field mlogin-field--select mlogin-select" data-open={open}>
      <div className="mlogin-control">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          className="mlogin-input mlogin-select-button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${id}`}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          onClick={() => (open ? closeList() : openList())}
          onKeyDown={onKeyDown}
        >
          {options[selectedIndex]?.label}
        </button>
        <span id={labelId} className="mlogin-label">
          {label}
        </span>
        <ChevronDown className="mlogin-chevron" size={18} aria-hidden="true" />

        {open ? (
          <ul id={listId} role="listbox" aria-labelledby={labelId} className="mlogin-select-list">
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={option.value === value}
                data-active={index === active}
                className="mlogin-select-option"
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(index)}
              >
                <span className="mlogin-select-radio" aria-hidden="true" />
                <span>{option.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
