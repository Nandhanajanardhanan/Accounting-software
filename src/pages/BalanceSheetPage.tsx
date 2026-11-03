import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Scale,
  Printer,
  Download,
  CheckCircle,
} from 'lucide-react';

export const BalanceSheetPage: React.FC = () => {
  const { company, ledgers, calculateBalanceSheet, getLedgerBalance } = useAccounting();
  const [viewMode, setViewMode] = useState<'TALLY_T' | 'SCHEDULE'>('TALLY_T');

  const bs = calculateBalanceSheet();

  // Breakdown of ledgers
  const fixedAssetLedgers = ledgers
    .filter((l) => l.group === 'FIXED_ASSET')
    .map((l) => ({ ...l, balance: getLedgerBalance(l.id).amount }))
    .filter((l) => l.balance > 0);

  const debtorLedgers = ledgers
    .filter((l) => l.group === 'SUNDRY_DEBTOR')
    .map((l) => ({ ...l, balance: getLedgerBalance(l.id).amount }))
    .filter((l) => l.balance > 0);

  const creditorLedgers = ledgers
    .filter((l) => l.group === 'SUNDRY_CREDITOR')
    .map((l) => ({ ...l, balance: getLedgerBalance(l.id).amount }))
    .filter((l) => l.balance > 0);

  const bankLedgers = ledgers
    .filter((l) => l.group === 'BANK')
    .map((l) => ({ ...l, balance: getLedgerBalance(l.id).amount }))
    .filter((l) => l.balance > 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines = [
      `"${company.companyName} - Balance Sheet"`,
      `"As of ${company.currentAccountingDate}"`,
      `"Liabilities","Amount (${company.currencySymbol})","Assets","Amount (${company.currencySymbol})"`,
      `"Capital Account",${bs.liabilities.capitalAccount},"Fixed Assets",${bs.assets.fixedAssets}`,
      `"Reserves & Surplus",${bs.liabilities.reservesAndSurplus},"Closing Stock",${bs.assets.closingStock}`,
      `"Net Profit for Year",${bs.liabilities.netProfitAddition},"Sundry Debtors",${bs.assets.sundryDebtors}`,
      `"Sundry Creditors",${bs.liabilities.sundryCreditors},"Bank Balances",${bs.assets.bankBalances}`,
      `"Current Liabilities",${bs.liabilities.currentLiabilities},"Cash in Hand",${bs.assets.cashInHand}`,
      `"Total Liabilities",${bs.liabilities.total},"Total Assets",${bs.assets.total}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BalanceSheet_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-950/80 text-teal-400 border border-teal-800">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Balance Sheet (Statement of Financial Position)
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-teal-900/60 text-teal-300 border border-teal-700">
                Route: /balance-sheet
              </span>
            </div>
            <p className="text-xs text-slate-400">
              As on {company.currentAccountingDate} | Financial Year {company.financialYearStart} to {company.financialYearEnd}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-slate-700 bg-slate-900 overflow-hidden">
            <button
              onClick={() => setViewMode('TALLY_T')}
              className={`px-3 py-1.5 font-bold ${
                viewMode === 'TALLY_T' ? 'bg-teal-500 text-black' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Tally T-Format
            </button>
            <button
              onClick={() => setViewMode('SCHEDULE')}
              className={`px-3 py-1.5 font-bold ${
                viewMode === 'SCHEDULE' ? 'bg-teal-500 text-black' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Vertical Schedule
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            title="Print Balance Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Equilibrium Alert Badge */}
      <div
        className={`p-3.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
          bs.isBalanced
            ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
            : 'bg-amber-950/50 border-amber-800 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="font-bold text-sm">
              {bs.isBalanced
                ? 'Balance Sheet is in Perfect Equilibrium'
                : 'Difference Detected in Trial Balance / Stock'}
            </span>
            <div className="text-[11px] text-slate-300">
              Total Liabilities ({company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN')}) = Total Assets ({company.currencySymbol} {bs.assets.total.toLocaleString('en-IN')})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400">Net Variance</span>
            <div className="font-bold text-emerald-300">
              {company.currencySymbol} {bs.difference.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Balance Sheet Content */}
      {viewMode === 'TALLY_T' ? (
        <div className="border-2 border-slate-800 rounded-lg shadow-xl overflow-hidden bg-slate-950/70">
          <div className="py-2.5 px-4 bg-slate-900 border-b border-slate-800 text-center font-bold uppercase tracking-wider text-teal-300 text-xs flex items-center justify-between">
            <span>Capital & Liabilities</span>
            <span className="text-slate-400 text-[11px] font-normal">
              {company.companyName}
            </span>
            <span>Property & Assets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Left Side: Liabilities */}
            <div className="p-4 space-y-4">
              <div className="flex justify-between font-bold text-[11px] uppercase text-slate-400 pb-2 border-b border-slate-800">
                <span>Liabilities</span>
                <span>Amount ({company.currencySymbol})</span>
              </div>

              {/* Capital & Equity */}
              <div className="space-y-1">
                <div className="font-bold text-amber-300">Capital Account</div>
                <div className="pl-3 space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Share Capital / Owner Equity</span>
                    <span className="font-mono">{bs.liabilities.capitalAccount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Add: Net Profit (Operating Surplus)</span>
                    <span className="font-mono">+ {bs.liabilities.netProfitAddition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Reserves & Surplus */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-amber-300">
                  <span>Reserves & Surplus</span>
                  <span className="font-mono">{bs.liabilities.reservesAndSurplus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 text-slate-400 text-[11px]">
                  General Corporate Reserve & Retained Earnings
                </div>
              </div>

              {/* Sundry Creditors */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-rose-300">
                  <span>Sundry Creditors (Suppliers Payable)</span>
                  <span className="font-mono">{bs.liabilities.sundryCreditors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-slate-400 text-[11px]">
                  {creditorLedgers.map((c) => (
                    <div key={c.id} className="flex justify-between">
                      <span>{c.name}</span>
                      <span>{c.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Liabilities */}
              {bs.liabilities.currentLiabilities > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Other Current Liabilities & Provisions</span>
                  <span className="font-mono">{bs.liabilities.currentLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Total Liabilities Footer */}
              <div className="pt-12 border-t-2 border-slate-700 flex justify-between font-bold text-base text-teal-300">
                <span>Total Liabilities</span>
                <span>{company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Right Side: Assets */}
            <div className="p-4 space-y-4">
              <div className="flex justify-between font-bold text-[11px] uppercase text-slate-400 pb-2 border-b border-slate-800">
                <span>Assets</span>
                <span>Amount ({company.currencySymbol})</span>
              </div>

              {/* Fixed Assets */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-cyan-300">
                  <span>Fixed Assets</span>
                  <span className="font-mono">{bs.assets.fixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-slate-300 text-[11px]">
                  {fixedAssetLedgers.map((f) => (
                    <div key={f.id} className="flex justify-between">
                      <span>{f.name}</span>
                      <span>{f.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Assets: Closing Stock */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Closing Stock (Inventory)</span>
                  <span className="font-mono">{bs.assets.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 text-slate-400 text-[11px]">
                  Warehouse merchandise & raw materials valued at cost
                </div>
              </div>

              {/* Sundry Debtors */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-blue-300">
                  <span>Sundry Debtors (Customer Receivables)</span>
                  <span className="font-mono">{bs.assets.sundryDebtors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-slate-400 text-[11px]">
                  {debtorLedgers.map((d) => (
                    <div key={d.id} className="flex justify-between">
                      <span>{d.name}</span>
                      <span>{d.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Balances */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-cyan-300">
                  <span>Bank Accounts (Liquid Deposits)</span>
                  <span className="font-mono">{bs.assets.bankBalances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-slate-300 text-[11px]">
                  {bankLedgers.map((b) => (
                    <div key={b.id} className="flex justify-between">
                      <span>{b.name}</span>
                      <span>{b.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash in Hand */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-emerald-300">
                  <span>Cash-in-Hand (Till)</span>
                  <span className="font-mono">{bs.assets.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Total Assets Footer */}
              <div className="pt-12 border-t-2 border-slate-700 flex justify-between font-bold text-base text-teal-300">
                <span>Total Assets</span>
                <span>{company.currencySymbol} {bs.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vertical Schedule View */
        <div className="border border-slate-800 rounded-lg p-5 bg-slate-950/80 space-y-4 font-mono">
          <div className="font-bold text-sm text-teal-300 border-b border-slate-800 pb-2">
            Schedule III Format - Statement of Financial Position
          </div>

          <div className="space-y-3">
            <div className="font-bold text-amber-300 uppercase text-xs">I. Equity and Liabilities</div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between py-1 bg-slate-900/60 px-3 rounded">
                <span>1. Shareholders Funds (Capital & Reserves)</span>
                <span className="font-bold">
                  {company.currencySymbol}{' '}
                  {(bs.liabilities.capitalAccount + bs.liabilities.reservesAndSurplus + bs.liabilities.netProfitAddition).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 bg-slate-900/60 px-3 rounded">
                <span>2. Current Liabilities & Trade Payables</span>
                <span className="font-bold">
                  {company.currencySymbol}{' '}
                  {(bs.liabilities.sundryCreditors + bs.liabilities.currentLiabilities).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-900 px-3 rounded font-bold border border-slate-700 text-teal-300">
                <span>Total Equity & Liabilities</span>
                <span>{company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="font-bold text-cyan-300 uppercase text-xs pt-4">II. Assets</div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between py-1 bg-slate-900/60 px-3 rounded">
                <span>1. Non-Current Assets (Fixed Assets)</span>
                <span className="font-bold">
                  {company.currencySymbol} {bs.assets.fixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 bg-slate-900/60 px-3 rounded">
                <span>2. Current Assets (Stock, Debtors, Bank & Cash)</span>
                <span className="font-bold">
                  {company.currencySymbol}{' '}
                  {(bs.assets.closingStock + bs.assets.sundryDebtors + bs.assets.bankBalances + bs.assets.cashInHand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-900 px-3 rounded font-bold border border-slate-700 text-teal-300">
                <span>Total Assets</span>
                <span>{company.currencySymbol} {bs.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
