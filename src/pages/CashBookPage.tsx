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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Cash Book (Daily Cash Inflows & Outflows)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /cash
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Till register, cash receipts, and direct cash disbursements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('RECEIPT', 'led_cash')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Cash Receipt (F6)</span>
          </button>

          <button
            onClick={() => onOpenVoucher('PAYMENT', undefined, 'led_cash')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Cash Payment (F5)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
            title="Print Cash Book"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Opening Cash</span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            {company.currencySymbol} {openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-emerald-700 font-bold tracking-wider">Total Receipts (In)</span>
          <div className="text-base font-bold text-emerald-800 font-mono mt-1">
            + {company.currencySymbol} {totalReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-rose-700 font-bold tracking-wider">Total Payments (Out)</span>
          <div className="text-base font-bold text-rose-800 font-mono mt-1">
            - {company.currencySymbol} {totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-blue-700 font-bold tracking-wider">Closing Cash-in-Hand</span>
          <div className="text-lg font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search particulars, voucher no, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] mr-1 font-semibold">Filter:</span>
          {(['ALL', 'RECEIPT', 'PAYMENT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Cash Book Ledger Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-3">Vch No.</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-4">Particulars</th>
              <th className="py-3 px-4 text-right text-emerald-700">Debit (Receipt)</th>
              <th className="py-3 px-4 text-right text-rose-700">Credit (Payment)</th>
              <th className="py-3 px-4 text-right text-blue-900">Running Balance</th>
              <th className="py-3 px-2 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
            {/* Opening Balance Row */}
            <tr className="bg-slate-50/70 font-semibold italic text-slate-500">
              <td className="py-2.5 px-4 font-sans">{company.financialYearStart}</td>
              <td className="py-2.5 px-3">--</td>
              <td className="py-2.5 px-3">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">OPENING</span>
              </td>
              <td className="py-2.5 px-4 font-sans text-slate-700">To Opening Cash Balance b/f</td>
              <td className="py-2.5 px-4 text-right text-emerald-700">
                {openingBalance > 0 ? openingBalance.toFixed(2) : '-'}
              </td>
              <td className="py-2.5 px-4 text-right text-rose-700">-</td>
              <td className="py-2.5 px-4 text-right font-bold text-blue-900">
                {openingBalance.toFixed(2)}
              </td>
              <td></td>
            </tr>

            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No cash transactions found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr
                  key={row.voucher.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-sans">{row.voucher.date}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{row.voucher.voucherNo}</td>
                  <td className="py-3 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.type === 'RECEIPT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="font-semibold text-slate-900">
                      {row.type === 'RECEIPT' ? 'To ' : 'By '}
                      {row.particulars}
                    </div>
                    {row.voucher.narration && (
                      <div className="text-[11px] text-slate-400 truncate max-w-md">
                        {row.voucher.narration}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700">
                    {row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900 text-xs">
                    {row.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-center font-sans">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete voucher ${row.voucher.voucherNo}?`)) {
                          deleteVoucher(row.voucher.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
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
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800 font-mono">
            <tr>
              <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider font-sans text-slate-600">
                Closing Cash Balance:
              </td>
              <td className="py-3 px-4 text-right text-emerald-700">
                {totalReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right text-rose-700">
                {totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right text-blue-900 text-sm">
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
