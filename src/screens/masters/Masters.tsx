// Every list of "things you set up once": accounts, groups, entry types, stock items, employees and so on.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Budget, BudgetLine, CompanyData, Employee, Group, Ledger, Nature, PayHead, StockItem, VoucherBase } from '../../core/types';
import { G, VAT_RATES, vatRateLabel, VOUCHER_META, VOUCHER_ORDER } from '../../core/defaults';
import { budgetActual, ledgerBalanceNow, ledgerName, primaryGroupOf } from '../../core/engine';
import { drCr, fmt, fmtDate, fmtQty } from '../../core/format';
import { newId, useBooks, type MasterKey } from '../../store/BooksContext';
import { Card, Combo, Empty, Field, Input, Modal, Notice, NumberInput, Page, PageHeader, Pill, SearchBox, Select, Toggle, useEnterToNext, useFeedback } from '../../ui/kit';
import { destinationsIn } from '../../ui/nav';
import { Hub } from '../../ui/report';
import { LedgerDialog } from './LedgerForm';
import { LedgerCombo } from '../vouchers/parts';

// ---------------------------------------------------------------- generic list and form

type Option = { value: string; label: string };

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'date' | 'toggle';
  options?: (data: CompanyData, record: Record<string, unknown>) => Option[];
  hint?: string;
  required?: boolean;
  /** Numbers and blanks in a select come back as this. */
  numeric?: boolean;
}

interface MasterConfig {
  masterKey: MasterKey;
  title: string;
  singular: string;
  hint: string;
  fields: FieldDef[];
  columns: { label: string; render: (r: Record<string, unknown>, data: CompanyData) => React.ReactNode; num?: boolean }[];
  blank: (data: CompanyData) => Record<string, unknown>;
  idPrefix: string;
  labelOf?: (r: Record<string, unknown>) => string;
  /** Returns why a record cannot be removed, or null if it can. */
  blockDelete?: (r: Record<string, unknown>, data: CompanyData) => string | null;
  locked?: (r: Record<string, unknown>) => boolean;
  validate?: (r: Record<string, unknown>, data: CompanyData) => string | null;
}

