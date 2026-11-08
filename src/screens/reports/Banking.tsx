// Bank reconciliation, cheques, post-dated entries, deposit slips and payment advice.
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, Upload } from 'lucide-react';
import { CASH_LEDGER_ID, G, VOUCHER_META } from '../../core/defaults';
import { bankRegister, daysBetween, isInGroup, ledgerName, ledgerOf, postings, voucherInBooks, voucherParticulars } from '../../core/engine';
import { amountInWords, bankModeLabel, drCr, fmt, fmtBlank, fmtDate, money, parseCsv } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Card, Combo, Empty, Field, Input, Notice, Page, Pill, Stat, Tabs, useFeedback } from '../../ui/kit';
import { Report } from '../../ui/report';

const useBanks = () => {
  const { data } = useBooks();
  return useMemo(() => data.ledgers.filter(l => l.id !== CASH_LEDGER_ID && (isInGroup(data, l.groupId, G.bank) || isInGroup(data, l.groupId, G.bankOd))), [data]);
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Bank statements write dates many ways. Returns an ISO date, or null if this is not one. */
export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/\-. ]([A-Za-z]{3})[A-Za-z]*[/\-. ](\d{2,4})/);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (month > 0) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const toNumber = (s: string) => {
  const n = Number((s ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const ReconcilePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, company, setBankDate } = useBooks();
  const { toast } = useFeedback();
  const banks = useBanks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'open' | 'all'>('open');
  const bank = id ? ledgerOf(data, id) : banks[0];
  const asOf = company.periodTo;
  const reg = useMemo(() => (bank ? bankRegister(data, bank.id, asOf) : null), [data, bank, asOf]);
  if (!bank || !reg) return <Report title="Bank Reconciliation" period="none"><Card><Empty title="No bank accounts yet" hint="Add one under Accounts." /></Card></Report>;
  const rows = view === 'open' ? reg.uncleared : reg.rows;
  const sym = company.currencySymbol;

  const onStatement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const table = parseCsv(await file.text());
    const headerAt = table.findIndex(r => r.some(c => /date/i.test(c)) && r.some(c => /(debit|credit|withdraw|deposit|amount)/i.test(c)));
    if (headerAt === -1) { toast('Could not find Date and Amount columns in that file.', 'bad'); return; }
    const header = table[headerAt].map(c => c.toLowerCase());
    const col = (re: RegExp) => header.findIndex(c => re.test(c));
    const dateCol = col(/date/);
    const debitCol = col(/(debit|withdraw)/);
    const creditCol = col(/(credit|deposit)/);
    const amountCol = col(/amount/);
    let matched = 0;
    let unmatched = 0;
    const open = [...reg.uncleared];
    for (const row of table.slice(headerAt + 1)) {
      const date = parseStatementDate(row[dateCol] ?? '');
      if (!date) continue;
      // Money the bank paid in is a debit in your books, and the other way around.
      const signed = debitCol >= 0 || creditCol >= 0
        ? toNumber(row[creditCol] ?? '') - toNumber(row[debitCol] ?? '')
        : toNumber(row[amountCol] ?? '');
      if (!signed) continue;
      const hit = open.findIndex(p => Math.abs(p.signed - signed) < 0.005 && Math.abs(daysBetween(p.voucher.date, date)) <= 10);
      if (hit === -1) { unmatched++; continue; }
      setBankDate(open[hit].voucher.id, open[hit].line.id, date);
      open.splice(hit, 1);
      matched++;
    }
    toast(`Matched ${matched} from your statement${unmatched ? `. ${unmatched} found no entry in your books` : ''}.`, unmatched ? 'warn' : 'good');
  };

  return (
    <Report
      title="Bank Reconciliation" period="asOf" hint="Enter the date each entry cleared at the bank. What is left explains any gap between your books and your statement."
      actions={<>
        <div className="w-60 no-print"><Combo value={bank.id} onChange={x => navigate(`/banking/reconcile/${x}`)} options={banks.map(b => ({ id: b.id, label: b.name }))} ariaLabel="Bank account" /></div>
        <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 text-slate-500" /> Match a statement</button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" aria-label="Bank statement CSV" onChange={e => void onStatement(e)} />
      </>}
    >
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Balance in your books" value={money(sym, reg.bookBalance)} />
        <Stat label="Not yet at the bank" value={money(sym, reg.notInBank)} sub={`${reg.uncleared.length} entries`} />
        <Stat label="Balance the bank should show" value={money(sym, reg.bankBalance)} />
      </div>
      <Tabs value={view} onChange={setView} tabs={[{ id: 'open', label: 'Not yet cleared' }, { id: 'all', label: 'All entries' }]} />
      <Card flush>
        {rows.length === 0 ? <Empty title="Everything has cleared" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Entry</th><th>Who or what</th><th>Reference</th><th className="num">In</th><th className="num">Out</th><th className="w-44">Cleared on</th></tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={`${p.voucher.id}-${p.line.id}`}>
                    <td className="whitespace-nowrap align-middle">{fmtDate(p.voucher.date)}</td>
                    <td className="whitespace-nowrap align-middle">{VOUCHER_META[p.voucher.type].label} {p.voucher.number}</td>
                    <td className="align-middle">{voucherParticulars(data, p.voucher, bank.id)}</td>
                    <td className="align-middle">{p.line.bank ? `${bankModeLabel(p.line.bank.mode)} ${p.line.bank.instrumentNo ?? ''}`.trim() : ''}</td>
                    <td className="num align-middle">{p.line.side === 'DR' ? fmt(p.line.amount) : ''}</td>
                    <td className="num align-middle">{p.line.side === 'CR' ? fmt(p.line.amount) : ''}</td>
                    <td><Input type="date" className="py-1" aria-label={`Cleared date for ${p.voucher.number}`} value={p.line.bank?.bankDate ?? ''} onChange={e => setBankDate(p.voucher.id, p.line.id, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="hint mt-2 no-print">A statement CSV needs a date column, and either debit and credit columns or one amount column. Entries match on the exact amount within 10 days.</p>
    </Report>
  );
};

export const ChequesPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const today = company.currentDate;
  const rows = useMemo(() => data.vouchers
    .filter(v => !v.isCancelled && v.date >= company.periodFrom && v.date <= company.periodTo)
    .flatMap(v => v.lines.filter(l => l.bank?.mode === 'CHEQUE').map(l => ({ v, l })))
    .sort((a, b) => (a.v.date > b.v.date ? -1 : 1)), [data.vouchers, company.periodFrom, company.periodTo]);
  return (
    <Report title="Cheque Register" hint="All cheques issued and received, and whether they have cleared.">
      <Card flush>
        {rows.length === 0 ? <Empty title="No cheques in this period" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Cheque no.</th><th>Cheque date</th><th>Bank</th><th>Who</th><th className="num">Issued</th><th className="num">Received</th><th>Status</th><th className="no-print" /></tr></thead>
              <tbody>
                {rows.map(({ v, l }) => {
                  const chequeDate = l.bank?.instrumentDate ?? v.date;
                  return (
                    <tr key={l.id} data-href={`/voucher/${v.id}`}>
                      <td className="font-medium">{l.bank?.instrumentNo}</td><td className="whitespace-nowrap">{fmtDate(chequeDate)}</td><td>{ledgerName(data, l.ledgerId)}</td><td>{voucherParticulars(data, v, l.ledgerId)}</td>
                      <td className="num">{l.side === 'CR' ? fmt(l.amount) : ''}</td><td className="num">{l.side === 'DR' ? fmt(l.amount) : ''}</td>
                      <td>{l.bank?.bankDate ? <Pill tone="green">Cleared {fmtDate(l.bank.bankDate)}</Pill> : chequeDate > today ? <Pill tone="amber">Post-dated</Pill> : <Pill>Not cleared</Pill>}</td>
                      <td className="text-right no-print">{l.side === 'CR' && <button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate(`/banking/cheque/${v.id}`); }}>Print cheque</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const ChequePrintPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, company } = useBooks();
  const v = data.vouchers.find(x => x.id === id);
  const line = v?.lines.find(l => l.bank && l.side === 'CR');
  if (!v || !line) return <Page><p className="hint">No cheque on that entry.</p></Page>;
  const payee = line.bank?.favouring || voucherParticulars(data, v, line.ledgerId);
  const date = line.bank?.instrumentDate ?? v.date;
  return (
    <Page>
      <div className="flex gap-2 mb-4 no-print">
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</button>
      </div>
      <p className="hint mb-3 no-print">Print a test on plain paper first and hold it against a cheque, as layouts differ from bank to bank.</p>
      <article className="border border-slate-300 rounded p-5 max-w-3xl bg-white relative h-64">
        <div className="absolute top-4 right-5 tracking-[0.2em] tabular-nums font-semibold">{date.split('-').reverse().join('-')}</div>
        <div className="absolute top-14 left-5 right-5"><span className="hint">Pay </span><b>{payee}</b></div>
        <div className="absolute top-24 left-5 right-44"><span className="hint">Dirhams </span>{amountInWords(line.amount, '').trim()}</div>
        <div className="absolute top-24 right-5 border border-slate-400 px-3 py-1 font-bold tabular-nums">{company.currencySymbol}{fmt(line.amount)}/-</div>
        <div className="absolute top-6 left-5 -rotate-12 border-y border-slate-500 text-[0.8rem] px-1">A/c Payee</div>
        <div className="absolute bottom-5 right-5 text-center"><div className="font-semibold">For {company.mailingName || company.name}</div><div className="mt-6 border-t border-slate-400 pt-0.5 hint">Authorised signatory</div></div>
      </article>
    </Page>
  );
};

export const PostDatedPage: React.FC = () => {
  const { data, company } = useBooks();
  const rows = useMemo(() => data.vouchers.filter(v => v.isPostDated && !v.isCancelled && !voucherInBooks(data, v)).sort((a, b) => (a.date < b.date ? -1 : 1)), [data]);
  return (
    <Report title="Post-Dated Entries" period="none" hint={`Dated after today (${fmtDate(company.currentDate)}), so not in your books yet. They join automatically when the date arrives.`}>
      <Card flush>
        {rows.length === 0 ? <Empty title="No post-dated entries" /> : (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Entry</th><th>Who or what</th><th className="num">Amount</th></tr></thead>
            <tbody>{rows.map(v => <tr key={v.id} data-href={`/voucher/${v.id}`}><td className="whitespace-nowrap">{fmtDate(v.date)}</td><td>{VOUCHER_META[v.type].label} {v.number}</td><td>{voucherParticulars(data, v)}</td><td className="num font-semibold">{fmt(v.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0))}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const DepositSlipPage: React.FC = () => {
  const { data, company } = useBooks();
  const banks = useBanks();
  const [bankId, setBankId] = useState(banks[0]?.id ?? '');
  const [date, setDate] = useState(company.currentDate);
  const bank = ledgerOf(data, bankId);
  const rows = useMemo(() => postings(data).filter(p => p.line.ledgerId === bankId && p.line.side === 'DR' && p.line.bank?.mode === 'CHEQUE' && !p.line.bank.bankDate), [data, bankId]);
  const total = rows.reduce((s, p) => s + p.line.amount, 0);
  return (
    <Report title="Deposit Slip" period="none" hint="Cheques you received that have not cleared yet, to take to the bank." actions={<>
      <div className="w-56 no-print"><Combo value={bankId} onChange={setBankId} options={banks.map(b => ({ id: b.id, label: b.name }))} ariaLabel="Bank account" /></div>
      <div className="w-40 no-print"><Input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Deposit date" /></div>
    </>}>
      <Card flush>
        <div className="px-4 pt-3 pb-2"><b>{bank?.bankName ?? bank?.name}</b>{bank?.accountNo && <span> · Account {bank.accountNo}</span>} · Deposit date {fmtDate(date)}</div>
        {rows.length === 0 ? <Empty title="No cheques waiting to be deposited" /> : (
          <table className="tbl">
            <thead><tr><th>Cheque no.</th><th>Cheque date</th><th>Received from</th><th className="num">Amount</th></tr></thead>
            <tbody>{rows.map(p => <tr key={p.line.id}><td className="font-medium">{p.line.bank?.instrumentNo}</td><td>{fmtDate(p.line.bank?.instrumentDate ?? p.voucher.date)}</td><td>{voucherParticulars(data, p.voucher, bankId)}</td><td className="num">{fmt(p.line.amount)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={3}>Total</td><td className="num">{fmt(total)}</td></tr></tfoot>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const PaymentAdvicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, company } = useBooks();
  const payments = useMemo(() => data.vouchers.filter(v => v.type === 'PAYMENT' && v.partyId && !v.isCancelled).sort((a, b) => (a.date > b.date ? -1 : 1)), [data.vouchers]);
  const v = id ? data.vouchers.find(x => x.id === id) : undefined;
  const partyLine = v?.lines.find(l => l.ledgerId === v.partyId);
  const bankLine = v?.lines.find(l => l.bank);
  const picker = (
    <div className="w-80 no-print">
      <Combo value={id ?? ''} onChange={x => navigate(`/banking/payment-advice/${x}`)} options={payments.map(p => ({ id: p.id, label: `${p.number}: ${p.partyId ? ledgerName(data, p.partyId) : ''}`, hint: fmtDate(p.date) }))} placeholder="Choose a payment to a vendor" ariaLabel="Payment" />
    </div>
  );
  if (!v || !partyLine) return <Report title="Payment Advice" period="none" noExport hint="A note telling a vendor what you paid them for.">{picker}</Report>;
  return (
    <Report title="Payment Advice" period="none" actions={picker}>
      <article className="card p-6 max-w-3xl">
        <div className="flex justify-between flex-wrap gap-3 mb-4">
          <div><div className="font-bold text-[1.1rem]">{company.mailingName || company.name}</div>{company.address && <div>{company.address}</div>}</div>
          <div className="text-right"><div>Ref {v.number}</div><div>{fmtDate(v.date)}</div></div>
        </div>
        <p className="mb-3">To <b>{ledgerName(data, partyLine.ledgerId)}</b>,</p>
        <p className="mb-3">We have paid you <b>{money(company.currencySymbol, partyLine.amount)}</b>{bankLine?.bank?.instrumentNo ? ` by ${bankModeLabel(bankLine.bank.mode) || 'reference'} ${bankLine.bank.instrumentNo}` : ''}{bankLine ? ` from ${ledgerName(data, bankLine.ledgerId)}` : ''}, as set out below.</p>
        <table className="tbl mb-3">
          <thead><tr><th>Against</th><th className="num">Amount</th></tr></thead>
          <tbody>{(partyLine.bills ?? []).map((b, i) => <tr key={i}><td>{b.type === 'ON_ACCOUNT' ? 'On account' : b.type === 'ADVANCE' ? `Advance ${b.ref}` : b.ref}</td><td className="num">{fmt(b.amount)}</td></tr>)}</tbody>
          <tfoot><tr><td>Total</td><td className="num">{fmt(partyLine.amount)}</td></tr></tfoot>
        </table>
        <p className="hint">{amountInWords(partyLine.amount)}</p>
        {v.narration && <p className="mt-2">{v.narration}</p>}
      </article>
    </Report>
  );
};

export { fmtBlank, drCr, Field, Notice };
