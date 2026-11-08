// The small set of building blocks every screen is made from, so the whole app looks and behaves the same.
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

// ---------------------------------------------------------------- page structure

export const Page: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <div className={`p-4 md:p-6 mx-auto w-full ${wide ? 'max-w-[1500px]' : 'max-w-[1240px]'}`}>{children}</div>
);

export const PageHeader: React.FC<{ title: string; hint?: React.ReactNode; actions?: React.ReactNode }> = ({ title, hint, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="text-xl font-bold">{title}</h1>
      {hint && <p className="hint mt-0.5 max-w-2xl">{hint}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
  </div>
);

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }> = ({ title, actions, children, className = '', flush }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h2 className="font-semibold text-[1.0714rem]">{title}</h2>
        {actions}
      </div>
    )}
    <div className={flush ? '' : 'px-4 pb-4 pt-1'}>{children}</div>
  </section>
);

export const Stat: React.FC<{ label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'plain'; onClick?: () => void }> = ({ label, value, sub, tone = 'plain', onClick }) => {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-rose-700' : 'text-slate-900';
  const body = (
    <>
      <div className="hint font-medium">{label}</div>
      <div className={`text-[1.5rem] leading-tight font-bold tabular-nums mt-1 ${color}`}>{value}</div>
      {sub && <div className="hint mt-0.5">{sub}</div>}
    </>
  );
  return onClick
    ? <button onClick={onClick} className="card p-4 text-left hover:border-brand-600 transition-colors cursor-pointer w-full">{body}</button>
    : <div className="card p-4">{body}</div>;
};

export const Empty: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="text-center py-10 px-4">
    <p className="font-semibold text-slate-700">{title}</p>
    {hint && <p className="hint mt-1">{hint}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const Notice: React.FC<{ tone?: 'info' | 'warn' | 'bad' | 'good'; children: React.ReactNode; className?: string }> = ({ tone = 'info', children, className = '' }) => {
  const styles = {
    info: 'bg-brand-50 border-brand-100 text-brand-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    bad: 'bg-rose-50 border-rose-200 text-rose-900',
    good: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  }[tone];
  return <div className={`border rounded-lg px-3 py-2 ${styles} ${className}`}>{children}</div>;
};

export const Pill: React.FC<{ tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray'; children: React.ReactNode }> = ({ tone = 'gray', children }) => {
  const styles = {
    blue: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800',
    red: 'bg-rose-50 text-rose-700', gray: 'bg-slate-100 text-slate-600',
  }[tone];
  return <span className={`pill ${styles}`}>{children}</span>;
};

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto no-print" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`px-3 py-2 font-semibold whitespace-nowrap border-b-2 -mb-px cursor-pointer ${value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >{t.label}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- form fields

export const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="hint block mt-1">{hint}</span>}
  </label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...p }, ref) => (
  <input ref={ref} {...p} className={`input ${className}`} />
));
Input.displayName = 'Input';

export const NumberInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | string | undefined; onValue: (n: number) => void; cell?: boolean }>(
  ({ value, onValue, cell, className = '', ...p }, ref) => {
    const [text, setText] = useState(value === undefined || value === 0 ? '' : String(value));
    const lastSent = useRef<number | undefined>(undefined);
    useEffect(() => {
      const incoming = value === undefined || value === '' ? 0 : Number(value);
      if (incoming !== lastSent.current) {
        setText(incoming === 0 ? '' : String(value));
        lastSent.current = incoming;
      }
    }, [value]);
    return (
      <input
        ref={ref} inputMode="decimal" {...p}
        value={text}
        onChange={e => {
          const raw = e.target.value.replace(/[^\d.-]/g, '');
          setText(raw);
          const n = Number(raw);
          const safe = Number.isFinite(n) ? n : 0;
          lastSent.current = safe;
          onValue(safe);
        }}
        className={`${cell ? 'cell-input' : 'input'} input-num ${className}`}
      />
    );
  },
);
NumberInput.displayName = 'NumberInput';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...p }) => (
  <select {...p} className={`input ${className}`}>{children}</select>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-2.5 cursor-pointer py-1">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-[3px] w-4 h-4 accent-brand-600 shrink-0" />
    <span>
      <span className="font-medium text-slate-800">{label}</span>
      {hint && <span className="hint block">{hint}</span>}
    </span>
  </label>
);

// Enter moves to the next field, the way Tally data entry works.
export function useEnterToNext<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'A') return;
    e.preventDefault();
    const fields = [...(ref.current?.querySelectorAll<HTMLElement>('input:not([disabled]):not([type=checkbox]),select:not([disabled]),textarea:not([disabled]),button[data-accept]') ?? [])]
      .filter(el => el.offsetParent !== null);
    const next = fields[fields.indexOf(target) + 1];
    next?.focus();
    if (next instanceof HTMLInputElement) next.select();
  }, []);
  return { ref, onKeyDown };
}

// ---------------------------------------------------------------- searchable picker

export interface ComboOption {
  id: string;
  label: string;
  hint?: string;
  section?: string;
}

interface ComboProps {
  value: string;
  onChange: (id: string) => void;
  options: ComboOption[];
  placeholder?: string;
  onCreate?: (text: string) => void;
  createLabel?: string;
  cell?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/** Type to search, arrows to move, Enter to pick. Used for every ledger and item choice. */
export const Combo: React.FC<ComboProps> = ({ value, onChange, options, placeholder = 'Type to search', onCreate, createLabel = 'Create', cell, autoFocus, disabled, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ left: number; top: number; width: number; flip: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    const words = q.split(/\s+/);
    return options.filter(o => words.every(w => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(w))).slice(0, 200);
  }, [options, query]);

