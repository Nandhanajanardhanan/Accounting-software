// Balance Sheet, Profit & Loss, Trial Balance, Cash Flow, Funds Flow and Ratios.
import React, { useMemo, useState } from 'react';
import { balanceSheet, cashFlow, fundsFlow, isZero, type Node, pnl, ratios, trialBalance } from '../../core/engine';
import { drCr, fmt, fmtBlank, fmtMonth, money } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Card, Notice, Stat } from '../../ui/kit';
import { DetailToggle, NodeRows, nodeHref, Report } from '../../ui/report';

const TwoColumns: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => (
  <div className="grid md:grid-cols-2 gap-4 items-start print:grid-cols-2">{left}{right}</div>
);

const SideTable: React.FC<{ title: string; total: number; children: React.ReactNode }> = ({ title, total, children }) => (
  <Card flush>
    <table className="tbl">
      <thead><tr><th>{title}</th><th className="num">Amount</th></tr></thead>
      <tbody>{children}</tbody>
      <tfoot><tr><td>Total</td><td className="num">{fmt(total)}</td></tr></tfoot>
    </table>
  </Card>
);

export const BalanceSheetPage: React.FC = () => {
  const { data, company } = useBooks();
  const [detailed, setDetailed] = useState(false);
  const bs = useMemo(() => balanceSheet(data, company.periodTo), [data, company.periodTo]);
  const balanced = isZero(bs.totalAssets - bs.totalLiabilities);
  return (
    <Report title="Balance Sheet" period="asOf" hint="What your business owns (assets) and owes (liabilities), including what it owes you, the owner." actions={<DetailToggle value={detailed} onChange={setDetailed} />}>
      {!isZero(bs.openingDiff) && (
        <Notice tone="warn" className="mb-3 no-print">Your opening balances are out by {fmt(Math.abs(bs.openingDiff))}. It is shown as a separate line until you correct it in the accounts.</Notice>
      )}
      {!balanced && <Notice tone="bad" className="mb-3">This does not total, by {fmt(Math.abs(bs.totalAssets - bs.totalLiabilities))}. Run Verify Data under Business & Tools.</Notice>}
      <TwoColumns
        left={<SideTable title="What you owe (liabilities)" total={bs.totalLiabilities}><NodeRows nodes={bs.liabilities} detailed={detailed} hrefFor={nodeHref} /></SideTable>}
        right={<SideTable title="What you own (assets)" total={bs.totalAssets}><NodeRows nodes={bs.assets} detailed={detailed} hrefFor={nodeHref} /></SideTable>}
      />
    </Report>
  );
};

