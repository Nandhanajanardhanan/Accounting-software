// The frame around every screen: top bar, sidebar, key bar, Go To search, period dialog and global shortcuts.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Banknote, BarChart3, LogOut, BookOpen, Boxes, Briefcase, Building2, CalendarDays, Check, CircleAlert, FileText, FolderKanban, Landmark, Layers, LayoutDashboard, Menu, NotebookPen, PiggyBank, Plus, Receipt, Search, Settings, Users, UserRound, Wallet,
} from 'lucide-react';
import type { VoucherBase } from '../core/types';
import { CASH_LEDGER_ID, VOUCHER_META, VOUCHER_ORDER } from '../core/defaults';
import { dayBefore, fyStartOf } from '../core/engine';
import { fmtDate } from '../core/format';
import { type SaveState, useBooks } from '../store/BooksContext';
import { authApi } from '../store/api';
import { DESTINATIONS, newVoucher } from './nav';
import { Field, Input, Modal, Notice, useFeedback } from './kit';

// ---------------------------------------------------------------- unsaved work guard

/** True while a voucher or master form has changes that are not saved. */
export const unsaved = { current: false };

export function useGuardedNavigate() {
  const navigate = useNavigate();
  const { confirm } = useFeedback();
  return useCallback(async (to: string | number) => {
    if (unsaved.current) {
      const leave = await confirm({ title: 'Leave without saving?', body: 'Your entry on this screen has not been saved.', confirmLabel: 'Leave', danger: true });
      if (!leave) return;
      unsaved.current = false;
    }
    if (typeof to === 'number') navigate(to);
    else navigate(to);
  }, [navigate, confirm]);
}

/** Marks the form as changed once its state differs from how it started. */
export function useTrackUnsaved(state: unknown) {
  const serial = JSON.stringify(state);
  const initial = useRef(serial);
  useEffect(() => { unsaved.current = serial !== initial.current; }, [serial]);
  useEffect(() => () => { unsaved.current = false; }, []);
}

// ---------------------------------------------------------------- shell context

interface ShellApi { openPeriod: () => void; openGoTo: () => void }
const ShellContext = createContext<ShellApi>({ openPeriod: () => {}, openGoTo: () => {} });
export const useShell = () => useContext(ShellContext);

// Keys a browser lets a page use. Alt+F4, Ctrl+F4 and Ctrl+W always go to the browser itself.
const VOUCHER_KEYS: Record<string, VoucherBase> = {
  F4: 'CONTRA', F5: 'PAYMENT', F6: 'RECEIPT', F7: 'JOURNAL', F8: 'SALES', F9: 'PURCHASE',
  'Ctrl+F8': 'CREDIT_NOTE', 'Ctrl+F9': 'DEBIT_NOTE', 'Ctrl+F10': 'MEMORANDUM',
  'Alt+F5': 'SALES_ORDER', 'Alt+F6': 'REJECTION_OUT', 'Ctrl+F6': 'REJECTION_IN',
  'Alt+F7': 'STOCK_JOURNAL', 'Ctrl+F7': 'PHYSICAL_STOCK', 'Alt+F8': 'DELIVERY_NOTE', 'Alt+F9': 'RECEIPT_NOTE',
};

