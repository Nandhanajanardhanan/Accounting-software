// Creating or changing an account. The form only asks what matters for the kind of account chosen.
import React, { useMemo, useState } from 'react';
import type { Ledger, OpeningBill, TaxType } from '../../core/types';
import { G, UAE_PLACES, VAT_RATES, vatRateLabel } from '../../core/defaults';
import { isInGroup, natureOf, round2 } from '../../core/engine';
import { fmt } from '../../core/format';
import { newId, useBooks } from '../../store/BooksContext';
import { Combo, Field, Input, Modal, Notice, NumberInput, Select, Toggle, useEnterToNext } from '../../ui/kit';

interface Props {
  initial?: Ledger;
  defaultName?: string;
  defaultGroupId?: string;
  onSaved: (ledger: Ledger) => void;
  onClose: () => void;
}

const titleFor = (data: Parameters<typeof isInGroup>[0], groupId: string, editing: boolean) => {
  const verb = editing ? 'Change' : 'New';
  if (groupId && isInGroup(data, groupId, G.debtors)) return `${verb} client`;
  if (groupId && isInGroup(data, groupId, G.creditors)) return `${verb} vendor`;
  return `${verb} account`;
};

export const LedgerDialog: React.FC<Props> = ({ initial, defaultName = '', defaultGroupId, onSaved, onClose }) => {
  const { data, features, saveMaster } = useBooks();
  const [l, setL] = useState<Ledger>(() => initial ?? {
    id: newId('led'), name: defaultName, groupId: defaultGroupId ?? '', openingBalance: 0,
    billWise: defaultGroupId ? isInGroup(data, defaultGroupId, G.debtors) || isInGroup(data, defaultGroupId, G.creditors) : undefined,
    creditDays: defaultGroupId && isInGroup(data, defaultGroupId, G.debtors) ? 30 : undefined,
    costCentres: defaultGroupId ? ['INCOME', 'EXPENSE'].includes(natureOf(data, defaultGroupId)) : undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [openingSide, setOpeningSide] = useState<'DR' | 'CR'>(() => {
    if (initial) return initial.openingBalance < 0 ? 'CR' : 'DR';
    const nature = defaultGroupId ? natureOf(data, defaultGroupId) : 'ASSET';
    return nature === 'LIABILITY' || nature === 'INCOME' ? 'CR' : 'DR';
  });
  const set = (patch: Partial<Ledger>) => setL(x => ({ ...x, ...patch }));
  const enter = useEnterToNext<HTMLDivElement>();

  const groupOptions = useMemo(() => data.groups.map(g => ({
    id: g.id, label: g.name, hint: g.parentId ? data.groups.find(x => x.id === g.parentId)?.name : 'Primary',
  })).sort((a, b) => a.label.localeCompare(b.label)), [data.groups]);

  const inGroup = (id: string) => !!l.groupId && isInGroup(data, l.groupId, id);
  const isParty = inGroup(G.debtors) || inGroup(G.creditors);
  const isClient = inGroup(G.debtors);
  const isBank = inGroup(G.bank) || inGroup(G.bankOd);
  const isTax = inGroup(G.duties);
  const isStock = inGroup(G.stock);
  const isPnl = !!l.groupId && ['INCOME', 'EXPENSE'].includes(natureOf(data, l.groupId));
  const isSystemGroupLocked = l.groupId === '';

  const openingAbs = Math.abs(l.openingBalance);
  const setOpening = (abs: number, side = openingSide) => set({ openingBalance: side === 'DR' ? abs : -abs });

  const bills = l.openingBills ?? [];
  const billsTotal = round2(bills.reduce((s, b) => s + b.amount, 0));
  const setBill = (i: number, patch: Partial<OpeningBill>) => set({ openingBills: bills.map((b, n) => (n === i ? { ...b, ...patch } : b)) });

  const save = () => {
    const name = l.name.trim();
    if (!name) return setError('Give this account a name.');
    if (!l.groupId && !l.isSystem) return setError('Choose what kind of account this is.');
    if (data.ledgers.some(x => x.id !== l.id && x.name.toLowerCase() === name.toLowerCase())) return setError(`There is already an account called ${name}.`);
    if (l.trn && !/^\d{15}$/.test(l.trn.trim().replace(/[\s-]/g, ''))) return setError('A TRN has 15 digits, as shown on your FTA VAT registration certificate.');
    if (l.billWise && bills.length && Math.abs(billsTotal - l.openingBalance) > 0.005) {
      return setError(`The opening bills add up to ${fmt(Math.abs(billsTotal))}, but the opening balance is ${fmt(openingAbs)}.`);
    }
    const saved: Ledger = { ...l, name, trn: l.trn?.replace(/[\s-]/g, '') || undefined };
    saveMaster('ledgers', saved);
    onSaved(saved);
    onClose();
  };

  return (
    <Modal
      title={titleFor(data, l.groupId, !!initial)} size="lg" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" data-accept onClick={save}>Save</button>
      </>}
    >
      <div ref={enter.ref} onKeyDown={enter.onKeyDown} className="flex flex-col gap-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input autoFocus value={l.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Kind of account">
            {isSystemGroupLocked && l.isSystem
              ? <Input disabled value="Primary" />
              : <Combo value={l.groupId} onChange={groupId => {
                  const party = isInGroup(data, groupId, G.debtors) || isInGroup(data, groupId, G.creditors);
                  const nature = natureOf(data, groupId);
                  const side = nature === 'LIABILITY' || nature === 'INCOME' ? 'CR' : 'DR';
                  setOpeningSide(side);
                  set({
                    groupId,
                    billWise: party ? true : l.billWise,
                    costCentres: ['INCOME', 'EXPENSE'].includes(nature) ? true : l.costCentres,
                    openingBalance: side === 'DR' ? openingAbs : -openingAbs,
                  });
                }} options={groupOptions} placeholder="Client, expense, bank..." ariaLabel="Kind of account" />}
          </Field>
        </div>

        {!isStock && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Opening balance" hint={isClient ? 'What this client already owed you when you started using this.' : inGroup(G.creditors) ? 'What you already owed this vendor when you started using this.' : 'Leave blank if none.'}>
              <NumberInput value={openingAbs} onValue={n => setOpening(n)} placeholder="0.00" />
            </Field>
            <Field label="Which way">
              <Select value={openingSide} onChange={e => { const s = e.target.value as 'DR' | 'CR'; setOpeningSide(s); setOpening(openingAbs, s); }}>
                <option value="DR">Dr (asset, expense, or owed to you)</option>
                <option value="CR">Cr (liability, income, or owed by you)</option>
              </Select>
            </Field>
          </div>
        )}

        {isParty && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Contact person"><Input value={l.contactPerson ?? ''} onChange={e => set({ contactPerson: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={l.email ?? ''} onChange={e => set({ email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={l.phone ?? ''} onChange={e => set({ phone: e.target.value })} /></Field>
              <Field label="Emirate" hint="Their emirate decides the VAT return box. Choose Outside UAE for foreign clients and suppliers (reverse charge on their bills).">
                <Select value={l.state ?? ''} onChange={e => set({ state: e.target.value })}>
                  <option value="">Not set</option>
                  {UAE_PLACES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Address"><Input value={l.address ?? ''} onChange={e => set({ address: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="TRN"><Input value={l.trn ?? ''} onChange={e => set({ trn: e.target.value })} placeholder="If VAT registered (15 digits)" /></Field>
              {features.billWise && <Field label="Payment terms (days)"><NumberInput value={l.creditDays} onValue={n => set({ creditDays: n })} placeholder="30" /></Field>}
            </div>
            {features.multiCurrency && data.currencies.length > 0 && (
              <Field label="Billed in" hint="Choose a currency for a foreign client. Invoices then ask for the exchange rate.">
                <Select value={l.currencyId ?? ''} onChange={e => set({ currencyId: e.target.value || undefined })}>
                  <option value="">{data.company.currencyCode} (your own currency)</option>
                  {data.currencies.map(c => <option key={c.id} value={c.id}>{c.code}: {c.name}</option>)}
                </Select>
              </Field>
            )}
            {features.billWise && (
              <>
                <Toggle checked={!!l.billWise} onChange={billWise => set({ billWise })} label="Track each invoice for this party" hint="Shows which are paid, part paid or overdue. Recommended." />
                {l.billWise && openingAbs > 0 && (
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="font-semibold mb-1">Which bills make up the opening balance?</div>
                    <p className="hint mb-2">Optional. Listing them lets you settle each one by name later.</p>
                    {bills.map((b, i) => (
                      <div key={i} className="grid grid-cols-[1fr_9rem_9rem_8rem_auto] gap-2 mb-1.5 items-center">
                        <Input placeholder="Bill number" value={b.ref} onChange={e => setBill(i, { ref: e.target.value })} aria-label="Bill number" />
                        <Input type="date" value={b.date} onChange={e => setBill(i, { date: e.target.value })} aria-label="Bill date" />
                        <Input type="date" value={b.dueDate ?? ''} onChange={e => setBill(i, { dueDate: e.target.value })} aria-label="Due date" />
                        <NumberInput value={Math.abs(b.amount)} onValue={n => setBill(i, { amount: openingSide === 'DR' ? n : -n })} aria-label="Amount" />
                        <button className="btn btn-ghost btn-sm" onClick={() => set({ openingBills: bills.filter((_, n) => n !== i) })}>Remove</button>
                      </div>
                    ))}
                    <button className="btn btn-sm" onClick={() => set({ openingBills: [...bills, { ref: '', date: data.company.booksFrom, amount: openingSide === 'DR' ? openingAbs - Math.abs(billsTotal) : -(openingAbs - Math.abs(billsTotal)) }] })}>Add a bill</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {isBank && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Bank name"><Input value={l.bankName ?? ''} onChange={e => set({ bankName: e.target.value })} /></Field>
            <Field label="Account number"><Input value={l.accountNo ?? ''} onChange={e => set({ accountNo: e.target.value })} /></Field>
            <Field label="IBAN / SWIFT"><Input value={l.ifsc ?? ''} onChange={e => set({ ifsc: e.target.value })} placeholder="AE.. 23 characters" /></Field>
            <Field label="Branch"><Input value={l.branch ?? ''} onChange={e => set({ branch: e.target.value })} /></Field>
          </div>
        )}

        {isTax && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tax type">
              <Select value={l.taxType ?? ''} onChange={e => set({ taxType: (e.target.value || undefined) as TaxType | undefined })}>
                <option value="">Not a specific tax</option>
                <option>VAT</option><option value="OTHER">Other</option>
              </Select>
            </Field>
            {(l.taxType === 'TDS' || l.taxType === 'TCS') ? (
              <>
                <Field label="Section"><Input value={l.section ?? ''} onChange={e => set({ section: e.target.value })} placeholder="194J" /></Field>
                <Field label="Rate %" hint="Invoices and bills work the amount out from this."><NumberInput value={l.taxRate} onValue={n => set({ taxRate: n })} /></Field>
              </>
            ) : (
              <Field label="Applies to">
                <Select value={l.taxSide ?? ''} onChange={e => set({ taxSide: (e.target.value || undefined) as 'INPUT' | 'OUTPUT' | undefined })}>
                  <option value="">Not set</option>
                  <option value="OUTPUT">Output: tax on what you sell</option>
                  <option value="INPUT">Input: tax on what you buy</option>
                </Select>
              </Field>
            )}
          </div>
        )}

        {isStock && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Opening stock value"><NumberInput value={l.openingBalance} onValue={n => set({ openingBalance: n })} /></Field>
            <Field label="Closing stock value" hint="For stock you track by value, not item by item."><NumberInput value={l.closingStockValue} onValue={n => set({ closingStockValue: n })} /></Field>
            <Field label="Closing value as at"><Input type="date" value={l.closingStockDate ?? ''} onChange={e => set({ closingStockDate: e.target.value })} /></Field>
          </div>
        )}

        {isPnl && (
          <>
            {features.vat && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Default VAT rate" hint="Filled in when you use this account on an invoice or bill.">
                  <Select value={l.vatRate ?? ''} onChange={e => set({ vatRate: e.target.value === '' ? undefined : Number(e.target.value) })}>
                    <option value="">None</option>
                    {VAT_RATES.map(r => <option key={r} value={r}>{vatRateLabel(r)}</option>)}
                  </Select>
                </Field>
              </div>
            )}
            {features.costCentres && <Toggle checked={!!l.costCentres} onChange={costCentres => set({ costCentres })} label="Can be tagged to a project" />}
          </>
        )}

        {features.interest && !isPnl && (
          <Field label="Interest rate % a year" hint="Used by the Interest Calculation report. Leave blank if none."><NumberInput value={l.interestPct} onValue={n => set({ interestPct: n })} /></Field>
        )}
      </div>
    </Modal>
  );
};
