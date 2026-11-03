import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Repeat,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Search,
  Trash2,
  Landmark,
  Wallet,
} from 'lucide-react';

interface ContraPageProps {
  onOpenVoucher: (type: any, defaultDr?: string, defaultCr?: string) => void;
}

export const ContraPage: React.FC<ContraPageProps> = ({ onOpenVoucher }) => {
  const { company, ledgers, getContraEntries, deleteVoucher } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CASH_TO_BANK' | 'BANK_TO_CASH' | 'BANK_TO_BANK'>('ALL');

  const contras = getContraEntries();
  const cashLedger = ledgers.find((l) => l.group === 'CASH');

  // Categorize contras
  let totalCashToBank = 0;
  let totalBankToCash = 0;
  let totalBankToBank = 0;

  contras.forEach((v) => {
    const isDrCash = v.debitLedgerId === cashLedger?.id;
    const isCrCash = v.creditLedgerId === cashLedger?.id;

    if (isCrCash && !isDrCash) {
      totalCashToBank += v.amount;
    } else if (isDrCash && !isCrCash) {
      totalBankToCash += v.amount;
    } else {
      totalBankToBank += v.amount;
    }
  });

  const totalContraVolume = totalCashToBank + totalBankToCash + totalBankToBank;

  const filteredContras = contras.filter((v) => {
    const drLedger = ledgers.find((l) => l.id === v.debitLedgerId)?.name || '';
    const crLedger = ledgers.find((l) => l.id === v.creditLedgerId)?.name || '';
    const isDrCash = v.debitLedgerId === cashLedger?.id;
    const isCrCash = v.creditLedgerId === cashLedger?.id;

    const matchesSearch =
      drLedger.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crLedger.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.chequeOrUtrNo && v.chequeOrUtrNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.narration && v.narration.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesFilter = true;
    if (filterMode === 'CASH_TO_BANK') {
      matchesFilter = isCrCash && !isDrCash;
    } else if (filterMode === 'BANK_TO_CASH') {
      matchesFilter = isDrCash && !isCrCash;
    } else if (filterMode === 'BANK_TO_BANK') {
      matchesFilter = !isDrCash && !isCrCash;
    }

    return matchesSearch && matchesFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher No', 'Destination (Dr)', 'Source (Cr)', 'Amount', 'Reference / Cheque', 'Narration'];
    const csvRows = [
      headers.join(','),
      ...filteredContras.map((v) => {
        const dr = ledgers.find((l) => l.id === v.debitLedgerId)?.name || 'Dr';
        const cr = ledgers.find((l) => l.id === v.creditLedgerId)?.name || 'Cr';
        return [
          v.date,
          `"${v.voucherNo}"`,
          `"${dr}"`,
          `"${cr}"`,
          v.amount,
          `"${v.chequeOrUtrNo || v.referenceNo || ''}"`,
          `"${v.narration || ''}"`,
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ContraRegister_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Contra Register (Cash ⇄ Bank Transfers)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /contra (F4)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Double-entry internal fund movements: Cash deposited into bank, cash withdrawals, and inter-bank transfers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('CONTRA')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Contra Entry (F4)</span>
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
            title="Print Contra Register"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Contra Volume</span>
          <div className="text-lg font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {totalContraVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-sans">{contras.length} Contra Entries</span>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-emerald-800 font-bold tracking-wider">Cash Deposited to Bank</span>
          <div className="text-base font-bold text-emerald-900 font-mono mt-1">
            {company.currencySymbol} {totalCashToBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-700 font-sans">Cash Out → Bank In</span>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-amber-800 font-bold tracking-wider">Cash Withdrawn from Bank</span>
          <div className="text-base font-bold text-amber-900 font-mono mt-1">
            {company.currencySymbol} {totalBankToCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-amber-700 font-sans">Office Cash in Hand</span>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-blue-800 font-bold tracking-wider">Bank-to-Bank Transfers</span>
          <div className="text-base font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {totalBankToBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Inter-account movement</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search account, reference, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] mr-1 font-semibold">Filter:</span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CASH_TO_BANK', label: 'Cash to Bank' },
            { id: 'BANK_TO_CASH', label: 'Bank to Cash' },
            { id: 'BANK_TO_BANK', label: 'Bank to Bank' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterMode(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contra Ledger Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-3">Vch No.</th>
              <th className="py-3 px-3">Contra Nature</th>
              <th className="py-3 px-4">Destination (Dr - Receiver)</th>
              <th className="py-3 px-4">Source (Cr - Giver)</th>
              <th className="py-3 px-3">Reference / Cheque</th>
              <th className="py-3 px-4 text-right text-blue-900">Transfer Amount</th>
              <th className="py-3 px-2 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
            {filteredContras.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-600">No Contra entries recorded yet.</p>
                    <p className="text-xs text-slate-400">
                      Click <strong className="text-blue-700">"New Contra Entry (F4)"</strong> or go to the <strong className="text-blue-700">Input Session</strong> tab to deposit cash or transfer funds.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredContras.map((v) => {
                const dr = ledgers.find((l) => l.id === v.debitLedgerId);
                const cr = ledgers.find((l) => l.id === v.creditLedgerId);
                const isDrCash = v.debitLedgerId === cashLedger?.id;
                const isCrCash = v.creditLedgerId === cashLedger?.id;

                let badge = 'Bank Transfer';
                let badgeColor = 'bg-blue-100 text-blue-800';

                if (isCrCash && !isDrCash) {
                  badge = 'Cash Deposited';
                  badgeColor = 'bg-emerald-100 text-emerald-800';
                } else if (isDrCash && !isCrCash) {
                  badge = 'Cash Withdrawn';
                  badgeColor = 'bg-amber-100 text-amber-800';
                }

                return (
                  <tr key={v.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-sans">{v.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{v.voucherNo}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                        {badge}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        {isDrCash ? <Wallet className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                        <span>{dr?.name || 'Dr Account'}</span>
                      </div>
                      {v.narration && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {v.narration}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-rose-800 flex items-center gap-1.5">
                        {isCrCash ? <Wallet className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                        <span>{cr?.name || 'Cr Account'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {v.chequeOrUtrNo || v.referenceNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-900 text-xs">
                      {company.currencySymbol} {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center font-sans">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete contra voucher ${v.voucherNo}?`)) {
                            deleteVoucher(v.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800 font-mono">
            <tr>
              <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider font-sans text-slate-600">
                Total Contra Volume:
              </td>
              <td className="py-3 px-4 text-right text-blue-900 text-sm">
                {company.currencySymbol}{' '}
                {totalContraVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
