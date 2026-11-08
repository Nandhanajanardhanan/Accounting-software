// Stock entries (notes, orders, stock journal, physical count) and payroll entries (attendance, salaries).
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AttendanceRow, PayrollRow, StockLine, Voucher, VoucherBase } from '../../core/types';
import { G } from '../../core/defaults';
import { computePay, godownQuantities, isCashOrBank, isInGroup, itemCostNow, itemOf, itemQtyNow, monthsBetween, payrollLines, round2 } from '../../core/engine';
import { fmt, fmtMonth, fmtQty } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { useTrackUnsaved } from '../../ui/Shell';
import { Field, Input, NumberInput } from '../../ui/kit';
import { blankKey, type Builder, GodownSelect, LedgerCombo, StockCombo } from './parts';

// ---------------------------------------------------------------- notes and orders

const NOTE_DIRECTION: Partial<Record<VoucherBase, 'IN' | 'OUT'>> = {
  DELIVERY_NOTE: 'OUT', RECEIPT_NOTE: 'IN', REJECTION_IN: 'IN', REJECTION_OUT: 'OUT', SALES_ORDER: 'OUT', PURCHASE_ORDER: 'IN',
};

type StockRow = Omit<StockLine, 'id' | 'amount' | 'direction'> & { key: string; direction?: 'IN' | 'OUT' };

export const NoteEditor: React.FC<{ base: VoucherBase; existing?: Voucher; source?: Voucher; registerBuilder: (b: Builder) => void }> = ({ base, existing, source, registerBuilder }) => {
  const { data, features } = useBooks();
  const original = existing ?? source;
  const clientSide = ['DELIVERY_NOTE', 'REJECTION_IN', 'SALES_ORDER'].includes(base);
  const isOrder = base === 'SALES_ORDER' || base === 'PURCHASE_ORDER';
  const [partyId, setPartyId] = useState(original?.partyId ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [reference, setReference] = useState(existing?.reference ?? '');
  const [rows, setRows] = useState<StockRow[]>(() => (original?.stock ?? []).map(s => ({ key: blankKey(), itemId: s.itemId, godownId: s.godownId, qty: s.qty, rate: s.rate, batch: s.batch, expiry: s.expiry })));
  const set = (key: string, patch: Partial<StockRow>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const direction = NOTE_DIRECTION[base]!;
  useTrackUnsaved({ partyId, dueDate, reference, rows: rows.map(({ key: _key, ...r }) => r) });

  useEffect(() => {
    registerBuilder(() => {
      const errors: string[] = [];
      if (!partyId) errors.push(`Choose the ${clientSide ? 'client' : 'vendor'}.`);
      const used = rows.filter(r => r.itemId);
      if (!used.length) errors.push('Add at least one item.');
      if (used.some(r => r.qty <= 0)) errors.push('Every item needs a quantity.');
      const stock: StockLine[] = used.map(r => ({
        id: r.key, itemId: r.itemId, godownId: r.godownId ?? data.godowns[0]?.id, qty: r.qty, rate: r.rate, amount: round2(r.qty * r.rate), direction, batch: r.batch, expiry: r.expiry,
      }));
      return { errors, patch: { lines: [], stock, partyId, dueDate: dueDate || undefined, reference: reference.trim() || undefined, orderId: source?.orderId ?? existing?.orderId } };
    });
  });

  const total = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label={clientSide ? 'Client' : 'Vendor'}>
          <LedgerCombo value={partyId} onChange={setPartyId} autoFocus={!partyId} ariaLabel={clientSide ? 'Client' : 'Vendor'} newGroupId={clientSide ? G.debtors : G.creditors}
            filter={l => isInGroup(data, l.groupId, clientSide ? G.debtors : G.creditors)} />
        </Field>
        {isOrder && <Field label="Due by"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>}
        <Field label="Reference"><Input value={reference} onChange={e => setReference(e.target.value)} /></Field>
      </div>
      <ItemsGrid rows={rows} set={set} setRows={setRows} showGodown={!isOrder} showRate batches={features.batches} sale={clientSide} />
      <div className="text-right font-bold tabular-nums">Value: {fmt(total)}</div>
    </div>
  );
};

const ItemsGrid: React.FC<{
  rows: StockRow[];
  set: (key: string, patch: Partial<StockRow>) => void;
  setRows: React.Dispatch<React.SetStateAction<StockRow[]>>;
  showGodown: boolean;
  showRate: boolean;
  batches?: boolean;
  sale?: boolean;
  direction?: 'IN' | 'OUT';
  title?: string;
}> = ({ rows, set, setRows, showGodown, showRate, batches, sale, direction, title }) => {
  const { data } = useBooks();
  const visible = rows.filter(r => !direction || r.direction === direction);
  return (
    <div>
      {title && <h3 className="font-semibold mb-1.5">{title}</h3>}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="tbl tbl-compact min-w-[560px]">
          <thead>
            <tr>
              <th>Item</th>{showGodown && data.godowns.length > 1 && <th>Location</th>}
              <th className="num w-24">Qty</th>{showRate && <th className="num w-28">Rate</th>}
              {batches && <><th className="w-24">Batch</th><th className="w-32">Expiry</th></>}
              {showRate && <th className="num w-28">Amount</th>}<th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.key}>
                <td><StockCombo value={r.itemId} onChange={itemId => {
                  const it = itemOf(data, itemId);
                  const cost = direction ? itemCostNow(data, itemId) : (sale ? it?.salePrice : it?.purchasePrice) ?? 0;
                  set(r.key, { itemId, rate: round2(cost), godownId: r.godownId ?? data.godowns[0]?.id });
                }} /></td>
                {showGodown && data.godowns.length > 1 && <td><GodownSelect value={r.godownId} onChange={godownId => set(r.key, { godownId })} /></td>}
                <td><NumberInput cell value={r.qty} onValue={qty => set(r.key, { qty })} aria-label="Quantity" /></td>
                {showRate && <td><NumberInput cell value={r.rate} onValue={rate => set(r.key, { rate })} aria-label="Rate" /></td>}
                {batches && <>
                  <td><input className="cell-input" value={r.batch ?? ''} onChange={e => set(r.key, { batch: e.target.value })} aria-label="Batch" /></td>
                  <td><input className="cell-input" type="date" value={r.expiry ?? ''} onChange={e => set(r.key, { expiry: e.target.value })} aria-label="Expiry" /></td>
                </>}
                {showRate && <td className="num align-middle">{r.qty * r.rate ? fmt(r.qty * r.rate) : ''}</td>}
                <td><button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove item" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-sm mt-2" onClick={() => setRows(rs => [...rs, { key: blankKey(), itemId: '', qty: 1, rate: 0, godownId: data.godowns[0]?.id, direction }])}><Plus className="w-3.5 h-3.5" /> Add item</button>
    </div>
  );
};

