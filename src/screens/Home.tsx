// The first screen: how the business is doing, what needs attention, and the Gateway of Tally menu.
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { G, VOUCHER_META } from '../core/defaults';
import { SAMPLE_COMPANY_ID } from '../core/sample';
import { billsOf, fyStartOf, invoiceRows, isCashOrBank, ledgerBalances, ledgersUnder, monthsBetween, pnl, voucherAmount, voucherParticulars } from '../core/engine';
import { fmtDate, fmtMonthShort, money, moneyWhole } from '../core/format';
import { useBooks } from '../store/BooksContext';
import { Card, Notice, Page, Stat } from '../ui/kit';
import { CHART_BLUE, CHART_ORANGE, ColumnChart } from '../ui/charts';
import { newVoucher } from '../ui/nav';
import { StatusPill } from './Work';

interface GatewayItem { key: string; label: string; to: string }

const useGateway = () => {
  const { features } = useBooks();
  const sections: { title: string; items: GatewayItem[] }[] = [
    { title: 'Your work', items: [
      { key: 'I', label: 'Invoices', to: '/invoices' },
      { key: 'L', label: 'Clients', to: '/clients' },
      ...(features.costCentres ? [{ key: 'J', label: 'Projects', to: '/projects' }] : []),
      { key: 'E', label: 'Expenses', to: '/expenses' },
    ] },
    { title: 'Masters', items: [
      { key: 'C', label: 'Create', to: '/masters' },
      { key: 'A', label: 'Alter', to: '/masters/ledgers' },
      { key: 'H', label: 'Chart of Accounts', to: '/masters/groups' },
    ] },
    { title: 'Transactions', items: [
      { key: 'V', label: 'Vouchers', to: '/new' },
      { key: 'K', label: 'Day Book', to: '/daybook' },
    ] },
    { title: 'Utilities', items: [
      { key: 'N', label: 'Banking', to: '/banking' },
    ] },
    { title: 'Reports', items: [
      { key: 'B', label: 'Balance Sheet', to: '/reports/balance-sheet' },
      { key: 'P', label: 'Profit & Loss A/c', to: '/reports/pnl' },
      ...(features.inventory ? [{ key: 'S', label: 'Stock Summary', to: '/inventory/summary' }] : []),
      { key: 'R', label: 'Ratio Analysis', to: '/reports/ratios' },
      { key: 'D', label: 'Display More Reports', to: '/reports' },
    ] },
    { title: 'Company', items: [
      { key: 'Q', label: 'Change or Create Business', to: '/company' },
    ] },
  ];
  return sections;
};

