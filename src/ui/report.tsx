// The wrapper every report shares: title, period, print, Excel export, and keyboard drill-down.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Download, Pencil, Printer } from 'lucide-react';
import type { Destination } from './nav';
import type { Node } from '../core/engine';
import { fmt, fmtBlank, fmtDate, exportTablesToCsv } from '../core/format';
import { useBooks } from '../store/BooksContext';
import { useShell } from './Shell';
import { Page, SearchBox } from './kit';

/** Opens an entry so its amounts, accounts, date or note can be corrected. */
export const EditEntryButton: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  return (
    <button className="btn btn-sm no-print" title="Edit this entry" onClick={e => { e.stopPropagation(); navigate(`/voucher/${id}`); }}>
      <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit
    </button>
  );
};

interface ReportProps {
  title: string;
  hint?: React.ReactNode;
  /** 'range' shows from-to, 'asOf' shows the end date only, 'none' hides the period button. */
  period?: 'range' | 'asOf' | 'none';
  actions?: React.ReactNode;
  wide?: boolean;
  noExport?: boolean;
  children: React.ReactNode;
}

export const Report: React.FC<ReportProps> = ({ title, hint, period = 'range', actions, wide, noExport, children }) => {
  const { company } = useBooks();
  const { openPeriod } = useShell();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(-1);

  const periodText = period === 'range'
    ? `${fmtDate(company.periodFrom)} to ${fmtDate(company.periodTo)}`
    : period === 'asOf' ? `As at ${fmtDate(company.periodTo)}` : '';

  // Up and Down walk the rows; Enter opens the highlighted one, as in Tally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-modal]')) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      const rows = [...(root.current?.querySelectorAll<HTMLElement>('tr[data-href]') ?? [])];
      if (!rows.length) return;
      if (e.key === 'Enter') {
        const row = rows[activeIndex.current];
        if (row && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); navigate(row.dataset.href!); }
        return;
      }
      e.preventDefault();
      rows[activeIndex.current]?.classList.remove('kbd-active');
      activeIndex.current = Math.max(0, Math.min(rows.length - 1, activeIndex.current + (e.key === 'ArrowDown' ? 1 : -1)));
      rows[activeIndex.current].classList.add('kbd-active');
      rows[activeIndex.current].scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a,button,input,select,label')) return;
    const row = target.closest<HTMLElement>('tr[data-href]');
    if (row) navigate(row.dataset.href!);
  };

  return (
    <Page wide={wide}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="print-only font-bold text-[1.1rem]">{company.name}</div>
          <h1 className="text-xl font-bold">{title}</h1>
          {hint && <p className="hint mt-0.5 max-w-2xl no-print">{hint}</p>}
          {periodText && <div className="print-only">{periodText}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {actions}
          {period !== 'none' && (
            <button className="btn" onClick={openPeriod} title="Change period (F2)"><CalendarDays className="w-4 h-4 text-slate-500" /> {periodText}</button>
          )}
          <button className="btn" onClick={() => window.print()} title="Print or save as PDF (Ctrl+P)"><Printer className="w-4 h-4 text-slate-500" /> Print</button>
          {!noExport && (
            <button
              className="btn" title="Save for Excel"
              onClick={() => root.current && exportTablesToCsv(root.current, `${title.replace(/[^\w]+/g, '_')}_${company.periodTo}.csv`, [company.name, title, periodText])}
            ><Download className="w-4 h-4 text-slate-500" /> Excel</button>
          )}
        </div>
      </div>
      <div ref={root} onClick={onClick}>{children}</div>
    </Page>
  );
};

/** Rows for a statement tree. Collapsed shows top-level groups; detailed shows every ledger, indented. */
export const NodeRows: React.FC<{
  nodes: Node[];
  detailed: boolean;
  hrefFor: (n: Node) => string | undefined;
  depth?: number;
}> = ({ nodes, detailed, hrefFor, depth = 0 }) => (
  <>
    {nodes.map(n => (
      <React.Fragment key={`${depth}-${n.id}`}>
        <tr data-href={hrefFor(n)} className={depth === 0 ? 'sub' : ''}>
          <td style={{ paddingLeft: `${0.75 + depth * 1.1}rem` }}>{n.name}</td>
          <td className="num">{fmt(n.amount)}</td>
        </tr>
        {detailed && n.children.length > 0 && <NodeRows nodes={n.children} detailed hrefFor={hrefFor} depth={depth + 1} />}
      </React.Fragment>
    ))}
  </>
);

export const nodeHref = (n: Node): string | undefined => {
  if (n.kind === 'group') return `/reports/group/${n.id}`;
  if (n.kind === 'ledger') return `/reports/ledger/${n.id}`;
  if (n.id === 'closing_stock' || n.id === 'opening_stock') return '/inventory/summary';
  if (n.id === 'led_pnl' || n.id === 'pnl_current') return '/reports/pnl';
  return undefined;
};

export const DetailToggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button className="btn" aria-pressed={value} onClick={() => onChange(!value)}>{value ? 'Show summary' : 'Show details'}</button>
);

/** A page of cards pointing to screens, used for Reports, Accounts, Inventory and so on. */
export const Hub: React.FC<{ title: string; hint?: string; sections: { title: string; items: Destination[]; extra?: React.ReactNode }[]; actions?: React.ReactNode }> = ({ title, hint, sections, actions }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const match = (d: Destination) => words.every(w => `${d.label} ${d.plain} ${d.keywords ?? ''}`.toLowerCase().includes(w));
    return sections.map(s => ({ ...s, items: s.items.filter(match) })).filter(s => s.items.length > 0 || (!q && s.extra));
  }, [q, sections]);
  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {hint && <p className="hint mt-0.5 max-w-2xl">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div className="w-56"><SearchBox value={q} onChange={setQ} placeholder="Filter this page" /></div>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {visible.map(s => (
          <section key={s.title}>
            <h2 className="font-semibold text-slate-500 mb-2">{s.title}</h2>
            {s.extra}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {s.items.map(d => (
                <button key={d.to} onClick={() => navigate(d.to)} className="card text-left p-3.5 hover:border-brand-600 transition-colors cursor-pointer">
                  <div className="font-semibold text-slate-900">{d.label}</div>
                  <div className="hint mt-0.5">{d.plain}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {visible.length === 0 && <p className="hint">Nothing on this page matches that. Try Alt+G to search everywhere.</p>}
      </div>
    </Page>
  );
};

export { fmtBlank };