const MasterForm: React.FC<{ config: MasterConfig; initial?: Record<string, unknown>; onClose: () => void }> = ({ config, initial, onClose }) => {
  const { data, saveMaster } = useBooks();
  const [r, setR] = useState<Record<string, unknown>>(() => initial ?? { id: newId(config.idPrefix), ...config.blank(data) });
  const [error, setError] = useState('');
  const enter = useEnterToNext<HTMLDivElement>();
  const set = (key: string, value: unknown) => setR(x => ({ ...x, [key]: value }));
  const save = () => {
    for (const f of config.fields) {
      if (f.required && !String(r[f.key] ?? '').trim()) return setError(`${f.label} is needed.`);
    }
    const problem = config.validate?.(r, data);
    if (problem) return setError(problem);
    saveMaster(config.masterKey, r as { id: string });
    onClose();
  };
  return (
    <Modal title={`${initial ? 'Change' : 'New'} ${config.singular.toLowerCase()}`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" data-accept onClick={save}>Save</button>
    </>}>
      <div ref={enter.ref} onKeyDown={enter.onKeyDown} className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        {config.fields.map((f, i) => {
          const value = r[f.key];
          if (f.type === 'toggle') return <Toggle key={f.key} checked={!!value} onChange={v => set(f.key, v)} label={f.label} hint={f.hint} />;
          return (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === 'select' ? (
                <Select value={String(value ?? '')} onChange={e => set(f.key, e.target.value === '' ? undefined : f.numeric ? Number(e.target.value) : e.target.value)}>
                  {f.options?.(data, r).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === 'number' ? (
                <NumberInput value={value as number | undefined} onValue={n => set(f.key, n)} />
              ) : (
                <Input autoFocus={i === 0} type={f.type === 'date' ? 'date' : 'text'} value={String(value ?? '')} onChange={e => set(f.key, e.target.value)} />
              )}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
};

export const GenericMaster: React.FC<{ config: MasterConfig }> = ({ config }) => {
  const { data, deleteMaster } = useBooks();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const records = data[config.masterKey] as unknown as Record<string, unknown>[];
  const labelOf = config.labelOf ?? (r => String(r.name ?? r.id));
  const visible = records.filter(r => labelOf(r).toLowerCase().includes(q.trim().toLowerCase()));

  const remove = async (r: Record<string, unknown>) => {
    const reason = config.blockDelete?.(r, data);
    if (reason) { toast(reason, 'warn'); return; }
    if (await confirm({ title: `Delete ${labelOf(r)}?`, confirmLabel: 'Delete', danger: true })) deleteMaster(config.masterKey, String(r.id));
  };

  return (
    <Page>
      <PageHeader title={config.title} hint={config.hint} actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New {config.singular.toLowerCase()}</button>} />
      {records.length > 8 && <div className="w-72 mb-3"><SearchBox value={q} onChange={setQ} /></div>}
      <Card flush>
        {records.length === 0 ? <Empty title={`No ${config.title.toLowerCase()} yet`} action={<button className="btn btn-primary" onClick={() => setCreating(true)}>Add the first one</button>} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>{config.columns.map(c => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}<th /></tr></thead>
              <tbody>
                {visible.map(r => (
                  <tr key={String(r.id)}>
                    {config.columns.map(c => <td key={c.label} className={c.num ? 'num' : ''}>{c.render(r, data)}</td>)}
                    <td className="text-right whitespace-nowrap">
                      {!config.locked?.(r) && <>
                        <button className="btn btn-ghost btn-sm" aria-label={`Change ${labelOf(r)}`} onClick={() => setEditing(r)}><Pencil className="w-4 h-4 text-slate-500" /></button>
                        <button className="btn btn-ghost btn-sm" aria-label={`Delete ${labelOf(r)}`} onClick={() => void remove(r)}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {creating && <MasterForm config={config} onClose={() => setCreating(false)} />}
      {editing && <MasterForm config={config} initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
};

const nameCol = { label: 'Name', render: (r: Record<string, unknown>) => <span className="font-medium">{String(r.name)}</span> };
const uniqueName = (key: MasterKey, label: string) => (r: Record<string, unknown>, data: CompanyData) => {
  const name = String(r.name ?? '').trim().toLowerCase();
  const list = data[key] as unknown as { id: string; name: string }[];
  return list.some(x => x.id !== r.id && x.name.toLowerCase() === name) ? `There is already a ${label} with that name.` : null;
};
const NATURE_LABEL: Record<Nature, string> = { ASSET: 'Asset', LIABILITY: 'Liability', INCOME: 'Income', EXPENSE: 'Expense' };

export const GroupsPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'groups', title: 'Groups', singular: 'Group', idPrefix: 'grp',
    hint: 'Groups decide where each account appears on your Balance Sheet and Profit & Loss. You have the 28 standard ones, and can add your own under them.',
    blank: data => ({ name: '', parentId: G.indirectExpense, nature: data.groups.find(g => g.id === G.indirectExpense)?.nature }),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'parentId', label: 'Under', type: 'select', required: true, options: data => [...data.groups].sort((a, b) => a.name.localeCompare(b.name)).map(g => ({ value: g.id, label: g.name })) },
    ],
    columns: [
      nameCol,
      { label: 'Under', render: (r, data) => (r.parentId ? data.groups.find(g => g.id === r.parentId)?.name : 'Primary') },
      { label: 'Type', render: (r, data) => NATURE_LABEL[primaryGroupOf(data, String(r.id))?.nature ?? 'ASSET'] },
      { label: '', render: r => (r.isSystem ? <Pill>Standard</Pill> : null) },
    ],
    locked: r => !!r.isSystem,
    validate: (r, data) => {
      // A group takes its nature from the group it sits under.
      const parent = data.groups.find(g => g.id === r.parentId) as Group | undefined;
      if (parent) r.nature = parent.nature;
      return uniqueName('groups', 'group')(r, data);
    },
    blockDelete: (r, data) => {
      if (data.groups.some(g => g.parentId === r.id)) return 'Move or remove the groups under it first.';
      if (data.ledgers.some(l => l.groupId === r.id)) return 'Move or remove the accounts in it first.';
      return null;
    },
  }} />
);

export const VoucherTypesPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'voucherTypes', title: 'Entry Types', singular: 'Entry type', idPrefix: 'vt',
    hint: 'Add your own kinds of entry with their own numbering, such as "Retainer Invoice" numbered RET-001. Tally calls these voucher types.',
    blank: () => ({ name: '', base: 'SALES', prefix: '', autoNumber: true }),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'base', label: 'Behaves like', type: 'select', options: () => VOUCHER_ORDER.map(b => ({ value: b, label: VOUCHER_META[b].label })) },
      { key: 'prefix', label: 'Number prefix', required: true, hint: 'RET gives numbers like RET-001.' },
    ],
    columns: [
      nameCol,
      { label: 'Behaves like', render: r => VOUCHER_META[r.base as VoucherBase]?.label },
      { label: 'Tally name', render: r => VOUCHER_META[r.base as VoucherBase]?.tallyName },
      { label: 'Numbered', render: r => `${String(r.prefix)}-001` },
    ],
    locked: r => !!r.isSystem,
    validate: uniqueName('voucherTypes', 'entry type'),
    blockDelete: (r, data) => (data.vouchers.some(v => v.typeId === r.id) ? 'Entries already use this type.' : null),
  }} />
);

export const CurrenciesPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'currencies', title: 'Currencies', singular: 'Currency', idPrefix: 'cur', labelOf: r => String(r.code),
    hint: 'Currencies your foreign clients pay in. Keep the rate current: it is used to work out your gain or loss on what they owe you.',
    blank: () => ({ code: '', symbol: '', name: '', rate: 0 }),
    fields: [
      { key: 'code', label: 'Code', required: true, hint: 'USD, EUR, GBP...' },
      { key: 'symbol', label: 'Symbol', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'rate', label: 'Value of 1 unit in your currency', type: 'number', required: true },
    ],
    columns: [
      { label: 'Code', render: r => <span className="font-medium">{String(r.code)}</span> },
      { label: 'Name', render: r => String(r.name) },
      { label: 'Symbol', render: r => String(r.symbol) },
      { label: 'Rate', num: true, render: r => fmt(Number(r.rate)) },
    ],
    blockDelete: (r, data) => (data.ledgers.some(l => l.currencyId === r.id) ? 'A client is billed in this currency.' : null),
  }} />
);