// ---------------------------------------------------------------- stock journal

export const StockJournalEditor: React.FC<{ existing?: Voucher; registerBuilder: (b: Builder) => void }> = ({ existing, registerBuilder }) => {
  const { data } = useBooks();
  const [rows, setRows] = useState<StockRow[]>(() => (existing?.stock ?? []).map(s => ({ key: blankKey(), itemId: s.itemId, godownId: s.godownId, qty: s.qty, rate: s.rate, direction: s.direction })));
  const set = (key: string, patch: Partial<StockRow>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const [buildItem, setBuildItem] = useState('');
  const [buildQty, setBuildQty] = useState(1);

  useTrackUnsaved(rows.map(({ key: _key, ...r }) => r));

  const sourceValue = round2(rows.filter(r => r.direction === 'OUT').reduce((s, r) => s + r.qty * r.rate, 0));
  const made = rows.filter(r => r.direction === 'IN');
  const madeValue = round2(made.reduce((s, r) => s + r.qty * r.rate, 0));

  const useBom = () => {
    const item = itemOf(data, buildItem);
    if (!item?.bom?.length) return;
    const godownId = data.godowns[0]?.id;
    const parts: StockRow[] = item.bom.map(b => ({ key: blankKey(), itemId: b.itemId, qty: b.qty * buildQty, rate: round2(itemCostNow(data, b.itemId)), godownId, direction: 'OUT' }));
    const cost = parts.reduce((s, p) => s + p.qty * p.rate, 0);
    setRows([...parts, { key: blankKey(), itemId: item.id, qty: buildQty, rate: round2(cost / (buildQty || 1)), godownId, direction: 'IN' }]);
  };

  useEffect(() => {
    registerBuilder(() => {
      const used = rows.filter(r => r.itemId);
      const errors: string[] = [];
      if (!used.some(r => r.direction === 'OUT') && !used.some(r => r.direction === 'IN')) errors.push('Add at least one item.');
      if (used.some(r => r.qty <= 0)) errors.push('Every item needs a quantity.');
      const stock: StockLine[] = used.map(r => ({ id: r.key, itemId: r.itemId, godownId: r.godownId ?? data.godowns[0]?.id, qty: r.qty, rate: r.rate, amount: round2(r.qty * r.rate), direction: r.direction! }));
      return { errors, patch: { lines: [], stock } };
    });
  });

  const withBom = data.stockItems.filter(i => i.bom?.length);
  return (
    <div className="flex flex-col gap-4">
      {withBom.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 border border-slate-200 rounded-lg p-3">
          <Field label="Make a finished item" className="min-w-64">
            <select className="input" value={buildItem} onChange={e => setBuildItem(e.target.value)}>
              <option value="">Choose</option>
              {withBom.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="How many" className="w-24"><NumberInput value={buildQty} onValue={setBuildQty} /></Field>
          <button className="btn" disabled={!buildItem} onClick={useBom}>Fill in from its parts list</button>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        <ItemsGrid title="Goes out (used up or moved from)" rows={rows} set={set} setRows={setRows} showGodown showRate direction="OUT" />
        <ItemsGrid title="Comes in (made or moved to)" rows={rows} set={set} setRows={setRows} showGodown showRate direction="IN" />
      </div>
      <div className="hint text-right tabular-nums">Value out {fmt(sourceValue)} · Value in {fmt(madeValue)}</div>
    </div>
  );
};

// ---------------------------------------------------------------- physical stock

export const PhysicalEditor: React.FC<{ existing?: Voucher; date: string; registerBuilder: (b: Builder) => void }> = ({ existing, date, registerBuilder }) => {
  const { data } = useBooks();
  const [rows, setRows] = useState<StockRow[]>(() => (existing?.stock ?? []).map(s => ({ key: blankKey(), itemId: s.itemId, godownId: s.godownId, qty: s.qty, rate: s.rate })));
  const set = (key: string, patch: Partial<StockRow>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const onHand = useMemo(() => godownQuantities(data, date), [data, date]);
  useTrackUnsaved(rows.map(({ key: _key, ...r }) => r));

  useEffect(() => {
    registerBuilder(() => {
      const used = rows.filter(r => r.itemId);
      const errors = used.length ? [] : ['Add at least one item you counted.'];
      const stock: StockLine[] = used.map(r => ({ id: r.key, itemId: r.itemId, godownId: r.godownId ?? data.godowns[0]?.id, qty: r.qty, rate: round2(itemCostNow(data, r.itemId)), amount: round2(r.qty * itemCostNow(data, r.itemId)), direction: 'IN' }));
      return { errors, patch: { lines: [], stock } };
    });
  });

  return (
    <div>
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="tbl tbl-compact min-w-[560px]">
          <thead><tr><th>Item</th><th>Location</th><th className="num w-28">Your books say</th><th className="num w-28">You counted</th><th className="num w-24">Difference</th><th className="w-9" /></tr></thead>
          <tbody>
            {rows.map(r => {
              const book = r.itemId ? onHand.get(r.godownId ?? data.godowns[0]?.id ?? '')?.get(r.itemId) ?? 0 : 0;
              return (
                <tr key={r.key}>
                  <td><StockCombo value={r.itemId} onChange={itemId => set(r.key, { itemId })} /></td>
                  <td><GodownSelect value={r.godownId} onChange={godownId => set(r.key, { godownId })} /></td>
                  <td className="num align-middle">{r.itemId ? fmtQty(book) : ''}</td>
                  <td><NumberInput cell value={r.qty} onValue={qty => set(r.key, { qty })} aria-label="Counted quantity" /></td>
                  <td className="num align-middle">{r.itemId ? fmtQty(r.qty - book) : ''}</td>
                  <td><button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove item" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn btn-sm mt-2" onClick={() => setRows(rs => [...rs, { key: blankKey(), itemId: '', qty: 0, rate: 0, godownId: data.godowns[0]?.id }])}><Plus className="w-3.5 h-3.5" /> Add item</button>
    </div>
  );
};

// ---------------------------------------------------------------- attendance

export const AttendanceEditor: React.FC<{ existing?: Voucher; registerBuilder: (b: Builder) => void }> = ({ existing, registerBuilder }) => {
  const { data } = useBooks();
  const [values, setValues] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const a of existing?.attendance ?? []) out[`${a.employeeId}|${a.typeId}`] = a.value;
    return out;
  });
  useEffect(() => {
    registerBuilder(() => {
      const attendance: AttendanceRow[] = Object.entries(values).filter(([, v]) => v > 0).map(([k, value]) => {
        const [employeeId, typeId] = k.split('|');
        return { employeeId, typeId, value };
      });
      return { errors: attendance.length ? [] : ['Enter attendance for at least one employee.'], patch: { lines: [], attendance } };
    });
  });
  if (!data.employees.length) return <p className="hint">Add your employees first, under Payroll.</p>;
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto">
      <table className="tbl tbl-compact">
        <thead><tr><th>Employee</th>{data.attendanceTypes.map(t => <th key={t.id} className="num w-28">{t.name} ({t.unit})</th>)}</tr></thead>
        <tbody>
          {data.employees.map(e => (
            <tr key={e.id}>
              <td className="align-middle">{e.name}</td>
              {data.attendanceTypes.map(t => (
                <td key={t.id}><NumberInput cell value={values[`${e.id}|${t.id}`]} onValue={n => setValues(v => ({ ...v, [`${e.id}|${t.id}`]: n }))} aria-label={`${e.name} ${t.name}`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------- payroll

export const PayrollEditor: React.FC<{ existing?: Voucher; date: string; registerBuilder: (b: Builder) => void }> = ({ existing, date, registerBuilder }) => {
  const { data } = useBooks();
  const [month, setMonth] = useState(existing?.payrollMonth ?? date.slice(0, 7));
  const [payLedgerId, setPayLedgerId] = useState(() => {
    const existingCredit = existing?.lines.filter(l => l.side === 'CR').sort((a, b) => b.amount - a.amount)[0]?.ledgerId;
    return existingCredit ?? data.ledgers.find(l => /salar.*payable/i.test(l.name))?.id ?? '';
  });
  const rows: PayrollRow[] = useMemo(() => data.employees.map(e => {
    const p = computePay(data, e.id, month);
    return { employeeId: e.id, days: p.days, earnings: p.earnings, deductions: p.deductions, employer: p.employer, net: p.net };
  }).filter(r => r.earnings.length > 0), [data, month]);
  const posting = useMemo(() => payrollLines(data, rows, payLedgerId), [data, rows, payLedgerId]);

  useEffect(() => {
    registerBuilder(() => {
      const errors: string[] = [];
      if (!rows.length) errors.push('No employees have a salary structure yet. Add one under Employees.');
      if (!payLedgerId) errors.push('Choose the bank account, or a Salary Payable account, that pays the salaries.');
      const already = data.vouchers.find(v => v.type === 'PAYROLL' && v.payrollMonth === month && v.id !== existing?.id && !v.isCancelled);
      if (already) errors.push(`Payroll for ${fmtMonth(month)} is already recorded as ${already.number}.`);
      return { errors, patch: { lines: posting.lines, payroll: rows, payrollMonth: month } };
    });
  });

  const months = useMemo(() => monthsBetween(data.company.booksFrom, data.company.periodTo), [data.company.booksFrom, data.company.periodTo]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Month">
          <select className="input" value={month} onChange={e => setMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </Field>
        <Field label="Pay from" hint="A bank pays now. A Salary Payable account records what you owe, and you pay it later.">
          <LedgerCombo value={payLedgerId} onChange={setPayLedgerId} ariaLabel="Pay from" newGroupId={G.currentLiabilities}
            filter={l => isCashOrBank(data, l) || isInGroup(data, l.groupId, G.currentLiabilities)} />
        </Field>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Employee</th><th className="num">Paid days</th><th className="num">Earnings</th><th className="num">Deductions</th><th className="num">Employer cost</th><th className="num">Net pay</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.employeeId}>
                <td>{data.employees.find(e => e.id === r.employeeId)?.name}</td>
                <td className="num">{r.days}</td>
                <td className="num">{fmt(r.earnings.reduce((s, x) => s + x.amount, 0))}</td>
                <td className="num">{fmt(r.deductions.reduce((s, x) => s + x.amount, 0))}</td>
                <td className="num">{fmt(r.employer.reduce((s, x) => s + x.amount, 0))}</td>
                <td className="num font-semibold">{fmt(r.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={5}>Total net pay</td><td className="num">{fmt(posting.net)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
};
