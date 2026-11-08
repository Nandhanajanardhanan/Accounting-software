// Payment, Receipt, Transfer, Journal and Memo entry. Plain words by default; a Dr/Cr view for accountants.
import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { BankInfo, BankMode, BillAlloc, CostAlloc, Side, Voucher, VoucherBase, VoucherLine } from '../../core/types';
import { CASH_LEDGER_ID, G, TDS_RECEIVABLE_LEDGER_ID } from '../../core/defaults';
import { isCashOrBank, isInGroup, isPnlLedger, isStockLedger, isZero, ledgerBalanceNow, ledgerOf, round2 } from '../../core/engine';
import { drCr, fmt } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { useTrackUnsaved } from '../../ui/Shell';
import { Field, Input, NumberInput, Select } from '../../ui/kit';
import { BillDialog, billsForLine, blankKey, type Builder, describeBills, isClientOrVendor, LedgerCombo, notCashOrBank, onlyCashOrBank, ProjectCombo, SplitDialog } from './parts';

interface Row {
  key: string;
  ledgerId: string;
  side: Side;
  amount: number;
  bills?: BillAlloc[];
  costs?: CostAlloc[];
  fc?: number;
  rate?: number;
}

const blankRow = (side: Side): Row => ({ key: blankKey(), ledgerId: '', side, amount: 0 });

// The side the money account sits on, and the words used for each kind of entry.
const WORDS: Partial<Record<VoucherBase, { account: string; accountSide: Side; rows: string; amountHint?: string }>> = {
  PAYMENT: { account: 'Paid from', accountSide: 'CR', rows: 'Paid for' },
  RECEIPT: { account: 'Received into', accountSide: 'DR', rows: 'Received from' },
  CONTRA: { account: 'Move money from', accountSide: 'CR', rows: 'Move money to' },
};

const fromLine = (l: VoucherLine): Row => ({
  key: blankKey(), ledgerId: l.ledgerId, side: l.side, amount: l.amount, bills: l.bills, costs: l.costs,
  fc: l.forex?.fcAmount, rate: l.forex?.rate,
});

interface Props {
  base: VoucherBase;
  date: string;
  voucherId?: string;
  existing?: Voucher;
  prefill?: { party?: string; amount?: number; ref?: string; ledger?: string; project?: string };
  registerBuilder: (b: Builder) => void;
}