export const CostCategoriesPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'costCategories', title: 'Project Categories', singular: 'Category', idPrefix: 'cc',
    hint: 'Optional groupings for your projects. Tally calls these cost categories.',
    blank: () => ({ name: '' }),
    fields: [{ key: 'name', label: 'Name', required: true }],
    columns: [nameCol, { label: 'Projects', num: true, render: (r, data) => data.costCentres.filter(c => c.categoryId === r.id).length }],
    validate: uniqueName('costCategories', 'category'),
    blockDelete: (r, data) => (data.costCentres.some(c => c.categoryId === r.id) ? 'Projects use this category.' : null),
  }} />
);

export const ScenariosPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'scenarios', title: 'Scenarios', singular: 'Scenario', idPrefix: 'sc',
    hint: 'A what-if view of your profit that includes entries normally kept out of your books.',
    blank: () => ({ name: '', includeOptional: true, includeMemo: true, includeReversing: true }),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'includeOptional', label: 'Include optional entries', type: 'toggle' },
      { key: 'includeMemo', label: 'Include memos', type: 'toggle' },
      { key: 'includeReversing', label: 'Include reversing journals', type: 'toggle' },
    ],
    columns: [
      nameCol,
      { label: 'Includes', render: r => [r.includeOptional && 'Optional', r.includeMemo && 'Memos', r.includeReversing && 'Reversing journals'].filter(Boolean).join(', ') },
    ],
    validate: uniqueName('scenarios', 'scenario'),
  }} />
);

export const StockGroupsPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'stockGroups', title: 'Stock Groups', singular: 'Stock group', idPrefix: 'sg',
    hint: 'Group similar items together. The Stock Summary totals by group.',
    blank: () => ({ name: '' }),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'parentId', label: 'Under', type: 'select', options: data => [{ value: '', label: 'Primary' }, ...data.stockGroups.map(g => ({ value: g.id, label: g.name }))] },
    ],
    columns: [nameCol, { label: 'Under', render: (r, data) => data.stockGroups.find(g => g.id === r.parentId)?.name ?? 'Primary' }, { label: 'Items', num: true, render: (r, data) => data.stockItems.filter(i => i.groupId === r.id).length }],
    validate: uniqueName('stockGroups', 'stock group'),
    blockDelete: (r, data) => (data.stockItems.some(i => i.groupId === r.id) || data.stockGroups.some(g => g.parentId === r.id) ? 'Items or groups still use this.' : null),
  }} />
);

export const StockCategoriesPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'stockCategories', title: 'Stock Categories', singular: 'Stock category', idPrefix: 'sc',
    hint: 'A second way to classify items, alongside groups.',
    blank: () => ({ name: '' }),
    fields: [{ key: 'name', label: 'Name', required: true }],
    columns: [nameCol, { label: 'Items', num: true, render: (r, data) => data.stockItems.filter(i => i.categoryId === r.id).length }],
    validate: uniqueName('stockCategories', 'stock category'),
    blockDelete: (r, data) => (data.stockItems.some(i => i.categoryId === r.id) ? 'Items use this category.' : null),
  }} />
);

export const UnitsPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'units', title: 'Units of Measure', singular: 'Unit', idPrefix: 'u', labelOf: r => String(r.symbol),
    hint: 'How you count your stock.',
    blank: () => ({ symbol: '', name: '', decimals: 0 }),
    fields: [
      { key: 'symbol', label: 'Symbol', required: true, hint: 'Pcs, Kg, Box...' },
      { key: 'name', label: 'Name', required: true },
      { key: 'decimals', label: 'Decimal places', type: 'number' },
    ],
    columns: [{ label: 'Symbol', render: r => <span className="font-medium">{String(r.symbol)}</span> }, { label: 'Name', render: r => String(r.name) }, { label: 'Decimal places', num: true, render: r => String(r.decimals ?? 0) }],
    blockDelete: (r, data) => (data.stockItems.some(i => i.unitId === r.id) ? 'Items use this unit.' : null),
  }} />
);

export const GodownsPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'godowns', title: 'Stock Locations', singular: 'Location', idPrefix: 'gd',
    hint: 'The places you keep stock. Tally calls these godowns.',
    blank: () => ({ name: '' }),
    fields: [{ key: 'name', label: 'Name', required: true }, { key: 'address', label: 'Address' }],
    columns: [nameCol, { label: 'Address', render: r => String(r.address ?? '') }],
    validate: uniqueName('godowns', 'location'),
    blockDelete: (r, data) => {
      if (data.godowns.length === 1) return 'You need at least one location.';
      return data.stockItems.some(i => i.openingGodownId === r.id) || data.vouchers.some(v => v.stock?.some(s => s.godownId === r.id)) ? 'Stock is recorded at this location.' : null;
    },
  }} />
);

