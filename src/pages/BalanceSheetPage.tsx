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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Balance Sheet (Statement of Financial Position)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /balance-sheet
              </span>
            </div>
            <p className="text-xs text-slate-500">
              As on {company.currentAccountingDate} | Financial Year {company.financialYearStart} to {company.financialYearEnd}
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
              onClick={() => setViewMode('SCHEDULE')}
              className={`px-3 py-1.5 font-bold text-xs ${
                viewMode === 'SCHEDULE' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Vertical Schedule
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
            title="Print Balance Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Equilibrium Alert Badge */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
          bs.isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div>
            <span className="font-bold text-sm">
              {bs.isBalanced
                ? 'Balance Sheet is in Perfect Equilibrium'
                : 'Difference Detected in Trial Balance / Stock'}
            </span>
            <div className="text-[11px] text-slate-600">
              Total Liabilities ({company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN')}) = Total Assets ({company.currencySymbol} {bs.assets.total.toLocaleString('en-IN')})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-500 font-sans font-semibold">Net Variance</span>
            <div className="font-bold text-emerald-700">
              {company.currencySymbol} {bs.difference.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Balance Sheet Content */}
      {viewMode === 'TALLY_T' ? (
        <div className="border border-slate-200 rounded-xl shadow-xs overflow-hidden bg-white">
          <div className="py-3 px-5 bg-[#003366] text-white text-center font-bold uppercase tracking-wider text-xs flex items-center justify-between">
            <span>Capital & Liabilities</span>
            <span className="text-blue-200 text-[11px] font-normal font-sans">
              {company.companyName}
            </span>
            <span>Property & Assets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Left Side: Liabilities */}
            <div className="p-5 space-y-4">
              <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                <span>Liabilities</span>
                <span>Amount ({company.currencySymbol})</span>
              </div>

              {/* Capital & Equity */}
              <div className="space-y-1">
                <div className="font-bold text-blue-950 font-sans">Capital Account</div>
                <div className="pl-3 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Share Capital / Owner Equity</span>
                    <span className="font-mono">{bs.liabilities.capitalAccount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Add: Net Surplus (from P&L)</span>
                    <span className="font-mono">+ {bs.liabilities.netProfitAddition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Reserves & Surplus */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-blue-950 font-sans">
                  <span>Reserves & Surplus</span>
                  <span className="font-mono">{bs.liabilities.reservesAndSurplus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 text-slate-500 text-[11px]">
                  General Corporate Reserve & Retained Earnings
                </div>
              </div>

              {/* Sundry Creditors */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-rose-800 font-sans">
                  <span>Sundry Creditors (Suppliers Payable)</span>
                  <span className="font-mono">{bs.liabilities.sundryCreditors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-1 text-slate-500 text-[11px]">
                  {creditorLedgers.map((c) => (
                    <div key={c.id} className="flex justify-between">
                      <span>{c.name}</span>
                      <span className="font-mono">{c.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Liabilities */}
              {bs.liabilities.currentLiabilities > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Other Current Liabilities & Provisions</span>
                  <span className="font-mono">{bs.liabilities.currentLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Total Liabilities Footer */}
              <div className="pt-12 border-t-2 border-slate-200 flex justify-between font-bold text-base text-blue-900 font-mono">
                <span className="font-sans">Total Liabilities</span>
                <span>{company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Right Side: Assets */}
            <div className="p-5 space-y-4">
              <div className="flex justify-between font-bold text-[11px] uppercase text-slate-500 pb-2 border-b border-slate-200">
                <span>Assets</span>
                <span>Amount ({company.currencySymbol})</span>
              </div>

              {/* Fixed Assets */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-blue-950 font-sans">
                  <span>Fixed Assets</span>
                  <span className="font-mono">{bs.assets.fixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-1 text-slate-700 text-[11px]">
                  {fixedAssetLedgers.map((f) => (
                    <div key={f.id} className="flex justify-between">
                      <span>{f.name}</span>
                      <span className="font-mono">{f.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Assets: Closing Stock */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-800 font-sans">
                  <span>Closing Stock (Inventory)</span>
                  <span className="font-mono">{bs.assets.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 text-slate-500 text-[11px]">
                  Warehouse merchandise & raw materials valued at cost
                </div>
              </div>

              {/* Sundry Debtors */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-blue-800 font-sans">
                  <span>Sundry Debtors (Customer Receivables)</span>
                  <span className="font-mono">{bs.assets.sundryDebtors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-1 text-slate-500 text-[11px]">
                  {debtorLedgers.map((d) => (
                    <div key={d.id} className="flex justify-between">
                      <span>{d.name}</span>
                      <span className="font-mono">{d.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Balances */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-blue-900 font-sans">
                  <span>Bank Accounts (Liquid Deposits)</span>
                  <span className="font-mono">{bs.assets.bankBalances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-3 space-y-1 text-slate-700 text-[11px]">
                  {bankLedgers.map((b) => (
                    <div key={b.id} className="flex justify-between">
                      <span>{b.name}</span>
                      <span className="font-mono">{b.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash in Hand */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-emerald-800 font-sans">
                  <span>Cash-in-Hand (Till)</span>
                  <span className="font-mono">{bs.assets.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Total Assets Footer */}
              <div className="pt-12 border-t-2 border-slate-200 flex justify-between font-bold text-base text-blue-900 font-mono">
                <span className="font-sans">Total Assets</span>
                <span>{company.currencySymbol} {bs.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vertical Schedule View */
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4 shadow-xs font-mono">
          <div className="font-bold text-sm text-blue-900 border-b border-slate-200 pb-2 font-sans">
            Schedule III Format - Statement of Financial Position
          </div>

          <div className="space-y-3">
            <div className="font-bold text-blue-950 uppercase text-xs font-sans">I. Equity and Liabilities</div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between py-2 bg-slate-50 px-3.5 rounded-lg">
                <span className="font-sans text-slate-700">1. Shareholders Funds (Capital & Reserves)</span>
                <span className="font-bold text-slate-900">
                  {company.currencySymbol}{' '}
                  {(bs.liabilities.capitalAccount + bs.liabilities.reservesAndSurplus + bs.liabilities.netProfitAddition).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-3.5 rounded-lg">
                <span className="font-sans text-slate-700">2. Current Liabilities & Trade Payables</span>
                <span className="font-bold text-slate-900">
                  {company.currencySymbol}{' '}
                  {(bs.liabilities.sundryCreditors + bs.liabilities.currentLiabilities).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2.5 bg-blue-50 px-3.5 rounded-lg font-bold border border-blue-200 text-blue-900">
                <span className="font-sans">Total Equity & Liabilities</span>
                <span>{company.currencySymbol} {bs.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="font-bold text-blue-950 uppercase text-xs pt-4 font-sans">II. Assets</div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between py-2 bg-slate-50 px-3.5 rounded-lg">
                <span className="font-sans text-slate-700">1. Non-Current Assets (Fixed Assets)</span>
                <span className="font-bold text-slate-900">
                  {company.currencySymbol} {bs.assets.fixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-3.5 rounded-lg">
                <span className="font-sans text-slate-700">2. Current Assets (Stock, Debtors, Bank & Cash)</span>
                <span className="font-bold text-slate-900">
                  {company.currencySymbol}{' '}
                  {(bs.assets.closingStock + bs.assets.sundryDebtors + bs.assets.bankBalances + bs.assets.cashInHand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2.5 bg-blue-50 px-3.5 rounded-lg font-bold border border-blue-200 text-blue-900">
                <span className="font-sans">Total Assets</span>
                <span>{company.currencySymbol} {bs.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