const comboOf = (e: KeyboardEvent) => `${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { company, features, storageError, saveState } = useBooks();
  const location = useLocation();
  const go = useGuardedNavigate();
  const [goToOpen, setGoToOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => { setNavOpen(false); mainRef.current?.scrollTo(0, 0); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-modal]')) return;
      const combo = comboOf(e);
      const base = VOUCHER_KEYS[combo];
      if (base) {
        e.preventDefault();
        const feature = VOUCHER_META[base].feature;
        if (!feature || features[feature]) void go(newVoucher(base));
        return;
      }
      switch (combo) {
        case 'F2': e.preventDefault(); setPeriodOpen(true); return;
        case 'F3': e.preventDefault(); void go('/company'); return;
        case 'F10': e.preventDefault(); void go('/new'); return;
        case 'F11': e.preventDefault(); void go('/settings/features'); return;
        case 'F12': e.preventDefault(); void go('/settings/configure'); return;
        case 'Alt+g': case 'Alt+G': case 'Ctrl+g': case 'Ctrl+G': e.preventDefault(); setGoToOpen(true); return;
        case 'Alt+s': case 'Alt+S': e.preventDefault(); void go('/savings'); return;
        case 'Alt+p': case 'Alt+P': e.preventDefault(); void go('/reports/pnl'); return;
        case 'Alt+b': case 'Alt+B': e.preventDefault(); void go('/reports/balance-sheet'); return;
        case 'Escape': {
          if (e.defaultPrevented || location.pathname === '/') return;
          e.preventDefault();
          const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
          void go(idx > 0 ? -1 : '/');
          return;
        }
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, features, location.pathname]);

  const api = useMemo(() => ({ openPeriod: () => setPeriodOpen(true), openGoTo: () => setGoToOpen(true) }), []);

  return (
    <ShellContext.Provider value={api}>
      <div className="h-screen flex flex-col print-root">
        <header className="no-print bg-brand-800 text-white flex items-center gap-2 md:gap-3 px-3 h-12 shrink-0">
          <button className="md:hidden p-1 cursor-pointer" onClick={() => setNavOpen(o => !o)} aria-label="Menu"><Menu className="w-5 h-5" /></button>
          <button onClick={() => void go('/company')} className="flex items-center gap-2 min-w-0 hover:bg-white/10 rounded-lg px-2 py-1 cursor-pointer" title="Change business (F3)">
            <Building2 className="w-4 h-4 shrink-0 opacity-80" />
            <span className="font-semibold truncate max-w-[34vw]">{company.name}</span>
          </button>
          <button onClick={() => setPeriodOpen(true)} className="hidden sm:flex items-center gap-1.5 text-white/85 hover:bg-white/10 rounded-lg px-2 py-1 cursor-pointer" title="Change period or date (F2)">
            <CalendarDays className="w-4 h-4 opacity-80" />
            <span className="tabular-nums">{fmtDate(company.periodFrom)} to {fmtDate(company.periodTo)}</span>
          </button>
          <div className="flex-1" />
          <SaveIndicator state={saveState} />
          <LogoutButton />
          <button onClick={() => setGoToOpen(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 md:w-72 text-white/85 cursor-pointer" title="Go To (Alt+G)">
            <Search className="w-4 h-4" />
            <span className="hidden md:inline flex-1 text-left whitespace-nowrap">Find a screen or account</span>
            <span className="hidden md:inline text-xs opacity-70">Alt+G</span>
          </button>
        </header>

        <div className="flex flex-1 min-h-0 print-root">
          <Sidebar open={navOpen} />
          <main ref={mainRef} className="flex-1 min-w-0 overflow-auto print-root">
            {storageError && <Notice tone="bad" className="m-4 no-print">{storageError}</Notice>}
            {children}
          </main>
        </div>

        <KeyBar onPeriod={() => setPeriodOpen(true)} onGoTo={() => setGoToOpen(true)} />
      </div>
      {goToOpen && <GoToPalette onClose={() => setGoToOpen(false)} />}
      {periodOpen && <PeriodDialog onClose={() => setPeriodOpen(false)} />}
    </ShellContext.Provider>
  );
};

// ---------------------------------------------------------------- sidebar

const Sidebar: React.FC<{ open: boolean }> = ({ open }) => {
  const { features } = useBooks();
  const { pathname } = useLocation();
  const go = useGuardedNavigate();
  const match = (...prefixes: string[]) => (p: string) => prefixes.some(x => p === x || p.startsWith(`${x}/`));
  const sections: { title?: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string) => boolean }[] }[] = [
    { items: [{ to: '/', label: 'Home', icon: LayoutDashboard, match: p => p === '/' }] },
    {
      title: 'Your work',
      items: [
        { to: '/invoices', label: 'Invoices', icon: FileText, match: match('/invoices') },
        { to: '/clients', label: 'Clients', icon: UserRound, match: match('/clients') },
        ...(features.costCentres ? [{ to: '/projects', label: 'Projects', icon: FolderKanban, match: match('/projects') }] : []),
        { to: '/expenses', label: 'Expenses', icon: Receipt, match: match('/expenses') },
        { to: '/bills', label: 'Purchases', icon: Briefcase, match: match('/bills', '/vendors') },
      ],
    },
    {
      title: 'Books',
      items: [
        { to: '/daybook', label: 'Day Book', icon: BookOpen, match: p => p === '/daybook' || (p.startsWith('/voucher') && p !== '/voucher/new/JOURNAL') || p === '/new' },
        { to: '/voucher/new/JOURNAL', label: 'Journal', icon: NotebookPen, match: p => p === '/voucher/new/JOURNAL' || p === '/reports/register/JOURNAL' },
        { to: `/reports/ledger/${CASH_LEDGER_ID}`, label: 'Cash Book', icon: Banknote, match: p => p === `/reports/ledger/${CASH_LEDGER_ID}` },
        { to: '/banking', label: 'Banking', icon: Landmark, match: match('/banking') },
        { to: '/reports', label: 'Reports', icon: BarChart3, match: p => match('/reports')(p) && p !== `/reports/ledger/${CASH_LEDGER_ID}` && p !== '/reports/register/JOURNAL' },
        ...(features.vat || features.tds || features.tcs ? [{ to: '/vat', label: 'VAT & Tax', icon: Wallet, match: match('/vat', '/tax') }] : []),
        ...(features.inventory ? [{ to: '/inventory', label: 'Inventory', icon: Boxes, match: (p: string) => p.startsWith('/inventory') || /^\/masters\/(stock|units|godowns)/.test(p) }] : []),
        ...(features.payroll ? [{ to: '/payroll', label: 'Payroll', icon: Users, match: (p: string) => p.startsWith('/payroll') || /^\/masters\/(employee|pay-heads|attendance)/.test(p) }] : []),
      ],
    },
    {
      title: 'Set up',
      items: [
        { to: '/masters', label: 'Accounts', icon: Layers, match: (p: string) => p === '/masters' || /^\/masters\/(ledgers|groups|voucher-types|currencies|cost|budgets|scenarios)/.test(p) },
        { to: '/savings', label: 'Savings Planner', icon: PiggyBank, match: match('/savings') },
        { to: '/tools', label: 'Business & Tools', icon: Settings, match: (p: string) => p.startsWith('/tools') || p.startsWith('/settings') || p === '/company' },
      ],
    },
  ];
  return (
    <nav className={`no-print ${open ? 'flex' : 'hidden'} md:flex flex-col w-52 shrink-0 bg-white border-r border-slate-200 overflow-y-auto absolute md:static z-40 h-[calc(100vh-5rem)] md:h-auto`} aria-label="Main">
      <div className="p-3">
        <button onClick={() => void go('/new')} className="btn btn-primary w-full"><Plus className="w-4 h-4" /> New Entry</button>
      </div>
      <div className="px-2 pb-3 flex flex-col gap-0.5">
        {sections.map((section, i) => (
          <React.Fragment key={section.title ?? i}>
            {section.title && <div className="px-3 pt-3 pb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{section.title}</div>}
            {section.items.map(it => {
              const active = it.match(pathname);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to} to={it.to} aria-current={active ? 'page' : undefined}
                  onClick={e => { if (unsaved.current) { e.preventDefault(); void go(it.to); } }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 font-medium ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" /> {it.label}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

// ---------------------------------------------------------------- save status

const SaveIndicator: React.FC<{ state: SaveState }> = ({ state }) => {
  if (state === 'error' || state === 'browser-only') {
    return <span className="hidden sm:flex items-center gap-1.5 text-amber-200 font-medium" title="Your latest entries are being held in this browser"><CircleAlert className="w-4 h-4" /> {state === 'error' ? 'Not saved to file' : 'Browser only'}</span>;
  }
  return <span className="hidden sm:flex items-center gap-1 text-white/70" title="Saved to the data file on this computer"><Check className="w-3.5 h-3.5" /> {state === 'saving' ? 'Saving' : 'Saved'}</span>;
};

// ---------------------------------------------------------------- key bar

const KeyBar: React.FC<{ onPeriod: () => void; onGoTo: () => void }> = ({ onPeriod, onGoTo }) => {
  const go = useGuardedNavigate();
  const vouchers: [string, VoucherBase][] = [['F4', 'CONTRA'], ['F5', 'PAYMENT'], ['F6', 'RECEIPT'], ['F7', 'JOURNAL'], ['F8', 'SALES'], ['F9', 'PURCHASE']];
  const Key: React.FC<{ k: string; label: string; onClick: () => void }> = ({ k, label, onClick }) => (
    <button onClick={onClick} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer whitespace-nowrap">
      <span className="kbd">{k}</span> <span className="text-slate-600">{label}</span>
    </button>
  );
  return (
    <footer className="no-print hidden sm:flex items-center gap-0.5 h-8 shrink-0 bg-white border-t border-slate-200 px-2 text-[0.8571rem] overflow-x-auto">
      <Key k="F2" label="Period" onClick={onPeriod} />
      {vouchers.map(([k, base]) => <Key key={k} k={k} label={VOUCHER_META[base].label} onClick={() => void go(newVoucher(base))} />)}
      <Key k="F10" label="Other" onClick={() => void go('/new')} />
      <Key k="F11" label="Features" onClick={() => void go('/settings/features')} />
      <div className="flex-1" />
      <Key k="Alt+G" label="Go To" onClick={onGoTo} />
      <Key k="Esc" label="Back" onClick={() => void go(-1)} />
    </footer>
  );
};

// ---------------------------------------------------------------- Go To

const GoToPalette: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, features } = useBooks();
  const go = useGuardedNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => {
    const out: { label: string; to: string; section: string; words: string }[] = [];
    for (const base of VOUCHER_ORDER) {
      const m = VOUCHER_META[base];
      if (m.feature && !features[m.feature]) continue;
      out.push({ label: `New ${m.label}`, to: newVoucher(base), section: 'Enter', words: `create voucher entry ${m.plain}` });
    }
    for (const d of DESTINATIONS) {
      if (d.feature && !features[d.feature]) continue;
      out.push({ label: d.label, to: d.to, section: d.section, words: `${d.keywords ?? ''} ${d.plain}` });
    }
    for (const l of data.ledgers) out.push({ label: l.name, to: `/reports/ledger/${l.id}`, section: 'Ledger', words: l.alias ?? '' });
    for (const i of data.stockItems) out.push({ label: i.name, to: `/inventory/item/${i.id}`, section: 'Stock Item', words: i.alias ?? '' });
    return out;
  }, [data.ledgers, data.stockItems, features]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.filter(e => ['Your work', 'Daily', 'Financial Statements', 'Outstandings'].includes(e.section)).slice(0, 14);
    const words = q.split(/\s+/);
    const scored = entries
      .map(e => {
        const label = e.label.toLowerCase();
        if (!words.every(w => label.includes(w) || e.words.toLowerCase().includes(w))) return null;
        return { e, score: label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2 };
      })
      .filter(Boolean) as { e: (typeof entries)[number]; score: number }[];
    return scored.sort((a, b) => a.score - b.score).slice(0, 40).map(s => s.e);
  }, [entries, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (to: string) => { onClose(); void go(to); };

  return (
    <Modal title="Go To" onClose={onClose}>
      <input
        autoFocus className="input" placeholder="Type a screen, account or item name" value={query} aria-label="Search"
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && results[active]) pick(results[active].to);
        }}
      />
      <div ref={listRef} className="mt-2 max-h-[50vh] overflow-y-auto -mx-2">
        {results.length === 0 && <p className="hint p-3">Nothing matches that. Try another word.</p>}
        {results.map((r, i) => (
          <button
            key={`${r.to}-${i}`} data-active={i === active}
            onClick={() => pick(r.to)} onMouseEnter={() => setActive(i)}
            className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 cursor-pointer ${i === active ? 'bg-brand-50' : ''}`}
          >
            <span className="font-medium truncate">{r.label}</span>
            <span className="hint shrink-0">{r.section}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------- period and date

const PeriodDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, company, setPeriod, setCurrentDate } = useBooks();
  const [from, setFrom] = useState(company.periodFrom);
  const [to, setTo] = useState(company.periodTo);
  const [date, setDate] = useState(company.currentDate);

  const today = company.currentDate;
  const fy = fyStartOf(data, today);
  const nextFy = `${Number(fy.slice(0, 4)) + 1}${fy.slice(4)}`;
  const prevFy = `${Number(fy.slice(0, 4)) - 1}${fy.slice(4)}`;
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = (start: string) => {
    const [y, m] = start.split('-').map(Number);
    return dayBefore(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10));
  };
  const lastMonthEnd = dayBefore(monthStart);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
  const quick: { label: string; from: string; to: string }[] = [
    { label: 'This year', from: fy, to: dayBefore(nextFy) },
    { label: 'Last year', from: prevFy, to: dayBefore(fy) },
    { label: 'This month', from: monthStart, to: monthEnd(monthStart) },
    { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
    { label: 'Up to today', from: fy, to: today },
  ];

  const invalid = from > to;
  const apply = () => {
    if (invalid) return;
    setPeriod(from, to);
    if (date !== company.currentDate) setCurrentDate(date);
    onClose();
  };

  return (
    <Modal
      title="Period and date" size="sm" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={invalid} onClick={apply}>Apply</button>
      </>}
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quick.map(q => (
          <button key={q.label} className={`btn btn-sm ${from === q.from && to === q.to ? 'border-brand-600 text-brand-700 bg-brand-50' : ''}`} onClick={() => { setFrom(q.from); setTo(q.to); }}>{q.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Reports from"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="Reports to"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
      </div>
      {invalid && <p className="text-rose-700 mt-2">The start date must be on or before the end date.</p>}
      <Field label="Current date" className="mt-3" hint="New entries start on this date. Post-dated entries join your books once this date reaches them.">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </Field>
    </Modal>
  );
};


/** Shown only when the books are behind a login. */
const LogoutButton: React.FC = () => {
  const [user, setUser] = React.useState<string | null>(null);
  React.useEffect(() => { authApi.me().then(me => setUser(me.required ? me.user : null)).catch(() => setUser(null)); }, []);
  if (!user) return null;
  const out = async () => {
    await authApi.logout().catch(() => {});
    window.location.reload();
  };
  return (
    <button onClick={() => void out()} className="flex items-center gap-1.5 text-white/85 hover:bg-white/10 rounded-lg px-2 py-1 cursor-pointer" title={`Signed in as ${user}`}>
      <LogOut className="w-4 h-4 opacity-80" /><span className="hidden sm:inline">Log out</span>
    </button>
  );
};