export const EmployeeGroupsPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'employeeGroups', title: 'Employee Groups', singular: 'Employee group', idPrefix: 'eg',
    hint: 'Groups of staff, such as departments.',
    blank: () => ({ name: '' }),
    fields: [{ key: 'name', label: 'Name', required: true }],
    columns: [nameCol, { label: 'Employees', num: true, render: (r, data) => data.employees.filter(e => e.groupId === r.id).length }],
    validate: uniqueName('employeeGroups', 'employee group'),
    blockDelete: (r, data) => (data.employees.some(e => e.groupId === r.id) ? 'Employees are in this group.' : null),
  }} />
);

export const AttendanceTypesPage: React.FC = () => (
  <GenericMaster config={{
    masterKey: 'attendanceTypes', title: 'Attendance Types', singular: 'Attendance type', idPrefix: 'at',
    hint: 'What you record for staff. Present and absent days decide attendance-based pay.',
    blank: () => ({ name: '', effect: 'PRESENT', unit: 'Days' }),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'effect', label: 'Counts as', type: 'select', options: () => [{ value: 'PRESENT', label: 'Days present' }, { value: 'ABSENT', label: 'Days absent' }, { value: 'OVERTIME', label: 'Overtime' }] },
      { key: 'unit', label: 'Unit', required: true },
    ],
    columns: [nameCol, { label: 'Counts as', render: r => ({ PRESENT: 'Days present', ABSENT: 'Days absent', OVERTIME: 'Overtime' }[String(r.effect)]) }, { label: 'Unit', render: r => String(r.unit) }],
    validate: uniqueName('attendanceTypes', 'attendance type'),
    blockDelete: (r, data) => (data.vouchers.some(v => v.attendance?.some(a => a.typeId === r.id)) ? 'Attendance has been recorded with this type.' : null),
  }} />
);

// ---------------------------------------------------------------- ledgers

