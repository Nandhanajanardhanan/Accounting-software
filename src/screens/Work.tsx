// The freelancer's everyday screens: clients, vendors, projects, invoices, bills and expenses.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import type { CostCentre, Ledger, Voucher } from '../core/types';
import { CASH_LEDGER_ID, G, VOUCHER_META } from '../core/defaults';
import {
  billsOf, budgetActual, costCentreReport, expenseSummary, invoiceRows, type InvoiceRow, type InvoiceStatus, isInGroup, ledgerName, ledgerOf, nextVoucherNumber, partyRows, postings, projectRows, voucherAmount, voucherParticulars,
} from '../core/engine';
import { fmt, fmtBlank, fmtDate, fmtMonthShort, money, moneyWhole } from '../core/format';
import { newId, useBooks } from '../store/BooksContext';
import { Card, Combo, Empty, Field, Input, Modal, Notice, NumberInput, Page, PageHeader, Pill, SearchBox, Select, Stat, Tabs, useEnterToNext, useFeedback } from '../ui/kit';
import { BarList, CHART_BLUE, CHART_ORANGE, ColumnChart } from '../ui/charts';
import { newVoucher } from '../ui/nav';
import { EditEntryButton, Report } from '../ui/report';
import { LedgerDialog } from './masters/LedgerForm';
import { LedgerCombo, onlyCashOrBank, ProjectCombo } from './vouchers/parts';

// ---------------------------------------------------------------- invoices and bills

