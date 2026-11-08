// What a client or vendor sees: a tax invoice for invoice types, and a plain voucher slip for everything else.
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { VOUCHER_META, vatRateLabel } from '../../core/defaults';
import { itemOf, ledgerName, ledgerOf, round2, voucherAmount } from '../../core/engine';
import { amountInWords, bankModeLabel, fmt, fmtDate, fmtQty } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Page } from '../../ui/kit';

const INVOICE_TITLE: Record<string, string> = { SALES: 'Tax Invoice', PURCHASE: 'Purchase Bill', CREDIT_NOTE: 'Tax Credit Note', DEBIT_NOTE: 'Debit Note' };

export const VoucherPrint: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, company, features } = useBooks();
  const v = data.vouchers.find(x => x.id === id);
  if (!v) return <Page><p className="hint">That entry no longer exists.</p></Page>;

  const toolbar = (
    <div className="flex items-center gap-2 mb-4 no-print">
      <button className="btn" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 text-slate-500" /> Back</button>
      <button className="btn btn-primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print or save as PDF</button>
      <Link className="btn" to={`/voucher/${v.id}`}>Change this entry</Link>
    </div>
  );

  const seller = (
    <div>
      <div className="text-[1.25rem] font-bold">{company.mailingName || company.name}</div>
      {company.ownerName && <div>{company.ownerName}{company.profession ? ` · ${company.profession}` : ''}</div>}
      {company.address && <div>{company.address}{company.state ? `, ${company.state}` : ''}</div>}
      {(company.phone || company.email) && <div>{[company.phone, company.email].filter(Boolean).join(' · ')}</div>}
      {features.vat && company.trn && <div>TRN: {company.trn}</div>}
    </div>
  );

  if (!(v.type in INVOICE_TITLE)) {
    return (
      <Page>
        {toolbar}
        <article className="card p-6 max-w-3xl mx-auto">
          {seller}
          <div className="flex justify-between items-baseline border-y border-slate-300 my-4 py-2">
            <h1 className="text-lg font-bold">{VOUCHER_META[v.type].label} Voucher</h1>
            <div>No. <b>{v.number}</b> · {fmtDate(v.date)}</div>
          </div>
          {v.lines.length > 0 && (
            <table className="tbl mb-3">
              <thead><tr><th>Account</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
              <tbody>
                {v.lines.map(l => (
                  <tr key={l.id}>
                    <td>
                      {ledgerName(data, l.ledgerId)}
                      {l.bank?.instrumentNo && <div className="hint">{bankModeLabel(l.bank.mode)} {l.bank.instrumentNo}{l.bank.instrumentDate ? `, ${fmtDate(l.bank.instrumentDate)}` : ''}</div>}
                      {l.bills?.some(b => b.type === 'AGST') && <div className="hint">Against {l.bills.filter(b => b.type === 'AGST').map(b => b.ref).join(', ')}</div>}
                    </td>
                    <td className="num">{l.side === 'DR' ? fmt(l.amount) : ''}</td>
                    <td className="num">{l.side === 'CR' ? fmt(l.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{fmt(voucherAmount(v))}</td><td className="num">{fmt(voucherAmount(v))}</td></tr></tfoot>
            </table>
          )}
          {(v.stock?.length ?? 0) > 0 && (
            <table className="tbl mb-3">
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {v.stock!.map(s => <tr key={s.id}><td>{itemOf(data, s.itemId)?.name}</td><td className="num">{fmtQty(s.qty)}</td><td className="num">{fmt(s.rate)}</td><td className="num">{fmt(s.amount)}</td></tr>)}
              </tbody>
            </table>
          )}
          {v.narration && <p className="mb-2"><b>Note:</b> {v.narration}</p>}
          {v.lines.length > 0 && <p className="hint">{amountInWords(voucherAmount(v))}</p>}
          <div className="grid grid-cols-2 gap-8 mt-12 text-center">
            <div className="border-t border-slate-300 pt-1">Prepared by</div>
            <div className="border-t border-slate-300 pt-1">Authorised signatory</div>
          </div>
        </article>
      </Page>
    );
  }

  const party = v.partyId ? ledgerOf(data, v.partyId) : undefined;
  const partyLine = v.lines.find(l => l.ledgerId === v.partyId);
  const total = partyLine?.amount ?? voucherAmount(v);
  const fx = v.exchangeRate ?? 1;
  const currency = v.currencyId ? data.currencies.find(c => c.id === v.currencyId) : undefined;
  const show = (n: number) => fmt(round2(n / fx));
  const taxable = v.vat?.reduce((s, r) => s + r.taxable, 0) ?? 0;
  const vatAmount = round2(v.vat?.reduce((s, r) => s + r.vat, 0) ?? 0);
  const reverseCharge = !!v.vat?.some(r => r.reverseCharge);
  const bank = company.invoiceBankLedgerId ? ledgerOf(data, company.invoiceBankLedgerId) : undefined;
  const mainSide = partyLine?.side === 'DR' ? 'CR' : 'DR';
  const taxLedgers = new Set(data.ledgers.filter(l => l.taxSide && l.taxType === 'VAT').map(l => l.id));
  const serviceLedgers = new Set([...(v.services ?? []).map(s => s.ledgerId), v.accountLedgerId]);
  const otherLines = v.lines.filter(l => l.ledgerId !== v.partyId && !taxLedgers.has(l.ledgerId) && !serviceLedgers.has(l.ledgerId));

  return (
    <Page>
      {toolbar}
      <article className="card p-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between gap-4">
          {seller}
          <div className="text-right">
            <div className="text-[1.4rem] font-bold">{INVOICE_TITLE[v.type]}</div>
            <div>No. <b>{v.number}</b></div>
            <div>Date: {fmtDate(v.date)}</div>
            {v.dueDate && <div>Due: {fmtDate(v.dueDate)}</div>}
            {v.reference && <div>Ref: {v.reference}{v.referenceDate ? `, ${fmtDate(v.referenceDate)}` : ''}</div>}
          </div>
        </div>

        <div className="border-y border-slate-300 my-4 py-2 grid sm:grid-cols-2 gap-3">
          <div>
            <div className="hint">{v.type === 'SALES' || v.type === 'CREDIT_NOTE' ? 'Bill to' : 'From'}</div>
            <div className="font-semibold">{party?.mailingName || party?.name}</div>
            {party?.address && <div>{party.address}{party.pincode ? ` ${party.pincode}` : ''}</div>}
            {party?.state && <div>{party.state}{party.country ? `, ${party.country}` : ''}</div>}
            {features.vat && party?.trn && <div>TRN: {party.trn}</div>}
          </div>
          {v.projectId && <div><div className="hint">Project</div><div className="font-semibold">{data.costCentres.find(c => c.id === v.projectId)?.name}</div></div>}
        </div>

        <table className="tbl mb-3">
          <thead>
            <tr><th>Description</th><th className="num">Qty</th><th className="num">Rate</th>{features.vat && <th className="num">VAT</th>}<th className="num">Amount{currency ? ` (${currency.code})` : ''}</th></tr>
          </thead>
          <tbody>
            {(v.services ?? []).map(s => (
              <tr key={s.id}>
                <td>{s.description || ledgerName(data, s.ledgerId)}</td>
                <td className="num">{fmtQty(s.qty)}</td>
                <td className="num">{fmt(s.rate)}</td>
                {features.vat && <td className="num">{vatRateLabel(s.vatRate)}</td>}
                <td className="num">{show(s.amount)}</td>
              </tr>
            ))}
            {(v.stock ?? []).map(s => {
              const it = itemOf(data, s.itemId);
              return (
                <tr key={s.id}>
                  <td>{it?.name}{s.discountPct ? ` (${s.discountPct}% discount)` : ''}{s.batch ? `, batch ${s.batch}` : ''}</td>
                  <td className="num">{fmtQty(s.qty)} {data.units.find(u => u.id === it?.unitId)?.symbol}</td>
                  <td className="num">{show(s.rate)}</td>
                  {features.vat && <td className="num">{vatRateLabel(s.vatRate)}</td>}
                  <td className="num">{show(s.amount)}</td>
                </tr>
              );
            })}
            {otherLines.map(l => (
              <tr key={l.id}>
                <td>{ledgerName(data, l.ledgerId)}</td><td /><td />{features.vat && <td />}
                <td className="num">{l.side === mainSide ? '' : '-'}{show(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap justify-between gap-6">
          <div className="min-w-64 flex-1">
            <div className="font-semibold">Amount in words</div>
            <p>{currency ? amountInWords(round2(total / fx), currency.name + 's', 'Cents') : amountInWords(total)}</p>
            {currency && <p className="hint mt-1">At 1 {currency.code} = {company.currencySymbol}{fx}, this is {company.currencySymbol}{fmt(total)}.</p>}
            {v.type === 'SALES' && bank && (
              <div className="mt-3">
                <div className="font-semibold">Pay to</div>
                {bank?.bankName && <div>{bank.bankName}{bank.branch ? `, ${bank.branch}` : ''}</div>}
                {bank?.accountNo && <div>Account: {bank.accountNo}</div>}
                {bank?.ifsc && <div>IBAN / SWIFT: {bank.ifsc}</div>}
              </div>
            )}
            {v.narration && <p className="mt-3"><b>Note:</b> {v.narration}</p>}
          </div>
          <table className="min-w-72 tabular-nums">
            <tbody>
              {features.vat && taxable > 0 && <tr><td className="pr-6 py-0.5 text-slate-600">Taxable value</td><td className="text-right">{show(taxable)}</td></tr>}
              {vatAmount > 0 && !reverseCharge && <tr><td className="pr-6 py-0.5 text-slate-600">VAT ({company.currencyCode})</td><td className="text-right">{fmt(vatAmount)}</td></tr>}
              {vatAmount > 0 && reverseCharge && <tr><td className="pr-6 py-0.5 text-slate-600">VAT, reverse charge ({company.currencyCode})</td><td className="text-right">{fmt(vatAmount)}</td></tr>}
              <tr className="border-t-2 border-slate-400"><td className="pr-6 pt-1.5 font-bold text-[1.1rem]">Total</td><td className="text-right pt-1.5 font-bold text-[1.1rem]">{currency?.symbol ?? company.currencySymbol}{show(total)}</td></tr>
            </tbody>
          </table>
        </div>
        {company.invoiceTerms && v.type === 'SALES' && <p className="hint mt-4">{company.invoiceTerms}</p>}
        <div className="flex justify-end mt-12"><div className="border-t border-slate-300 pt-1 min-w-52 text-center">Authorised signatory</div></div>
      </article>
    </Page>
  );
};
