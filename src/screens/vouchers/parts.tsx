// Pieces shared by the entry screens: account pickers, invoice-settlement and project dialogs, and what every editor returns.
import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { BillAlloc, CompanyData, CostAlloc, Ledger, Voucher, VoucherLine } from '../../core/types';
import { G } from '../../core/defaults';
import { autoAllocate, isCashOrBank, isInGroup, isStockLedger, itemQtyNow, ledgerBalanceNow, pendingBillsFor, primaryGroupOf, round2 } from '../../core/engine';
import { drCr, fmt, fmtDate, fmtQty } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Combo, type ComboOption, Input, Modal, Notice, NumberInput, Select } from '../../ui/kit';
import { LedgerDialog } from '../masters/LedgerForm';

export interface BuildResult {
  errors: string[];
  warnings?: string[];
  patch?: Partial<Voucher>;
  /**
   * Money paid at the time of an invoice or purchase, saved as a linked receipt or payment.
   * null removes an earlier one; leave it out when the editor has no such choice.
   */
  settlement?: { type: 'RECEIPT' | 'PAYMENT'; lines: VoucherLine[] } | null;
}

/** Each editor hands the frame a function that turns its fields into a voucher. */
export type Builder = () => BuildResult;

export const blankKey = () => `r_${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------- account picker

export function ledgerOptions(data: CompanyData, filter: (l: Ledger) => boolean, firstGroups: string[] = []): ComboOption[] {
  const rank = (l: Ledger) => {
    const i = firstGroups.findIndex(g => isInGroup(data, l.groupId, g));
    return i === -1 ? firstGroups.length : i;
  };
  return data.ledgers
    .filter(l => l.groupId !== '' && !isStockLedger(data, l) && filter(l))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map(l => {
      const direct = data.groups.find(g => g.id === l.groupId);
      const bal = ledgerBalanceNow(data, l.id);
      return { id: l.id, label: l.name, hint: Math.abs(bal) >= 0.005 ? drCr(bal) : undefined, section: direct?.name ?? primaryGroupOf(data, l.groupId)?.name };
    });
}

export const LedgerCombo: React.FC<{
  value: string;
  onChange: (id: string) => void;
  filter?: (l: Ledger) => boolean;
  firstGroups?: string[];
  newGroupId?: string;
  placeholder?: string;
  cell?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}> = ({ value, onChange, filter = () => true, firstGroups, newGroupId, placeholder = 'Type to search', cell, autoFocus, ariaLabel }) => {
  const { data } = useBooks();
  const [creating, setCreating] = useState<string | null>(null);
  const options = useMemo(() => ledgerOptions(data, filter, firstGroups), [data, filter, firstGroups]);
  return (
    <>
      <Combo value={value} onChange={onChange} options={options} placeholder={placeholder} cell={cell} autoFocus={autoFocus} ariaLabel={ariaLabel} onCreate={setCreating} createLabel="New account" />
      {creating !== null && <LedgerDialog defaultName={creating} defaultGroupId={newGroupId} onSaved={l => onChange(l.id)} onClose={() => setCreating(null)} />}
    </>
  );
};

/** Groups that make sense in each kind of entry. */
export const notCashOrBank = (data: CompanyData) => (l: Ledger) => !isCashOrBank(data, l);
export const onlyCashOrBank = (data: CompanyData) => (l: Ledger) => isCashOrBank(data, l);
export const isClientOrVendor = (data: CompanyData, l: Ledger) => isInGroup(data, l.groupId, G.debtors) || isInGroup(data, l.groupId, G.creditors);

// ---------------------------------------------------------------- invoice settlement

const BILL_TYPES: { id: BillAlloc['type']; label: string }[] = [
  { id: 'AGST', label: 'Against an invoice' },
  { id: 'NEW', label: 'New invoice or bill' },
  { id: 'ADVANCE', label: 'Advance' },
  { id: 'ON_ACCOUNT', label: 'On account' },
];

export const BillDialog: React.FC<{
  ledger: Ledger;
  side: 'DR' | 'CR';
  amount: number;
  date: string;
  voucherId?: string;
  value: BillAlloc[];
  onSave: (bills: BillAlloc[]) => void;
  onClose: () => void;
}> = ({ ledger, side, amount, date, voucherId, value, onSave, onClose }) => {
  const { data } = useBooks();
  const pending = useMemo(() => pendingBillsFor(data, ledger.id, side, date, voucherId), [data, ledger.id, side, date, voucherId]);
  const [rows, setRows] = useState<BillAlloc[]>(value.length ? value : [{ type: pending.length ? 'AGST' : 'ON_ACCOUNT', ref: '', amount }]);
  const allocated = round2(rows.reduce((s, r) => s + r.amount, 0));
  const left = round2(amount - allocated);
  const set = (i: number, patch: Partial<BillAlloc>) => setRows(rs => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const invalid = rows.some(r => r.type !== 'ON_ACCOUNT' && !r.ref.trim()) || Math.abs(left) >= 0.005;
  return (
    <Modal
      title={`Settle ${fmt(amount)} for ${ledger.name}`} size="lg" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={invalid} onClick={() => { onSave(rows.map(r => ({ ...r, ref: r.ref.trim() }))); onClose(); }}>Use this</button>
      </>}
    >
      <table className="tbl mb-3">
        <thead><tr><th>Type</th><th>Invoice or bill</th><th>Due date</th><th className="num">Amount</th><th /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="w-48">
                <Select value={r.type} onChange={e => set(i, { type: e.target.value as BillAlloc['type'], ref: '' })}>
                  {BILL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </td>
              <td>
                {r.type === 'AGST' ? (
                  <Select value={r.ref} onChange={e => {
                    const bill = pending.find(b => b.ref === e.target.value);
                    set(i, { ref: e.target.value, amount: bill ? Math.min(Math.abs(bill.pending), r.amount || Math.abs(bill.pending)) : r.amount });
                  }}>
                    <option value="">Choose</option>
                    {r.ref && !pending.some(b => b.ref === r.ref) && <option value={r.ref}>{r.ref}</option>}
                    {pending.map(b => <option key={b.ref} value={b.ref}>{b.ref} ({fmtDate(b.date)}): {fmt(Math.abs(b.pending))} open</option>)}
                  </Select>
                ) : r.type === 'ON_ACCOUNT' ? (
                  <span className="hint">No specific invoice</span>
                ) : (
                  <Input value={r.ref} onChange={e => set(i, { ref: e.target.value })} placeholder={r.type === 'ADVANCE' ? 'ADV-1' : 'Bill number'} aria-label="Reference" />
                )}
              </td>
              <td className="w-40">{r.type === 'NEW' ? <Input type="date" value={r.dueDate ?? ''} onChange={e => set(i, { dueDate: e.target.value })} aria-label="Due date" /> : null}</td>
              <td className="w-36"><NumberInput value={r.amount} onValue={n => set(i, { amount: n })} aria-label="Amount" /></td>
              <td className="w-8"><button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setRows(rs => rs.filter((_, n) => n !== i))}><Trash2 className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <button className="btn btn-sm" onClick={() => setRows(rs => [...rs, { type: pending.length ? 'AGST' : 'ON_ACCOUNT', ref: '', amount: Math.max(0, left) }])}>Add a line</button>
        <span className={Math.abs(left) >= 0.005 ? 'font-semibold text-rose-700' : 'hint'}>
          {Math.abs(left) >= 0.005 ? `${fmt(Math.abs(left))} ${left > 0 ? 'still to place' : 'too much'}` : 'All placed'}
        </span>
      </div>
    </Modal>
  );
};

export const describeBills = (bills: { type: string; ref: string; amount: number }[]) => bills.map(b => {
  if (b.type === 'ON_ACCOUNT') return `${fmt(b.amount)} on account`;
  if (b.type === 'NEW') return `new ${b.ref || 'bill'}`;
  if (b.type === 'ADVANCE') return `advance ${b.ref}`;
  return `${fmt(b.amount)} against ${b.ref}`;
}).join(', ');

/** The settlement to use: what was chosen by hand, otherwise the oldest open bills first. */
export function billsForLine(data: CompanyData, ledger: Ledger, side: 'DR' | 'CR', amount: number, date: string, chosen: BillAlloc[] | undefined, voucherId?: string): BillAlloc[] | undefined {
  if (!data.company.features.billWise || !ledger.billWise || !amount) return undefined;
  if (chosen?.length) return chosen;
  return autoAllocate(data, ledger.id, side, amount, date, voucherId);
}

// ---------------------------------------------------------------- project split

export const SplitDialog: React.FC<{ amount: number; value: CostAlloc[]; onSave: (costs: CostAlloc[]) => void; onClose: () => void }> = ({ amount, value, onSave, onClose }) => {
  const { data } = useBooks();
  const [rows, setRows] = useState<CostAlloc[]>(value.length ? value : [{ centreId: '', amount }]);
  const left = round2(amount - rows.reduce((s, r) => s + r.amount, 0));
  const set = (i: number, patch: Partial<CostAlloc>) => setRows(rs => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const options = data.costCentres.map(c => ({ id: c.id, label: c.name }));
  return (
    <Modal
      title={`Split ${fmt(amount)} across projects`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={Math.abs(left) >= 0.005 || rows.some(r => !r.centreId)} onClick={() => { onSave(rows); onClose(); }}>Use this</button>
      </>}
    >
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_9rem_auto] gap-2 mb-2 items-center">
          <Combo value={r.centreId} onChange={centreId => set(i, { centreId })} options={options} placeholder="Project" ariaLabel="Project" />
          <NumberInput value={r.amount} onValue={n => set(i, { amount: n })} aria-label="Amount" />
          <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setRows(rs => rs.filter((_, n) => n !== i))}><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex items-center justify-between mt-2">
        <button className="btn btn-sm" onClick={() => setRows(rs => [...rs, { centreId: '', amount: Math.max(0, left) }])}>Add a project</button>
        <span className={Math.abs(left) >= 0.005 ? 'font-semibold text-rose-700' : 'hint'}>{Math.abs(left) >= 0.005 ? `${fmt(Math.abs(left))} ${left > 0 ? 'still to place' : 'too much'}` : 'All placed'}</span>
      </div>
    </Modal>
  );
};

export const ProjectCombo: React.FC<{ value: string; onChange: (id: string) => void; cell?: boolean; clientId?: string; ariaLabel?: string }> = ({ value, onChange, cell, clientId, ariaLabel = 'Project' }) => {
  const { data } = useBooks();
  const options = useMemo(() => {
    const active = data.costCentres.filter(c => c.status !== 'DONE' || c.id === value);
    const rank = (c: { clientId?: string }) => (clientId && c.clientId === clientId ? 0 : 1);
    return [...active].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }));
  }, [data.costCentres, value, clientId]);
  return (
    <div className="relative">
      <Combo value={value} onChange={onChange} options={options} placeholder="No project" cell={cell} ariaLabel={ariaLabel} />
      {value && <button tabIndex={-1} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer" onClick={() => onChange('')} aria-label="Clear project">✕</button>}
    </div>
  );
};

// ---------------------------------------------------------------- stock item picker

export const StockCombo: React.FC<{ value: string; onChange: (id: string) => void; ariaLabel?: string }> = ({ value, onChange, ariaLabel = 'Item' }) => {
  const { data } = useBooks();
  const options = useMemo(() => data.stockItems.map(i => {
    const unit = data.units.find(u => u.id === i.unitId)?.symbol ?? '';
    return { id: i.id, label: i.name, hint: `${fmtQty(itemQtyNow(data, i.id))} ${unit}` };
  }), [data]);
  return <Combo value={value} onChange={onChange} options={options} cell placeholder="Choose an item" ariaLabel={ariaLabel} />;
};

export const GodownSelect: React.FC<{ value?: string; onChange: (id: string) => void }> = ({ value, onChange }) => {
  const { data } = useBooks();
  return (
    <select className="cell-input" value={value ?? ''} onChange={e => onChange(e.target.value)} aria-label="Location">
      {data.godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
};

export const Errors: React.FC<{ errors: string[] }> = ({ errors }) => errors.length === 0 ? null : (
  <Notice tone="bad" className="mb-3">
    {errors.length === 1 ? errors[0] : <ul className="list-disc pl-4">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
  </Notice>
);
