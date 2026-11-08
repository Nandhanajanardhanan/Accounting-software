// UAE VAT return and register, withholding tax registers, and payroll reports.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { VOUCHER_META } from '../../core/defaults';
import { type VatBox, type VatDoc, monthRange, monthsBetween, taxDeductionRegister, tdsFromClients, vatDocuments, vatReturn, voucherParticulars } from '../../core/engine';
import { amountInWords, fmt, fmtBlank, fmtDate, fmtMonth, money } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Card, Empty, Notice, Select, Stat, Tabs } from '../../ui/kit';
import { newVoucher } from '../../ui/nav';
import { Report } from '../../ui/report';

const FTA_NOTE = 'These are the figures to fill in your VAT 201 return. Filing still happens on the FTA EmaraTax portal, and your tax agent should check them first. Set the period at the top to your VAT quarter or month.';

const DocTable: React.FC<{ docs: VatDoc[]; empty?: string }> = ({ docs, empty = 'None in this period' }) => {
  const sum = (k: 'invoiceValue' | 'standard' | 'zeroRated' | 'exempt' | 'vat') => docs.reduce((s, d) => s + d[k], 0);
  if (docs.length === 0) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>TRN</th><th>Party</th><th>Number</th><th>Date</th><th>Emirate</th><th className="num">Value</th><th className="num">Standard rated</th><th className="num">Zero-rated</th><th className="num">Exempt</th><th className="num">VAT</th></tr></thead>
        <tbody>
          {docs.map(d => (
            <tr key={d.voucher.id} data-href={`/voucher/${d.voucher.id}`}>
              <td>{d.party?.trn ?? 'Not registered'}</td>
              <td>{d.party?.name}{d.reverseCharge ? <div className="hint">Reverse charge</div> : null}</td>
              <td className="font-medium whitespace-nowrap">{d.voucher.reference && d.voucher.type === 'PURCHASE' ? d.voucher.reference : d.voucher.number}</td>
              <td className="whitespace-nowrap">{fmtDate(d.voucher.date)}</td>
              <td>{d.place}</td>
              <td className="num">{fmt(d.invoiceValue)}</td><td className="num">{fmtBlank(d.standard)}</td><td className="num">{fmtBlank(d.zeroRated)}</td><td className="num">{fmtBlank(d.exempt)}</td><td className="num">{fmtBlank(d.vat)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={5}>Total</td><td className="num">{fmt(sum('invoiceValue'))}</td><td className="num">{fmt(sum('standard'))}</td><td className="num">{fmt(sum('zeroRated'))}</td><td className="num">{fmt(sum('exempt'))}</td><td className="num">{fmt(sum('vat'))}</td></tr></tfoot>
      </table>
    </div>
  );
};

const BoxRows: React.FC<{ boxes: VatBox[]; total: VatBox }> = ({ boxes, total }) => (
  <>
    <tbody>
      {boxes.map(b => (
        <tr key={b.box} className={b.amount === 0 && b.vat === 0 ? 'muted' : ''}>
          <td className="font-medium whitespace-nowrap">{b.box}</td><td>{b.label}</td><td className="num">{fmt(b.amount)}</td><td className="num">{fmt(b.vat)}</td>
        </tr>
      ))}
    </tbody>
    <tfoot><tr><td>{total.box}</td><td>{total.label}</td><td className="num">{fmt(total.amount)}</td><td className="num">{fmt(total.vat)}</td></tr></tfoot>
  </>
);

export const VatReturnPage: React.FC = () => {
  const { data, company } = useBooks();
  const r = useMemo(() => vatReturn(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const sym = company.currencySymbol;
  const head = <thead><tr><th className="w-14">Box</th><th>Description</th><th className="num">Amount ({company.currencyCode})</th><th className="num">VAT amount ({company.currencyCode})</th></tr></thead>;
  return (
    <Report title="VAT Return (VAT 201)" hint="Output VAT on your sales, less the VAT you can recover on purchases, in the boxes the FTA form uses.">
      <Notice className="mb-3 no-print">{FTA_NOTE}</Notice>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Stat label="VAT due on sales (box 12)" value={money(sym, r.due)} />
        <Stat label="Recoverable VAT (box 13)" value={money(sym, r.recoverable)} />
        <Stat label={r.payable >= 0 ? 'Payable to the FTA (box 14)' : 'Refundable to you (box 14)'} value={money(sym, Math.abs(r.payable))} tone={r.payable > 0 ? 'bad' : 'good'} />
      </div>
      <Card title="VAT on sales and all other outputs" flush className="mb-4">
        <div className="overflow-x-auto"><table className="tbl">{head}<BoxRows boxes={r.outputs} total={r.outputTotal} /></table></div>
      </Card>
      <Card title="VAT on expenses and all other inputs" flush className="mb-4">
        <div className="overflow-x-auto"><table className="tbl">{head}<BoxRows boxes={r.inputs} total={r.inputTotal} /></table></div>
      </Card>
      <Card title="Net VAT due" flush>
        <table className="tbl">
          <tbody>
            <tr><td className="font-medium w-14">12</td><td>Total value of due tax for the period</td><td className="num">{fmt(r.due)}</td></tr>
            <tr><td className="font-medium">13</td><td>Total value of recoverable tax for the period</td><td className="num">{fmt(r.recoverable)}</td></tr>
          </tbody>
          <tfoot><tr><td>14</td><td>{r.payable >= 0 ? 'Payable tax for the period' : 'Refundable tax for the period'}</td><td className="num">{fmt(Math.abs(r.payable))}</td></tr></tfoot>
        </table>
      </Card>
    </Report>
  );
};

export const VatRegisterPage: React.FC = () => {
  const { data, company } = useBooks();
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales');
  const docs = useMemo(() => vatDocuments(data, tab === 'sales' ? ['SALES', 'CREDIT_NOTE'] : ['PURCHASE', 'DEBIT_NOTE'], company.periodFrom, company.periodTo), [data, tab, company.periodFrom, company.periodTo]);
  return (
    <Report title="VAT Register" hint="VAT on every invoice, bill and note. Click a row to open it.">
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'sales', label: 'Sales and credit notes' }, { id: 'purchases', label: 'Purchases and debit notes' }]} />
      <Card flush><DocTable docs={docs} /></Card>
    </Report>
  );
};

export const TaxDeductionPage: React.FC = () => {
  const { kind } = useParams();
  const { data, company } = useBooks();
  const type = kind === 'TCS' ? 'TCS' : 'TDS';
  const sym = company.currencySymbol;
  const from = company.periodFrom;
  const to = company.periodTo;
  const reg = useMemo(() => {
    const all = taxDeductionRegister(data, type, from, to);
    const rows = all.rows.filter(r => r.ledger.taxSide !== 'INPUT');
    const deducted = rows.reduce((s, r) => s + r.deducted, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return { rows, deducted, paid, outstanding: deducted - paid };
  }, [data, type, from, to]);
  const clients = useMemo(() => (type === 'TDS' ? tdsFromClients(data, from, to) : null), [data, type, from, to]);
  return (
    <Report title={type === 'TDS' ? 'TDS' : 'TCS'} hint={type === 'TDS' ? 'TDS clients cut from your payments, and TDS you deducted from vendors.' : 'Tax you collected on sales, and what you have deposited.'}>
      <Notice className="mb-3 no-print">Compare the client figures with your Form 26AS. Certificates and returns are filed on the government portal.</Notice>
      {clients && (
        <Card title={`TDS deducted by clients: ${money(sym, clients.total)}`} flush className="mb-4">
          {clients.rows.length === 0 ? <Empty title="None in this period" hint="Enter it in the TDS box when you record a receipt from a client." /> : (
            <table className="tbl">
              <thead><tr><th>Date</th><th>Entry</th><th>Client</th><th className="num">TDS</th></tr></thead>
              <tbody>{clients.rows.map(r => <tr key={r.voucher.id} data-href={`/voucher/${r.voucher.id}`}><td className="whitespace-nowrap">{fmtDate(r.voucher.date)}</td><td>{r.voucher.number}</td><td>{r.party}</td><td className="num font-semibold">{fmt(r.amount)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={3}>Total, claim this on your return</td><td className="num">{fmt(clients.total)}</td></tr></tfoot>
            </table>
          )}
        </Card>
      )}
      <Card title={type === 'TDS' ? 'TDS you deducted from vendors' : 'TCS you collected'} flush>
        {reg.rows.length === 0 ? <Empty title="None in this period" hint={`Create a Duties & Taxes account with tax type ${type}, then add it to a bill as a charge.`} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Entry</th><th>Party</th><th>Section</th><th className="num">{type === 'TDS' ? 'Deducted' : 'Collected'}</th><th className="num">Deposited</th></tr></thead>
              <tbody>
                {reg.rows.map(r => <tr key={`${r.voucher.id}-${r.ledger.id}`} data-href={`/voucher/${r.voucher.id}`}><td className="whitespace-nowrap">{fmtDate(r.voucher.date)}</td><td>{VOUCHER_META[r.voucher.type].label} {r.voucher.number}</td><td>{r.party}</td><td>{r.ledger.section}</td><td className="num">{fmtBlank(r.deducted)}</td><td className="num">{fmtBlank(r.paid)}</td></tr>)}
              </tbody>
              <tfoot><tr><td colSpan={4}>Still to deposit: {fmt(reg.outstanding)}</td><td className="num">{fmt(reg.deducted)}</td><td className="num">{fmt(reg.paid)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- payroll

const useMonths = () => {
  const { company } = useBooks();
  return useMemo(() => monthsBetween(company.periodFrom, company.periodTo), [company.periodFrom, company.periodTo]);
};

const MonthPicker: React.FC<{ value: string; onChange: (m: string) => void }> = ({ value, onChange }) => {
  const months = useMonths();
  return <div className="w-44 no-print"><Select value={value} onChange={e => onChange(e.target.value)} aria-label="Month">{months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}</Select></div>;
};

export const PaySheetPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const [month, setMonth] = useState(company.currentDate.slice(0, 7));
  const run = data.vouchers.find(v => v.type === 'PAYROLL' && v.payrollMonth === month && !v.isCancelled);
  const heads = data.payHeads.filter(h => run?.payroll?.some(r => [...r.earnings, ...r.deductions].some(x => x.headId === h.id)));
  const amountOf = (r: NonNullable<typeof run>['payroll'] extends (infer T)[] | undefined ? T : never, headId: string) => [...r.earnings, ...r.deductions].find(x => x.headId === headId)?.amount ?? 0;
  return (
    <Report title="Pay Sheet" period="none" hint={`Salaries for ${fmtMonth(month)}.`} actions={<MonthPicker value={month} onChange={setMonth} />}>
      <Card flush>
        {!run ? <Empty title="No payroll recorded for this month" action={<button className="btn btn-primary" onClick={() => navigate(newVoucher('PAYROLL'))}>Run payroll</button>} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Employee</th><th className="num">Paid days</th>{heads.map(h => <th key={h.id} className="num">{h.name}</th>)}<th className="num">Net pay</th></tr></thead>
              <tbody>
                {run.payroll!.map(r => (
                  <tr key={r.employeeId}>
                    <td className="font-medium">{data.employees.find(e => e.id === r.employeeId)?.name}</td><td className="num">{r.days}</td>
                    {heads.map(h => <td key={h.id} className="num">{fmtBlank(amountOf(r, h.id))}</td>)}
                    <td className="num font-semibold">{fmt(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>Total</td>{heads.map(h => <td key={h.id} className="num">{fmt(run.payroll!.reduce((s, r) => s + amountOf(r, h.id), 0))}</td>)}<td className="num">{fmt(run.payroll!.reduce((s, r) => s + r.net, 0))}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const PaySlipsPage: React.FC = () => {
  const { data, company } = useBooks();
  const [month, setMonth] = useState(company.currentDate.slice(0, 7));
  const run = data.vouchers.find(v => v.type === 'PAYROLL' && v.payrollMonth === month && !v.isCancelled);
  const name = (headId: string) => data.payHeads.find(h => h.id === headId)?.name ?? 'Removed pay head';
  return (
    <Report title="Pay Slips" period="none" noExport hint={`One slip per employee for ${fmtMonth(month)}.`} actions={<>
      <MonthPicker value={month} onChange={setMonth} />
    </>}>
      {!run ? <Card><Empty title="No payroll recorded for this month" /></Card> : (
        <div className="flex flex-col gap-4">
          {run.payroll!.map(r => {
            const e = data.employees.find(x => x.id === r.employeeId);
            const gross = r.earnings.reduce((s, x) => s + x.amount, 0);
            const deductions = r.deductions.reduce((s, x) => s + x.amount, 0);
            return (
              <article key={r.employeeId} className="card p-5 break-inside-avoid">
                <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                  <div><div className="font-bold">{company.mailingName || company.name}</div><div className="hint">Pay slip for {fmtMonth(month)}</div></div>
                  <div className="text-right"><div className="font-semibold">{e?.name}</div><div className="hint">{[e?.code, e?.designation].filter(Boolean).join(' · ')}</div><div className="hint">Paid days: {r.days} of {monthRange(month).days}</div></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <table className="tbl"><thead><tr><th>Earnings</th><th className="num">Amount</th></tr></thead><tbody>{r.earnings.map(x => <tr key={x.headId}><td>{name(x.headId)}</td><td className="num">{fmt(x.amount)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td className="num">{fmt(gross)}</td></tr></tfoot></table>
                  <table className="tbl"><thead><tr><th>Deductions</th><th className="num">Amount</th></tr></thead><tbody>{r.deductions.map(x => <tr key={x.headId}><td>{name(x.headId)}</td><td className="num">{fmt(x.amount)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td className="num">{fmt(deductions)}</td></tr></tfoot></table>
                </div>
                <div className="flex flex-wrap justify-between items-baseline gap-2 mt-3 pt-2 border-t border-slate-200">
                  <span className="hint">{amountInWords(r.net)}</span>
                  <span className="font-bold text-[1.1rem]">Net pay {money(company.currencySymbol, r.net)}</span>
                </div>
              </article>
            );
          })}
          <button className="btn self-start no-print" onClick={() => window.print()}><Printer className="w-4 h-4 text-slate-500" /> Print all</button>
        </div>
      )}
    </Report>
  );
};

export const AttendanceSheetPage: React.FC = () => {
  const { data, company } = useBooks();
  const [month, setMonth] = useState(company.currentDate.slice(0, 7));
  const totals = useMemo(() => {
    const out = new Map<string, number>();
    for (const v of data.vouchers) {
      if (v.type !== 'ATTENDANCE' || v.isCancelled || !v.date.startsWith(month)) continue;
      for (const a of v.attendance ?? []) out.set(`${a.employeeId}|${a.typeId}`, (out.get(`${a.employeeId}|${a.typeId}`) ?? 0) + a.value);
    }
    return out;
  }, [data.vouchers, month]);
  return (
    <Report title="Attendance Sheet" period="none" hint={`Attendance recorded for ${fmtMonth(month)}.`} actions={<MonthPicker value={month} onChange={setMonth} />}>
      <Card flush>
        {data.employees.length === 0 ? <Empty title="No employees yet" /> : (
          <table className="tbl">
            <thead><tr><th>Employee</th>{data.attendanceTypes.map(t => <th key={t.id} className="num">{t.name} ({t.unit})</th>)}</tr></thead>
            <tbody>{data.employees.map(e => <tr key={e.id}><td className="font-medium">{e.name}</td>{data.attendanceTypes.map(t => <td key={t.id} className="num">{totals.get(`${e.id}|${t.id}`) ?? ''}</td>)}</tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const StatutoryPage: React.FC = () => {
  const { data, company } = useBooks();
  const [month, setMonth] = useState(company.currentDate.slice(0, 7));
  const rows = useMemo(() => {
    const run = data.vouchers.find(v => v.type === 'PAYROLL' && v.payrollMonth === month && !v.isCancelled);
    if (!run) return null;
    const out = new Map<string, { kind: string; employee: number; employer: number }>();
    for (const r of run.payroll ?? []) {
      const add = (headId: string, amount: number, who: 'employee' | 'employer') => {
        const h = data.payHeads.find(x => x.id === headId);
        if (!h?.statutory) return;
        if (!out.has(h.statutory)) out.set(h.statutory, { kind: h.statutory, employee: 0, employer: 0 });
        out.get(h.statutory)![who] += amount;
      };
      r.deductions.forEach(x => add(x.headId, x.amount, 'employee'));
      r.employer.forEach(x => add(x.headId, x.amount, 'employer'));
    }
    return [...out.values()];
  }, [data, month]);
  const label: Record<string, string> = { PF: 'Provident Fund', ESI: 'ESI', PT: 'Professional Tax', TDS: 'TDS on salary' };
  return (
    <Report title="PF & PT Summary" period="none" hint={`What is due to the authorities for ${fmtMonth(month)}.`} actions={<MonthPicker value={month} onChange={setMonth} />}>
      <Card flush>
        {!rows || rows.length === 0 ? <Empty title="Nothing for this month" /> : (
          <table className="tbl">
            <thead><tr><th>Type</th><th className="num">From employees</th><th className="num">From you</th><th className="num">Total due</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.kind}><td className="font-medium">{label[r.kind]}</td><td className="num">{fmt(r.employee)}</td><td className="num">{fmtBlank(r.employer)}</td><td className="num font-semibold">{fmt(r.employee + r.employer)}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export { voucherParticulars };
