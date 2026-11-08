// Your business: companies, details, features, security, backups, import and export, edit log, checks and the savings planner.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import type { CompanySettings, Features, Ledger, StockItem, ValuationMethod } from '../core/types';
import { CASH_LEDGER_ID, EMIRATES, FEATURE_INFO, G, VOUCHER_META } from '../core/defaults';
import { isInGroup, ledgerName, nextVoucherNumber, pnl, ledgerBalances, isCashOrBank, verifyBooks, voucherAmount, voucherParticulars } from '../core/engine';
import { downloadFile, fmt, fmtDate, money, moneyWhole, parseCsv, todayIso } from '../core/format';
import { api, type RestorePoint } from '../store/api';
import { newId, useBooks } from '../store/BooksContext';
import { Card, Empty, Field, Input, Modal, Notice, NumberInput, Page, PageHeader, Pill, Select, Stat, Tabs, Toggle, useFeedback } from '../ui/kit';
import { NewBusinessForm } from './Welcome';
import { Report } from '../ui/report';
import { LedgerCombo } from './vouchers/parts';

// ---------------------------------------------------------------- companies

export const CompaniesPage: React.FC = () => {
  const { companies, company, switchCompany, createCompany, deleteCompany, openSample } = useBooks();
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const remove = async (id: string, name: string) => {
    const yes = await confirm({
      title: `Delete ${name}?`,
      body: 'This permanently removes its books and restore points from this computer. Export a backup first if you might need them again.',
      confirmLabel: 'Delete for good', danger: true,
    });
    if (!yes) return;
    await deleteCompany(id);
    toast(`${name} deleted`);
  };
  return (
    <Page>
      <PageHeader title="Businesses" hint="Keep separate books for each business you run." actions={<>
        <button className="btn" onClick={() => void openSample().then(() => navigate('/'))}>Open sample data</button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New business</button>
      </>} />
      <Card flush>
        <table className="tbl">
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td className="font-medium align-middle">{c.name} {c.id === company.id && <Pill tone="blue">Open now</Pill>}</td>
                <td className="text-right whitespace-nowrap">
                  {c.id !== company.id && <button className="btn btn-sm" onClick={() => void switchCompany(c.id).then(() => navigate('/'))}>Open</button>}{' '}
                  <button className="btn btn-ghost btn-sm" aria-label={`Delete ${c.name}`} onClick={() => void remove(c.id, c.name)}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {creating && (
        <Modal title="New business" size="lg" onClose={() => setCreating(false)}>
          <NewBusinessForm submitLabel="Create" onCancel={() => setCreating(false)} onCreate={async input => { await createCompany(input); setCreating(false); navigate('/'); }} />
        </Modal>
      )}
    </Page>
  );
};

// ---------------------------------------------------------------- settings

