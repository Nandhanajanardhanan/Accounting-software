// Invoices, bills, credit notes and debit notes: lines of work first, stock items if Inventory is on.
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { BillAlloc, Voucher, VoucherLine } from '../../core/types';
import { CASH_LEDGER_ID, G, PROFESSIONAL_FEES_LEDGER_ID, UAE_PLACES, VAT_RATES, vatRateLabel, VOUCHER_META } from '../../core/defaults';
import { addDays, isCashOrBank, isInGroup, isPnlLedger, itemOf, itemQtyNow, ledgerBalanceNow, ledgerOf, pendingBillsFor, round2 } from '../../core/engine';
import { computeInvoice, type InvoiceBase, type InvoiceChargeInput, type InvoiceItemInput, type InvoiceServiceInput } from '../../core/invoice';
import { amountInWords, drCr, fmt, fmtDate, fmtQty } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { useTrackUnsaved } from '../../ui/Shell';
import { Field, Input, NumberInput, Select, Toggle } from '../../ui/kit';
import { billsForLine, blankKey, type Builder, GodownSelect, LedgerCombo, ProjectCombo, StockCombo } from './parts';

type ServiceRow = InvoiceServiceInput & { key: string };
type ItemRow = InvoiceItemInput & { key: string };
type ChargeRow = InvoiceChargeInput & { key: string };

interface Props {
  base: InvoiceBase;
  date: string;
  number: string;
  voucherId?: string;
  existing?: Voucher;
  source?: Voucher;
  prefill?: { party?: string; project?: string };
  registerBuilder: (b: Builder) => void;
}

const isSaleSide = (b: InvoiceBase) => b === 'SALES' || b === 'CREDIT_NOTE';

