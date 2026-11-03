import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Printer,
  Download,
  Search,
  Trash2,
} from 'lucide-react';

interface BankBookPageProps {
  onOpenVoucher: (type: any, defaultDr?: string, defaultCr?: string) => void;
}

export const BankBookPage: React.FC<BankBookPageProps> = ({ onOpenVoucher }) => {
  const { company, ledgers, getBankBook, deleteVoucher } = useAccounting();
  const bankLedgers = ledgers.filter((l) => l.group === 'BANK');

  const [selectedBankId, setSelectedBankId] = useState<string>(
    bankLedgers[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'>('ALL');

  const { openingBalance, rows, totalDeposits, totalWithdrawals, closingBalance } =
    getBankBook(selectedBankId);

  const selectedBankLedger = bankLedgers.find((b) => b.id === selectedBankId);

  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      row.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.voucher.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.voucher.chequeOrUtrNo && row.voucher.chequeOrUtrNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.voucher.narration && row.voucher.narration.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterType === 'ALL' || row.type === filterType;

    return matchesSearch && matchesFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Voucher No',
      'Type',
      'Particulars',
      'Cheque/UTR No',
      'Deposit (Dr)',
      'Withdrawal (Cr)',
      'Running Balance',
      'Narration',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r) =>
        [
          r.voucher.date,
          `"${r.voucher.voucherNo}"`,
          r.type,
          `"${r.particulars}"`,
          `"${r.voucher.chequeOrUtrNo || ''}"`,
          r.debit || 0,
          r.credit || 0,
          r.runningBalance,
          `"${r.voucher.narration || ''}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BankBook_${selectedBankLedger?.name || 'Bank'}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Bank Book & Reconciliation
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-sky-900/60 text-sky-300 border border-sky-700">
                Route: /bank
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Electronic funds transfers, cheques, RTGS, NEFT, and bank account registers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('RECEIPT', selectedBankId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Bank Receipt (F6)</span>
          </button>

          <button
            onClick={() => onOpenVoucher('PAYMENT', undefined, selectedBankId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Bank Payment (F5)</span>
          </button>

          <button
            onClick={() => onOpenVoucher('CONTRA', selectedBankId, 'led_cash')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Contra Transfer (F4)</span>
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
            title="Print Bank Book"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Bank Account Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-bold uppercase text-[11px]">Select Bank Account:</span>
          <div className="flex flex-wrap gap-2">
            {bankLedgers.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBankId(bank.id)}
                className={`px-3 py-1.5 rounded border font-semibold text-xs transition-all ${
                  selectedBankId === bank.id
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {bank.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Account Status: <span className="text-emerald-400 font-bold">Active & Reconciled</span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Opening Balance</span>
          <div className="text-base font-bold text-slate-200 mt-1">
            {company.currencySymbol} {openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-emerald-400 font-semibold">Total Deposits (In)</span>
          <div className="text-base font-bold text-emerald-300 mt-1">
            + {company.currencySymbol} {totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-rose-400 font-semibold">Total Withdrawals (Out)</span>
          <div className="text-base font-bold text-rose-300 mt-1">
            - {company.currencySymbol} {totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3 bg-sky-950/40 border border-sky-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-sky-400 font-bold">Closing Available Bank Balance</span>
          <div className="text-lg font-bold text-cyan-300 mt-1">
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
            placeholder="Search particulars, UTR, cheque, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] mr-1">Filter:</span>
          {(['ALL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                filterType === t
                  ? 'bg-sky-500 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bank Book Ledger Table */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-xl bg-slate-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Vch No.</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-4">Particulars</th>
              <th className="py-2.5 px-3">Cheque / UTR</th>
              <th className="py-2.5 px-3 text-right text-emerald-400">Deposit (Dr)</th>
              <th className="py-2.5 px-3 text-right text-rose-400">Withdrawal (Cr)</th>
              <th className="py-2.5 px-4 text-right text-cyan-300">Bank Balance</th>
              <th className="py-2.5 px-2 text-center w-10">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-200">
            {/* Opening Balance Row */}
            <tr className="bg-slate-900/40 font-semibold italic text-slate-400">
              <td className="py-2 px-3">{company.financialYearStart}</td>
              <td className="py-2 px-3">--</td>
              <td className="py-2 px-3">OPENING</td>
              <td className="py-2 px-4 text-white">To Opening Bank Balance b/f</td>
              <td className="py-2 px-3 text-slate-500">System Ledger</td>
              <td className="py-2 px-3 text-right text-emerald-400">
                {openingBalance > 0 ? openingBalance.toFixed(2) : '-'}
              </td>
              <td className="py-2 px-3 text-right text-rose-400">-</td>
              <td className="py-2 px-4 text-right font-bold text-cyan-300">
                {openingBalance.toFixed(2)}
              </td>
              <td></td>
            </tr>

            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No bank transactions found for the selected bank or filter.
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
                        row.type === 'DEPOSIT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : row.type === 'TRANSFER'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-white">
                      {row.type === 'DEPOSIT' ? 'To ' : 'By '}
                      {row.particulars}
                    </div>
                    {row.voucher.narration && (
                      <div className="text-[10px] text-slate-400 truncate max-w-md">
                        {row.voucher.narration}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                    {row.voucher.chequeOrUtrNo || row.voucher.referenceNo || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                    {row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-cyan-300">
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
              <td colSpan={5} className="py-2.5 px-4 text-right uppercase tracking-wider text-slate-300">
                Closing Bank Balance ({selectedBankLedger?.name || 'Bank'}):
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-400">
                {totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 text-right text-rose-400">
                {totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-4 text-right text-cyan-300 text-sm">
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
