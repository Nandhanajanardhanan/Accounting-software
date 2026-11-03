import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Search,
  Trash2,
} from 'lucide-react';

interface CashBookPageProps {
  onOpenVoucher: (type: any, defaultDr?: string, defaultCr?: string) => void;
}

export const CashBookPage: React.FC<CashBookPageProps> = ({ onOpenVoucher }) => {
  const { company, getCashBook, deleteVoucher } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');

  const { openingBalance, rows, totalReceipts, totalPayments, closingBalance } = getCashBook();

  // Filter rows
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      row.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.voucher.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.voucher.narration && row.voucher.narration.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'RECEIPT' && row.type === 'RECEIPT') ||
      (filterType === 'PAYMENT' && row.type === 'PAYMENT');

    return matchesSearch && matchesFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher No', 'Type', 'Particulars', 'Debit (Receipt)', 'Credit (Payment)', 'Running Balance', 'Narration'];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map(r => [
        r.voucher.date,
        `"${r.voucher.voucherNo}"`,
        r.type,
        `"${r.particulars}"`,
        r.debit || 0,
        r.credit || 0,
        r.runningBalance,
        `"${r.voucher.narration || ''}"`,
      ].join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CashBook_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Cash Book (Daily Cash Inflows & Outflows)
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                Route: /cash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Company till transactions, cash receipts, and direct cash disbursements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('RECEIPT', 'led_cash')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Cash Inflow (F6)</span>
          </button>

          <button
            onClick={() => onOpenVoucher('PAYMENT', undefined, 'led_cash')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Cash Outflow (F5)</span>
          </button>

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
            title="Print Cash Book"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Opening Cash</span>
          <div className="text-base font-bold text-slate-200 mt-1">
            {company.currencySymbol} {openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-emerald-400 font-semibold">Total Receipts (In)</span>
          <div className="text-base font-bold text-emerald-300 mt-1">
            + {company.currencySymbol} {totalReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-rose-400 font-semibold">Total Payments (Out)</span>
          <div className="text-base font-bold text-rose-300 mt-1">
            - {company.currencySymbol} {totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-amber-400 font-bold">Closing Cash-in-Hand</span>
          <div className="text-lg font-bold text-amber-300 mt-1">
            {company.currencySymbol} {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/20 border border-white/5 rounded-lg">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search particulars, voucher no, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] mr-1">Filter:</span>
          {(['ALL', 'RECEIPT', 'PAYMENT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                filterType === t
                  ? 'bg-amber-400 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Cash Book Ledger Table */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-xl bg-slate-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Vch No.</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-4">Particulars</th>
              <th className="py-2.5 px-3 text-right text-emerald-400">Debit (Receipt)</th>
              <th className="py-2.5 px-3 text-right text-rose-400">Credit (Payment)</th>
              <th className="py-2.5 px-4 text-right text-amber-300">Running Balance</th>
              <th className="py-2.5 px-2 text-center w-10">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-200">
            {/* Opening Balance Row */}
            <tr className="bg-slate-900/40 font-semibold italic text-slate-400">
              <td className="py-2 px-3">{company.financialYearStart}</td>
              <td className="py-2 px-3">--</td>
              <td className="py-2 px-3">OPENING</td>
              <td className="py-2 px-4 text-white">To Opening Cash Balance b/f</td>
              <td className="py-2 px-3 text-right text-emerald-400">
                {openingBalance > 0 ? openingBalance.toFixed(2) : '-'}
              </td>
              <td className="py-2 px-3 text-right text-rose-400">-</td>
              <td className="py-2 px-4 text-right font-bold text-amber-300">
                {openingBalance.toFixed(2)}
              </td>
              <td></td>
            </tr>

            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No cash transactions found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr
                  key={row.voucher.id}
                  className="hover:bg-slate-900/70 transition-colors"
                >
                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{row.voucher.date}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-200">{row.voucher.voucherNo}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.type === 'RECEIPT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-white">
                      {row.type === 'RECEIPT' ? 'To ' : 'By '}
                      {row.particulars}
                    </div>
                    {row.voucher.narration && (
                      <div className="text-[10px] text-slate-400 truncate max-w-md">
                        {row.voucher.narration}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                    {row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-amber-300">
                    {row.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete voucher ${row.voucher.voucherNo}?`)) {
                          deleteVoucher(row.voucher.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Totals Footer */}
          <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-xs">
            <tr>
              <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-slate-300">
                Total Closing Cash Balance:
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-400">
                {totalReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 text-right text-rose-400">
                {totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-4 text-right text-amber-300 text-sm">
                {company.currencySymbol} {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