export const AccountingEditor: React.FC<Props> = ({ base, date, voucherId, existing, prefill, registerBuilder }) => {
  const { data, features } = useBooks();
  const words = WORDS[base];

  const initial = useMemo(() => {
    const bank: BankInfo = { mode: 'NEFT' };
    if (existing) {
      const withBank = existing.lines.find(l => l.bank);
      if (withBank?.bank) Object.assign(bank, withBank.bank);
      if (words) {
        const moneyLines = existing.lines.filter(l => {
          const led = ledgerOf(data, l.ledgerId);
          return l.side === words.accountSide && !!led && isCashOrBank(data, led);
        });
        const tdsLine = base === 'RECEIPT' ? existing.lines.find(l => l.ledgerId === TDS_RECEIVABLE_LEDGER_ID && l.side === 'DR') : undefined;
        const rest = existing.lines.filter(l => !moneyLines.includes(l) && l !== tdsLine);
        // Only entries of the plain shape open in the plain view.
        if (moneyLines.length === 1 && rest.every(l => l.side !== words.accountSide)) {
          return { view: 'simple' as const, account: moneyLines[0].ledgerId, rows: [...rest.map(fromLine), blankRow(rest[0]?.side ?? 'DR')], bank, tds: tdsLine?.amount ?? 0 };
        }
      }
      return { view: 'drcr' as const, account: '', rows: [...existing.lines.map(fromLine), blankRow('DR')], bank, tds: 0 };
    }
    if (words) {
      const side: Side = words.accountSide === 'DR' ? 'CR' : 'DR';
      const rows: Row[] = [];
      const ledgerId = prefill?.party ?? prefill?.ledger;
      if (ledgerId) {
        const costs = prefill?.project && prefill?.amount ? [{ centreId: prefill.project, amount: prefill.amount }] : prefill?.project ? [{ centreId: prefill.project, amount: 0 }] : undefined;
        rows.push({
          key: blankKey(), ledgerId, side, amount: prefill?.amount ?? 0, costs,
          bills: prefill?.ref && prefill?.amount ? [{ type: 'AGST', ref: prefill.ref, amount: prefill.amount }] : undefined,
        });
      }
      rows.push(blankRow(side));
      const firstBank = data.ledgers.find(l => isInGroup(data, l.groupId, G.bank));
      const defaultAccount = base === 'CONTRA' ? firstBank?.id ?? CASH_LEDGER_ID : firstBank?.id ?? CASH_LEDGER_ID;
      return { view: 'simple' as const, account: defaultAccount, rows, bank, tds: 0 };
    }
    return { view: 'drcr' as const, account: '', rows: [blankRow('DR'), blankRow('CR'), blankRow('DR')], bank, tds: 0 };
  }, [existing, base, data, prefill, words]);

  const [view, setView] = useState<'simple' | 'drcr'>(initial.view);
  const [account, setAccount] = useState(initial.account);
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [bank, setBank] = useState<BankInfo>(initial.bank);
  const [tds, setTds] = useState(initial.tds);
  const [billRow, setBillRow] = useState<string | null>(null);
  const [splitRow, setSplitRow] = useState<string | null>(null);

  useTrackUnsaved({ view, account, rows: rows.map(({ key: _key, ...r }) => r), bank, tds });

  const setRow = (key: string, patch: Partial<Row>) => setRows(rs => {
    const next = rs.map(r => (r.key === key ? { ...r, ...patch } : r));
    // There is always one empty row ready for the next line.
    return next[next.length - 1].ledgerId ? [...next, blankRow(view === 'simple' ? next[0].side : flip(next))] : next;
  });
  const flip = (list: Row[]): Side => {
    const dr = list.filter(r => r.side === 'DR').reduce((s, r) => s + r.amount, 0);
    const cr = list.filter(r => r.side === 'CR').reduce((s, r) => s + r.amount, 0);
    return dr > cr ? 'CR' : 'DR';
  };

  const filled = rows.filter(r => r.ledgerId);
  const total = round2(filled.reduce((s, r) => s + r.amount, 0));
  const drTotal = round2(filled.filter(r => r.side === 'DR').reduce((s, r) => s + r.amount, 0));
  const crTotal = round2(filled.filter(r => r.side === 'CR').reduce((s, r) => s + r.amount, 0));
  const difference = round2(drTotal - crTotal);

  const accountLedger = account ? ledgerOf(data, account) : undefined;
  const hasClient = filled.some(r => { const l = ledgerOf(data, r.ledgerId); return !!l && isInGroup(data, l.groupId, G.debtors); });
  const showTds = base === 'RECEIPT' && view === 'simple' && features.tds && hasClient && !!ledgerOf(data, TDS_RECEIVABLE_LEDGER_ID);

  const rowLedgers = useMemo(() => {
    if (base === 'CONTRA') return onlyCashOrBank(data);
    if (base === 'JOURNAL') return notCashOrBank(data);
    if (view === 'drcr') return () => true;
    return notCashOrBank(data);
  }, [base, data, view]);

  const firstGroups = useMemo(() => {
    if (base === 'RECEIPT') return [G.debtors, G.sales, G.directIncome, G.indirectIncome];
    if (base === 'PAYMENT') return [G.indirectExpense, G.directExpense, G.creditors, G.capital, G.duties];
    return [];
  }, [base]);
  const newRowGroup = base === 'RECEIPT' ? G.debtors : base === 'PAYMENT' ? G.indirectExpense : undefined;

  const usesBank = view === 'simple'
    ? (!!accountLedger && isCashOrBank(data, accountLedger) && account !== CASH_LEDGER_ID) || (base === 'CONTRA' && filled.some(r => r.ledgerId !== CASH_LEDGER_ID))
    : filled.some(r => { const l = ledgerOf(data, r.ledgerId); return !!l && isCashOrBank(data, l) && r.ledgerId !== CASH_LEDGER_ID; });

  useEffect(() => {
    registerBuilder(() => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const lines: VoucherLine[] = [];
      const lineOf = (r: Row): VoucherLine => {
        const led = ledgerOf(data, r.ledgerId)!;
        const costs = r.costs?.length
          ? (r.costs.length === 1 ? [{ centreId: r.costs[0].centreId, amount: r.amount }] : r.costs)
          : undefined;
        return {
          id: r.key, ledgerId: r.ledgerId, side: r.side, amount: r.amount,
          bills: billsForLine(data, led, r.side, r.amount, date, r.bills, voucherId),
          costs: costs && isPnlLedger(data, led) ? costs : undefined,
          forex: led.currencyId && r.fc ? { currencyId: led.currencyId, fcAmount: r.fc, rate: r.rate ?? 0 } : undefined,
        };
      };
      for (const r of filled) {
        if (r.amount <= 0) errors.push(`Enter the amount for ${ledgerOf(data, r.ledgerId)?.name}.`);
        const led = ledgerOf(data, r.ledgerId);
        if (led && isStockLedger(data, led)) errors.push(`${led.name} is a stock account, and cannot be used here. Stock is valued automatically.`);
        if (r.costs && r.costs.length > 1 && !isZero(r.costs.reduce((s, c) => s + c.amount, 0) - r.amount)) {
          errors.push(`The project split for ${led?.name} does not add up to ${fmt(r.amount)}.`);
        }
      }
      const bankOn = (ledgerId: string): BankInfo | undefined => {
        const led = ledgerOf(data, ledgerId);
        if (!led || !isCashOrBank(data, led) || ledgerId === CASH_LEDGER_ID) return undefined;
        const prior = existing?.lines.find(l => l.ledgerId === ledgerId)?.bank;
        return { ...bank, bankDate: prior?.bankDate };
      };

      if (view === 'simple') {
        if (!account) errors.push(`Choose where the money ${base === 'RECEIPT' ? 'went into' : 'came from'}.`);
        if (!filled.length) errors.push(`Add at least one line under "${words?.rows}".`);
        if (filled.some(r => r.ledgerId === account)) errors.push('The two sides cannot be the same account.');
        if (tds < 0) errors.push('TDS cannot be negative.');
        if (tds >= total && tds > 0) errors.push('TDS must be less than the amount received.');
        const received = round2(total - (showTds ? tds : 0));
        if (account) lines.push({ id: blankKey(), ledgerId: account, side: words!.accountSide, amount: received, bank: bankOn(account) });
        if (showTds && tds > 0) lines.push({ id: blankKey(), ledgerId: TDS_RECEIVABLE_LEDGER_ID, side: 'DR', amount: tds });
        for (const r of filled) lines.push({ ...lineOf(r), bank: bankOn(r.ledgerId) });
      } else {
        if (filled.length < 2) errors.push('An entry needs at least one debit and one credit line.');
        if (!isZero(difference)) errors.push(`Debits and credits differ by ${fmt(Math.abs(difference))}. They must be equal.`);
        for (const r of filled) lines.push({ ...lineOf(r), bank: bankOn(r.ledgerId) });
      }

      if (!errors.length) {
        for (const l of lines) {
          const led = ledgerOf(data, l.ledgerId)!;
          if (isCashOrBank(data, led) && l.side === 'CR') {
            const before = existing?.lines.filter(x => x.ledgerId === l.ledgerId).reduce((s, x) => s + (x.side === 'DR' ? x.amount : -x.amount), 0) ?? 0;
            const after = ledgerBalanceNow(data, l.ledgerId) - before - l.amount;
            if (after < -0.005) warnings.push(`${led.name} will go negative: ${drCr(after)}.`);
          }
        }
      }
      const party = filled.map(r => ledgerOf(data, r.ledgerId)).find(l => l && isClientOrVendor(data, l));
      return { errors, warnings, patch: { lines, partyId: party?.id } };
    });
  });

  const switchToDrCr = () => {
    const side = words?.accountSide ?? 'CR';
    const list: Row[] = [];
    if (account) list.push({ key: blankKey(), ledgerId: account, side, amount: round2(total - (showTds ? tds : 0)) });
    if (showTds && tds > 0) list.push({ key: blankKey(), ledgerId: TDS_RECEIVABLE_LEDGER_ID, side: 'DR', amount: tds });
    setRows([...list, ...filled, blankRow(flip([...list, ...filled]))]);
    setView('drcr');
  };

  const details = (r: Row) => {
    const led = r.ledgerId ? ledgerOf(data, r.ledgerId) : undefined;
    if (!led) return null;
    const bills = billsForLine(data, led, r.side, r.amount, date, r.bills, voucherId);
    const projects = features.costCentres && led.costCentres && isPnlLedger(data, led) && data.costCentres.length > 0;
    const foreign = features.multiCurrency && !!led.currencyId;
    if (!bills && !projects && !foreign) return null;
    const currency = foreign ? data.currencies.find(c => c.id === led.currencyId) : undefined;
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 pl-2 hint">
        {foreign && currency && (
          <span className="flex items-center gap-1.5">
            <span>{currency.code}</span>
            <NumberInput
              className="w-24 py-0.5" value={r.fc} aria-label={`Amount in ${currency.code}`}
              onValue={fc => { const rate = r.rate ?? currency.rate; setRow(r.key, { fc, rate, amount: round2(fc * rate) }); }}
            />
            <span>at</span>
            <NumberInput
              className="w-20 py-0.5" value={r.rate ?? currency.rate} aria-label="Exchange rate"
              onValue={rate => setRow(r.key, { rate, amount: round2((r.fc ?? 0) * rate) })}
            />
          </span>
        )}
        {projects && (
          r.costs && r.costs.length > 1
            ? <span>Split across {r.costs.length} projects <button className="text-brand-700 font-semibold cursor-pointer" onClick={() => setSplitRow(r.key)}>Change</button></span>
            : (
              <span className="flex items-center gap-2">
                <span className="w-56"><ProjectCombo cell value={r.costs?.[0]?.centreId ?? ''} onChange={id => setRow(r.key, { costs: id ? [{ centreId: id, amount: r.amount }] : undefined })} /></span>
                <button className="text-brand-700 font-semibold cursor-pointer" onClick={() => setSplitRow(r.key)}>Split</button>
              </span>
            )
        )}
        {bills && (
          <span>
            {describeBills(bills)}{' '}
            <button className="text-brand-700 font-semibold cursor-pointer" onClick={() => setBillRow(r.key)}>Change</button>
          </span>
        )}
      </div>
    );
  };

  const activeBillRow = rows.find(r => r.key === billRow);
  const activeSplitRow = rows.find(r => r.key === splitRow);
  const billLedger = activeBillRow ? ledgerOf(data, activeBillRow.ledgerId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {view === 'simple' && words && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={words.account} hint={accountLedger ? `Balance: ${drCr(ledgerBalanceNow(data, account))}` : undefined}>
            <LedgerCombo value={account} onChange={setAccount} filter={onlyCashOrBank(data)} newGroupId={G.bank} ariaLabel={words.account} placeholder="Cash or bank" />
          </Field>
        </div>
      )}

      {view === 'simple' ? (
        <div className="border border-slate-200 rounded-lg">
          <div className="grid grid-cols-[1fr_11rem_2.5rem] gap-2 px-2 py-2 bg-slate-50 rounded-t-lg font-semibold text-[0.8571rem] text-slate-600">
            <span className="pl-2">{words?.rows}</span><span className="text-right pr-2">Amount</span><span />
          </div>
          {rows.map(r => (
            <div key={r.key} className="border-t border-slate-100">
              <div className="grid grid-cols-[1fr_11rem_2.5rem] gap-2 px-2 py-1 items-center">
                <LedgerCombo cell value={r.ledgerId} onChange={ledgerId => setRow(r.key, { ledgerId, bills: undefined, costs: undefined })} filter={rowLedgers} firstGroups={firstGroups} newGroupId={newRowGroup} ariaLabel={words?.rows} placeholder="Type an expense, client or vendor" />
                <NumberInput cell value={r.amount} onValue={amount => setRow(r.key, { amount, bills: undefined })} placeholder="0.00" aria-label="Amount" />
                {r.ledgerId ? <button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button> : <span />}
              </div>
              {details(r)}
            </div>
          ))}
          {showTds && (
            <div className="grid grid-cols-[1fr_11rem_2.5rem] gap-2 px-2 py-2 items-center border-t border-slate-200 bg-slate-50/60">
              <span className="pl-2 hint">TDS the client deducted, if any. It is part of what they settled, and you claim it back when you file your return.</span>
              <NumberInput cell value={tds} onValue={setTds} placeholder="0.00" aria-label="TDS deducted by client" />
              <span />
            </div>
          )}
          <div className="grid grid-cols-[1fr_11rem_2.5rem] gap-2 px-2 py-2 border-t-2 border-slate-200 font-bold bg-slate-50 rounded-b-lg">
            <span className="pl-2">{showTds && tds > 0 ? `Total settled (${fmt(total - tds)} reached your account)` : 'Total'}</span>
            <span className="text-right pr-2 tabular-nums">{fmt(total)}</span><span />
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg">
          <div className="grid grid-cols-[1fr_9rem_9rem_2.5rem] gap-2 px-2 py-2 bg-slate-50 rounded-t-lg font-semibold text-[0.8571rem] text-slate-600">
            <span className="pl-2">Account</span><span className="text-right pr-2">Debit</span><span className="text-right pr-2">Credit</span><span />
          </div>
          {rows.map(r => (
            <div key={r.key} className="border-t border-slate-100">
              <div className="grid grid-cols-[1fr_9rem_9rem_2.5rem] gap-2 px-2 py-1 items-center">
                <LedgerCombo
                  cell value={r.ledgerId} filter={rowLedgers} ariaLabel="Account"
                  onChange={ledgerId => {
                    // A new line offers the amount that would balance the entry.
                    if (!r.amount && !isZero(difference)) setRow(r.key, { ledgerId, side: difference > 0 ? 'CR' : 'DR', amount: Math.abs(difference), bills: undefined, costs: undefined });
                    else setRow(r.key, { ledgerId, bills: undefined, costs: undefined });
                  }}
                />
                <NumberInput cell value={r.side === 'DR' ? r.amount : 0} onValue={amount => setRow(r.key, { side: 'DR', amount, bills: undefined })} placeholder="0.00" aria-label="Debit" />
                <NumberInput cell value={r.side === 'CR' ? r.amount : 0} onValue={amount => setRow(r.key, { side: 'CR', amount, bills: undefined })} placeholder="0.00" aria-label="Credit" />
                {r.ledgerId ? <button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button> : <span />}
              </div>
              {details(r)}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_9rem_9rem_2.5rem] gap-2 px-2 py-2 border-t-2 border-slate-200 font-bold bg-slate-50 rounded-b-lg">
            <span className={`pl-2 ${isZero(difference) ? 'text-emerald-700' : 'text-rose-700'}`}>{isZero(difference) ? (drTotal ? 'Balanced' : 'Total') : `Out by ${fmt(Math.abs(difference))}`}</span>
            <span className="text-right pr-2 tabular-nums">{fmt(drTotal)}</span>
            <span className="text-right pr-2 tabular-nums">{fmt(crTotal)}</span><span />
          </div>
        </div>
      )}

      {usesBank && (
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="How">
            <Select value={bank.mode} onChange={e => setBank(b => ({ ...b, mode: e.target.value as BankMode }))}>
              <option value="NEFT">Bank transfer</option><option value="CARD">Card</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label={bank.mode === 'CHEQUE' ? 'Cheque number' : 'Reference number'}>
            <Input value={bank.instrumentNo ?? ''} onChange={e => setBank(b => ({ ...b, instrumentNo: e.target.value }))} />
          </Field>
          {bank.mode === 'CHEQUE' && (
            <Field label="Cheque date"><Input type="date" value={bank.instrumentDate ?? ''} onChange={e => setBank(b => ({ ...b, instrumentDate: e.target.value }))} /></Field>
          )}
        </div>
      )}

      {view === 'simple' && words && (
        <button className="self-start text-brand-700 font-medium hint cursor-pointer no-print" onClick={switchToDrCr}>Use debit and credit view</button>
      )}

      {billRow && activeBillRow && billLedger && (
        <BillDialog
          ledger={billLedger} side={activeBillRow.side} amount={activeBillRow.amount} date={date} voucherId={voucherId}
          value={billsForLine(data, billLedger, activeBillRow.side, activeBillRow.amount, date, activeBillRow.bills, voucherId) ?? []}
          onSave={bills => setRow(billRow, { bills })} onClose={() => setBillRow(null)}
        />
      )}
      {splitRow && activeSplitRow && (
        <SplitDialog amount={activeSplitRow.amount} value={activeSplitRow.costs ?? []} onSave={costs => setRow(splitRow, { costs })} onClose={() => setSplitRow(null)} />
      )}
    </div>
  );
};
