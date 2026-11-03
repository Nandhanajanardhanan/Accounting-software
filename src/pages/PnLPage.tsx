import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  TrendingUp,
  Printer,
  Download,
} from 'lucide-react';

export const PnLPage: React.FC = () => {
  const { company, ledgers, calculatePnL, getLedgerBalance } = useAccounting();
  const [viewMode, setViewMode] = useState<'TALLY_T' | 'VERTICAL'>('TALLY_T');

  const pnl = calculatePnL();

  const indirectExpenseLedgers = ledgers
    .filter((l) => l.group === 'INDIRECT_EXPENSE')
    .map((l) => ({
      ...l,
      balance: getLedgerBalance(l.id).amount,
    }))
    .filter((l) => l.balance > 0);

  const indirectIncomeLedgers = ledgers
    .filter((l) => l.group === 'INDIRECT_INCOME')
    .map((l) => ({
      ...l,
      balance: getLedgerBalance(l.id).amount,
    }))
    .filter((l) => l.balance > 0);

  const totalTradingDebit = pnl.openingStock + pnl.purchases + pnl.directExpenses + pnl.grossProfit;
  const totalTradingCredit = pnl.salesRevenue + pnl.directIncome + pnl.closingStock + pnl.grossLoss;

  const totalPnlDebit = pnl.grossLoss + pnl.indirectExpenses + pnl.netProfit;
  const totalPnlCredit = pnl.grossProfit + pnl.indirectIncome + pnl.netLoss;

  const grossMarginPct = pnl.salesRevenue > 0 ? ((pnl.grossProfit / pnl.salesRevenue) * 100).toFixed(2) : '0.00';
  const netMarginPct = pnl.salesRevenue > 0 ? ((pnl.netProfit / pnl.salesRevenue) * 100).toFixed(2) : '0.00';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines = [
      `"${company.companyName} - Profit & Loss Account"`,
      `"Period: ${company.financialYearStart} to ${company.financialYearEnd}"`,
      `"Particulars","Debit Amount (${company.currencySymbol})","Particulars","Credit Amount (${company.currencySymbol})"`,
      `"Opening Stock",${pnl.openingStock},"Sales Revenue",${pnl.salesRevenue}`,
      `"Purchases",${pnl.purchases},"Direct Services / Incomes",${pnl.directIncome}`,
      `"Direct Expenses",${pnl.directExpenses},"Closing Stock",${pnl.closingStock}`,
      `"Gross Profit c/d",${pnl.grossProfit},"",`,
      `"Total Trading",${totalTradingDebit},"Total Trading",${totalTradingCredit}`,
      `"Gross Loss b/f",${pnl.grossLoss},"Gross Profit b/f",${pnl.grossProfit}`,
      ...indirectExpenseLedgers.map((l) => `"${l.name}",${l.balance},"",`),
      ...indirectIncomeLedgers.map((l) => `"",,"${l.name}",${l.balance}`),
      `"Net Profit (Surplus)",${pnl.netProfit},"Net Loss",${pnl.netLoss}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ProfitAndLoss_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Profit & Loss Account (Trading & Operating Statement)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /pnl
              </span>
            </div>
            <p className="text-xs text-slate-500">
              For the accounting period {company.financialYearStart} to {company.financialYearEnd}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setViewMode('TALLY_T')}
              className={`px-3 py-1.5 font-bold text-xs ${
                viewMode === 'TALLY_T' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Tally T-Format
            </button>
            <button
              onClick={() => setViewMode('VERTICAL')}
              className={`px-3 py-1.5 font-bold text-xs ${
                viewMode === 'VERTICAL' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Schedule Format
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
            title="Print P&L"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Margin Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Revenue (Sales)</span>
          <div className="text-base font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {pnl.salesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Cost of Goods Sold</span>
          <div className="text-base font-bold text-orange-700 font-mono mt-1">
            {company.currencySymbol} {pnl.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-emerald-800 font-bold tracking-wider">Gross Profit</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
              {grossMarginPct}%
            </span>
          </div>
          <div className="text-base font-bold text-emerald-800 font-mono mt-1">
            {company.currencySymbol} {pnl.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-blue-900 font-bold tracking-wider">Net Operating Surplus</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-950">
              {netMarginPct}%
            </span>
          </div>
          <div className="text-lg font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {pnl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Main Statement Layout */}
      {viewMode === 'TALLY_T' ? (
        <div className="space-y-6">
          {/* SECTION 1: TRADING ACCOUNT */}
          <div className="border border-slate-200 rounded-xl shadow-xs overflow-hidden bg-white">
            <div className="py-2.5 px-4 bg-[#003366] text-white text-center font-bold uppercase tracking-wider text-xs">
              Part I: Trading Account (Direct Manufacturing & Merchandise)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Debit Side (Direct Expenses) */}
              <div className="p-5 space-y-2.5">
                <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                  <span>Particulars (Debit)</span>
                  <span>Amount ({company.currencySymbol})</span>
                </div>

                <div className="flex justify-between py-1 text-slate-700">
                  <span>To Opening Stock</span>
                  <span className="font-mono">{pnl.openingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-700">
                  <span>To Purchases (Direct)</span>
                  <span className="font-mono">{pnl.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {pnl.directExpenses > 0 && (
                  <div className="flex justify-between py-1 text-slate-700">
                    <span>To Freight & Direct Expenses</span>
                    <span className="font-mono">{pnl.directExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {pnl.grossProfit > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700 font-bold border-t border-slate-100 pt-2">
                    <span>To Gross Profit c/d (Transferred to P&L)</span>
                    <span className="font-mono">{pnl.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="pt-8 border-t-2 border-slate-200 flex justify-between font-bold text-blue-900 font-mono">
                  <span className="font-sans">Total Debit</span>
                  <span>{totalTradingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Credit Side (Direct Incomes) */}
              <div className="p-5 space-y-2.5">
                <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                  <span>Particulars (Credit)</span>
                  <span>Amount ({company.currencySymbol})</span>
                </div>

                <div className="flex justify-between py-1 text-slate-700">
                  <span>By Sales (Revenue)</span>
                  <span className="font-mono text-blue-800 font-bold">
                    {pnl.salesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {pnl.directIncome > 0 && (
                  <div className="flex justify-between py-1 text-slate-700">
                    <span>By Service & Consulting Income</span>
                    <span className="font-mono">{pnl.directIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 text-slate-700">
                  <span>By Closing Stock</span>
                  <span className="font-mono">{pnl.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {pnl.grossLoss > 0 && (
                  <div className="flex justify-between py-1 text-rose-700 font-bold border-t border-slate-100 pt-2">
                    <span>By Gross Loss c/d</span>
                    <span className="font-mono">{pnl.grossLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="pt-8 border-t-2 border-slate-200 flex justify-between font-bold text-blue-900 font-mono">
                  <span className="font-sans">Total Credit</span>
                  <span>{totalTradingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROFIT & LOSS ACCOUNT */}
          <div className="border border-slate-200 rounded-xl shadow-xs overflow-hidden bg-white">
            <div className="py-2.5 px-4 bg-[#003366] text-white text-center font-bold uppercase tracking-wider text-xs">
              Part II: Profit & Loss Account (Operating Overhead & Net Margin)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Debit Side (Indirect Overhead Expenses) */}
              <div className="p-5 space-y-2.5">
                <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                  <span>Particulars (Debit)</span>
                  <span>Amount ({company.currencySymbol})</span>
                </div>

                {pnl.grossLoss > 0 && (
                  <div className="flex justify-between py-1 text-rose-700 font-bold">
                    <span>To Gross Loss b/f</span>
                    <span className="font-mono">{pnl.grossLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {indirectExpenseLedgers.map((l) => (
                  <div key={l.id} className="flex justify-between py-1 text-slate-700">
                    <span>To {l.name}</span>
                    <span className="font-mono">{l.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {pnl.netProfit > 0 && (
                  <div className="flex justify-between py-1 text-emerald-800 font-bold border-t border-slate-100 pt-2">
                    <span>To Net Profit (Transferred to Balance Sheet)</span>
                    <span className="font-mono">{pnl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="pt-8 border-t-2 border-slate-200 flex justify-between font-bold text-blue-900 font-mono">
                  <span className="font-sans">Total Debit</span>
                  <span>{totalPnlDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Credit Side (Indirect Incomes) */}
              <div className="p-5 space-y-2.5">
                <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                  <span>Particulars (Credit)</span>
                  <span>Amount ({company.currencySymbol})</span>
                </div>

                {pnl.grossProfit > 0 && (
                  <div className="flex justify-between py-1 text-emerald-800 font-bold">
                    <span>By Gross Profit b/f</span>
                    <span className="font-mono">{pnl.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {indirectIncomeLedgers.map((l) => (
                  <div key={l.id} className="flex justify-between py-1 text-slate-700">
                    <span>By {l.name}</span>
                    <span className="font-mono">{l.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {pnl.netLoss > 0 && (
                  <div className="flex justify-between py-1 text-rose-700 font-bold border-t border-slate-100 pt-2">
                    <span>By Net Loss (Capital Reduction)</span>
                    <span className="font-mono">{pnl.netLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="pt-8 border-t-2 border-slate-200 flex justify-between font-bold text-blue-900 font-mono">
                  <span className="font-sans">Total Credit</span>
                  <span>{totalPnlCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vertical Schedule View */
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4 shadow-xs">
          <div className="font-bold text-sm text-blue-900 border-b border-slate-200 pb-2">
            Statement of Profit and Loss (Standard Corporate Schedule)
          </div>

          <div className="space-y-3 font-mono">
            {/* Revenue */}
            <div className="space-y-1">
              <div className="font-bold uppercase text-[11px] text-slate-500 font-sans">I. Revenue From Operations</div>
              <div className="flex justify-between px-3.5 py-2 bg-slate-50 rounded-lg">
                <span className="font-sans text-slate-700">Gross Sales & Consulting Incomes</span>
                <span className="font-bold text-blue-800">
                  {company.currencySymbol} {(pnl.salesRevenue + pnl.directIncome).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Other Incomes */}
            <div className="space-y-1">
              <div className="font-bold uppercase text-[11px] text-slate-500 font-sans">II. Other Incomes</div>
              <div className="flex justify-between px-3.5 py-2 bg-slate-50 rounded-lg">
                <span className="font-sans text-slate-700">Bank Interest, Discounts & Rebates</span>
                <span className="font-bold text-emerald-700">
                  {company.currencySymbol} {pnl.indirectIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Total Income */}
            <div className="flex justify-between px-3.5 py-2.5 bg-blue-50/70 rounded-lg font-bold border border-blue-200">
              <span className="text-blue-900 font-sans">III. Total Revenue (I + II)</span>
              <span className="text-blue-900">
                {company.currencySymbol} {(pnl.salesRevenue + pnl.directIncome + pnl.indirectIncome).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Expenses */}
            <div className="space-y-1 pt-2">
              <div className="font-bold uppercase text-[11px] text-slate-500 font-sans">IV. Expenses</div>
              <div className="space-y-1">
                <div className="flex justify-between px-3.5 py-1.5 bg-slate-50 rounded">
                  <span className="font-sans text-slate-700">Cost of Materials Consumed / Purchases</span>
                  <span>{pnl.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between px-3.5 py-1.5 bg-slate-50 rounded">
                  <span className="font-sans text-slate-700">Changes in Inventories (Opening - Closing Stock)</span>
                  <span>{(pnl.openingStock - pnl.closingStock).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {indirectExpenseLedgers.map((l) => (
                  <div key={l.id} className="flex justify-between px-3.5 py-1.5 bg-slate-50 rounded">
                    <span className="font-sans text-slate-700">{l.name}</span>
                    <span>{l.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Expenses */}
            <div className="flex justify-between px-3.5 py-2.5 bg-rose-50/60 rounded-lg font-bold border border-rose-200">
              <span className="text-rose-900 font-sans">V. Total Expenses</span>
              <span className="text-rose-900">
                {company.currencySymbol} {(pnl.cogs + pnl.indirectExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between px-3.5 py-3 bg-emerald-50 rounded-lg font-bold border border-emerald-200 text-sm">
              <span className="text-emerald-900 font-sans">VI. Net Surplus for the Period (III - V)</span>
              <span className="text-emerald-900 font-bold">
                {company.currencySymbol} {pnl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
