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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Trial Balance (Dual Column Equilibrium)
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                Route: /trial-balance
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Double-entry audit verification showing mathematical equality of debits and credits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            title="Print Trial Balance"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div
        className={`p-3.5 rounded-lg border flex items-center justify-between ${
          isBalanced
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="font-bold">
              {isBalanced ? 'Trial Balance Verified & In Mathematical Harmony' : 'Difference in Trial Balance'}
            </span>
            <div className="text-[11px] text-slate-300">
              Total Debit: {company.currencySymbol} {totalDebit.toLocaleString('en-IN')} | Total Credit: {company.currencySymbol} {totalCredit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-xl bg-slate-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <th className="py-2.5 px-4">Particulars (Ledger)</th>
              <th className="py-2.5 px-4">Account Group</th>
              <th className="py-2.5 px-4 text-right text-emerald-400">Debit Balance (Dr)</th>
              <th className="py-2.5 px-4 text-right text-rose-400">Credit Balance (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-200">
            {rows
              .filter((r) => r.debit > 0 || r.credit > 0)
              .map((r) => (
                <tr key={r.ledger.id} className="hover:bg-slate-900/60">
                  <td className="py-2 px-4 font-semibold text-white">{r.ledger.name}</td>
                  <td className="py-2 px-4 text-slate-400">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800">
                      {r.ledger.group.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-emerald-400">
                    {r.debit > 0 ? r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-rose-400">
                    {r.credit > 0 ? r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-xs">
            <tr>
              <td colSpan={2} className="py-2.5 px-4 text-right uppercase text-slate-300">
                Total Equilibrium Check:
              </td>
              <td className="py-2.5 px-4 text-right text-emerald-400 text-sm">
                {company.currencySymbol} {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-4 text-right text-rose-400 text-sm">
                {company.currencySymbol} {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