export const LedgersPage: React.FC = () => {
  const { data, deleteMaster } = useBooks();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Ledger | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => [...data.ledgers].sort((a, b) => a.name.localeCompare(b.name)).filter(l => `${l.name} ${l.alias ?? ''} ${data.groups.find(g => g.id === l.groupId)?.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())), [data.ledgers, data.groups, q]);

  const remove = async (l: Ledger) => {
    if (l.isSystem) { toast(`${l.name} is needed by the software.`, 'warn'); return; }
    if (data.vouchers.some(v => v.partyId === l.id || v.lines.some(x => x.ledgerId === l.id))) { toast(`${l.name} has entries, so it cannot be deleted.`, 'warn'); return; }
    if (data.payHeads.some(h => h.ledgerId === l.id || h.liabilityLedgerId === l.id)) { toast('A pay head posts to this account.', 'warn'); return; }
    if (Math.abs(l.openingBalance) >= 0.005) { toast(`${l.name} has an opening balance. Clear it first.`, 'warn'); return; }
    if (await confirm({ title: `Delete ${l.name}?`, confirmLabel: 'Delete', danger: true })) deleteMaster('ledgers', l.id);
  };

  return (
    <Page>
      <PageHeader title="Ledgers" hint="Every account in your books: clients, vendors, banks, income and expenses." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New account</button>} />
      <div className="w-72 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search accounts" /></div>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Group</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className="cursor-pointer hover:bg-brand-50" onClick={() => navigate(`/reports/ledger/${l.id}`)}>
                  <td className="font-medium">{l.name}</td>
                  <td className="text-slate-600">{data.groups.find(g => g.id === l.groupId)?.name ?? 'Primary'}</td>
                  <td className="num">{drCr(ledgerBalanceNow(data, l.id))}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" aria-label={`Change ${l.name}`} onClick={e => { e.stopPropagation(); setEditing(l); }}><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button className="btn btn-ghost btn-sm" aria-label={`Delete ${l.name}`} onClick={e => { e.stopPropagation(); void remove(l); }}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {creating && <LedgerDialog onSaved={() => {}} onClose={() => setCreating(false)} />}
      {editing && <LedgerDialog initial={editing} onSaved={() => {}} onClose={() => setEditing(null)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- stock items

const StockItemDialog: React.FC<{ initial?: StockItem; onClose: () => void }> = ({ initial, onClose }) => {
  const { data, features, saveMaster } = useBooks();
  const [it, setIt] = useState<StockItem>(() => initial ?? { id: newId('it'), name: '', unitId: data.units[0]?.id ?? '', openingQty: 0, openingRate: 0, openingGodownId: data.godowns[0]?.id });
  const [error, setError] = useState('');
  const set = (patch: Partial<StockItem>) => setIt(x => ({ ...x, ...patch }));
  const enter = useEnterToNext<HTMLDivElement>();
  const bom = it.bom ?? [];
  const save = () => {
    const name = it.name.trim();
    if (!name) return setError('Give the item a name.');
    if (data.stockItems.some(x => x.id !== it.id && x.name.toLowerCase() === name.toLowerCase())) return setError(`There is already an item called ${name}.`);
    if (!it.unitId) return setError('Choose a unit.');
    saveMaster('stockItems', { ...it, name, bom: bom.filter(b => b.itemId && b.qty > 0) });
    onClose();
  };
  return (
    <Modal title={initial ? 'Change stock item' : 'New stock item'} size="lg" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" data-accept onClick={save}>Save</button>
    </>}>
      <div ref={enter.ref} onKeyDown={enter.onKeyDown} className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input autoFocus value={it.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Unit">
            <Select value={it.unitId} onChange={e => set({ unitId: e.target.value })}>{data.units.map(u => <option key={u.id} value={u.id}>{u.symbol}: {u.name}</option>)}</Select>
          </Field>
          <Field label="Group">
            <Select value={it.groupId ?? ''} onChange={e => set({ groupId: e.target.value || undefined })}>
              <option value="">Primary</option>{data.stockGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={it.categoryId ?? ''} onChange={e => set({ categoryId: e.target.value || undefined })}>
              <option value="">None</option>{data.stockCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Selling price"><NumberInput value={it.salePrice} onValue={salePrice => set({ salePrice })} /></Field>
          <Field label="Buying price"><NumberInput value={it.purchasePrice} onValue={purchasePrice => set({ purchasePrice })} /></Field>
          {features.vat && <>
            <Field label="VAT rate">
              <Select value={it.vatRate ?? ''} onChange={e => set({ vatRate: e.target.value === '' ? undefined : Number(e.target.value) })}>
                <option value="">None</option>{VAT_RATES.map(r => <option key={r} value={r}>{vatRateLabel(r)}</option>)}
              </Select>
            </Field>
          </>}
          <Field label="Reorder when stock falls to"><NumberInput value={it.reorderLevel} onValue={reorderLevel => set({ reorderLevel })} /></Field>
          <Field label="Order at least"><NumberInput value={it.minOrderQty} onValue={minOrderQty => set({ minOrderQty })} /></Field>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <h3 className="font-semibold mb-2">Opening stock</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Quantity"><NumberInput value={it.openingQty} onValue={openingQty => set({ openingQty })} /></Field>
            <Field label="Cost per unit"><NumberInput value={it.openingRate} onValue={openingRate => set({ openingRate })} /></Field>
            <Field label="Location">
              <Select value={it.openingGodownId ?? ''} onChange={e => set({ openingGodownId: e.target.value })}>{data.godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
            </Field>
          </div>
          {it.openingQty * it.openingRate > 0 && <p className="hint mt-1">Opening value {fmt(it.openingQty * it.openingRate)}. Your opening balances must include this to balance.</p>}
        </div>
        <div className="border-t border-slate-100 pt-3">
          <h3 className="font-semibold">Parts list</h3>
          <p className="hint mb-2">If you make this item from others, list what one unit uses. A Stock Journal can then fill it in. Tally calls this a bill of materials.</p>
          {bom.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2 mb-1.5 items-center">
              <Combo value={b.itemId} onChange={itemId => set({ bom: bom.map((x, n) => (n === i ? { ...x, itemId } : x)) })} options={data.stockItems.filter(x => x.id !== it.id).map(x => ({ id: x.id, label: x.name }))} ariaLabel="Part" />
              <NumberInput value={b.qty} onValue={qty => set({ bom: bom.map((x, n) => (n === i ? { ...x, qty } : x)) })} aria-label="Quantity" />
              <button className="btn btn-ghost btn-sm" aria-label="Remove part" onClick={() => set({ bom: bom.filter((_, n) => n !== i) })}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={() => set({ bom: [...bom, { itemId: '', qty: 1 }] })}>Add a part</button>
        </div>
      </div>
    </Modal>
  );
};

export const StockItemsPage: React.FC = () => {
  const { data, deleteMaster } = useBooks();
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = data.stockItems.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()));
  const remove = async (it: StockItem) => {
    if (data.vouchers.some(v => v.stock?.some(s => s.itemId === it.id))) { toast(`${it.name} has stock entries, so it cannot be deleted.`, 'warn'); return; }
    if (data.stockItems.some(x => x.bom?.some(b => b.itemId === it.id))) { toast('Another item lists this as a part.', 'warn'); return; }
    if (await confirm({ title: `Delete ${it.name}?`, confirmLabel: 'Delete', danger: true })) deleteMaster('stockItems', it.id);
  };
  return (
    <Page>
      <PageHeader title="Stock Items" hint="The goods you buy and sell." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New item</button>} />
      <div className="w-72 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search items" /></div>
      <Card flush>
        {data.stockItems.length === 0 ? <Empty title="No stock items yet" action={<button className="btn btn-primary" onClick={() => setCreating(true)}>Add your first item</button>} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Group</th><th>Unit</th><th className="num">VAT</th><th className="num">Selling price</th><th className="num">Opening qty</th><th /></tr></thead>
              <tbody>
                {rows.map(i => (
                  <tr key={i.id} className="cursor-pointer hover:bg-brand-50" onClick={() => navigate(`/inventory/item/${i.id}`)}>
                    <td className="font-medium">{i.name}</td>
                    <td>{data.stockGroups.find(g => g.id === i.groupId)?.name ?? 'Primary'}</td>
                    <td>{data.units.find(u => u.id === i.unitId)?.symbol}</td>
                    <td className="num">{i.vatRate === undefined ? '' : vatRateLabel(i.vatRate)}</td>
                    <td className="num">{i.salePrice ? fmt(i.salePrice) : ''}</td>
                    <td className="num">{fmtQty(i.openingQty)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button className="btn btn-ghost btn-sm" aria-label={`Change ${i.name}`} onClick={e => { e.stopPropagation(); setEditing(i); }}><Pencil className="w-4 h-4 text-slate-500" /></button>
                      <button className="btn btn-ghost btn-sm" aria-label={`Delete ${i.name}`} onClick={e => { e.stopPropagation(); void remove(i); }}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {creating && <StockItemDialog onClose={() => setCreating(false)} />}
      {editing && <StockItemDialog initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- budgets

const BudgetDialog: React.FC<{ initial?: Budget; onClose: () => void }> = ({ initial, onClose }) => {
  const { data, company, saveMaster } = useBooks();
  const [b, setB] = useState<Budget>(() => initial ?? { id: newId('bud'), name: '', from: company.periodFrom, to: company.periodTo, lines: [] });
  const [error, setError] = useState('');
  const set = (patch: Partial<Budget>) => setB(x => ({ ...x, ...patch }));
  const setLine = (i: number, patch: Partial<BudgetLine>) => set({ lines: b.lines.map((l, n) => (n === i ? { ...l, ...patch } : l)) });
  const save = () => {
    if (!b.name.trim()) return setError('Give the budget a name.');
    if (b.from > b.to) return setError('The start date must be on or before the end date.');
    const lines = b.lines.filter(l => l.refId && l.amount);
    if (!lines.length) return setError('Add at least one line with an amount.');
    saveMaster('budgets', { ...b, name: b.name.trim(), lines });
    onClose();
  };
  return (
    <Modal title={initial ? 'Change budget' : 'New budget'} size="lg" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={save}>Save</button>
    </>}>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Name"><Input autoFocus value={b.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="From"><Input type="date" value={b.from} onChange={e => set({ from: e.target.value })} /></Field>
          <Field label="To"><Input type="date" value={b.to} onChange={e => set({ to: e.target.value })} /></Field>
        </div>
        {b.lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[8rem_1fr_9rem_auto] gap-2 items-center">
            <Select value={l.kind} onChange={e => setLine(i, { kind: e.target.value as BudgetLine['kind'], refId: '' })} aria-label="Line kind">
              <option value="LEDGER">Account</option><option value="GROUP">Group</option>
            </Select>
            {l.kind === 'LEDGER'
              ? <LedgerCombo value={l.refId} onChange={refId => setLine(i, { refId })} ariaLabel="Account" />
              : <Combo value={l.refId} onChange={refId => setLine(i, { refId })} options={data.groups.map(g => ({ id: g.id, label: g.name }))} ariaLabel="Group" />}
            <NumberInput value={l.amount} onValue={amount => setLine(i, { amount })} aria-label="Budget amount" />
            <button className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => set({ lines: b.lines.filter((_, n) => n !== i) })}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button className="btn btn-sm self-start" onClick={() => set({ lines: [...b.lines, { kind: 'LEDGER', refId: '', amount: 0 }] })}>Add a line</button>
      </div>
    </Modal>
  );
};

export const BudgetsPage: React.FC = () => {
  const { data, deleteMaster } = useBooks();
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <Page>
      <PageHeader title="Budgets" hint="Spending and income targets. Compare them with actual figures under Reports." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New budget</button>} />
      <Card flush>
        {data.budgets.length === 0 ? <Empty title="No budgets yet" /> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Period</th><th className="num">Lines</th><th /></tr></thead>
            <tbody>
              {data.budgets.map(b => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td><td>{fmtDate(b.from)} to {fmtDate(b.to)}</td><td className="num">{b.lines.length}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" aria-label={`Change ${b.name}`} onClick={() => setEditing(b)}><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button className="btn btn-ghost btn-sm" aria-label={`Delete ${b.name}`} onClick={() => { void confirm({ title: `Delete ${b.name}?`, confirmLabel: 'Delete', danger: true }).then(y => { if (y) deleteMaster('budgets', b.id); }); }}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <BudgetDialog onClose={() => setCreating(false)} />}
      {editing && <BudgetDialog initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- employees and pay heads

const EmployeeDialog: React.FC<{ initial?: Employee; onClose: () => void }> = ({ initial, onClose }) => {
  const { data, saveMaster } = useBooks();
  const [e, setE] = useState<Employee>(() => initial ?? { id: newId('emp'), name: '', salary: [] });
  const [error, setError] = useState('');
  const set = (patch: Partial<Employee>) => setE(x => ({ ...x, ...patch }));
  const setPay = (headId: string, amount: number | undefined, on: boolean) => {
    const others = e.salary.filter(s => s.headId !== headId);
    set({ salary: on ? [...others, { headId, amount }] : others });
  };
  const save = () => {
    if (!e.name.trim()) return setError('Enter the employee\'s name.');
    saveMaster('employees', { ...e, name: e.name.trim() });
    onClose();
  };
  return (
    <Modal title={initial ? 'Change employee' : 'New employee'} size="lg" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={save}>Save</button>
    </>}>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input autoFocus value={e.name} onChange={x => set({ name: x.target.value })} /></Field>
          <Field label="Employee number"><Input value={e.code ?? ''} onChange={x => set({ code: x.target.value })} /></Field>
          <Field label="Designation"><Input value={e.designation ?? ''} onChange={x => set({ designation: x.target.value })} /></Field>
          <Field label="Group">
            <Select value={e.groupId ?? ''} onChange={x => set({ groupId: x.target.value || undefined })}>
              <option value="">None</option>{data.employeeGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="Joining date"><Input type="date" value={e.joinDate ?? ''} onChange={x => set({ joinDate: x.target.value })} /></Field>
          <Field label="Emirates ID"><Input value={e.pan ?? ''} onChange={x => set({ pan: x.target.value })} placeholder="784-...." /></Field>
          <Field label="PF number"><Input value={e.pfNo ?? ''} onChange={x => set({ pfNo: x.target.value })} /></Field>
          <Field label="ESI number"><Input value={e.esiNo ?? ''} onChange={x => set({ esiNo: x.target.value })} /></Field>
          <Field label="Bank"><Input value={e.bankName ?? ''} onChange={x => set({ bankName: x.target.value })} /></Field>
          <Field label="Account number"><Input value={e.accountNo ?? ''} onChange={x => set({ accountNo: x.target.value })} /></Field>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <h3 className="font-semibold">Salary structure</h3>
          {data.payHeads.length === 0 && <p className="hint">Add pay heads first, such as Basic Pay.</p>}
          {data.payHeads.map(h => {
            const line = e.salary.find(s => s.headId === h.id);
            return (
              <div key={h.id} className="grid grid-cols-[1fr_9rem] gap-2 items-center py-1">
                <Toggle checked={!!line} onChange={on => setPay(h.id, line?.amount, on)} label={h.name} hint={h.calc === 'PERCENT' ? `${h.pct}% worked out automatically` : h.calc === 'ATTENDANCE' ? 'Monthly, adjusted for attendance' : 'Fixed monthly amount'} />
                {line && h.calc !== 'PERCENT' ? <NumberInput value={line.amount} onValue={n => setPay(h.id, n, true)} aria-label={`${h.name} amount`} /> : <span />}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export const EmployeesPage: React.FC = () => {
  const { data, deleteMaster } = useBooks();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const remove = async (e: Employee) => {
    if (data.vouchers.some(v => v.payroll?.some(r => r.employeeId === e.id) || v.attendance?.some(a => a.employeeId === e.id))) { toast(`${e.name} has payroll records.`, 'warn'); return; }
    if (await confirm({ title: `Delete ${e.name}?`, confirmLabel: 'Delete', danger: true })) deleteMaster('employees', e.id);
  };
  return (
    <Page>
      <PageHeader title="Employees" hint="Your staff and what each is paid." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New employee</button>} />
      <Card flush>
        {data.employees.length === 0 ? <Empty title="No employees yet" /> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Designation</th><th>Group</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {data.employees.map(e => (
                <tr key={e.id}>
                  <td className="font-medium">{e.name}</td><td>{e.designation}</td><td>{data.employeeGroups.find(g => g.id === e.groupId)?.name}</td><td>{fmtDate(e.joinDate)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" aria-label={`Change ${e.name}`} onClick={() => setEditing(e)}><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button className="btn btn-ghost btn-sm" aria-label={`Delete ${e.name}`} onClick={() => void remove(e)}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <EmployeeDialog onClose={() => setCreating(false)} />}
      {editing && <EmployeeDialog initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
};

const PayHeadDialog: React.FC<{ initial?: PayHead; onClose: () => void }> = ({ initial, onClose }) => {
  const { data, saveMaster } = useBooks();
  const [h, setH] = useState<PayHead>(() => initial ?? { id: newId('ph'), name: '', kind: 'EARNING', calc: 'FLAT', ledgerId: '' });
  const [error, setError] = useState('');
  const set = (patch: Partial<PayHead>) => setH(x => ({ ...x, ...patch }));
  const save = () => {
    if (!h.name.trim()) return setError('Give the pay head a name.');
    if (!h.ledgerId) return setError('Choose the account this posts to.');
    if (h.kind === 'EMPLOYER' && !h.liabilityLedgerId) return setError('Choose the account the employer amount is owed to.');
    if (h.calc === 'PERCENT' && (!h.pct || !h.basisHeadIds?.length)) return setError('Enter a percentage and tick what it is worked out on.');
    saveMaster('payHeads', { ...h, name: h.name.trim() });
    onClose();
  };
  return (
    <Modal title={initial ? 'Change pay head' : 'New pay head'} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={save}>Save</button>
    </>}>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <Field label="Name"><Input autoFocus value={h.name} onChange={e => set({ name: e.target.value })} placeholder="Basic Pay, HRA, Employee PF..." /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kind">
            <Select value={h.kind} onChange={e => set({ kind: e.target.value as PayHead['kind'] })}>
              <option value="EARNING">Earning: paid to the employee</option>
              <option value="DEDUCTION">Deduction: taken from their pay</option>
              <option value="EMPLOYER">Employer contribution: your extra cost</option>
            </Select>
          </Field>
          <Field label="Worked out as">
            <Select value={h.calc} onChange={e => set({ calc: e.target.value as PayHead['calc'] })}>
              <option value="FLAT">Fixed monthly amount</option>
              <option value="ATTENDANCE">Monthly, adjusted for attendance</option>
              <option value="PERCENT">Percentage of other heads</option>
            </Select>
          </Field>
        </div>
        {h.calc === 'PERCENT' && (
          <div className="grid sm:grid-cols-[8rem_1fr] gap-3 items-start">
            <Field label="Percent"><NumberInput value={h.pct} onValue={pct => set({ pct })} /></Field>
            <div>
              <span className="label">Of</span>
              {data.payHeads.filter(x => x.id !== h.id && x.kind === 'EARNING').map(x => (
                <Toggle key={x.id} label={x.name} checked={!!h.basisHeadIds?.includes(x.id)} onChange={on => set({ basisHeadIds: on ? [...(h.basisHeadIds ?? []), x.id] : (h.basisHeadIds ?? []).filter(id => id !== x.id) })} />
              ))}
            </div>
          </div>
        )}
        <Field label={h.kind === 'DEDUCTION' ? 'Owed to account' : 'Expense account'}><LedgerCombo value={h.ledgerId} onChange={ledgerId => set({ ledgerId })} ariaLabel="Account" newGroupId={h.kind === 'DEDUCTION' ? G.duties : G.indirectExpense} /></Field>
        {h.kind === 'EMPLOYER' && <Field label="Owed to account"><LedgerCombo value={h.liabilityLedgerId ?? ''} onChange={liabilityLedgerId => set({ liabilityLedgerId })} ariaLabel="Owed to" newGroupId={G.duties} /></Field>}
        <Field label="Statutory type" hint="Shows this head on the PF and PT summary.">
          <Select value={h.statutory ?? ''} onChange={e => set({ statutory: (e.target.value || undefined) as PayHead['statutory'] })}>
            <option value="">None</option><option value="PF">Provident Fund</option><option value="ESI">ESI</option><option value="PT">Professional Tax</option><option value="TDS">TDS on salary</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
};

export const PayHeadsPage: React.FC = () => {
  const { data, deleteMaster } = useBooks();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState<PayHead | null>(null);
  const [creating, setCreating] = useState(false);
  const remove = async (h: PayHead) => {
    if (data.employees.some(e => e.salary.some(s => s.headId === h.id)) || data.payHeads.some(x => x.basisHeadIds?.includes(h.id))) { toast('Employees or other pay heads use this.', 'warn'); return; }
    if (await confirm({ title: `Delete ${h.name}?`, confirmLabel: 'Delete', danger: true })) deleteMaster('payHeads', h.id);
  };
  return (
    <Page>
      <PageHeader title="Pay Heads" hint="The parts that make up a salary." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New pay head</button>} />
      <Card flush>
        {data.payHeads.length === 0 ? <Empty title="No pay heads yet" hint="Start with Basic Pay." /> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Kind</th><th>Worked out as</th><th>Account</th><th /></tr></thead>
            <tbody>
              {data.payHeads.map(h => (
                <tr key={h.id}>
                  <td className="font-medium">{h.name}</td>
                  <td>{{ EARNING: 'Earning', DEDUCTION: 'Deduction', EMPLOYER: 'Employer contribution' }[h.kind]}</td>
                  <td>{h.calc === 'PERCENT' ? `${h.pct}%` : h.calc === 'ATTENDANCE' ? 'By attendance' : 'Fixed'}</td>
                  <td>{ledgerName(data, h.ledgerId)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" aria-label={`Change ${h.name}`} onClick={() => setEditing(h)}><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button className="btn btn-ghost btn-sm" aria-label={`Delete ${h.name}`} onClick={() => void remove(h)}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <PayHeadDialog onClose={() => setCreating(false)} />}
      {editing && <PayHeadDialog initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
};

// ---------------------------------------------------------------- hub pages

export const MastersHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="Accounts" hint="Everything you set up once and use again. Tally calls these masters." sections={[{ title: 'Accounts', items: destinationsIn(features, 'Accounts') }]} />;
};
export const InventoryHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="Inventory" hint="Goods, stock levels and locations." sections={[{ title: 'Set up', items: destinationsIn(features, 'Inventory') }, { title: 'Reports', items: destinationsIn(features, 'Inventory Reports') }]} />;
};
export const PayrollHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="Payroll" hint="For when you hire staff." sections={[{ title: 'Set up', items: destinationsIn(features, 'Payroll') }, { title: 'Reports', items: destinationsIn(features, 'Payroll Reports') }]} />;
};
export const BankingHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="Banking" hint="Keep your books matched to your bank." sections={[{ title: 'Banking', items: destinationsIn(features, 'Banking') }]} />;
};
export const TaxHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="VAT & Tax" hint="Figures to prepare your FTA VAT return from." sections={[{ title: 'Returns and registers', items: destinationsIn(features, 'VAT & Tax') }]} />;
};
export const ReportsHub: React.FC = () => {
  const { features } = useBooks();
  return (
    <Hub
      title="Reports" hint="Click any figure in a report to see what is behind it."
      sections={['Financial Statements', 'Books & Registers', 'Outstandings', 'Analysis', 'Inventory Reports', 'VAT & Tax', 'Payroll Reports']
        .map(s => ({ title: s, items: destinationsIn(features, s) }))}
    />
  );
};
export const ToolsHub: React.FC = () => {
  const { features } = useBooks();
  return <Hub title="Business & Tools" hint="Your business details, backups and settings." sections={[{ title: 'Business & Tools', items: destinationsIn(features, 'Business & Tools') }]} />;
};

export { budgetActual };