export const CompanyDetailsPage: React.FC = () => {
  const { company, updateCompany, data, features } = useBooks();
  const { toast } = useFeedback();
  const [c, setC] = useState<CompanySettings>(company);
  useEffect(() => setC(company), [company]);
  const set = (patch: Partial<CompanySettings>) => setC(x => ({ ...x, ...patch }));
  const save = () => {
    if (!c.name.trim()) { toast('Your business needs a name.', 'bad'); return; }
    const earliest = data.vouchers.reduce((m, v) => (v.date < m ? v.date : m), '9999-12-31');
    if (c.booksFrom > earliest) { toast(`You have entries dated ${fmtDate(earliest)}, so your books cannot start later than that.`, 'bad'); return; }
    updateCompany({
      name: c.name.trim(), ownerName: c.ownerName, profession: c.profession, mailingName: c.mailingName, address: c.address, state: c.state, pincode: c.pincode,
      phone: c.phone, email: c.email, website: c.website, trn: c.trn?.replace(/[\s-]/g, '') || undefined, pan: c.pan, tan: c.tan,
      currencySymbol: c.currencySymbol, currencyCode: c.currencyCode, booksFrom: c.booksFrom, fyStart: c.fyStart, upiId: c.upiId,
      invoiceBankLedgerId: c.invoiceBankLedgerId, invoiceTerms: c.invoiceTerms,
    });
    toast('Saved');
  };
  return (
    <Page>
      <PageHeader title="Business details" hint="These appear on your invoices." actions={<button className="btn btn-primary" onClick={save}>Save</button>} />
      <div className="flex flex-col gap-4">
        <Card title="About you">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Business name"><Input value={c.name} onChange={e => set({ name: e.target.value })} /></Field>
            <Field label="Name on invoices" hint="If different from the business name."><Input value={c.mailingName ?? ''} onChange={e => set({ mailingName: e.target.value })} /></Field>
            <Field label="Your name"><Input value={c.ownerName ?? ''} onChange={e => set({ ownerName: e.target.value })} /></Field>
            <Field label="What you do"><Input value={c.profession ?? ''} onChange={e => set({ profession: e.target.value })} /></Field>
            <Field label="Address"><Input value={c.address ?? ''} onChange={e => set({ address: e.target.value })} /></Field>
            <Field label="Emirate">
              <Select value={c.state ?? ''} onChange={e => set({ state: e.target.value })}>
                <option value="">Not set</option>{EMIRATES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Phone"><Input value={c.phone ?? ''} onChange={e => set({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={c.email ?? ''} onChange={e => set({ email: e.target.value })} /></Field>
          </div>
        </Card>
        <Card title="Tax numbers">
          <div className="grid sm:grid-cols-3 gap-3">
            {features.vat && <Field label="TRN (Tax Registration Number)"><Input value={c.trn ?? ''} onChange={e => set({ trn: e.target.value })} placeholder="15 digits" /></Field>}
            {(features.tds || features.tcs) && <Field label="TAN"><Input value={c.tan ?? ''} onChange={e => set({ tan: e.target.value })} /></Field>}
          </div>
        </Card>
        <Card title="On your invoices">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Bank account clients pay into">
              <LedgerCombo value={c.invoiceBankLedgerId ?? ''} onChange={invoiceBankLedgerId => set({ invoiceBankLedgerId })} filter={l => isInGroup(data, l.groupId, G.bank)} newGroupId={G.bank} ariaLabel="Invoice bank account" />
            </Field>
          </div>
          <Field label="Terms printed at the bottom" className="mt-3"><Input value={c.invoiceTerms ?? ''} onChange={e => set({ invoiceTerms: e.target.value })} /></Field>
        </Card>
        <Card title="Books">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Financial year starts" hint="Usually 1 January."><Input type="date" value={c.fyStart} onChange={e => set({ fyStart: e.target.value })} /></Field>
            <Field label="Books start from"><Input type="date" value={c.booksFrom} onChange={e => set({ booksFrom: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency"><Input value={c.currencyCode} onChange={e => set({ currencyCode: e.target.value })} /></Field>
              <Field label="Symbol"><Input value={c.currencySymbol} onChange={e => set({ currencySymbol: e.target.value })} /></Field>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
};

export const FeaturesPage: React.FC = () => {
  const { features, updateFeatures } = useBooks();
  const groups = [...new Set(FEATURE_INFO.map(f => f.group))];
  return (
    <Page>
      <PageHeader title="Features" hint="Turn on only what you need. Everything else stays out of sight, and turning something off never deletes your entries. Shortcut: F11." />
      <div className="flex flex-col gap-4">
        {groups.map(g => (
          <Card key={g} title={g}>
            <div className="flex flex-col gap-1.5">
              {FEATURE_INFO.filter(f => f.group === g).map(f => (
                <Toggle key={f.key} checked={features[f.key]} onChange={v => updateFeatures({ [f.key]: v } as Partial<Features>)} label={f.label} hint={f.plain} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
};

export const ConfigurePage: React.FC = () => {
  const { company, updateCompany } = useBooks();
  return (
    <Page>
      <PageHeader title="Configure" hint="Shortcut: F12." />
      <Card title="Stock valuation">
        <p className="hint mb-2">How closing stock is valued on your Balance Sheet and Profit & Loss. Only matters if you turn Inventory on.</p>
        <div className="max-w-sm">
          <Select value={company.valuation} onChange={e => updateCompany({ valuation: e.target.value as ValuationMethod })} aria-label="Valuation method">
            <option value="AVG">Average cost (Tally's default)</option>
            <option value="FIFO">First in, first out</option>
            <option value="LAST_PURCHASE">Last purchase price</option>
          </Select>
        </div>
      </Card>
    </Page>
  );
};

export const SecurityPage: React.FC = () => {
  const { company, setPassword } = useBooks();
  const { toast } = useFeedback();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const save = async () => {
    if (pw.length < 4) { toast('Use at least 4 characters.', 'bad'); return; }
    if (pw !== again) { toast('The two passwords do not match.', 'bad'); return; }
    await setPassword(pw);
    setPw(''); setAgain('');
    toast('Password set. It is asked for next time these books open.');
  };
  return (
    <Page>
      <PageHeader title="Security" hint="Ask for a password when these books open." />
      <Card>
        <Notice tone="warn" className="mb-3">This stops someone casually opening your books on this computer. It does not encrypt the data file, and a forgotten password cannot be recovered, so keep backups.</Notice>
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
          <Field label={company.passwordHash ? 'New password' : 'Password'}><Input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="Type it again"><Input type="password" value={again} onChange={e => setAgain(e.target.value)} autoComplete="new-password" /></Field>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary" onClick={() => void save()}>{company.passwordHash ? 'Change password' : 'Set password'}</button>
          {company.passwordHash && <button className="btn" onClick={() => void setPassword(null).then(() => toast('Password removed'))}>Remove password</button>}
        </div>
      </Card>
    </Page>
  );
};

// ---------------------------------------------------------------- backup

export const BackupPage: React.FC = () => {
  const { company, exportBackup, importBackup, restoreFromPoint, storagePath, saveState } = useBooks();
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [points, setPoints] = useState<RestorePoint[]>([]);

  useEffect(() => { api.restorePoints(company.id).then(setPoints).catch(() => setPoints([])); }, [company.id, saveState]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const yes = await confirm({ title: 'Restore this backup?', body: 'If the backup is of a business already here, its current books are replaced by the backup. The state before today\'s first change stays available as a restore point.', confirmLabel: 'Restore', danger: true });
    if (!yes) return;
    const r = await importBackup(text);
    toast(r.message, r.ok ? 'good' : 'bad');
  };
  const restore = async (p: RestorePoint) => {
    const yes = await confirm({ title: `Go back to ${fmtDate(p.day)}?`, body: 'Your books return to how they were at the start of that day. Anything entered since is removed. Export a backup first if you might want it.', confirmLabel: 'Go back', danger: true });
    if (!yes) return;
    await restoreFromPoint(p.day);
    toast(`Restored to ${fmtDate(p.day)}`);
  };
  return (
    <Page>
      <PageHeader title="Backup & Restore" hint="Your books are saved automatically to a file on this computer. A backup copies them somewhere safe." />
      <div className="flex flex-col gap-4">
        <Card title="Where your books are">
          {storagePath ? <p className="font-mono text-[0.8571rem] break-all">{storagePath}</p> : <Notice tone="warn">The local server is not running, so entries are only being held in this browser. Open the app with start.bat so they reach your data file.</Notice>}
          <p className="hint mt-1">Copy this file to back up every business at once. Close the app first.</p>
        </Card>
        <Card title="Backup file">
          <p className="hint mb-3">Saves {company.name} as one file you can keep on a USB drive or in the cloud, or open on another computer.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={exportBackup}><Download className="w-4 h-4" /> Save a backup</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 text-slate-500" /> Restore from a backup</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" aria-label="Backup file" onChange={e => void onFile(e)} />
          </div>
        </Card>
        <Card title="Automatic restore points" flush>
          <p className="hint px-4 pb-2">One a day, from just before your first change that day. The last 30 days are kept.</p>
          {points.length === 0 ? <Empty title="None yet" hint="The first appears after you change something on a later save." /> : (
            <table className="tbl">
              <tbody>
                {points.map(p => (
                  <tr key={p.day}>
                    <td className="align-middle font-medium">{fmtDate(p.day)}</td>
                    <td className="align-middle hint">{Math.max(1, Math.round(p.size / 1024))} KB</td>
                    <td className="text-right"><button className="btn btn-sm" onClick={() => void restore(p)}>Go back to this</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Page>
  );
};

// ---------------------------------------------------------------- import and export

type ImportKind = 'parties' | 'items' | 'expenses';

const TEMPLATES: Record<ImportKind, { label: string; hint: string; header: string; sample: string }> = {
  parties: {
    label: 'Clients and vendors', hint: 'One per line. Type is client or vendor. Opening is what they owe you, or you owe them.',
    header: 'name,type,opening,emirate,trn,email,phone,terms_days', sample: 'Acme Studios LLC,client,0,Dubai,100123456700003,hello@acme.example,,30',
  },
  items: {
    label: 'Stock items', hint: 'Needs Inventory to be on. Unit must already exist.',
    header: 'name,unit,vat_rate,selling_price,buying_price,opening_qty,opening_cost', sample: 'USB-C Dock,Nos,5,650,480,0,0',
  },
  expenses: {
    label: 'Expenses', hint: 'Each line becomes a Payment. Account and paid_from must match existing account names. Dates as YYYY-MM-DD or DD/MM/YYYY.',
    header: 'date,account,amount,paid_from,note', sample: `${todayIso()},Travel,1200,Cash,Taxi to client`,
  },
};

export const ImportPage: React.FC = () => {
  const { data, saveMasters, saveVoucher, company } = useBooks();
  const { toast } = useFeedback();
  const [kind, setKind] = useState<ImportKind>('parties');
  const [report, setReport] = useState<{ added: number; problems: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = TEMPLATES[kind];

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const table = parseCsv(await file.text());
    if (table.length < 2) { toast('That file has no rows under its header.', 'bad'); return; }
    const header = table[0].map(h => h.trim().toLowerCase());
    const rows = table.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
    const problems: string[] = [];
    let added = 0;
    if (kind === 'parties') {
      const seen = new Set(data.ledgers.map(l => l.name.toLowerCase()));
      const list: Ledger[] = [];
      rows.forEach((r, i) => {
        const name = r.name;
        if (!name) { problems.push(`Row ${i + 2}: no name.`); return; }
        if (seen.has(name.toLowerCase())) { problems.push(`Row ${i + 2}: ${name} already exists.`); return; }
        const isClient = (r.type ?? '').toLowerCase() !== 'vendor';
        const opening = Number(r.opening) || 0;
        seen.add(name.toLowerCase());
        list.push({
          id: newId('led'), name, groupId: isClient ? G.debtors : G.creditors, openingBalance: isClient ? opening : -opening, billWise: true,
          state: r.emirate || r.state || undefined, trn: (r.trn || r.gstin)?.replace(/[\s-]/g, '') || undefined, email: r.email || undefined, phone: r.phone || undefined, creditDays: Number(r.terms_days) || 30,
        });
      });
      if (list.length) saveMasters('ledgers', list);
      added = list.length;
    } else if (kind === 'items') {
      const seen = new Set(data.stockItems.map(x => x.name.toLowerCase()));
      const list: StockItem[] = [];
      rows.forEach((r, i) => {
        if (!r.name) { problems.push(`Row ${i + 2}: no name.`); return; }
        if (seen.has(r.name.toLowerCase())) { problems.push(`Row ${i + 2}: ${r.name} already exists.`); return; }
        const unit = data.units.find(u => u.symbol.toLowerCase() === (r.unit ?? '').toLowerCase());
        if (!unit) { problems.push(`Row ${i + 2}: unit "${r.unit}" does not exist.`); return; }
        seen.add(r.name.toLowerCase());
        list.push({
          id: newId('it'), name: r.name, unitId: unit.id, vatRate: (r.vat_rate || r.gst_rate) ? Number(r.vat_rate || r.gst_rate) : undefined, salePrice: Number(r.selling_price) || undefined, purchasePrice: Number(r.buying_price) || undefined,
          openingQty: Number(r.opening_qty) || 0, openingRate: Number(r.opening_cost) || 0, openingGodownId: data.godowns[0]?.id,
        });
      });
      if (list.length) saveMasters('stockItems', list);
      added = list.length;
    } else {
      const byName = (name: string) => data.ledgers.find(l => l.name.toLowerCase() === name.toLowerCase());
      let seq = Number(nextVoucherNumber(data, 'vt_payment').split('-')[1]) || 1;
      const prefix = data.voucherTypes.find(x => x.id === 'vt_payment')?.prefix ?? 'PAY';
      rows.forEach((r, i) => {
        const m = (r.date ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const date = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : r.date;
        const account = byName(r.account ?? '');
        const from = byName(r.paid_from ?? '') ?? data.ledgers.find(l => l.id === CASH_LEDGER_ID);
        const amount = Number(r.amount);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) { problems.push(`Row ${i + 2}: date "${r.date}" not understood.`); return; }
        if (date < company.booksFrom) { problems.push(`Row ${i + 2}: dated before your books start.`); return; }
        if (!account) { problems.push(`Row ${i + 2}: no account called "${r.account}".`); return; }
        if (!from || !isCashOrBank(data, from)) { problems.push(`Row ${i + 2}: "${r.paid_from}" is not a cash or bank account.`); return; }
        if (!(amount > 0)) { problems.push(`Row ${i + 2}: amount "${r.amount}" not understood.`); return; }
        const now = new Date().toISOString();
        saveVoucher({
          id: newId('v'), typeId: 'vt_payment', type: 'PAYMENT', number: `${prefix}-${String(seq++).padStart(3, '0')}`, date, narration: r.note || undefined, createdAt: now, updatedAt: now,
          lines: [{ id: newId('l'), ledgerId: account.id, side: 'DR', amount }, { id: newId('l'), ledgerId: from.id, side: 'CR', amount }],
        });
        added++;
      });
    }
    setReport({ added, problems });
  };

  return (
    <Page>
      <PageHeader title="Import Data" hint="Bring in lists from a spreadsheet. Save it as CSV first." />
      <Tabs value={kind} onChange={k => { setKind(k); setReport(null); }} tabs={(Object.keys(TEMPLATES) as ImportKind[]).map(id => ({ id, label: TEMPLATES[id].label }))} />
      <Card>
        <p className="mb-3">{t.hint}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => downloadFile(`${kind}_template.csv`, `${t.header}\r\n${t.sample}\r\n`, 'text/csv')}><Download className="w-4 h-4 text-slate-500" /> Get a template</button>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> Choose a CSV file</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" aria-label="CSV file" onChange={e => void onFile(e)} />
        </div>
        {report && (
          <div className="mt-3 flex flex-col gap-2">
            <Notice tone={report.added ? 'good' : 'warn'}>Added {report.added}.</Notice>
            {report.problems.length > 0 && <Notice tone="warn"><div className="font-semibold mb-1">{report.problems.length} rows were skipped</div><ul className="list-disc pl-4">{report.problems.slice(0, 15).map(p => <li key={p}>{p}</li>)}</ul></Notice>}
          </div>
        )}
      </Card>
    </Page>
  );
};

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: unknown[][]) => `﻿${rows.map(r => r.map(csvCell).join(',')).join('\r\n')}`;

export const ExportPage: React.FC = () => {
  const { data, company } = useBooks();
  const stamp = company.currentDate;
  const save = (name: string, rows: unknown[][]) => downloadFile(`${company.name.replace(/[^\w]+/g, '_')}_${name}_${stamp}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  const exports: { label: string; plain: string; run: () => void }[] = [
    { label: 'Accounts', plain: 'All ledgers with their group and opening balance.', run: () => save('ledgers', [['Name', 'Group', 'Opening', 'Emirate', 'TRN', 'Email', 'Phone'], ...data.ledgers.map(l => [l.name, data.groups.find(g => g.id === l.groupId)?.name ?? 'Primary', l.openingBalance, l.state, l.trn, l.email, l.phone])]) },
    { label: 'Entries', plain: 'Every entry, one row per ledger line.', run: () => save('entries', [['Date', 'Type', 'Number', 'Account', 'Debit', 'Credit', 'Note', 'Status'], ...data.vouchers.flatMap(v => v.lines.map(l => [v.date, VOUCHER_META[v.type].label, v.number, ledgerName(data, l.ledgerId), l.side === 'DR' ? l.amount : '', l.side === 'CR' ? l.amount : '', v.narration, v.isCancelled ? 'Cancelled' : v.isOptional ? 'Optional' : '']))]) },
    { label: 'Projects', plain: 'Your projects and who they are for.', run: () => save('projects', [['Name', 'Client', 'Status', 'Agreed price', 'Start', 'End'], ...data.costCentres.map(c => [c.name, c.clientId ? ledgerName(data, c.clientId) : '', c.status, c.quote, c.startDate, c.endDate])]) },
    { label: 'Stock items', plain: 'Items with prices and opening stock.', run: () => save('stock_items', [['Name', 'Unit', 'VAT %', 'Selling price', 'Buying price', 'Opening qty', 'Opening cost'], ...data.stockItems.map(i => [i.name, data.units.find(u => u.id === i.unitId)?.symbol, i.vatRate, i.salePrice, i.purchasePrice, i.openingQty, i.openingRate])]) },
  ];
  return (
    <Page>
      <PageHeader title="Export Data" hint="Save lists as CSV files that open in Excel. Any report also has its own Excel button." />
      <div className="grid sm:grid-cols-2 gap-3">
        {exports.map(x => (
          <button key={x.label} onClick={x.run} className="card p-4 text-left hover:border-brand-600 cursor-pointer">
            <div className="font-semibold flex items-center gap-2"><Download className="w-4 h-4 text-slate-500" /> {x.label}</div>
            <div className="hint mt-0.5">{x.plain}</div>
          </button>
        ))}
      </div>
    </Page>
  );
};

// ---------------------------------------------------------------- log and checks

export const EditLogPage: React.FC = () => {
  const { data } = useBooks();
  const [q, setQ] = useState('');
  const rows = data.auditLog.filter(a => `${a.entity} ${a.label} ${a.before ?? ''} ${a.after ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const tone = { CREATE: 'green', ALTER: 'blue', DELETE: 'red', CANCEL: 'amber', RESTORE: 'gray' } as const;
  const word = { CREATE: 'Created', ALTER: 'Changed', DELETE: 'Deleted', CANCEL: 'Cancelled', RESTORE: 'Restored' } as const;
  return (
    <Report title="Edit Log" period="none" hint="A record of what was created, changed or deleted, kept as an audit trail. The latest 2,000 changes are kept.">
      <div className="max-w-sm mb-3 no-print"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the log" aria-label="Search the log" /></div>
      <Card flush>
        {rows.length === 0 ? <Empty title="Nothing recorded yet" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>When</th><th>What</th><th>Item</th><th>Before</th><th>After</th></tr></thead>
              <tbody>
                {rows.slice(0, 500).map(a => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{new Date(a.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><Pill tone={tone[a.action]}>{word[a.action]}</Pill></td>
                    <td><span className="hint">{a.entity}</span> <span className="font-medium">{a.label}</span></td>
                    <td className="text-slate-500">{a.before}</td>
                    <td className="text-slate-700">{a.after}</td>
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

export const VerifyPage: React.FC = () => {
  const { data } = useBooks();
  const navigate = useNavigate();
  const issues = useMemo(() => verifyBooks(data), [data]);
  const errors = issues.filter(i => i.severity === 'error');
  return (
    <Page>
      <PageHeader title="Verify Data" hint="Checks every entry balances, every account it uses still exists, and your Balance Sheet totals." />
      {issues.length === 0 && <Notice tone="good">All {data.vouchers.length} entries and {data.ledgers.length} accounts check out. Your books are sound.</Notice>}
      {issues.length > 0 && <Notice tone={errors.length ? 'bad' : 'warn'} className="mb-3">{errors.length ? `${errors.length} problems need fixing.` : 'No errors, but some things are worth a look.'}</Notice>}
      {issues.length > 0 && (
        <Card flush>
          <table className="tbl">
            <tbody>
              {issues.map((i, n) => (
                <tr key={n} className={i.voucherId ? 'cursor-pointer hover:bg-brand-50' : ''} onClick={() => { if (i.voucherId) navigate(`/voucher/${i.voucherId}`); }}>
                  <td className="w-20"><Pill tone={i.severity === 'error' ? 'red' : 'amber'}>{i.severity === 'error' ? 'Error' : 'Check'}</Pill></td>
                  <td>{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
};

const SHORTCUTS: [string, [string, string][]][] = [
  ['Getting around', [['Alt+G or Ctrl+G', 'Go To: find any screen or account'], ['Esc', 'Back'], ['F2', 'Change period and date'], ['F3', 'Change business'], ['F10', 'All entry types'], ['F11', 'Features'], ['F12', 'Configure'], ['Alt+S', 'Savings Planner'], ['Alt+P', 'Profit & Loss'], ['Alt+B', 'Balance Sheet'], ['Up, Down, Enter', 'Move through a report and open a row']]],
  ['New entries', [['F4', 'Transfer (Contra)'], ['F5', 'Payment'], ['F6', 'Receipt'], ['F7', 'Journal'], ['F8', 'Invoice (Sales)'], ['F9', 'Bill (Purchase)'], ['Ctrl+F8', 'Credit Note'], ['Ctrl+F9', 'Debit Note'], ['Ctrl+F10', 'Memo'], ['Alt+F7', 'Stock Journal'], ['Ctrl+F7', 'Physical Stock'], ['Alt+F8', 'Delivery Note'], ['Alt+F9', 'Receipt Note'], ['Alt+F5', 'Client Order'], ['Alt+F6', 'Rejection Out'], ['Ctrl+F6', 'Rejection In']]],
  ['While entering', [['Enter', 'Next field'], ['Ctrl+A or Ctrl+Enter', 'Save'], ['Alt+C', 'Create a new account from a picker'], ['Alt+D', 'Delete this entry'], ['Alt+X', 'Cancel this entry'], ['Alt+2', 'Duplicate this entry']]],
  ['In reports', [['Ctrl+P', 'Print or save as PDF']]],
];

export const ShortcutsPage: React.FC = () => (
  <Page>
    <PageHeader title="Keyboard Shortcuts" hint="The same as TallyPrime wherever a browser allows. Alt+F4, Ctrl+F4 and Ctrl+W always belong to the browser, so Vendor Order, Payroll and Attendance are opened from New Entry instead." />
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {SHORTCUTS.map(([title, keys]) => (
        <Card key={title} title={title} flush>
          <table className="tbl"><tbody>{keys.map(([k, what]) => <tr key={k}><td className="w-48"><span className="kbd">{k}</span></td><td>{what}</td></tr>)}</tbody></table>
        </Card>
      ))}
    </div>
  </Page>
);

// ---------------------------------------------------------------- savings planner

const Slider: React.FC<{ label: string; plain: string; value: number; amount: string; onChange: (n: number) => void }> = ({ label, plain, value, amount, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-medium">{label}</span>
      <span className="tabular-nums font-semibold">{value}% · {amount}</span>
    </div>
    <input type="range" min={0} max={60} value={value} aria-label={label} onChange={e => onChange(Number(e.target.value))} className="w-full accent-brand-600" />
    <p className="hint">{plain}</p>
  </div>
);

export const SavingsPage: React.FC = () => {
  const { data, company, updateSavings } = useBooks();
  const navigate = useNavigate();
  const s = data.savings;
  const sym = company.currencySymbol;
  const stats = useMemo(() => {
    const p = pnl(data, company.periodFrom, company.periodTo);
    const balances = ledgerBalances(data, company.periodFrom, company.periodTo);
    const liquid = data.ledgers.filter(l => isCashOrBank(data, l)).reduce((t, l) => t + (balances.get(l.id)?.closing ?? 0), 0);
    return { income: p.sales + p.directIncome + p.indirectIncome, expenses: p.purchases + p.directExpense + p.indirectExpense, profit: p.netProfit, liquid };
  }, [data, company.periodFrom, company.periodTo]);
  const surplus = Math.max(0, stats.profit);
  const part = (pct: number) => moneyWhole(sym, (surplus * pct) / 100);
  const allocated = s.emergencyReservePct + s.taxBufferPct + s.expansionReservePct + s.generalSavingsPct;
  const burn = Math.max(1, s.monthlyBurnRateEstimate);
  const runway = stats.liquid / burn;
  const project = (years: number) => {
    const monthly = surplus / 12;
    let balance = stats.liquid;
    for (let m = 0; m < years * 12; m++) balance = balance * (1 + s.annualReturnRatePct / 1200) + monthly;
    return balance;
  };
  const runwayTone = runway >= 6 ? 'good' : runway >= 3 ? 'plain' : 'bad';
  return (
    <Page>
      <PageHeader title="Savings Planner" hint="Freelance income goes up and down. Decide what to set aside from your profit, and see how long your money would last." actions={<button className="btn" onClick={() => navigate('/reports/pnl')}>See Profit & Loss</button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Income" value={moneyWhole(sym, stats.income)} sub="This period" />
        <Stat label="Expenses" value={moneyWhole(sym, stats.expenses)} sub="This period" />
        <Stat label="Profit" value={moneyWhole(sym, stats.profit)} tone={stats.profit < 0 ? 'bad' : 'good'} sub={stats.income > 0 ? `${((stats.profit / stats.income) * 100).toFixed(0)}% of income` : undefined} />
        <Stat label="Cash and bank" value={moneyWhole(sym, stats.liquid)} sub="Available now" />
      </div>
      <Card title="How long your money would last" className="mb-4">
        <div className="grid md:grid-cols-[1fr_16rem] gap-4 items-center">
          <div>
            <div className={`text-[1.75rem] font-bold tabular-nums ${runwayTone === 'bad' ? 'text-rose-700' : runwayTone === 'good' ? 'text-emerald-700' : ''}`}>{runway.toFixed(1)} months</div>
            <p className="hint">With no new income, at what you spend each month. {runway >= 6 ? 'That is a comfortable cushion.' : runway >= 3 ? 'Aim for at least six months.' : 'This is thin, so building a cushion should come first.'}</p>
            <div className="h-2.5 rounded bg-slate-100 mt-2 max-w-xl" role="img" aria-label={`${runway.toFixed(1)} months of runway, out of a 12 month scale`}>
              <div className="h-2.5 rounded bg-brand-600" style={{ width: `${Math.min(100, (runway / 12) * 100)}%` }} />
            </div>
          </div>
          <Field label="You spend each month"><NumberInput value={s.monthlyBurnRateEstimate} onValue={n => updateSavings({ monthlyBurnRateEstimate: n })} /></Field>
        </div>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="Set aside from your profit">
          <div className="flex flex-col gap-3">
            <Slider label="Emergency fund" plain="For late-paying clients and quiet months." value={s.emergencyReservePct} amount={part(s.emergencyReservePct)} onChange={n => updateSavings({ emergencyReservePct: n })} />
            <Slider label="Tax" plain="VAT and corporate tax that will fall due." value={s.taxBufferPct} amount={part(s.taxBufferPct)} onChange={n => updateSavings({ taxBufferPct: n })} />
            <Slider label="Equipment and growth" plain="A new laptop, courses, or marketing." value={s.expansionReservePct} amount={part(s.expansionReservePct)} onChange={n => updateSavings({ expansionReservePct: n })} />
            <Slider label="General savings" plain="Fixed deposits or other long-term savings." value={s.generalSavingsPct} amount={part(s.generalSavingsPct)} onChange={n => updateSavings({ generalSavingsPct: n })} />
          </div>
          {allocated !== 100 && <Notice tone="warn" className="mt-3">These add up to {allocated}%. {allocated > 100 ? 'That is more than your whole profit.' : `${100 - allocated}% of your profit is left for you to spend.`}</Notice>}
        </Card>
        <Card title="If you keep saving like this">
          <p className="hint mb-3">Starts from your cash and bank today, adds this period's profit spread over 12 months, and grows at the rate below. A projection, not a promise.</p>
          <div className="max-w-40 mb-3"><Field label="Yearly return %"><NumberInput value={s.annualReturnRatePct} onValue={n => updateSavings({ annualReturnRatePct: n })} /></Field></div>
          <table className="tbl"><tbody>{[1, 3, 5].map(y => <tr key={y}><td>After {y} {y === 1 ? 'year' : 'years'}</td><td className="num font-semibold">{money(sym, Math.round(project(y)))}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </Page>
  );
};

export { fmt, voucherAmount, voucherParticulars };
