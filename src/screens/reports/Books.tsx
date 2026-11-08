// Day Book, ledger statements, group summaries, cash and bank books, registers, and the analysis reports.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Voucher, VoucherBase } from '../../core/types';
import { G, VOUCHER_META, VOUCHER_ORDER } from '../../core/defaults';
import {
  ageBuckets, billsOf, budgetActual, childGroups, costCentreReport, daysBetween, forexPositions, groupOf, groupSummary, indexOf, interestFor, isCashOrBank, isInGroup, isZero,
  itemPositions, ledgerBalances, ledgerName, ledgerOf, ledgerStatement, monthsBetween, pnl, scenarioOptions, statistics, stockMoves, voucherAmount, voucherInBooks, voucherParticulars,
} from '../../core/engine';
import { drCr, fmt, fmtBlank, fmtDate, fmtMonth, money } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Card, Combo, Empty, Notice, Pill, SearchBox, Select, Stat, Tabs } from '../../ui/kit';
import { EditEntryButton, Hub, Report } from '../../ui/report';
import { DESTINATIONS, newVoucher } from '../../ui/nav';

const voucherState = (v: Voucher) => {
  if (v.isCancelled) return <Pill tone="red">Cancelled</Pill>;
  if (v.isOptional) return <Pill tone="amber">Optional</Pill>;
  if (v.isPostDated) return <Pill tone="amber">Post-dated</Pill>;
  if (v.type === 'MEMORANDUM' || v.type === 'REVERSING_JOURNAL') return <Pill>Not in books</Pill>;
  return null;
};

// ---------------------------------------------------------------- day book