const Gateway: React.FC = () => {
  const navigate = useNavigate();
  const sections = useGateway();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || document.querySelector('[data-modal]')) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const buttons = [...(box.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = i === -1 ? 0 : Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
        buttons[next]?.focus();
        e.preventDefault();
        return;
      }
      const hit = sections.flatMap(s => s.items).find(it => it.key.toLowerCase() === e.key.toLowerCase());
      if (hit) { e.preventDefault(); navigate(hit.to); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sections, navigate]);
  return (
    <section className="card overflow-hidden" ref={box}>
      <h2 className="bg-brand-800 text-white text-center font-semibold py-2">Gateway of Tally</h2>
      <div className="px-2 py-2">
        {sections.map(s => (
          <div key={s.title} className="mb-1">
            <div className="px-2 pt-2 pb-0.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{s.title}</div>
            {s.items.map(it => {
              const at = it.label.toLowerCase().indexOf(it.key.toLowerCase());
              return (
                <button key={it.key} onClick={() => navigate(it.to)} className="w-full text-left rounded-md px-2 py-1 hover:bg-brand-50 focus:bg-brand-100 cursor-pointer">
                  {at >= 0 ? <>{it.label.slice(0, at)}<span className="font-bold text-brand-700 underline underline-offset-2">{it.label[at]}</span>{it.label.slice(at + 1)}</> : <>{it.label} <span className="kbd ml-1">{it.key}</span></>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

const GettingStarted: React.FC = () => {
  const { data, features } = useBooks();
  const navigate = useNavigate();
  const clients = ledgersUnder(data, G.debtors).length;
  const invoices = data.vouchers.filter(v => v.type === 'SALES').length;
  const payments = data.vouchers.filter(v => v.type === 'PAYMENT' || v.type === 'RECEIPT').length;
  const steps = [
    { done: clients > 0, label: 'Add your first client', to: '/clients' },
    ...(features.costCentres ? [{ done: data.costCentres.length > 0, label: 'Create a project', to: '/projects' }] : []),
    { done: invoices > 0, label: 'Raise your first invoice', to: newVoucher('SALES') },
    { done: payments > 0, label: 'Record an expense or a payment', to: '/expenses' },
  ];
  if (steps.every(s => s.done)) return null;
  return (
    <Card title="Getting started" className="mb-4">
      <ul className="grid sm:grid-cols-2 gap-1.5">
        {steps.map(s => (
          <li key={s.label}>
            <button onClick={() => navigate(s.to)} className="flex items-center gap-2 cursor-pointer hover:text-brand-700">
              {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
              <span className={s.done ? 'text-slate-400 line-through' : 'font-medium'}>{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export const Home: React.FC = () => {
  const { data, company, openSample: _openSample } = useBooks();
  const navigate = useNavigate();
  const sym = company.currencySymbol;
  const today = company.currentDate;
  const from = fyStartOf(data, today);
  const to = company.periodTo > today ? company.periodTo : today;

  const stats = useMemo(() => {
    const balances = ledgerBalances(data, from, to);
    const cash = data.ledgers.filter(l => isCashOrBank(data, l)).reduce((s, l) => s + (balances.get(l.id)?.closing ?? 0), 0);
    // Totals come from the party balances, so they always agree with the Balance Sheet.
    const owedBy = (groupId: string, sign: number) => ledgersUnder(data, groupId).reduce((s, l) => s + Math.max(0, sign * (balances.get(l.id)?.closing ?? 0)), 0);
    const bills = billsOf(data, to).filter(b => b.dueDate < today && !b.isOnAccount);
    const sum = (list: typeof bills) => list.reduce((s, b) => s + Math.abs(b.pending), 0);
    const profit = pnl(data, from, to);
    const months = monthsBetween(from, today.slice(0, 7) >= from.slice(0, 7) ? today : from);
    const series = months.map(m => {
      const y = Number(m.slice(0, 4));
      const mm = Number(m.slice(5));
      const end = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
      const p = pnl(data, `${m}-01`, end);
      return {
        month: m,
        income: p.sales + p.directIncome + p.indirectIncome,
        // Stock swings are excluded, so a month shows money earned and money spent.
        expense: p.purchases + p.directExpense + p.indirectExpense,
      };
    });
    return {
      cash, profit,
      toCollect: owedBy(G.debtors, 1), overdue: sum(bills.filter(b => b.pending > 0)),
      toPay: owedBy(G.creditors, -1), payOverdue: sum(bills.filter(b => b.pending < 0)),
      series, thisMonth: series[series.length - 1],
    };
  }, [data, from, to, today]);

  const needsAttention = useMemo(() => invoiceRows(data, 'SALES', '0000-01-01', to).filter(r => r.status === 'OVERDUE').sort((a, b) => b.balance - a.balance).slice(0, 5), [data, to]);
  const recent = useMemo(() => [...data.vouchers].filter(v => !v.isCancelled).sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : b.createdAt.localeCompare(a.createdAt))).filter(v => v.date <= today).slice(0, 6), [data.vouchers, today]);
  const isSample = company.id === SAMPLE_COMPANY_ID;

  return (
    <Page wide>
      {isSample && (
        <Notice className="mb-4">
          You are looking at sample data for a made-up freelancer. Try anything you like, then <button className="font-semibold underline cursor-pointer" onClick={() => navigate('/company')}>create your own business</button>.
        </Notice>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold">{company.ownerName ? `Hello, ${company.ownerName.split(' ')[0]}` : company.name}</h1>
        <span className="hint">Today is {fmtDate(today)}. Figures are for this financial year.</span>
      </div>

      <GettingStarted />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Stat label="To collect" value={moneyWhole(sym, stats.toCollect)} sub={stats.overdue > 0 ? `${moneyWhole(sym, stats.overdue)} overdue` : 'Nothing overdue'} tone={stats.overdue > 0 ? 'bad' : 'plain'} onClick={() => navigate('/reports/outstanding/receivable')} />
        <Stat label="To pay" value={moneyWhole(sym, stats.toPay)} sub={stats.payOverdue > 0 ? `${moneyWhole(sym, stats.payOverdue)} overdue` : 'Nothing overdue'} onClick={() => navigate('/reports/outstanding/payable')} />
        <Stat label="Cash and bank" value={moneyWhole(sym, stats.cash)} sub="All accounts" onClick={() => navigate('/reports/cash-bank')} />
        <Stat label="Profit this year" value={moneyWhole(sym, stats.profit.netProfit)} sub={stats.profit.sales ? `${((stats.profit.netProfit / stats.profit.sales) * 100).toFixed(0)}% of sales` : undefined} tone={stats.profit.netProfit < 0 ? 'bad' : 'good'} onClick={() => navigate('/reports/pnl')} />
        <Stat label="Spent this month" value={moneyWhole(sym, stats.thisMonth?.expense ?? 0)} sub={`Earned ${moneyWhole(sym, stats.thisMonth?.income ?? 0)}`} onClick={() => navigate('/expenses')} />
      </div>

      <div className="grid lg:grid-cols-[1fr_17rem] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Card title="Earned and spent by month">
            <ColumnChart
              labels={stats.series.map(s => fmtMonthShort(s.month))} ariaLabel="Income and expenses by month"
              series={[
                { name: 'Earned', color: CHART_BLUE, values: stats.series.map(s => s.income) },
                { name: 'Spent', color: CHART_ORANGE, values: stats.series.map(s => s.expense) },
              ]}
              format={n => money(sym, n)}
            />
          </Card>
          <div className="grid xl:grid-cols-2 gap-4">
            <Card title="Overdue invoices" flush>
              {needsAttention.length === 0 ? <p className="hint px-4 pb-4">Nothing overdue. Good work.</p> : (
                <table className="tbl">
                  <tbody>
                    {needsAttention.map(r => (
                      <tr key={r.voucher.id} className="cursor-pointer hover:bg-brand-50" onClick={() => navigate(`/voucher/${r.voucher.id}`)}>
                        <td><div className="font-medium">{r.partyName}</div><div className="hint">{r.voucher.number}</div></td>
                        <td><StatusPill row={r} /></td>
                        <td className="num font-semibold">{moneyWhole(sym, r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Latest entries" flush>
              {recent.length === 0 ? <p className="hint px-4 pb-4">Nothing recorded yet.</p> : (
                <table className="tbl">
                  <tbody>
                    {recent.map(v => (
                      <tr key={v.id} className="cursor-pointer hover:bg-brand-50" onClick={() => navigate(`/voucher/${v.id}`)}>
                        <td><div className="font-medium truncate max-w-56">{voucherParticulars(data, v)}</div><div className="hint">{VOUCHER_META[v.type].label} {v.number} · {fmtDate(v.date)}</div></td>
                        <td className="num font-semibold">{moneyWhole(sym, voucherAmount(v))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
        <Gateway />
      </div>
    </Page>
  );
};
