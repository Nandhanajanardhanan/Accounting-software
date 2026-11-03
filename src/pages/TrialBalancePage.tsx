import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Scale, Printer, Download, CheckCircle2 } from 'lucide-react';

export const TrialBalancePage: React.FC = () => {
  const { company, calculateTrialBalance } = useAccounting();
  const rows = calculateTrialBalance();

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 1;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines = [
      `"${company.companyName} - Trial Balance"`,
      `"As of ${company.currentAccountingDate}"`,
      `"Particulars","Group","Debit (${company.currencySymbol})","Credit (${company.currencySymbol})"`,
      ...rows.map(
        (r) =>
          `"${r.ledger.name}","${r.ledger.group}",${r.debit > 0 ? r.debit : 0},${
            r.credit > 0 ? r.credit : 0
          }`
      ),
      `"Total",,${totalDebit},${totalCredit}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrialBalance_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Trial Balance (Dual Column Equilibrium)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /trial-balance
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Double-entry audit verification showing mathematical equality of debits and credits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            title="Print Trial Balance"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
          isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <span className="font-bold text-sm">
              {isBalanced ? 'Trial Balance Verified & In Mathematical Harmony' : 'Difference in Trial Balance'}
            </span>
            <div className="text-[11px] text-slate-600 font-mono">
              Total Debit: {company.currencySymbol} {totalDebit.toLocaleString('en-IN')} | Total Credit: {company.currencySymbol} {totalCredit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Particulars (Ledger)</th>
              <th className="py-3 px-4">Account Group</th>
              <th className="py-3 px-4 text-right text-emerald-700">Debit Balance (Dr)</th>
              <th className="py-3 px-4 text-right text-rose-700">Credit Balance (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
            {rows
              .filter((r) => r.debit > 0 || r.credit > 0)
              .map((r) => (
                <tr key={r.ledger.id} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-4 font-semibold text-slate-900 font-sans">{r.ledger.name}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 font-medium">
                      {r.ledger.group.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                    {r.debit > 0 ? r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                    {r.credit > 0 ? r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900 font-mono">
            <tr>
              <td colSpan={2} className="py-3 px-4 text-right uppercase text-slate-600 font-sans">
                Total Equilibrium Check:
              </td>
              <td className="py-3 px-4 text-right text-emerald-700 text-sm">
                {company.currencySymbol} {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right text-rose-700 text-sm">
                {company.currencySymbol} {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