export const InvoiceEditor: React.FC<Props> = ({ base, date, number, voucherId, existing, source, prefill, registerBuilder }) => {
  const { data, features, company } = useBooks();
  const sale = isSaleSide(base);
  const original = existing ?? source;

  const defaultLedger = useMemo(() => {
    if (sale) return ledgerOf(data, PROFESSIONAL_FEES_LEDGER_ID)?.id ?? data.ledgers.find(l => isInGroup(data, l.groupId, G.sales))?.id ?? '';
    return '';
  }, [data, sale]);

  const blankService = (): ServiceRow => {
    const led = defaultLedger ? ledgerOf(data, defaultLedger) : undefined;
    return { key: blankKey(), description: '', ledgerId: defaultLedger, qty: 1, rate: 0, // No VAT unless you set a default rate on the account yourself.
    vatRate: features.vat ? led?.vatRate : undefined };
  };

  const [partyId, setPartyId] = useState(original?.partyId ?? prefill?.party ?? '');
  const [projectId, setProjectId] = useState(original?.projectId ?? prefill?.project ?? '');
  const [accountLedgerId, setAccountLedgerId] = useState(() => original?.accountLedgerId ?? data.ledgers.find(l => isInGroup(data, l.groupId, sale ? G.sales : G.purchase))?.id ?? '');
  const fx0 = original?.exchangeRate ?? 1;
  const mainSide = base === 'SALES' || base === 'DEBIT_NOTE' ? 'CR' : 'DR';
  const isTaxLine = (ledgerId: string) => { const led = ledgerOf(data, ledgerId); return !!led?.taxSide && led.taxType === 'VAT'; };
  // Entries brought over from the old version have ledger lines but no lines of work.
  const ledgerLinesOnly = !!original && !original.services?.length && !original.stock?.length;
  const [services, setServices] = useState<ServiceRow[]>(() => {
    if (ledgerLinesOnly) {
      const main = original.lines.filter(l => l.side === mainSide && l.ledgerId !== original.partyId && l.ledgerId !== 'led_round_off' && !isTaxLine(l.ledgerId));
      return [...main.map(l => ({ key: blankKey(), description: original.narration ?? '', ledgerId: l.ledgerId, qty: 1, rate: l.amount })), blankService()];
    }
    const prior = (original?.services ?? []).map(s => ({ key: blankKey(), id: s.id, description: s.description, ledgerId: s.ledgerId, qty: s.qty, rate: s.rate, vatRate: s.vatRate }));
    return original && !prior.length && (original.stock?.length ?? 0) > 0 ? [] : [...prior, blankService()];
  });
  const [items, setItems] = useState<ItemRow[]>(() => (original?.stock ?? []).map(s => ({
    key: blankKey(), id: s.id, itemId: s.itemId, godownId: s.godownId, qty: s.qty, rate: round2(s.rate / fx0), discountPct: s.discountPct, vatRate: s.vatRate, batch: s.batch, expiry: s.expiry,
  })));
  const [charges, setCharges] = useState<ChargeRow[]>(() => {
    if (!existing && !source) return [];
    const known = new Set([...(original?.services ?? []).map(s => s.ledgerId), original?.partyId, original?.accountLedgerId, 'led_round_off']);
    return (original?.lines ?? [])
      .filter(l => !known.has(l.ledgerId) && !isTaxLine(l.ledgerId) && !(ledgerLinesOnly && l.side === mainSide))
      .map(l => ({ key: blankKey(), ledgerId: l.ledgerId, amount: l.side === mainSide ? l.amount : -l.amount }));
  });
  const [roundOff, setRoundOff] = useState(() => (existing ? existing.lines.some(l => l.ledgerId === 'led_round_off') || !existing.currencyId : true));
  const [reference, setReference] = useState(existing?.reference ?? '');
  const [referenceDate, setReferenceDate] = useState(existing?.referenceDate ?? '');
  const [creditDays, setCreditDays] = useState<number | undefined>(undefined);
  const [againstRef, setAgainstRef] = useState(() => (base === 'CREDIT_NOTE' || base === 'DEBIT_NOTE' ? existing?.lines.find(l => l.ledgerId === existing.partyId)?.bills?.find(b => b.type === 'AGST')?.ref ?? '' : ''));
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(original?.exchangeRate);
  const [placeOfSupply, setPlaceOfSupply] = useState(existing?.placeOfSupply ?? '');
  const showItems = features.inventory;
  useTrackUnsaved({ partyId, projectId, services: services.map(({ key: _key, ...s }) => s), items: items.map(({ key: _key, ...i }) => i), charges: charges.map(({ key: _key, ...c }) => c), reference, againstRef });

  const party = partyId ? ledgerOf(data, partyId) : undefined;
  const currency = features.multiCurrency && party?.currencyId ? data.currencies.find(c => c.id === party.currencyId) : undefined;

  // Paid now, part paid or on credit. Money paid now is kept as a receipt (or payment) linked to this invoice.
  const settles = base === 'SALES' || base === 'PURCHASE';
  const moneyLedgers = useMemo(() => data.ledgers.filter(l => isCashOrBank(data, l)), [data]);
  const linked = existing ? data.vouchers.find(v => v.settlesInvoiceId === existing.id) : undefined;
  const linkedPartyLine = linked?.lines.find(l => l.ledgerId === linked.partyId);
  const linkedMoneyLine = linked?.lines.find(l => l.ledgerId !== linked.partyId);
  const [payStatus, setPayStatus] = useState<'UNPAID' | 'PAID' | 'PART'>(() => {
    if (!linkedPartyLine || !existing) return 'UNPAID';
    const invoiceTotal = existing.lines.find(l => l.ledgerId === existing.partyId)?.amount ?? 0;
    return linkedPartyLine.amount + 0.004 < invoiceTotal ? 'PART' : 'PAID';
  });
  const [payAmount, setPayAmount] = useState<number | undefined>(linkedPartyLine?.amount);
  const [payInto, setPayInto] = useState(() => linkedMoneyLine?.ledgerId ?? (moneyLedgers.some(l => l.id === CASH_LEDGER_ID) ? CASH_LEDGER_ID : moneyLedgers[0]?.id ?? ''));
  const fx = currency ? exchangeRate ?? currency.rate : 1;
  const symbol = currency?.symbol ?? company.currencySymbol;

  // A foreign-currency invoice is not rounded. VAT stays as chosen (choose 0% for a zero-rated export).
  useEffect(() => {
    if (!currency || existing) return;
    setExchangeRate(r => r ?? currency.rate);
    setRoundOff(false);
  }, [currency, existing]);

  const setService = (key: string, patch: Partial<ServiceRow>) => setServices(rs => {
    const next = rs.map(r => (r.key === key ? { ...r, ...patch } : r));
    const last = next[next.length - 1];
    return last && (last.description || last.rate) ? [...next, { ...blankService(), ledgerId: last.ledgerId, vatRate: features.vat ? ledgerOf(data, last.ledgerId)?.vatRate : undefined }] : next;
  });
  const setItem = (key: string, patch: Partial<ItemRow>) => setItems(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const setCharge = (key: string, patch: Partial<ChargeRow>) => setCharges(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const usedServices = services.filter(s => s.ledgerId && (s.description || s.rate));
  const usedItems = items.filter(i => i.itemId);

  const fxInput = currency ? { currencyId: currency.id, exchangeRate: fx } : {};
  const preview = useMemo(() => computeInvoice(data, {
    base, partyId, accountLedgerId, services: usedServices, items: usedItems, charges, roundOff, placeOfSupply: placeOfSupply || undefined, projectId: projectId || undefined, ...fxInput,
  }), [data, base, partyId, accountLedgerId, usedServices, usedItems, charges, roundOff, placeOfSupply, projectId, fxInput.currencyId, fxInput.exchangeRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = creditDays ?? party?.creditDays ?? 0;
  const dueDate = party?.billWise ? addDays(date, days) : undefined;
  const partySide = base === 'SALES' || base === 'DEBIT_NOTE' ? 'DR' : 'CR';
  const pending = useMemo(() => (party?.billWise && (base === 'CREDIT_NOTE' || base === 'DEBIT_NOTE') ? pendingBillsFor(data, party.id, partySide, date, voucherId) : []), [data, party, base, partySide, date, voucherId]);

  useEffect(() => {
    registerBuilder(() => {
      const errors = [...preview.errors];
      const warnings: string[] = [];
      if (usedServices.some(s => !s.qty)) errors.push('A line of work has no quantity.');
      if (features.billWise && party?.billWise && (base === 'SALES' || base === 'PURCHASE') && data.vouchers.some(v => v.id !== voucherId && v.lines.some(l => l.ledgerId === party.id && l.bills?.some(b => b.type === 'NEW' && b.ref === (reference.trim() || number))))) {
        errors.push(`${party.name} already has a bill numbered ${reference.trim() || number}. Use a different number.`);
      }
      for (const row of usedItems) {
        if (row.qty <= 0) errors.push(`Enter a quantity for ${itemOf(data, row.itemId)?.name}.`);
        if (preview.stock.length && sale && base === 'SALES' && row.qty > itemQtyNow(data, row.itemId) + (existing?.stock?.find(s => s.itemId === row.itemId)?.qty ?? 0)) {
          warnings.push(`${itemOf(data, row.itemId)?.name}: selling more than you have in stock.`);
        }
      }
      let bills: BillAlloc[] | undefined;
      const lines = preview.lines.map(l => ({ ...l }));
      const partyLine = lines.find(l => l.ledgerId === partyId);
      if (party?.billWise && features.billWise && partyLine) {
        if (base === 'SALES' || base === 'PURCHASE') {
          const prior = existing?.lines.find(l => l.ledgerId === existing.partyId)?.bills?.find(b => b.type === 'NEW');
          const ref = base === 'PURCHASE' ? reference.trim() || number : prior?.ref ?? number;
          bills = [{ type: 'NEW', ref, amount: partyLine.amount, dueDate }];
        } else if (againstRef) {
          const openNow = pending.find(b => b.ref === againstRef);
          const take = openNow ? Math.min(Math.abs(openNow.pending), partyLine.amount) : partyLine.amount;
          bills = [{ type: 'AGST', ref: againstRef, amount: take }];
          if (partyLine.amount - take > 0.004) bills.push({ type: 'ON_ACCOUNT', ref: '', amount: round2(partyLine.amount - take) });
        } else {
          bills = billsForLine(data, party, partyLine.side, partyLine.amount, date, undefined, voucherId);
        }
        partyLine.bills = bills;
      }
      if (party && party.creditLimit && base === 'SALES' && ledgerBalanceNow(data, party.id) + preview.total > party.creditLimit) {
        warnings.push(`${party.name} will go over their credit limit of ${fmt(party.creditLimit)}.`);
      }
      // Lines carry the ledger ids posted before this edit, so bank-reconciled details stay with cash parties.
      const priorBank = existing?.lines.find(l => l.ledgerId === partyId)?.bank;
      if (partyLine && priorBank) partyLine.bank = priorBank;

      let settlement: { type: 'RECEIPT' | 'PAYMENT'; lines: VoucherLine[] } | null | undefined;
      if (settles) {
        if (payStatus === 'UNPAID' || !partyLine) settlement = null;
        else {
          const amount = payStatus === 'PAID' ? partyLine.amount : round2(payAmount ?? 0);
          if (!payInto) errors.push(`Choose the cash or bank account the money ${sale ? 'went into' : 'came from'}.`);
          if (payStatus === 'PART' && (amount <= 0 || amount >= partyLine.amount)) errors.push(`For part paid, enter an amount more than 0 and less than the total of ${fmt(partyLine.amount)}.`);
          const ref = bills?.find(b => b.type === 'NEW')?.ref;
          const isBank = isInGroup(data, ledgerOf(data, payInto)?.groupId ?? '', G.bank);
          const keepBank = linkedMoneyLine?.ledgerId === payInto ? linkedMoneyLine.bank : undefined;
          const settled: VoucherLine = {
            id: blankKey(), ledgerId: partyId, side: sale ? 'CR' : 'DR', amount,
            bills: ref ? [{ type: 'AGST', ref, amount }] : undefined,
            forex: currency ? { currencyId: currency.id, fcAmount: round2(amount / fx), rate: fx } : undefined,
          };
          const money: VoucherLine = { id: blankKey(), ledgerId: payInto, side: sale ? 'DR' : 'CR', amount, bank: keepBank ?? (isBank ? { mode: 'NEFT' } : undefined) };
          settlement = { type: sale ? 'RECEIPT' : 'PAYMENT', lines: sale ? [money, settled] : [settled, money] };
        }
      }
      return {
        errors, warnings, settlement,
        patch: {
          lines, stock: preview.stock.length ? preview.stock : undefined, services: preview.services.length ? preview.services : undefined,
          vat: preview.vat.length ? preview.vat : undefined, partyId, projectId: projectId || undefined,
          accountLedgerId: usedItems.length ? accountLedgerId : undefined, reference: reference.trim() || undefined, referenceDate: referenceDate || undefined,
          dueDate: party?.billWise ? dueDate : undefined, placeOfSupply: placeOfSupply || party?.state, currencyId: currency?.id, exchangeRate: currency ? fx : undefined,
          stockAlreadyMoved: source?.stockAlreadyMoved ?? existing?.stockAlreadyMoved, noteIds: source?.noteIds ?? existing?.noteIds, orderId: source?.orderId ?? existing?.orderId,
        },
      };
    });
  });

  // Only clients and vendors: whether the money came in cash or by bank is chosen under Payment.
  const partyFirst = sale ? [G.debtors, G.creditors] : [G.creditors, G.debtors];
  const partyFilter = useMemo(() => (l: { groupId: string; id: string }) =>
    isInGroup(data, l.groupId, G.debtors) || isInGroup(data, l.groupId, G.creditors) || l.id === original?.partyId, [data, original?.partyId]);
  const workLedgers = useMemo(() => {
    if (sale) return (l: { groupId: string }) => isInGroup(data, l.groupId, G.sales) || isInGroup(data, l.groupId, G.directIncome) || isInGroup(data, l.groupId, G.indirectIncome);
    return (l: Parameters<typeof isPnlLedger>[1]) => (isPnlLedger(data, l) && !isInGroup(data, l.groupId, G.sales)) || isInGroup(data, l.groupId, G.fixedAssets);
  }, [data, sale]);
  const chargeLedgers = useMemo(() => (l: Parameters<typeof isCashOrBank>[1]) => !isCashOrBank(data, l) && !isInGroup(data, l.groupId, G.debtors) && !isInGroup(data, l.groupId, G.creditors), [data]);

  const vatTotal = round2(preview.vat.reduce((s, r) => s + r.vat, 0));
  const label = sale ? 'Client' : 'Vendor';
  const vatCell = (value: number | undefined, onChange: (v: number | undefined) => void) => (
    <select className="cell-input text-right" aria-label="VAT rate" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
      <option value="">No VAT</option>
      {VAT_RATES.map(r => <option key={r} value={r}>{vatRateLabel(r)}</option>)}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label={label} hint={party ? `Balance: ${drCr(ledgerBalanceNow(data, party.id))}${party.state ? ` · ${party.state}` : ''}` : undefined}>
          <LedgerCombo value={partyId} onChange={id => { setPartyId(id); setCreditDays(undefined); setAgainstRef(''); }} filter={partyFilter} firstGroups={partyFirst} newGroupId={sale ? G.debtors : G.creditors} placeholder={sale ? 'Who is this invoice for?' : 'Who billed you?'} ariaLabel={label} autoFocus={!partyId} />
        </Field>
        {features.costCentres && (
          <Field label="Project" hint={data.costCentres.length === 0 ? 'Add projects to see profit per project.' : undefined}>
            <ProjectCombo value={projectId} onChange={setProjectId} clientId={partyId} />
          </Field>
        )}
        {base === 'PURCHASE' && (
          <>
            <Field label="Their bill number"><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="As printed on the bill" /></Field>
            <Field label="Their bill date"><Input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} /></Field>
          </>
        )}
        {(base === 'CREDIT_NOTE' || base === 'DEBIT_NOTE') && party?.billWise && (
          <Field label={`Against ${base === 'CREDIT_NOTE' ? 'invoice' : 'bill'}`}>
            <Select value={againstRef} onChange={e => setAgainstRef(e.target.value)}>
              <option value="">Oldest open first</option>
              {againstRef && !pending.some(b => b.ref === againstRef) && <option value={againstRef}>{againstRef}</option>}
              {pending.map(b => <option key={b.ref} value={b.ref}>{b.ref} ({fmtDate(b.date)}): {fmt(Math.abs(b.pending))} open</option>)}
            </Select>
          </Field>
        )}
        {(base === 'SALES' || base === 'PURCHASE') && party?.billWise && features.billWise && (
          <Field label="Payment terms (days)" hint={dueDate ? `Due ${fmtDate(dueDate)}` : undefined}>
            <NumberInput value={days} onValue={setCreditDays} placeholder="0" />
          </Field>
        )}
        {currency && (
          <Field label={`Exchange rate (1 ${currency.code})`} hint={`Rates below are in ${currency.code}. Your books record ${company.currencyCode}.`}>
            <NumberInput value={fx} onValue={setExchangeRate} />
          </Field>
        )}
        {features.vat && party && (
          <Field label="Place of supply (Emirate)" hint={preview.reverseCharge ? 'Supplier outside the UAE: reverse charge applies. You account for the VAT yourself and recover it in the same return.' : 'Used for boxes 1a to 1g of your VAT return.'}>
            <Select value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)}>
              <option value="">{party.state ? `Same as ${sale ? 'client' : 'vendor'} (${party.state})` : `Your emirate${company.state ? ` (${company.state})` : ''}`}</option>
              {UAE_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        )}
      </div>

      {settles && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Field label="Payment" hint={payStatus === 'UNPAID' ? `On credit: it shows under ${sale ? 'To collect' : 'To pay'} until you record the ${sale ? 'receipt' : 'payment'}.` : `Saved with a linked ${sale ? 'receipt' : 'payment'}, so it shows in your Cash Book or bank.`}>
            <Select value={payStatus} onChange={e => setPayStatus(e.target.value as 'UNPAID' | 'PAID' | 'PART')} aria-label="Payment status">
              <option value="UNPAID">Not paid yet (on credit)</option>
              <option value="PAID">{sale ? 'Paid in full now' : 'Paid in full now'}</option>
              <option value="PART">Part paid now</option>
            </Select>
          </Field>
          {payStatus !== 'UNPAID' && (
            <Field label={sale ? 'Received into' : 'Paid from'} hint={moneyLedgers.length === 0 ? 'Add a cash or bank account first.' : undefined}>
              <Select value={payInto} onChange={e => setPayInto(e.target.value)} aria-label={sale ? 'Received into' : 'Paid from'}>
                {moneyLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
          )}
          {payStatus === 'PART' && (
            <Field label={sale ? 'Amount received now' : 'Amount paid now'} hint={preview.total > 0 ? `Balance left: ${fmt(Math.max(0, round2(preview.total - (payAmount ?? 0))))}` : undefined}>
              <NumberInput value={payAmount} onValue={setPayAmount} placeholder="0.00" />
            </Field>
          )}
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="tbl tbl-compact min-w-[640px]">
          <thead>
            <tr>
              <th className="w-[38%]">{sale ? 'Work done' : 'What for'}</th>
              <th className="w-[22%]">Account</th>
              <th className="num w-20">Hours or qty</th>
              <th className="num w-28">Rate {currency ? `(${currency.code})` : ''}</th>
              {features.vat && <th className="num w-24">VAT</th>}
              <th className="num w-32">Amount{currency ? ` (${currency.code})` : ''}</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.key}>
                <td><input className="cell-input" value={s.description} onChange={e => setService(s.key, { description: e.target.value })} placeholder={sale ? 'Website design, phase 1' : 'Describe it'} aria-label="Description" /></td>
                <td>
                  <LedgerCombo cell value={s.ledgerId} filter={workLedgers} newGroupId={sale ? G.sales : G.indirectExpense} ariaLabel="Account" onChange={ledgerId => {
                    const led = ledgerOf(data, ledgerId);
                    setService(s.key, { ledgerId, vatRate: features.vat ? led?.vatRate ?? s.vatRate : undefined });
                  }} />
                </td>
                <td><NumberInput cell value={s.qty} onValue={qty => setService(s.key, { qty })} aria-label="Hours or quantity" /></td>
                <td><NumberInput cell value={s.rate} onValue={rate => setService(s.key, { rate })} placeholder="0.00" aria-label="Rate" /></td>
                {features.vat && <td>{vatCell(s.vatRate, vatRate => setService(s.key, { vatRate }))}</td>}
                <td className="num align-middle">{s.qty * s.rate ? fmt(s.qty * s.rate) : ''}</td>
                <td>{(s.description || s.rate) ? <button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => setServices(rs => rs.length > 1 ? rs.filter(x => x.key !== s.key) : [blankService()])}><Trash2 className="w-4 h-4 text-slate-400" /></button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showItems && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-semibold">Stock items</h3>
            <button className="btn btn-sm" onClick={() => setItems(rs => [...rs, { key: blankKey(), itemId: '', qty: 1, rate: 0, godownId: data.godowns[0]?.id }])}><Plus className="w-3.5 h-3.5" /> Add item</button>
          </div>
          {items.length > 0 && (
            <>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="tbl tbl-compact min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Item</th>{data.godowns.length > 1 && <th>Location</th>}
                      <th className="num w-20">Qty</th><th className="num w-24">Rate</th><th className="num w-20">Disc %</th>
                      {features.vat && <th className="num w-24">VAT</th>}
                      {features.batches && <><th className="w-24">Batch</th><th className="w-32">Expiry</th></>}
                      <th className="num w-28">Amount</th><th className="w-9" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => {
                      const it = itemOf(data, i.itemId);
                      const gross = i.qty * i.rate;
                      return (
                        <tr key={i.key}>
                          <td>
                            <StockCombo value={i.itemId} onChange={itemId => {
                              const chosen = itemOf(data, itemId);
                              setItem(i.key, { itemId, rate: (sale ? chosen?.salePrice : chosen?.purchasePrice) ?? 0, vatRate: chosen?.vatRate, godownId: i.godownId ?? data.godowns[0]?.id });
                            }} />
                            {it && <div className="hint pl-2">In stock: {fmtQty(itemQtyNow(data, it.id))} {data.units.find(u => u.id === it.unitId)?.symbol}</div>}
                          </td>
                          {data.godowns.length > 1 && <td><GodownSelect value={i.godownId} onChange={godownId => setItem(i.key, { godownId })} /></td>}
                          <td><NumberInput cell value={i.qty} onValue={qty => setItem(i.key, { qty })} aria-label="Quantity" /></td>
                          <td><NumberInput cell value={i.rate} onValue={rate => setItem(i.key, { rate })} aria-label="Rate" /></td>
                          <td><NumberInput cell value={i.discountPct} onValue={discountPct => setItem(i.key, { discountPct })} aria-label="Discount percent" /></td>
                          {features.vat && <td>{vatCell(i.vatRate, vatRate => setItem(i.key, { vatRate }))}</td>}
                          {features.batches && <>
                            <td><input className="cell-input" value={i.batch ?? ''} onChange={e => setItem(i.key, { batch: e.target.value })} aria-label="Batch" /></td>
                            <td><input className="cell-input" type="date" value={i.expiry ?? ''} onChange={e => setItem(i.key, { expiry: e.target.value })} aria-label="Expiry" /></td>
                          </>}
                          <td className="num align-middle">{gross ? fmt(gross - (gross * (i.discountPct ?? 0)) / 100) : ''}</td>
                          <td><button tabIndex={-1} className="btn btn-ghost btn-sm" aria-label="Remove item" onClick={() => setItems(rs => rs.filter(x => x.key !== i.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 max-w-sm">
                <Field label={`Post goods to ${sale ? 'sales' : 'purchase'} account`}>
                  <LedgerCombo value={accountLedgerId} onChange={setAccountLedgerId} filter={l => isInGroup(data, l.groupId, sale ? G.sales : G.purchase)} newGroupId={sale ? G.sales : G.purchase} ariaLabel="Goods account" />
                </Field>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div>
          {charges.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {charges.map(c => (
                <div key={c.key} className="grid grid-cols-[1fr_8rem_auto] gap-2 items-center">
                  <LedgerCombo value={c.ledgerId} filter={chargeLedgers} ariaLabel="Charge account" onChange={ledgerId => {
                    const led = ledgerOf(data, ledgerId);
                    // Withholding taxes work themselves out from the ledger's rate.
                    if ((led?.taxType === 'TDS' || led?.taxType === 'TCS') && led.taxRate) {
                      const tax = round2((preview.subtotal * led.taxRate) / 100);
                      setCharge(c.key, { ledgerId, amount: led.taxType === 'TDS' ? -tax : tax });
                    } else setCharge(c.key, { ledgerId });
                  }} />
                  <NumberInput value={c.amount} onValue={amount => setCharge(c.key, { amount })} aria-label="Charge amount" />
                  <button className="btn btn-ghost btn-sm" aria-label="Remove charge" onClick={() => setCharges(rs => rs.filter(x => x.key !== c.key))}><Trash2 className="w-4 h-4 text-slate-400" /></button>
                </div>
              ))}
              <p className="hint">A positive amount adds to the total. Use a minus for a discount.</p>
            </div>
          )}
          <button className="btn btn-sm" onClick={() => setCharges(rs => [...rs, { key: blankKey(), ledgerId: '', amount: 0 }])}><Plus className="w-3.5 h-3.5" /> Add a discount or charge</button>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-1 tabular-nums">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{fmt(preview.subtotal)}</span></div>
          {vatTotal > 0 && !preview.reverseCharge && <div className="flex justify-between"><span className="text-slate-600">VAT</span><span>{fmt(vatTotal)}</span></div>}
          {vatTotal > 0 && preview.reverseCharge && <div className="flex justify-between"><span className="text-slate-600">VAT under reverse charge (not paid to supplier)</span><span>{fmt(vatTotal)}</span></div>}
          {preview.roundOff !== 0 && <div className="flex justify-between"><span className="text-slate-600">Round off</span><span>{fmt(preview.roundOff)}</span></div>}
          <div className="flex justify-between items-baseline border-t border-slate-200 mt-1 pt-1.5">
            <span className="font-semibold">Total{currency ? ` in ${company.currencyCode}` : ''}</span>
            <span className="text-xl font-bold">{company.currencySymbol}{fmt(preview.total)}</span>
          </div>
          {currency && <div className="flex justify-between font-semibold"><span>Total in {currency.code}</span><span>{symbol}{fmt(preview.fcTotal)}</span></div>}
          {settles && payStatus !== 'UNPAID' && preview.total > 0 && (() => {
            const paidNow = payStatus === 'PAID' ? preview.total : Math.min(preview.total, payAmount ?? 0);
            return (
              <>
                <div className="flex justify-between"><span className="text-slate-600">{sale ? 'Received now' : 'Paid now'}</span><span>{fmt(paidNow)}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance due</span><span>{fmt(round2(preview.total - paidNow))}</span></div>
              </>
            );
          })()}
          {preview.total > 0 && !currency && <div className="hint">{amountInWords(preview.total)}</div>}
          <div className="pt-1"><Toggle checked={roundOff} onChange={setRoundOff} label="Round off to a whole amount" /></div>
        </div>
      </div>
    </div>
  );
};

export const invoiceTitle = (base: InvoiceBase) => VOUCHER_META[base].label;