export const DayBookPage: React.FC = () => {
  const { data, company, features } = useBooks();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState<VoucherBase | ''>('');
  const rows = useMemo(() => data.vouchers
    .filter(v => v.date >= company.periodFrom && v.date <= company.periodTo)
    .filter(v => !type || v.type === type)
    .map(v => ({ v, who: voucherParticulars(data, v), amount: voucherAmount(v) }))
    .filter(r => `${r.v.number} ${r.who} ${r.v.narration ?? ''} ${VOUCHER_META[r.v.type].label}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.v.date > b.v.date ? -1 : a.v.date < b.v.date ? 1 : b.v.createdAt.localeCompare(a.v.createdAt))),
    [data, company.periodFrom, company.periodTo, q, type]);
  const types = VOUCHER_ORDER.filter(b => !VOUCHER_META[b].feature || features[VOUCHER_META[b].feature!] || data.vouchers.some(v => v.type === b));
  return (
    <Report title="Day Book" hint="Every entry in this period, newest first. Click Edit to correct an amount, account, date or note.">
      <div className="flex flex-wrap gap-2 mb-3 no-print">
        <div className="w-72"><SearchBox value={q} onChange={setQ} placeholder="Search number, name or note" /></div>
        <div className="w-52">
          <Select value={type} onChange={e => setType(e.target.value as VoucherBase | '')} aria-label="Entry type">
            <option value="">All entry types</option>
            {types.map(b => <option key={b} value={b}>{VOUCHER_META[b].label}</option>)}
          </Select>
        </div>
      </div>
      <Card flush>
        {rows.length === 0 ? <Empty title="No entries match" action={<button className="btn btn-primary" onClick={() => navigate('/new')}>Add an entry</button>} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Type</th><th>Number</th><th>Who or what</th><th>Note</th><th /><th className="num">Amount</th><th className="no-print" /></tr></thead>
              <tbody>
                {rows.map(({ v, who, amount }) => (
                  <tr key={v.id} data-href={`/voucher/${v.id}`} className={v.isCancelled ? 'muted' : ''}>
                    <td className="whitespace-nowrap">{fmtDate(v.date)}</td>
                    <td>{VOUCHER_META[v.type].label}</td>
                    <td className="font-medium whitespace-nowrap">{v.number}</td>
                    <td>{who}</td>
                    <td className="text-slate-500 max-w-72 truncate">{v.narration}</td>
                    <td>{voucherState(v)}</td>
                    <td className="num font-semibold">{fmt(amount)}</td>
                    <td className="text-right no-print"><EditEntryButton id={v.id} /></td>
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

// ---------------------------------------------------------------- ledger statement

export const LedgerStatementPage: React.FC = () => {
  const { id } = useParams();
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const ledger = id ? ledgerOf(data, id) : undefined;
  const statement = useMemo(() => (id ? ledgerStatement(data, id, company.periodFrom, company.periodTo) : null), [data, id, company.periodFrom, company.periodTo]);
  const options = useMemo(() => data.ledgers.filter(l => l.groupId).map(l => ({ id: l.id, label: l.name, hint: data.groups.find(g => g.id === l.groupId)?.name })).sort((a, b) => a.label.localeCompare(b.label)), [data.ledgers, data.groups]);
  const picker = (
    <div className="w-72 no-print"><Combo value={id ?? ''} onChange={x => navigate(`/reports/ledger/${x}`)} options={options} placeholder="Choose an account" ariaLabel="Account" /></div>
  );
  if (!ledger || !statement) return <Report title="Ledger Statement" hint="All entries in any one account." period="none" noExport>{picker}</Report>;
  return (
    <Report title={ledger.name} hint={data.groups.find(g => g.id === ledger.groupId)?.name} actions={picker}>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Entry</th><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th><th className="no-print" /></tr></thead>
            <tbody>
              <tr className="sub"><td /><td /><td>Opening balance</td><td className="num" /><td className="num" /><td className="num">{drCr(statement.opening)}</td><td className="no-print" /></tr>
              {statement.rows.map(r => (
                <tr key={`${r.voucher.id}-${r.balance}`} data-href={`/voucher/${r.voucher.id}`}>
                  <td className="whitespace-nowrap">{fmtDate(r.voucher.date)}</td>
                  <td className="whitespace-nowrap">{VOUCHER_META[r.voucher.type].label} {r.voucher.number}</td>
                  <td>{r.particulars}{r.voucher.narration && <div className="hint">{r.voucher.narration}</div>}</td>
                  <td className="num">{fmtBlank(r.debit)}</td>
                  <td className="num">{fmtBlank(r.credit)}</td>
                  <td className="num">{drCr(r.balance)}</td>
                  <td className="text-right no-print"><EditEntryButton id={r.voucher.id} /></td>
                </tr>
              ))}
              {statement.rows.length === 0 && <tr><td colSpan={7} className="text-center hint py-6">No entries in this period.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={3}>Closing balance</td><td className="num">{fmt(statement.dr)}</td><td className="num">{fmt(statement.cr)}</td><td className="num">{drCr(statement.closing)}</td><td className="no-print" /></tr></tfoot>
          </table>
        </div>
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- group summary

export const GroupSummaryPage: React.FC = () => {
  const { id } = useParams();
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const group = id ? groupOf(data, id) : undefined;
  const rows = useMemo(() => (id ? groupSummary(data, id, company.periodFrom, company.periodTo) : []), [data, id, company.periodFrom, company.periodTo]);
  const picker = (
    <div className="w-72 no-print"><Combo value={id ?? ''} onChange={x => navigate(`/reports/group/${x}`)} options={data.groups.map(g => ({ id: g.id, label: g.name }))} placeholder="Choose a group" ariaLabel="Group" /></div>
  );
  if (!group) return <Report title="Group Summary" hint="Balances of all ledgers in a group." period="none" noExport>{picker}</Report>;
  const total = rows.reduce((s, r) => ({ opening: s.opening + r.opening, dr: s.dr + r.dr, cr: s.cr + r.cr, closing: s.closing + r.node.amount }), { opening: 0, dr: 0, cr: 0, closing: 0 });
  return (
    <Report title={group.name} hint={group.parentId ? `Part of ${groupOf(data, group.parentId)?.name}` : 'A main group'} actions={picker}>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Particulars</th><th className="num">Opening</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Closing</th></tr></thead>
            <tbody>
              {rows.filter(r => !isZero(r.opening) || !isZero(r.dr) || !isZero(r.cr)).map(r => (
                <tr key={r.node.id} data-href={r.node.kind === 'group' ? `/reports/group/${r.node.id}` : `/reports/ledger/${r.node.id}`} className={r.node.kind === 'group' ? 'sub' : ''}>
                  <td>{r.node.name}</td><td className="num">{isZero(r.opening) ? '' : drCr(r.opening)}</td><td className="num">{fmtBlank(r.dr)}</td><td className="num">{fmtBlank(r.cr)}</td><td className="num">{drCr(r.node.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td className="num">{drCr(total.opening)}</td><td className="num">{fmt(total.dr)}</td><td className="num">{fmt(total.cr)}</td><td className="num">{drCr(total.closing)}</td></tr></tfoot>
          </table>
        </div>
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- cash and bank books

export const CashBankPage: React.FC = () => {
  const { data, company } = useBooks();
  const rows = useMemo(() => {
    const b = ledgerBalances(data, company.periodFrom, company.periodTo);
    return data.ledgers.filter(l => isCashOrBank(data, l)).map(l => ({ l, ...b.get(l.id)! }));
  }, [data, company.periodFrom, company.periodTo]);
  const total = rows.reduce((s, r) => s + r.closing, 0);
  return (
    <Report title="Cash & Bank Books" hint="Click an account for its full statement.">
      <Card flush>
        <table className="tbl">
          <thead><tr><th>Account</th><th className="num">Opening</th><th className="num">Money in</th><th className="num">Money out</th><th className="num">Closing</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.l.id} data-href={`/reports/ledger/${r.l.id}`}>
                <td className="font-medium">{r.l.name}</td><td className="num">{drCr(r.opening)}</td><td className="num">{fmtBlank(r.dr)}</td><td className="num">{fmtBlank(r.cr)}</td><td className="num font-semibold">{drCr(r.closing)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4}>Total</td><td className="num">{drCr(total)}</td></tr></tfoot>
        </table>
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- registers

export const RegistersIndex: React.FC = () => {
  const { features, data } = useBooks();
  return (
    <Hub title="Registers" hint="Every entry type, month by month." sections={[{
      title: 'Registers',
      items: VOUCHER_ORDER
        .filter(b => !VOUCHER_META[b].feature || features[VOUCHER_META[b].feature!] || data.vouchers.some(v => v.type === b))
        .map(b => ({ label: `${VOUCHER_META[b].label} Register`, to: `/reports/register/${b}`, section: '', plain: VOUCHER_META[b].plain, keywords: VOUCHER_META[b].tallyName })),
    }]} />
  );
};

export const RegisterPage: React.FC = () => {
  const { base, month } = useParams();
  const { data, company } = useBooks();
  const meta = VOUCHER_META[base as VoucherBase];
  const list = useMemo(() => data.vouchers.filter(v => v.type === base && v.date >= company.periodFrom && v.date <= company.periodTo && !v.isCancelled), [data.vouchers, base, company.periodFrom, company.periodTo]);
  if (!meta) return <Report title="Register" period="none">Unknown register.</Report>;
  if (month) {
    const rows = list.filter(v => v.date.startsWith(month)).sort((a, b) => (a.date < b.date ? -1 : 1));
    return (
      <Report title={`${meta.label} Register: ${fmtMonth(month)}`} period="none">
        <Card flush>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Number</th><th>Who or what</th><th>Note</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} data-href={`/voucher/${v.id}`}>
                  <td className="whitespace-nowrap">{fmtDate(v.date)}</td><td className="font-medium">{v.number}</td><td>{voucherParticulars(data, v)}</td><td className="text-slate-500">{v.narration}</td><td className="num font-semibold">{fmt(voucherAmount(v))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4}>Total</td><td className="num">{fmt(rows.reduce((s, v) => s + voucherAmount(v), 0))}</td></tr></tfoot>
          </table>
        </Card>
      </Report>
    );
  }
  const months = monthsBetween(company.periodFrom, company.periodTo).map(m => {
    const own = list.filter(v => v.date.startsWith(m));
    return { month: m, count: own.length, total: own.reduce((s, v) => s + voucherAmount(v), 0) };
  });
  return (
    <Report title={`${meta.label} Register`} hint={meta.plain}>
      <Card flush>
        <table className="tbl">
          <thead><tr><th>Month</th><th className="num">Entries</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {months.map(m => (
              <tr key={m.month} data-href={m.count ? `/reports/register/${base}/${m.month}` : undefined}>
                <td>{fmtMonth(m.month)}</td><td className="num">{m.count || ''}</td><td className="num font-medium">{fmtBlank(m.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td className="num">{list.length}</td><td className="num">{fmt(months.reduce((s, m) => s + m.total, 0))}</td></tr></tfoot>
        </table>
      </Card>
    </Report>
  );
};

// ---------------------------------------------------------------- outstandings

export const OutstandingPage: React.FC = () => {
  const { kind } = useParams();
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const isCollect = kind === 'receivable';
  const today = company.currentDate;
  const asOf = company.periodTo > today ? company.periodTo : today;
  const bills = useMemo(() => billsOf(data, asOf).filter(b => (isCollect ? b.pending > 0 : b.pending < 0)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)), [data, asOf, isCollect]);
  const total = bills.reduce((s, b) => s + Math.abs(b.pending), 0);
  const overdue = bills.filter(b => b.dueDate < today).reduce((s, b) => s + Math.abs(b.pending), 0);
  const sym = company.currencySymbol;
  return (
    <Report title={isCollect ? 'Money to Collect' : 'Money to Pay'} period="none" hint={isCollect ? 'Unpaid client invoices, oldest due date first. Tally calls this Bills Receivable.' : 'Unpaid vendor bills, oldest due date first. Tally calls this Bills Payable.'}>
      <div className="grid sm:grid-cols-3 gap-3 mb-4 no-print">
        <Stat label="Total" value={money(sym, total)} />
        <Stat label="Overdue" value={money(sym, overdue)} tone={overdue > 0 ? 'bad' : 'plain'} />
        <Stat label="Not due yet" value={money(sym, total - overdue)} />
      </div>
      <Card flush>
        {bills.length === 0 ? <Empty title={isCollect ? 'Nobody owes you anything' : 'You owe nothing'} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Bill</th><th>Date</th><th>{isCollect ? 'Client' : 'Vendor'}</th><th>Due</th><th className="num">Late by</th><th className="num">Original</th><th className="num">Open</th><th className="no-print" /></tr></thead>
              <tbody>
                {bills.map(b => {
                  const late = daysBetween(b.dueDate, today);
                  const settle = new URLSearchParams({ party: b.ledgerId, amount: String(Math.abs(b.pending)), ...(b.isOnAccount ? {} : { ref: b.ref }) });
                  return (
                    <tr key={`${b.ledgerId}-${b.ref}-${b.voucherId}`} data-href={`/reports/ledger/${b.ledgerId}`}>
                      <td className="font-medium">{b.ref}</td>
                      <td className="whitespace-nowrap">{fmtDate(b.date)}</td>
                      <td>{ledgerName(data, b.ledgerId)}</td>
                      <td className="whitespace-nowrap">{fmtDate(b.dueDate)}</td>
                      <td className={`num ${late > 0 ? 'text-rose-700 font-semibold' : ''}`}>{late > 0 ? `${late} days` : ''}</td>
                      <td className="num">{fmt(Math.abs(b.amount))}</td>
                      <td className="num font-semibold">{fmt(Math.abs(b.pending))}</td>
                      <td className="text-right no-print"><button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate(`${newVoucher(isCollect ? 'RECEIPT' : 'PAYMENT')}?${settle}`); }}>{isCollect ? 'Receive' : 'Pay'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={6}>Total</td><td className="num">{fmt(total)}</td><td className="no-print" /></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const AgeingPage: React.FC = () => {
  const { data, company } = useBooks();
  const [side, setSide] = useState<'receivable' | 'payable'>('receivable');
  const today = company.currentDate;
  const rows = useMemo(() => {
    const groupId = side === 'receivable' ? G.debtors : G.creditors;
    const bills = billsOf(data, today).filter(b => (side === 'receivable' ? b.pending > 0 : b.pending < 0));
    const parties = [...new Set(bills.map(b => b.ledgerId))].filter(id => { const l = ledgerOf(data, id); return !!l && isInGroup(data, l.groupId, groupId); });
    return parties.map(id => ({ id, name: ledgerName(data, id), ...ageBuckets(bills.filter(b => b.ledgerId === id), today) }));
  }, [data, today, side]);
  const totals = rows.reduce((s, r) => ({ current: s.current + r.current, d30: s.d30 + r.d30, d60: s.d60 + r.d60, d90: s.d90 + r.d90, older: s.older + r.older }), { current: 0, d30: 0, d60: 0, d90: 0, older: 0 });
  const cols: ['current' | 'd30' | 'd60' | 'd90' | 'older', string][] = [['current', 'Not due'], ['d30', '1 to 30 days late'], ['d60', '31 to 60'], ['d90', '61 to 90'], ['older', 'Over 90']];
  return (
    <Report title="Ageing Analysis" period="none" hint="How overdue each party is, as of today.">
      <Tabs value={side} onChange={setSide} tabs={[{ id: 'receivable', label: 'Clients' }, { id: 'payable', label: 'Vendors' }]} />
      <Card flush>
        {rows.length === 0 ? <Empty title="Nothing open" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Party</th>{cols.map(([k, l]) => <th key={k} className="num">{l}</th>)}<th className="num">Total</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} data-href={`/reports/ledger/${r.id}`}>
                    <td className="font-medium">{r.name}</td>
                    {cols.map(([k]) => <td key={k} className="num">{fmtBlank(r[k])}</td>)}
                    <td className="num font-semibold">{fmt(r.current + r.d30 + r.d60 + r.d90 + r.older)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td>{cols.map(([k]) => <td key={k} className="num">{fmt(totals[k])}</td>)}<td className="num">{fmt(totals.current + totals.d30 + totals.d60 + totals.d90 + totals.older)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const InterestPage: React.FC = () => {
  const { data, company } = useBooks();
  const rows = useMemo(() => data.ledgers.filter(l => l.interestPct).map(l => ({ l, ...interestFor(data, l, company.periodFrom, company.periodTo) })), [data, company.periodFrom, company.periodTo]);
  return (
    <Report title="Interest Calculation" hint="Simple interest on the daily balance of accounts that have an interest rate. Set the rate on the account.">
      <Card flush>
        {rows.length === 0 ? <Empty title="No accounts have an interest rate" hint="Open an account in Ledgers and enter one." /> : (
          <table className="tbl">
            <thead><tr><th>Account</th><th className="num">Rate</th><th className="num">Closing balance</th><th className="num">Interest</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.l.id} data-href={`/reports/ledger/${r.l.id}`}><td className="font-medium">{r.l.name}</td><td className="num">{r.rate}%</td><td className="num">{drCr(r.closing)}</td><td className="num font-semibold">{drCr(r.interest)}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const CostCentreReportPage: React.FC = () => {
  const { data, company } = useBooks();
  const rows = useMemo(() => costCentreReport(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const name = (id: string) => data.costCentres.find(c => c.id === id)?.name ?? 'Deleted project';
  const category = (id: string) => data.costCategories.find(c => c.id === data.costCentres.find(x => x.id === id)?.categoryId)?.name;
  return (
    <Report title="Project Break-up" hint="Income and spending per project, account by account. Tally calls this the cost centre report.">
      {rows.length === 0 ? <Card><Empty title="Nothing tagged to a project yet" /></Card> : (
        <div className="flex flex-col gap-4">
          {rows.map(r => (
            <Card key={r.centreId} title={<span>{name(r.centreId)} {category(r.centreId) && <span className="hint font-normal">· {category(r.centreId)}</span>}</span>} flush>
              <table className="tbl">
                <tbody>
                  {[...r.ledgers.entries()].map(([id, amount]) => <tr key={id} data-href={`/reports/ledger/${id}`}><td>{ledgerName(data, id)}</td><td className="num">{drCr(amount)}</td></tr>)}
                </tbody>
                <tfoot><tr><td>Profit</td><td className="num">{fmt(r.income - r.expense)}</td></tr></tfoot>
              </table>
            </Card>
          ))}
        </div>
      )}
    </Report>
  );
};

export const BudgetReportPage: React.FC = () => {
  const { data } = useBooks();
  const [id, setId] = useState(data.budgets[0]?.id ?? '');
  const budget = data.budgets.find(b => b.id === id);
  return (
    <Report title="Budget vs Actual" period="none" hint="How your actual figures compare with your budget." actions={
      data.budgets.length > 0 ? <div className="w-60"><Select value={id} onChange={e => setId(e.target.value)} aria-label="Budget">{data.budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div> : undefined
    }>
      <Card flush>
        {!budget ? <Empty title="No budgets yet" hint="Create one under Accounts." /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Line</th><th className="num">Budget</th><th className="num">Actual</th><th className="num">Left</th><th className="num">Used</th></tr></thead>
              <tbody>
                {budget.lines.map(l => {
                  const actual = budgetActual(data, l.kind, l.refId, budget.from, budget.to);
                  const name = l.kind === 'GROUP' ? groupOf(data, l.refId)?.name : ledgerName(data, l.refId);
                  const pct = l.amount ? (actual / l.amount) * 100 : 0;
                  return (
                    <tr key={`${l.kind}-${l.refId}`} data-href={l.kind === 'GROUP' ? `/reports/group/${l.refId}` : `/reports/ledger/${l.refId}`}>
                      <td className="font-medium">{name}</td><td className="num">{fmt(l.amount)}</td><td className="num">{fmt(actual)}</td>
                      <td className={`num ${actual > l.amount ? 'text-rose-700 font-semibold' : ''}`}>{fmt(l.amount - actual)}</td>
                      <td className="num">{pct.toFixed(0)}%</td>
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

export const ScenarioReportPage: React.FC = () => {
  const { data, company } = useBooks();
  const [id, setId] = useState(data.scenarios[0]?.id ?? '');
  const scenario = data.scenarios.find(s => s.id === id);
  const actual = useMemo(() => pnl(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const what = useMemo(() => (scenario ? pnl(data, company.periodFrom, company.periodTo, scenarioOptions(scenario, company.periodTo)) : null), [data, scenario, company.periodFrom, company.periodTo]);
  const rows: [string, 'sales' | 'purchases' | 'directIncome' | 'directExpense' | 'indirectIncome' | 'indirectExpense' | 'grossProfit' | 'netProfit'][] = [
    ['Sales', 'sales'], ['Direct income', 'directIncome'], ['Purchases', 'purchases'], ['Direct expenses', 'directExpense'], ['Gross profit', 'grossProfit'],
    ['Other income', 'indirectIncome'], ['Running expenses', 'indirectExpense'], ['Net profit', 'netProfit'],
  ];
  return (
    <Report title="Scenario Report" hint="Your profit if the entries kept out of your books were real." actions={
      data.scenarios.length > 0 ? <div className="w-60"><Select value={id} onChange={e => setId(e.target.value)} aria-label="Scenario">{data.scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div> : undefined
    }>
      <Card flush>
        {!what ? <Empty title="No scenarios yet" hint="Create one under Accounts." /> : (
          <table className="tbl">
            <thead><tr><th>Line</th><th className="num">Actual</th><th className="num">{scenario?.name}</th><th className="num">Difference</th></tr></thead>
            <tbody>{rows.map(([label, k]) => <tr key={k} className={k === 'netProfit' || k === 'grossProfit' ? 'sub' : ''}><td>{label}</td><td className="num">{fmt(actual[k])}</td><td className="num">{fmt(what[k])}</td><td className="num">{fmtBlank(what[k] - actual[k])}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const ForexPage: React.FC = () => {
  const { data, company } = useBooks();
  const rows = useMemo(() => forexPositions(data, company.periodTo), [data, company.periodTo]);
  const total = rows.reduce((s, r) => s + r.gain, 0);
  return (
    <Report title="Forex Gain or Loss" period="asOf" hint="What foreign-currency balances are worth at the current rate, against what your books show. Record the gain or loss with a Journal when you settle.">
      <Card flush>
        {rows.length === 0 ? <Empty title="No accounts in a foreign currency" hint="Set a currency on a client under Clients." /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Account</th><th className="num">Foreign balance</th><th className="num">Rate now</th><th className="num">Worth now</th><th className="num">In your books</th><th className="num">Gain or loss</th></tr></thead>
              <tbody>{rows.map(r => <tr key={r.ledger.id} data-href={`/reports/ledger/${r.ledger.id}`}><td className="font-medium">{r.ledger.name}</td><td className="num">{r.currencyCode} {fmt(r.fcBalance)}</td><td className="num">{fmt(r.rate)}</td><td className="num">{fmt(r.atToday)}</td><td className="num">{fmt(r.bookValue)}</td><td className={`num font-semibold ${r.gain < 0 ? 'text-rose-700' : ''}`}>{fmt(r.gain)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={5}>Total</td><td className="num">{fmt(total)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const StatisticsPage: React.FC = () => {
  const { data } = useBooks();
  const s = useMemo(() => statistics(data), [data]);
  return (
    <Report title="Statistics" period="none" hint="How much is in this business's books.">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="Entries" flush>
          <table className="tbl">
            <tbody>{VOUCHER_ORDER.filter(b => s.voucherCounts.get(b)).map(b => <tr key={b} data-href={`/reports/register/${b}`}><td>{VOUCHER_META[b].label}</td><td className="num">{s.voucherCounts.get(b)}</td></tr>)}</tbody>
            <tfoot><tr><td>Total</td><td className="num">{data.vouchers.length}</td></tr></tfoot>
          </table>
        </Card>
        <Card title="Masters" flush>
          <table className="tbl"><tbody>{Object.entries(s.masters).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </Report>
  );
};

export const ExceptionsPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const today = company.currentDate;
  const ex = useMemo(() => {
    const bal = ledgerBalances(data, company.periodFrom, company.periodTo);
    const neg = data.ledgers.filter(l => {
      const c = bal.get(l.id)?.closing ?? 0;
      if (isCashOrBank(data, l)) return !isInGroup(data, l.groupId, G.bankOd) && c < -0.005;
      if (isInGroup(data, l.groupId, G.debtors)) return c < -0.005;
      if (isInGroup(data, l.groupId, G.creditors)) return c > 0.005;
      return false;
    }).map(l => ({ l, c: bal.get(l.id)!.closing }));
    const stock = itemPositions(data, company.periodFrom, company.periodTo).filter(p => p.closeQty < 0);
    const late = billsOf(data, today).filter(b => b.dueDate < today && !b.isOnAccount);
    const vs = (test: (v: Voucher) => boolean) => data.vouchers.filter(test).sort((a, b) => (a.date > b.date ? -1 : 1));
    return {
      neg, stock,
      overdueIn: late.filter(b => b.pending > 0), overdueOut: late.filter(b => b.pending < 0),
      memos: vs(v => v.type === 'MEMORANDUM' && !v.isCancelled),
      reversing: vs(v => v.type === 'REVERSING_JOURNAL' && !v.isCancelled),
      optional: vs(v => !!v.isOptional && !v.isCancelled),
      postDated: vs(v => !!v.isPostDated && !voucherInBooks(data, v) && !v.isCancelled),
      cancelled: vs(v => !!v.isCancelled),
    };
  }, [data, company.periodFrom, company.periodTo, today]);
  const count = ex.neg.length + ex.stock.length + ex.overdueIn.length + ex.overdueOut.length + ex.memos.length + ex.reversing.length + ex.optional.length + ex.postDated.length + ex.cancelled.length;
  const vouchers = (title: string, list: Voucher[]) => list.length > 0 && (
    <Card title={`${title} (${list.length})`} flush>
      <table className="tbl"><tbody>{list.map(v => <tr key={v.id} data-href={`/voucher/${v.id}`}><td className="whitespace-nowrap">{fmtDate(v.date)}</td><td className="font-medium">{v.number}</td><td>{voucherParticulars(data, v)}</td><td className="num">{fmt(voucherAmount(v))}</td></tr>)}</tbody></table>
    </Card>
  );
  void stockMoves; void indexOf; void childGroups; void DESTINATIONS;
  return (
    <Report title="Exceptions" period="none" hint="Things worth a look. Nothing here is necessarily wrong.">
      {count === 0 ? <Notice tone="good">Nothing to report.</Notice> : (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {ex.neg.length > 0 && (
            <Card title={`Unexpected balances (${ex.neg.length})`} flush>
              <table className="tbl"><tbody>{ex.neg.map(({ l, c }) => <tr key={l.id} data-href={`/reports/ledger/${l.id}`}><td>{l.name}<div className="hint">{isCashOrBank(data, l) ? 'Cash or bank below zero' : isInGroup(data, l.groupId, G.debtors) ? 'You owe this client' : 'This vendor owes you'}</div></td><td className="num font-semibold">{drCr(c)}</td></tr>)}</tbody></table>
            </Card>
          )}
          {ex.stock.length > 0 && (
            <Card title={`Negative stock (${ex.stock.length})`} flush>
              <table className="tbl"><tbody>{ex.stock.map(p => <tr key={p.item.id} data-href={`/inventory/item/${p.item.id}`}><td>{p.item.name}</td><td className="num font-semibold">{p.closeQty}</td></tr>)}</tbody></table>
            </Card>
          )}
          {ex.overdueIn.length > 0 && <Card title={`Overdue from clients (${ex.overdueIn.length})`} actions={<button className="btn btn-sm" onClick={() => navigate('/reports/outstanding/receivable')}>See all</button>} flush><table className="tbl"><tbody>{ex.overdueIn.slice(0, 8).map(b => <tr key={`${b.ledgerId}-${b.ref}`}><td>{ledgerName(data, b.ledgerId)}<div className="hint">{b.ref}, due {fmtDate(b.dueDate)}</div></td><td className="num font-semibold">{fmt(b.pending)}</td></tr>)}</tbody></table></Card>}
          {ex.overdueOut.length > 0 && <Card title={`Overdue to vendors (${ex.overdueOut.length})`} actions={<button className="btn btn-sm" onClick={() => navigate('/reports/outstanding/payable')}>See all</button>} flush><table className="tbl"><tbody>{ex.overdueOut.slice(0, 8).map(b => <tr key={`${b.ledgerId}-${b.ref}`}><td>{ledgerName(data, b.ledgerId)}<div className="hint">{b.ref}, due {fmtDate(b.dueDate)}</div></td><td className="num font-semibold">{fmt(-b.pending)}</td></tr>)}</tbody></table></Card>}
          {vouchers('Memos, not in your books', ex.memos)}
          {vouchers('Reversing journals', ex.reversing)}
          {vouchers('Optional entries', ex.optional)}
          {vouchers('Post-dated, not yet in your books', ex.postDated)}
          {vouchers('Cancelled', ex.cancelled)}
        </div>
      )}
    </Report>
  );
};