const STATUS: Record<InvoiceStatus, { label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'gray' }> = {
  PAID: { label: 'Paid', tone: 'green' },
  PART_PAID: { label: 'Part paid', tone: 'blue' },
  UNPAID: { label: 'Not paid yet', tone: 'gray' },
  OVERDUE: { label: 'Overdue', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
  NOT_IN_BOOKS: { label: 'Not in books', tone: 'amber' },
};

export const StatusPill: React.FC<{ row: InvoiceRow }> = ({ row }) => (
  <Pill tone={STATUS[row.status].tone}>{STATUS[row.status].label}{row.status === 'OVERDUE' ? ` ${row.daysLate}d` : ''}</Pill>
);

type InvoiceFilter = 'ALL' | 'OPEN' | 'OVERDUE' | 'PAID';

export const InvoicesPage: React.FC<{ base: 'SALES' | 'PURCHASE' }> = ({ base }) => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const isSale = base === 'SALES';
  const rows = useMemo(() => invoiceRows(data, base, company.periodFrom, company.periodTo), [data, base, company.periodFrom, company.periodTo]);
  const [filter, setFilter] = useState<InvoiceFilter>('ALL');
  const [q, setQ] = useState('');
  const visible = rows.filter(r => {
    if (filter === 'OPEN' && !['UNPAID', 'PART_PAID', 'OVERDUE'].includes(r.status)) return false;
    if (filter === 'OVERDUE' && r.status !== 'OVERDUE') return false;
    if (filter === 'PAID' && r.status !== 'PAID') return false;
    const s = `${r.voucher.number} ${r.partyName} ${r.projectName ?? ''} ${r.voucher.reference ?? ''}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });
  const live = rows.filter(r => r.status !== 'CANCELLED' && r.status !== 'NOT_IN_BOOKS');
  const billed = live.reduce((s, r) => s + r.total, 0);
  const open = live.reduce((s, r) => s + r.balance, 0);
  const overdue = live.filter(r => r.status === 'OVERDUE').reduce((s, r) => s + r.balance, 0);
  const sym = company.currencySymbol;
  const noun = isSale ? 'invoice' : 'purchase';

  const settle = (e: React.MouseEvent, r: InvoiceRow) => {
    e.stopPropagation();
    const newRef = r.voucher.lines.find(l => l.ledgerId === r.partyId)?.bills?.find(b => b.type === 'NEW')?.ref ?? '';
    const q2 = new URLSearchParams({ party: r.partyId, amount: String(r.balance), ref: newRef });
    navigate(`${newVoucher(isSale ? 'RECEIPT' : 'PAYMENT')}?${q2}`);
  };

  return (
    <Report
      title={isSale ? 'Invoices' : 'Purchases'}
      hint={isSale ? 'Everything you have billed your clients, and what they still owe.' : 'Everything vendors have billed you, and what you still owe.'}
      actions={<button className="btn btn-primary" onClick={() => navigate(newVoucher(base))}><Plus className="w-4 h-4" /> New {noun}</button>}
    >
      <div className="grid sm:grid-cols-3 gap-3 mb-4 no-print">
        <Stat label={`Total ${isSale ? 'billed' : 'purchases'}`} value={moneyWhole(sym, billed)} sub={`${live.length} ${noun}${live.length === 1 ? '' : 's'}`} />
        <Stat label={isSale ? 'Still to collect' : 'Still to pay'} value={moneyWhole(sym, open)} />
        <Stat label="Overdue" value={moneyWhole(sym, overdue)} tone={overdue > 0 ? 'bad' : 'plain'} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Tabs<InvoiceFilter> value={filter} onChange={setFilter} tabs={[{ id: 'ALL', label: 'All' }, { id: 'OPEN', label: 'Not fully paid' }, { id: 'OVERDUE', label: 'Overdue' }, { id: 'PAID', label: 'Paid' }]} />
        <div className="w-64 mb-4"><SearchBox value={q} onChange={setQ} placeholder={`Search ${noun}s`} /></div>
      </div>
      <Card flush>
        {visible.length === 0
          ? <Empty title={rows.length ? `No ${noun}s match this view` : `No ${noun}s yet in this period`} action={<button className="btn btn-primary" onClick={() => navigate(newVoucher(base))}>Create your first {noun}</button>} />
          : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Number</th><th>Date</th><th>{isSale ? 'Client' : 'Vendor'}</th><th>Project</th><th>Due</th><th>Status</th>
                    <th className="num">Total</th><th className="num">{isSale ? 'Received' : 'Paid'}</th><th className="num">Balance</th><th className="no-print" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.voucher.id} data-href={`/voucher/${r.voucher.id}`} className={r.status === 'CANCELLED' ? 'muted' : ''}>
                      <td className="font-medium whitespace-nowrap">{r.voucher.number}{r.voucher.reference && !isSale ? <div className="hint">{r.voucher.reference}</div> : null}</td>
                      <td className="whitespace-nowrap">{fmtDate(r.voucher.date)}</td>
                      <td>{r.partyName}</td>
                      <td>{r.projectName}</td>
                      <td className="whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                      <td><StatusPill row={r} /></td>
                      <td className="num">{fmt(r.total)}</td>
                      <td className="num">{fmtBlank(r.received)}</td>
                      <td className="num font-semibold">{fmtBlank(r.balance)}</td>
                      <td className="text-right whitespace-nowrap no-print">
                        {r.balance > 0.005 && r.status !== 'CANCELLED' && <button className="btn btn-sm" onClick={e => settle(e, r)}>{isSale ? 'Receive' : 'Pay'}</button>}{' '}
                        <EditEntryButton id={r.voucher.id} />{' '}
                        <button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate(`/voucher/${r.voucher.id}/print`); }}>Print</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- clients and vendors

export const PartiesPage: React.FC<{ kind: 'client' | 'vendor' }> = ({ kind }) => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const groupId = kind === 'client' ? G.debtors : G.creditors;
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => partyRows(data, groupId, company.periodFrom, company.periodTo).sort((a, b) => b.balance - a.balance || a.ledger.name.localeCompare(b.ledger.name)), [data, groupId, company.periodFrom, company.periodTo]);
  const visible = rows.filter(r => `${r.ledger.name} ${r.ledger.contactPerson ?? ''} ${r.ledger.email ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const isClient = kind === 'client';
  return (
    <Report
      title={isClient ? 'Clients' : 'Vendors'}
      hint={isClient ? 'Who you work for, what you have billed them, and what they owe you.' : 'Who you buy from or subcontract to, and what you owe them.'}
      actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New {kind}</button>}
    >
      <div className="w-72 mb-3 no-print"><SearchBox value={q} onChange={setQ} placeholder={`Search ${kind}s`} /></div>
      <Card flush>
        {rows.length === 0
          ? <Empty title={`No ${kind}s yet`} hint={`Add a ${kind} to start ${isClient ? 'invoicing' : 'recording bills'}.`} action={<button className="btn btn-primary" onClick={() => setCreating(true)}>Add your first {kind}</button>} />
          : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th><th>Contact</th><th className="num">{isClient ? 'Invoices' : 'Purchases'}</th>
                    <th className="num">{isClient ? 'Billed' : 'Billed to you'}</th><th className="num">{isClient ? 'Received' : 'Paid'}</th>
                    <th className="num">{isClient ? 'Owes you' : 'You owe'}</th><th className="num">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.ledger.id} data-href={`/${kind}s/${r.ledger.id}`}>
                      <td className="font-medium">{r.ledger.name}</td>
                      <td>{r.ledger.contactPerson}{r.ledger.email ? <div className="hint">{r.ledger.email}</div> : null}</td>
                      <td className="num">{r.invoices || ''}</td>
                      <td className="num">{fmtBlank(r.billed)}</td>
                      <td className="num">{fmtBlank(r.settled)}</td>
                      <td className="num font-semibold">{fmtBlank(r.balance)}</td>
                      <td className={`num ${r.overdue > 0 ? 'text-rose-700 font-semibold' : ''}`}>{fmtBlank(r.overdue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total</td>
                    <td className="num">{fmt(visible.reduce((s, r) => s + r.billed, 0))}</td>
                    <td className="num">{fmt(visible.reduce((s, r) => s + r.settled, 0))}</td>
                    <td className="num">{fmt(visible.reduce((s, r) => s + r.balance, 0))}</td>
                    <td className="num">{fmt(visible.reduce((s, r) => s + r.overdue, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
      </Card>
      {creating && <LedgerDialog defaultGroupId={groupId} onSaved={l => navigate(`/${kind}s/${l.id}`)} onClose={() => setCreating(false)} />}
    </Report>
  );
};

export const PartyDetail: React.FC<{ kind: 'client' | 'vendor' }> = ({ kind }) => {
  const { id } = useParams();
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const ledger = id ? ledgerOf(data, id) : undefined;
  const isClient = kind === 'client';
  const row = useMemo(() => partyRows(data, isClient ? G.debtors : G.creditors, company.periodFrom, company.periodTo).find(r => r.ledger.id === id), [data, id, isClient, company.periodFrom, company.periodTo]);
  const invoices = useMemo(() => invoiceRows(data, isClient ? 'SALES' : 'PURCHASE', company.periodFrom, company.periodTo).filter(r => r.partyId === id), [data, id, isClient, company.periodFrom, company.periodTo]);
  const projects = data.costCentres.filter(c => c.clientId === id);
  const onAccount = useMemo(() => billsOf(data, company.periodTo).filter(b => b.ledgerId === id && b.isOnAccount), [data, id, company.periodTo]);
  if (!ledger || !row) return <Page><p className="hint">That {kind} no longer exists.</p></Page>;
  const sym = company.currencySymbol;
  const reminder = () => {
    const owed = invoices.filter(r => r.balance > 0.005);
    const lines = owed.map(r => `${r.voucher.number} dated ${fmtDate(r.voucher.date)}: ${money(sym, r.balance)}${r.dueDate ? `, due ${fmtDate(r.dueDate)}` : ''}`);
    const subject = `Payment reminder from ${company.name}`;
    const body = `Hello ${ledger.contactPerson ?? ledger.name},\n\nThis is a reminder that the following ${owed.length === 1 ? 'invoice is' : 'invoices are'} still open:\n\n${lines.join('\n')}\n\nThank you,\n${company.ownerName ?? company.name}`;
    return `mailto:${ledger.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  return (
    <Page>
      <PageHeader
        title={ledger.name}
        hint={[ledger.contactPerson, ledger.email, ledger.phone, ledger.state, ledger.trn && `TRN ${ledger.trn}`].filter(Boolean).join(' · ') || undefined}
        actions={<>
          <button className="btn" onClick={() => setEditing(true)}><Pencil className="w-4 h-4 text-slate-500" /> Edit</button>
          <button className="btn" onClick={() => navigate(`/reports/ledger/${ledger.id}`)}>Full statement</button>
          {isClient && row.balance > 0.005 && ledger.email && <a className="btn" href={reminder()}>Email a reminder</a>}
          <button className="btn" onClick={() => navigate(`${newVoucher(isClient ? 'RECEIPT' : 'PAYMENT')}?party=${ledger.id}`)}>{isClient ? 'Record a payment' : 'Pay'}</button>
          <button className="btn btn-primary" onClick={() => navigate(`${newVoucher(isClient ? 'SALES' : 'PURCHASE')}?party=${ledger.id}`)}><Plus className="w-4 h-4" /> New {isClient ? 'invoice' : 'purchase'}</button>
        </>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label={isClient ? 'Billed this period' : 'Billed to you'} value={moneyWhole(sym, row.billed)} />
        <Stat label={isClient ? 'Received' : 'Paid'} value={moneyWhole(sym, row.settled)} />
        <Stat label={isClient ? 'Owes you' : 'You owe'} value={moneyWhole(sym, row.balance)} />
        <Stat label="Overdue" value={moneyWhole(sym, row.overdue)} tone={row.overdue > 0 ? 'bad' : 'plain'} />
      </div>
      {onAccount.length > 0 && <Notice tone="warn" className="mb-4">{money(sym, Math.abs(onAccount.reduce((s, b) => s + b.pending, 0)))} is on account, not matched to any {isClient ? 'invoice' : 'bill'}. Open the entry to match it.</Notice>}
      <Card title={isClient ? 'Invoices' : 'Purchases'} flush className="mb-4">
        {invoices.length === 0 ? <Empty title="None in this period" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Number</th><th>Date</th><th>Project</th><th>Due</th><th>Status</th><th className="num">Total</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {invoices.map(r => (
                  <tr key={r.voucher.id} data-href={`/voucher/${r.voucher.id}`} onClick={() => navigate(`/voucher/${r.voucher.id}`)}>
                    <td className="font-medium">{r.voucher.number}</td><td>{fmtDate(r.voucher.date)}</td><td>{r.projectName}</td><td>{fmtDate(r.dueDate)}</td>
                    <td><StatusPill row={r} /></td><td className="num">{fmt(r.total)}</td><td className="num font-semibold">{fmtBlank(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {isClient && projects.length > 0 && (
        <Card title="Projects">
          <ul className="flex flex-col gap-1">
            {projects.map(p => <li key={p.id}><button className="text-brand-700 font-medium cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>{p.name}</button></li>)}
          </ul>
        </Card>
      )}
      {editing && <LedgerDialog initial={ledger} onSaved={() => {}} onClose={() => setEditing(false)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- projects

const PROJECT_STATUS: Record<NonNullable<CostCentre['status']>, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  ACTIVE: { label: 'Active', tone: 'green' }, ON_HOLD: { label: 'On hold', tone: 'amber' }, DONE: { label: 'Done', tone: 'gray' },
};

const ProjectDialog: React.FC<{ initial?: CostCentre; onClose: () => void; onSaved?: (id: string) => void }> = ({ initial, onClose, onSaved }) => {
  const { data, saveMaster } = useBooks();
  const [p, setP] = useState<CostCentre>(() => initial ?? { id: newId('prj'), name: '', status: 'ACTIVE', categoryId: data.costCategories[0]?.id });
  const [error, setError] = useState('');
  const set = (patch: Partial<CostCentre>) => setP(x => ({ ...x, ...patch }));
  const enter = useEnterToNext<HTMLDivElement>();
  const save = () => {
    const name = p.name.trim();
    if (!name) return setError('Give the project a name.');
    if (data.costCentres.some(c => c.id !== p.id && c.name.toLowerCase() === name.toLowerCase())) return setError(`You already have a project called ${name}.`);
    saveMaster('costCentres', { ...p, name });
    onSaved?.(p.id);
    onClose();
  };
  return (
    <Modal title={initial ? 'Change project' : 'New project'} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" data-accept onClick={save}>Save</button>
    </>}>
      <div ref={enter.ref} onKeyDown={enter.onKeyDown} className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <Field label="Project name"><Input autoFocus value={p.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Client">
          <LedgerCombo value={p.clientId ?? ''} onChange={clientId => set({ clientId })} filter={l => isInGroup(data, l.groupId, G.debtors)} newGroupId={G.debtors} ariaLabel="Client" placeholder="Who is it for?" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Agreed price" hint="Lets you see how much of it you have billed."><NumberInput value={p.quote} onValue={quote => set({ quote })} /></Field>
          <Field label="Status">
            <Select value={p.status ?? 'ACTIVE'} onChange={e => set({ status: e.target.value as CostCentre['status'] })}>
              <option value="ACTIVE">Active</option><option value="ON_HOLD">On hold</option><option value="DONE">Done</option>
            </Select>
          </Field>
          <Field label="Start date"><Input type="date" value={p.startDate ?? ''} onChange={e => set({ startDate: e.target.value })} /></Field>
          <Field label="End date"><Input type="date" value={p.endDate ?? ''} onChange={e => set({ endDate: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><Input value={p.notes ?? ''} onChange={e => set({ notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
};

export const ProjectsPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => projectRows(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const sum = (k: 'income' | 'expense' | 'profit') => rows.reduce((s, r) => s + r[k], 0);
  return (
    <Report
      title="Projects" hint="Tag invoices and expenses to a project to see the real profit on each. Tally calls these cost centres."
      actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New project</button>}
    >
      <Card flush>
        {rows.length === 0
          ? <Empty title="No projects yet" hint="Create one, then choose it when you raise an invoice or record an expense." action={<button className="btn btn-primary" onClick={() => setCreating(true)}>Create your first project</button>} />
          : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr><th>Project</th><th>Client</th><th>Status</th><th className="num">Agreed</th><th className="num">Billed</th><th className="num">Billed %</th><th className="num">Spent</th><th className="num">Profit</th><th className="num">Margin</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.project.id} data-href={`/projects/${r.project.id}`}>
                      <td className="font-medium">{r.project.name}</td>
                      <td>{r.clientName}</td>
                      <td><Pill tone={PROJECT_STATUS[r.project.status ?? 'ACTIVE'].tone}>{PROJECT_STATUS[r.project.status ?? 'ACTIVE'].label}</Pill></td>
                      <td className="num">{fmtBlank(r.project.quote ?? 0)}</td>
                      <td className="num">{fmtBlank(r.income)}</td>
                      <td className="num">{r.billedPct === null ? '' : `${r.billedPct.toFixed(0)}%`}</td>
                      <td className="num">{fmtBlank(r.expense)}</td>
                      <td className={`num font-semibold ${r.profit < 0 ? 'text-rose-700' : ''}`}>{fmt(r.profit)}</td>
                      <td className="num">{r.marginPct === null ? '' : `${r.marginPct.toFixed(0)}%`}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4}>Total</td><td className="num">{fmt(sum('income'))}</td><td /><td className="num">{fmt(sum('expense'))}</td><td className="num">{fmt(sum('profit'))}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          )}
      </Card>
      {creating && <ProjectDialog onClose={() => setCreating(false)} onSaved={id => navigate(`/projects/${id}`)} />}
    </Report>
  );
};

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const { data, company, deleteMaster } = useBooks();
  const navigate = useNavigate();
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const row = useMemo(() => projectRows(data, company.periodFrom, company.periodTo).find(r => r.project.id === id), [data, id, company.periodFrom, company.periodTo]);
  const report = useMemo(() => costCentreReport(data, company.periodFrom, company.periodTo).find(r => r.centreId === id), [data, id, company.periodFrom, company.periodTo]);
  const entries = useMemo(() => {
    const seen = new Map<string, { voucher: Voucher; income: number; expense: number }>();
    for (const p of postings(data)) {
      if (p.voucher.date < company.periodFrom || p.voucher.date > company.periodTo) continue;
      for (const c of p.line.costs ?? []) {
        if (c.centreId !== id) continue;
        if (!seen.has(p.voucher.id)) seen.set(p.voucher.id, { voucher: p.voucher, income: 0, expense: 0 });
        const e = seen.get(p.voucher.id)!;
        if (p.line.side === 'CR') e.income += c.amount; else e.expense += c.amount;
      }
    }
    return [...seen.values()].sort((a, b) => (a.voucher.date > b.voucher.date ? -1 : 1));
  }, [data, id, company.periodFrom, company.periodTo]);
  if (!row) return <Page><p className="hint">That project no longer exists.</p></Page>;
  const sym = company.currencySymbol;
  const inUse = data.vouchers.some(v => v.projectId === id || v.lines.some(l => l.costs?.some(c => c.centreId === id)));
  const remove = async () => {
    if (await confirm({ title: `Delete ${row.project.name}?`, confirmLabel: 'Delete', danger: true })) {
      deleteMaster('costCentres', row.project.id);
      navigate('/projects');
    }
  };
  return (
    <Page>
      <PageHeader
        title={row.project.name}
        hint={[row.clientName, row.project.notes].filter(Boolean).join(' · ') || undefined}
        actions={<>
          <button className="btn" onClick={() => setEditing(true)}><Pencil className="w-4 h-4 text-slate-500" /> Edit</button>
          {!inUse && <button className="btn btn-danger" onClick={() => void remove()}>Delete</button>}
          <button className="btn" onClick={() => navigate(`/expenses?project=${id}`)}>Add expense</button>
          <button className="btn btn-primary" onClick={() => navigate(`${newVoucher('SALES')}?project=${id}${row.project.clientId ? `&party=${row.project.clientId}` : ''}`)}><Plus className="w-4 h-4" /> New invoice</button>
        </>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Billed" value={moneyWhole(sym, row.income)} sub={row.project.quote ? `${row.billedPct?.toFixed(0)}% of ${moneyWhole(sym, row.project.quote)} agreed` : undefined} />
        <Stat label="Spent" value={moneyWhole(sym, row.expense)} />
        <Stat label="Profit" value={moneyWhole(sym, row.profit)} tone={row.profit < 0 ? 'bad' : 'good'} />
        <Stat label="Margin" value={row.marginPct === null ? 'None yet' : `${row.marginPct.toFixed(0)}%`} />
      </div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4 items-start">
        <Card title="Entries" flush>
          {entries.length === 0 ? <Empty title="Nothing tagged to this project in this period" /> : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Entry</th><th>Who or what</th><th className="num">Income</th><th className="num">Spent</th></tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.voucher.id} className="cursor-pointer" onClick={() => navigate(`/voucher/${e.voucher.id}`)}>
                      <td className="whitespace-nowrap">{fmtDate(e.voucher.date)}</td>
                      <td>{VOUCHER_META[e.voucher.type].label} {e.voucher.number}</td>
                      <td>{voucherParticulars(data, e.voucher)}{e.voucher.narration ? <div className="hint">{e.voucher.narration}</div> : null}</td>
                      <td className="num">{fmtBlank(e.income)}</td>
                      <td className="num">{fmtBlank(e.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="By account">
          {report && report.ledgers.size > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {[...report.ledgers.entries()].map(([ledgerId, amount]) => (
                <li key={ledgerId} className="flex justify-between gap-3"><span>{ledgerName(data, ledgerId)}</span><span className="tabular-nums">{fmt(Math.abs(amount))}</span></li>
              ))}
            </ul>
          ) : <p className="hint">Nothing yet.</p>}
        </Card>
      </div>
      {editing && <ProjectDialog initial={row.project} onClose={() => setEditing(false)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- expenses

const QuickExpense: React.FC<{ initialProject?: string; initialLedger?: string }> = ({ initialProject, initialLedger }) => {
  const { data, company, features, saveVoucher } = useBooks();
  const { toast } = useFeedback();
  const firstBank = data.ledgers.find(l => isInGroup(data, l.groupId, G.bank))?.id ?? CASH_LEDGER_ID;
  const [date, setDate] = useState(company.currentDate);
  const [ledgerId, setLedgerId] = useState(initialLedger ?? '');
  const [amount, setAmount] = useState(0);
  const [fromId, setFromId] = useState(firstBank);
  const [projectId, setProjectId] = useState(initialProject ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const enter = useEnterToNext<HTMLDivElement>();

  const expenseFilter = useMemo(() => (l: Ledger) => isInGroup(data, l.groupId, G.indirectExpense) || isInGroup(data, l.groupId, G.directExpense), [data]);
  const ledger = ledgerId ? ledgerOf(data, ledgerId) : undefined;
  const showProject = features.costCentres && data.costCentres.length > 0 && !!ledger?.costCentres;

  const save = () => {
    if (!ledgerId) return setError('Choose what the money was for.');
    if (amount <= 0) return setError('Enter the amount.');
    if (date < company.booksFrom) return setError(`Your books start on ${fmtDate(company.booksFrom)}.`);
    setError('');
    const now = new Date().toISOString();
    const number = nextVoucherNumber(data, 'vt_payment');
    saveVoucher({
      id: newId('v'), typeId: 'vt_payment', type: 'PAYMENT', number, date, createdAt: now, updatedAt: now, narration: note.trim() || undefined,
      lines: [
        { id: newId('l'), ledgerId, side: 'DR', amount, costs: showProject && projectId ? [{ centreId: projectId, amount }] : undefined },
        { id: newId('l'), ledgerId: fromId, side: 'CR', amount },
      ],
    });
    toast(`Expense saved as ${number}`);
    setAmount(0); setNote(''); setLedgerId(''); setKey(k => k + 1);
  };

  return (
    <Card title="Add an expense" className="mb-4 no-print">
      {error && <Notice tone="bad" className="mb-2">{error}</Notice>}
      <div key={key} ref={enter.ref} onKeyDown={enter.onKeyDown} className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_8rem_1fr_1fr_9rem] gap-3 items-start">
        <Field label="What was it for?">
          <LedgerCombo value={ledgerId} onChange={setLedgerId} filter={expenseFilter} newGroupId={G.indirectExpense} ariaLabel="What was it for" placeholder="Software, travel, rent..." />
        </Field>
        <Field label="Amount"><NumberInput value={amount} onValue={setAmount} placeholder="0.00" /></Field>
        <Field label="Paid from"><LedgerCombo value={fromId} onChange={setFromId} filter={onlyCashOrBank(data)} newGroupId={G.bank} ariaLabel="Paid from" /></Field>
        {showProject
          ? <Field label="Project"><ProjectCombo value={projectId} onChange={setProjectId} /></Field>
          : <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>}
        <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button className="btn btn-primary" data-accept onClick={save}>Save expense</button>
        {showProject && <input className="input max-w-md" value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />}
      </div>
    </Card>
  );
};

export const ExpensesPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const s = useMemo(() => expenseSummary(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const sym = company.currencySymbol;
  const thisMonth = company.currentDate.slice(0, 7);
  const monthRow = s.months.find(m => m.month === thisMonth);
  const months = s.months.filter(m => m.month <= thisMonth || m.amount !== 0);
  const prior = months[months.findIndex(m => m.month === thisMonth) - 1];
  const budgets = data.budgets.filter(b => b.from <= company.periodTo && b.to >= company.periodFrom);
  const budgetFor = (ledgerId: string) => budgets.flatMap(b => b.lines).find(l => l.kind === 'LEDGER' && l.refId === ledgerId)?.amount;
  const expenseBudget = budgets.flatMap(b => b.lines.map(l => ({ b, l }))).find(x => x.l.kind === 'GROUP' && x.l.refId === G.indirectExpense);
  const ids = useMemo(() => new Set(s.ledgers.map(r => r.ledger.id)), [s.ledgers]);
  const recent = useMemo(() => {
    const out: { voucher: Voucher; ledgerId: string; amount: number; project?: string }[] = [];
    const all = postings(data);
    for (let i = all.length - 1; i >= 0 && out.length < 12; i--) {
      const p = all[i];
      if (!ids.has(p.line.ledgerId) || p.line.side !== 'DR' || p.voucher.date > company.periodTo || p.voucher.date < company.periodFrom) continue;
      const projectId = p.line.costs?.[0]?.centreId;
      out.push({ voucher: p.voucher, ledgerId: p.line.ledgerId, amount: p.line.amount, project: projectId ? data.costCentres.find(c => c.id === projectId)?.name : undefined });
    }
    return out;
  }, [data, ids, company.periodFrom, company.periodTo]);
  void CHART_BLUE;

  return (
    <Report title="Expenses" hint="Where your money goes. Add an expense in seconds below.">
      <QuickExpense initialProject={params.get('project') ?? undefined} initialLedger={params.get('ledger') ?? undefined} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Total in this period" value={moneyWhole(sym, s.total)} />
        <Stat label="This month" value={moneyWhole(sym, monthRow?.amount ?? 0)} sub={prior ? `Last month ${moneyWhole(sym, prior.amount)}` : undefined} />
        <Stat label="Biggest category" value={s.ledgers[0]?.ledger.name ?? 'None yet'} sub={s.ledgers[0] ? moneyWhole(sym, s.ledgers[0].amount) : undefined} />
        {expenseBudget
          ? <Stat label="Budget used" value={`${((budgetActual(data, 'GROUP', G.indirectExpense, expenseBudget.b.from, expenseBudget.b.to) / expenseBudget.l.amount) * 100).toFixed(0)}%`} sub={`of ${moneyWhole(sym, expenseBudget.l.amount)}`} />
          : <Stat label="Monthly average" value={moneyWhole(sym, s.total / Math.max(1, months.filter(m => m.amount > 0).length))} />}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4 items-start">
        <Card title="Spending by month">
          {s.total === 0 ? <Empty title="No expenses yet" /> : (
            <ColumnChart
              labels={months.map(m => fmtMonthShort(m.month))} ariaLabel="Spending by month"
              series={[{ name: 'Spent', color: CHART_ORANGE, values: months.map(m => m.amount) }]}
              format={n => money(sym, n)}
            />
          )}
        </Card>
        <Card title="By category">
          {s.ledgers.length === 0 ? <Empty title="No expenses yet" /> : (
            <BarList
              rows={s.ledgers.slice(0, 8).map(r => ({ label: r.ledger.name, value: r.amount, href: `/reports/ledger/${r.ledger.id}`, marker: budgetFor(r.ledger.id) }))}
              format={n => moneyWhole(sym, n)} onRow={navigate}
            />
          )}
        </Card>
      </div>
      <Card title="Recent expenses" flush>
        {recent.length === 0 ? <Empty title="Nothing recorded yet" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Category</th><th>Project</th><th>Note</th><th className="num">Amount</th><th className="no-print" /></tr></thead>
              <tbody>
                {recent.map(r => (
                  <tr key={`${r.voucher.id}-${r.ledgerId}`} data-href={`/voucher/${r.voucher.id}`}>
                    <td className="whitespace-nowrap">{fmtDate(r.voucher.date)}</td>
                    <td className="font-medium">{ledgerName(data, r.ledgerId)}</td>
                    <td>{r.project}</td>
                    <td className="text-slate-600">{r.voucher.narration}</td>
                    <td className="num font-semibold">{fmt(r.amount)}</td>
                    <td className="text-right no-print"><EditEntryButton id={r.voucher.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export { voucherAmount, Combo };