  const showCreate = !!onCreate && query.trim().length > 0 && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase());
  const total = filtered.length + (showCreate ? 1 : 0);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const place = () => {
      const r = inputRef.current!.getBoundingClientRect();
      const flip = window.innerHeight - r.bottom < 260 && r.top > 260;
      setBox({ left: r.left, top: flip ? r.top - 4 : r.bottom + 4, width: Math.max(r.width, 300), flip });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (id: string) => { onChange(id); setOpen(false); setQuery(''); };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive(a => Math.min(a + 1, total - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      if (!open) return; // Let Enter move on to the next field.
      if (active < filtered.length && filtered[active]) pick(filtered[active].id);
      else if (showCreate) { const text = query.trim(); setOpen(false); setQuery(''); onCreate!(text); e.preventDefault(); }
      else setOpen(false);
    } else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setQuery(''); }
    else if (e.key === 'Tab') { setOpen(false); setQuery(''); }
    else if (e.altKey && e.key.toLowerCase() === 'c' && onCreate) { e.preventDefault(); const text = query.trim(); setOpen(false); setQuery(''); onCreate(text); }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        value={open ? query : selected?.label ?? ''}
        placeholder={open && selected ? selected.label : placeholder}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setQuery(''); }, 120)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKey}
        className={`${cell ? 'cell-input' : 'input'} pr-7`}
      />
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      {open && box && createPortal(
        <div
          ref={listRef}
          data-modal-layer
          onMouseDown={e => e.preventDefault()}
          style={{ position: 'fixed', left: box.left, width: box.width, ...(box.flip ? { bottom: window.innerHeight - box.top } : { top: box.top }) }}
          className="z-[70] max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {filtered.length === 0 && !showCreate && <div className="px-3 py-2 hint">No match found</div>}
          {filtered.map((o, i) => (
            <React.Fragment key={o.id}>
              {o.section && (i === 0 || filtered[i - 1].section !== o.section) && (
                <div className="px-3 pt-2 pb-0.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{o.section}</div>
              )}
              <button
                type="button" tabIndex={-1} data-active={i === active}
                onClick={() => pick(o.id)} onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-3 cursor-pointer ${i === active ? 'bg-brand-50' : ''}`}
              >
                <span className="truncate">{o.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {o.hint && <span className="hint tabular-nums">{o.hint}</span>}
                  {o.id === value && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </span>
              </button>
            </React.Fragment>
          ))}
          {showCreate && (
            <button
              type="button" tabIndex={-1} data-active={active === filtered.length}
              onClick={() => { const text = query.trim(); setOpen(false); setQuery(''); onCreate!(text); }}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-1.5 font-semibold text-brand-700 border-t border-slate-100 cursor-pointer ${active === filtered.length ? 'bg-brand-50' : ''}`}
            >
              <Plus className="w-3.5 h-3.5" /> {createLabel} "{query.trim()}"
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export const SearchBox: React.FC<{ value: string; onChange: (s: string) => void; placeholder?: string; autoFocus?: boolean }> = ({ value, onChange, placeholder = 'Search', autoFocus }) => (
  <div className="relative">
    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
    <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input pl-8" />
  </div>
);

// ---------------------------------------------------------------- modal, toast, confirm

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ title, onClose, children, footer, size = 'md' }) => {
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Only the top dialog closes.
      const all = document.querySelectorAll('[data-modal]');
      if (all[all.length - 1] !== panel.current) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  const panel = useRef<HTMLDivElement>(null);
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto no-print" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} data-modal role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-xl shadow-xl w-full ${width} mt-[6vh] mb-8`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h2 className="font-semibold text-[1.1429rem]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

interface ToastItem { id: number; text: string; tone: 'good' | 'bad' | 'warn' }
interface ConfirmArgs { title: string; body?: React.ReactNode; confirmLabel?: string; danger?: boolean }
interface Feedback {
  toast: (text: string, tone?: ToastItem['tone']) => void;
  confirm: (args: ConfirmArgs) => Promise<boolean>;
}
const FeedbackContext = createContext<Feedback | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmArgs & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const value = useMemo<Feedback>(() => ({
    toast: (text, tone = 'good') => {
      const id = ++seq.current;
      setToasts(t => [...t.slice(-2), { id, text, tone }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'good' ? 2600 : 6000);
    },
    confirm: args => new Promise(resolve => setDialog({ ...args, resolve })),
  }), []);

  const close = (answer: boolean) => { dialog?.resolve(answer); setDialog(null); };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center no-print" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg font-medium max-w-xl ${t.tone === 'good' ? 'bg-slate-900 text-white' : t.tone === 'warn' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-rose-600 text-white'}`}>{t.text}</div>
        ))}
      </div>
      {dialog && (
        <Modal
          title={dialog.title} size="sm" onClose={() => close(false)}
          footer={<>
            <button className="btn" onClick={() => close(false)}>Cancel</button>
            <button autoFocus className={`btn ${dialog.danger ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}`} onClick={() => close(true)}>{dialog.confirmLabel ?? 'Yes'}</button>
          </>}
        >
          <div className="text-slate-600">{dialog.body}</div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
};