export const ProfitLossPage: React.FC = () => {
  const { data, company } = useBooks();
  const [detailed, setDetailed] = useState(false);
  const p = useMemo(() => pnl(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const hasStock = !isZero(p.openingStock) || !isZero(p.closingStock);
  const sum = (list: Node[]) => list.reduce((s, n) => s + n.amount, 0);
  const tradingLeft = sum(p.tradingExpenses) + p.openingStock + Math.max(0, p.grossProfit);
  const tradingRight = sum(p.tradingIncomes) + p.closingStock + Math.max(0, -p.grossProfit);
  const lossBelow = Math.max(0, -p.grossProfit);
  const profitBelow = Math.max(0, p.grossProfit);
  const leftTotal = sum(p.indirectExpenses) + lossBelow + Math.max(0, p.netProfit);
  const rightTotal = sum(p.indirectIncomes) + profitBelow + Math.max(0, -p.netProfit);
  const stockRow = (id: string, name: string, amount: number) => (
    <tr className="sub" data-href="/inventory/summary"><td>{name}</td><td className="num">{fmt(amount)}</td></tr>
  );
  const plain = (name: string, amount: number, tone?: 'bold') => (
    <tr className={tone ? 'total' : 'sub'}><td>{name}</td><td className="num">{fmt(amount)}</td></tr>
  );
  return (
    <Report title="Profit & Loss" hint="Income less expenses for the period." actions={<DetailToggle value={detailed} onChange={setDetailed} />}>
      <div className="grid sm:grid-cols-3 gap-3 mb-4 no-print">
        <Stat label="Total income" value={money(company.currencySymbol, p.sales + p.directIncome + p.indirectIncome)} />
        <Stat label="Total expenses" value={money(company.currencySymbol, p.purchases + p.directExpense + p.indirectExpense + (p.openingStock - p.closingStock))} />
        <Stat label={p.netProfit >= 0 ? 'Net profit' : 'Net loss'} value={money(company.currencySymbol, Math.abs(p.netProfit))} tone={p.netProfit >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="flex flex-col gap-4">
        <TwoColumns
          left={
            <SideTable title="Direct costs" total={tradingLeft}>
              {hasStock && stockRow('o', 'Opening Stock', p.openingStock)}
              <NodeRows nodes={p.tradingExpenses} detailed={detailed} hrefFor={nodeHref} />
              {p.grossProfit > 0 && plain('Gross Profit', p.grossProfit)}
            </SideTable>
          }
          right={
            <SideTable title="Income from your work" total={tradingRight}>
              <NodeRows nodes={p.tradingIncomes} detailed={detailed} hrefFor={nodeHref} />
              {hasStock && stockRow('c', 'Closing Stock', p.closingStock)}
              {p.grossProfit < 0 && plain('Gross Loss', -p.grossProfit)}
            </SideTable>
          }
        />
        <TwoColumns
          left={
            <SideTable title="Running expenses" total={leftTotal}>
              {lossBelow > 0 && plain('Gross Loss', lossBelow)}
              <NodeRows nodes={p.indirectExpenses} detailed={detailed} hrefFor={nodeHref} />
              {p.netProfit > 0 && plain('Net Profit', p.netProfit)}
            </SideTable>
          }
          right={
            <SideTable title="Other income" total={rightTotal}>
              {profitBelow > 0 && plain('Gross Profit', profitBelow)}
              <NodeRows nodes={p.indirectIncomes} detailed={detailed} hrefFor={nodeHref} />
              {p.netProfit < 0 && plain('Net Loss', -p.netProfit)}
            </SideTable>
          }
        />
      </div>
    </Report>
  );
};

const TbRows: React.FC<{ nodes: Node[]; detailed: boolean; depth?: number }> = ({ nodes, detailed, depth = 0 }) => (
  <>
    {nodes.map(n => (
      <React.Fragment key={`${depth}-${n.id}`}>
        <tr data-href={nodeHref(n)} className={depth === 0 ? 'sub' : ''}>
          <td style={{ paddingLeft: `${0.75 + depth * 1.1}rem` }}>{n.name}</td>
          <td className="num">{n.amount > 0 ? fmt(n.amount) : ''}</td>
          <td className="num">{n.amount < 0 ? fmt(-n.amount) : ''}</td>
        </tr>
        {detailed && n.children.length > 0 && <TbRows nodes={n.children} detailed depth={depth + 1} />}
      </React.Fragment>
    ))}
  </>
);

export const TrialBalancePage: React.FC = () => {
  const { data, company } = useBooks();
  const [detailed, setDetailed] = useState(false);
  const tb = useMemo(() => trialBalance(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const balanced = isZero(tb.totalDr - tb.totalCr);
  return (
    <Report title="Trial Balance" period="asOf" hint="All balances. Debits must equal credits, which proves your entries are complete." actions={<DetailToggle value={detailed} onChange={setDetailed} />}>
      <Notice tone={balanced ? 'good' : 'bad'} className="mb-3 no-print">{balanced ? 'Your books balance.' : `Your books are out by ${fmt(Math.abs(tb.totalDr - tb.totalCr))}. Run Verify Data under Business & Tools.`}</Notice>
      <Card flush>
        <table className="tbl">
          <thead><tr><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
          <tbody>
            <TbRows nodes={tb.groups} detailed={detailed} />
            {tb.specials.map(s => (
              <tr key={s.id} className="sub" data-href={s.id === 'opening_stock' ? '/inventory/summary' : undefined}>
                <td>{s.name}</td>
                <td className="num">{s.amount > 0 ? fmt(s.amount) : ''}</td>
                <td className="num">{s.amount < 0 ? fmt(-s.amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td className="num">{fmt(tb.totalDr)}</td><td className="num">{fmt(tb.totalCr)}</td></tr></tfoot>
        </table>
      </Card>
    </Report>
  );
};

export const CashFlowPage: React.FC = () => {
  const { data, company } = useBooks();
  const f = useMemo(() => cashFlow(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const sym = company.currencySymbol;
  const inflow = f.months.reduce((s, m) => s + m.inflow, 0);
  const outflow = f.months.reduce((s, m) => s + m.outflow, 0);
  return (
    <Report title="Cash Flow" hint="Money in and out of your cash and bank accounts. Moves between your own accounts are not counted.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 no-print">
        <Stat label="Started with" value={money(sym, f.opening)} />
        <Stat label="Money in" value={money(sym, inflow)} tone="good" />
        <Stat label="Money out" value={money(sym, outflow)} tone="bad" />
        <Stat label="Ended with" value={money(sym, f.closing)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="By month" flush>
          <table className="tbl">
            <thead><tr><th>Month</th><th className="num">In</th><th className="num">Out</th><th className="num">Net</th></tr></thead>
            <tbody>{f.months.map(m => <tr key={m.month}><td>{fmtMonth(m.month)}</td><td className="num">{fmtBlank(m.inflow)}</td><td className="num">{fmtBlank(m.outflow)}</td><td className="num font-medium">{fmtBlank(m.net)}</td></tr>)}</tbody>
            <tfoot><tr><td>Total</td><td className="num">{fmt(inflow)}</td><td className="num">{fmt(outflow)}</td><td className="num">{fmt(inflow - outflow)}</td></tr></tfoot>
          </table>
        </Card>
        <Card title="Where it came from and went" flush>
          <table className="tbl">
            <thead><tr><th>Group</th><th className="num">In</th><th className="num">Out</th></tr></thead>
            <tbody>{f.byGroup.map(g => <tr key={g.name}><td>{g.name}</td><td className="num">{fmtBlank(g.inflow)}</td><td className="num">{fmtBlank(g.outflow)}</td></tr>)}</tbody>
          </table>
        </Card>
      </div>
    </Report>
  );
};

export const FundsFlowPage: React.FC = () => {
  const { data, company } = useBooks();
  const f = useMemo(() => fundsFlow(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const sources = f.sources.reduce((s, x) => s + x.amount, 0);
  const uses = f.uses.reduce((s, x) => s + x.amount, 0);
  const net = f.workingCapitalChange;
  return (
    <Report title="Funds Flow" hint="Where long-term funds came from and where they went. The difference is the change in your working capital.">
      <TwoColumns
        left={
          <Card flush>
            <table className="tbl">
              <thead><tr><th>Funds came from</th><th className="num">Amount</th></tr></thead>
              <tbody>{f.sources.map(x => <tr key={x.name}><td>{x.name}</td><td className="num">{fmt(x.amount)}</td></tr>)}</tbody>
              <tfoot><tr><td>Total</td><td className="num">{fmt(sources)}</td></tr></tfoot>
            </table>
          </Card>
        }
        right={
          <Card flush>
            <table className="tbl">
              <thead><tr><th>Funds went to</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {f.uses.map(x => <tr key={x.name}><td>{x.name}</td><td className="num">{fmt(x.amount)}</td></tr>)}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{fmt(uses)}</td></tr></tfoot>
            </table>
          </Card>
        }
      />
      <Card title="Working capital" className="mt-4">
        <div className="grid sm:grid-cols-3 gap-3 tabular-nums">
          <div><div className="hint">At the start</div><div className="font-semibold">{fmt(f.workingCapitalStart)}</div></div>
          <div><div className="hint">At the end</div><div className="font-semibold">{fmt(f.workingCapitalEnd)}</div></div>
          <div><div className="hint">{net >= 0 ? 'Increase' : 'Decrease'}</div><div className="font-semibold">{fmt(Math.abs(net))}</div></div>
        </div>
      </Card>
    </Report>
  );
};

export const RatiosPage: React.FC = () => {
  const { data, company } = useBooks();
  const r = useMemo(() => ratios(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const num = (v: number | null, digits = 2, suffix = '') => (v === null ? 'Not available' : `${v.toFixed(digits)}${suffix}`);
  const amounts: [string, number, string][] = [
    ['Working capital', r.workingCapital, 'Current assets less current liabilities.'],
    ['Cash in hand', r.cash, ''],
    ['Bank accounts', r.bank, ''],
    ['Bank overdraft', r.bankOd, ''],
    ['Clients owe you', r.debtors, ''],
    ['You owe vendors', r.creditors, ''],
    ['Sales', r.sales, ''],
    ['Purchases', r.purchases, ''],
    ['Stock value', r.stock, ''],
    ['Net profit', r.netProfit, ''],
  ];
  const measures: [string, string, string][] = [
    ['Current ratio', num(r.currentRatio), 'What you own short-term for every 1 you owe short-term. Above 1 is comfortable.'],
    ['Quick ratio', num(r.quickRatio), 'The same, leaving stock out.'],
    ['Debt to equity', num(r.debtEquity), 'Loans for every 1 of your own money.'],
    ['Gross profit', num(r.grossProfitPct, 1, '%'), 'Share of income left after direct costs.'],
    ['Net profit', num(r.netProfitPct, 1, '%'), 'Share of income left after all expenses.'],
    ['Return on investment', num(r.returnOnInvestment, 1, '%'), 'Profit against money put into the business.'],
    ['Return on working capital', num(r.returnOnWorkingCapital, 1, '%'), 'Profit against working capital.'],
    ['Stock turnover', num(r.inventoryTurnover), 'How many times stock sold through.'],
    ['Days to get paid', num(r.debtorDays, 0, ' days'), 'On average, how long clients take to pay you.'],
    ['Days to pay vendors', num(r.creditorDays, 0, ' days'), 'On average, how long you take to pay vendors.'],
  ];
  return (
    <Report title="Ratio Analysis" hint="Key figures on the health of your business.">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="Key amounts" flush>
          <table className="tbl"><tbody>{amounts.map(([k, v, hint]) => <tr key={k}><td>{k}{hint && <div className="hint">{hint}</div>}</td><td className="num font-medium">{drCrFree(v)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Ratios" flush>
          <table className="tbl"><tbody>{measures.map(([k, v, hint]) => <tr key={k}><td>{k}<div className="hint">{hint}</div></td><td className="num font-medium">{v}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </Report>
  );
};

const drCrFree = (n: number) => fmt(n);
export { drCr };
