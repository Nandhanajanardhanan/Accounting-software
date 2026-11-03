import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  ShoppingCart,
  Plus,
  Printer,
  Download,
  Search,
  Layers,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { VoucherEntry } from '../types/accounting';

interface PurchasePageProps {
  onOpenVoucher: (type: any) => void;
}

export const PurchasePage: React.FC<PurchasePageProps> = ({ onOpenVoucher }) => {
  const { company, ledgers, getPurchasesList, deleteVoucher } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<VoucherEntry | null>(null);

  const purchases = getPurchasesList();

  // Summary Metrics
  const totalPurchaseAmount = purchases.reduce((sum, v) => sum + v.amount, 0);
  const cashPurchases = purchases.filter((v) => v.paymentMode === 'CASH');
  const creditPurchases = purchases.filter((v) => v.paymentMode === 'CREDIT' || !v.paymentMode);
  const bankPurchases = purchases.filter((v) => v.paymentMode === 'BANK');

  const totalCashPurchases = cashPurchases.reduce((sum, v) => sum + v.amount, 0);
  const totalCreditPurchases = creditPurchases.reduce((sum, v) => sum + v.amount, 0);

  const filteredPurchases = purchases.filter((p) => {
    const supplier = ledgers.find((l) => l.id === p.creditLedgerId)?.name || '';
    return (
      supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.narration && p.narration.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher No', 'Supplier Account', 'Invoice Ref', 'Payment Mode', 'Amount', 'Narration'];
    const csvRows = [
      headers.join(','),
      ...filteredPurchases.map((p) => {
        const supplier = ledgers.find((l) => l.id === p.creditLedgerId)?.name || 'Direct';
        return [
          p.date,
          `"${p.voucherNo}"`,
          `"${supplier}"`,
          `"${p.referenceNo || ''}"`,
          p.paymentMode || 'CREDIT',
          p.amount,
          `"${p.narration || ''}"`,
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PurchaseRegister_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-950/80 text-orange-400 border border-orange-800">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Purchase Register (Inward Invoices)
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-orange-900/60 text-orange-300 border border-orange-700">
                Route: /purchase
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Raw materials, merchandise, inventory procurement, and vendor credit bills
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('PURCHASE')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-black font-bold transition-all shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase (F9)</span>
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
            title="Print Purchase Register"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Total Purchases</span>
          <div className="text-lg font-bold text-orange-300 mt-1">
            {company.currencySymbol} {totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">{purchases.length} Inward Vouchers</span>
        </div>

        <div className="p-3 bg-orange-950/40 border border-orange-900/60 rounded-lg">
          <span className="text-[10px] uppercase text-orange-300 font-semibold">Credit Purchases</span>
          <div className="text-base font-bold text-orange-200 mt-1">
            {company.currencySymbol} {totalCreditPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Supplier Ledger Credit</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Cash Purchases</span>
          <div className="text-base font-bold text-slate-200 mt-1">
            {company.currencySymbol} {totalCashPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Direct Cash Disbursed</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Bank Purchases</span>
          <div className="text-base font-bold text-cyan-300 mt-1">
            {company.currencySymbol}{' '}
            {bankPurchases
              .reduce((sum, v) => sum + v.amount, 0)
              .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Online & Cheque</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-black/20 border border-white/5 rounded-lg">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier, bill no, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-orange-400"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-orange-300">{filteredPurchases.length}</strong> purchase bills
        </div>
      </div>

      {/* Purchase Register Table */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-xl bg-slate-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Vch No.</th>
              <th className="py-2.5 px-3">Supplier / Account</th>
              <th className="py-2.5 px-3">Bill Ref No.</th>
              <th className="py-2.5 px-3">Payment Mode</th>
              <th className="py-2.5 px-3">Items</th>
              <th className="py-2.5 px-3 text-right text-orange-400">Purchase Amount</th>
              <th className="py-2.5 px-2 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-200">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No purchase records found. Click "New Purchase (F9)" to add one.
                </td>
              </tr>
            ) : (
              filteredPurchases.map((v) => {
                const supplier = ledgers.find((l) => l.id === v.creditLedgerId);
                const hasItems = v.items && v.items.length > 0;

                return (
                  <tr key={v.id} className="hover:bg-slate-900/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{v.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">{v.voucherNo}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">
                        {supplier?.name || 'Cash/Direct Purchase'}
                      </div>
                      {v.narration && (
                        <div className="text-[10px] text-slate-400 truncate max-w-sm">
                          {v.narration}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">
                      {v.referenceNo || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          v.paymentMode === 'CASH'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : v.paymentMode === 'BANK'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {v.paymentMode || 'CREDIT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {hasItems ? (
                        <button
                          onClick={() => setSelectedVoucherForView(v)}
                          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 underline"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{v.items!.length} item(s)</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Direct Entry</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-orange-300 text-xs">
                      {company.currencySymbol} {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center flex items-center justify-center gap-1">
                      {hasItems && (
                        <button
                          onClick={() => setSelectedVoucherForView(v)}
                          className="text-slate-400 hover:text-white p-1"
                          title="View Invoice Items"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete purchase voucher ${v.voucherNo}?`)) {
                            deleteVoucher(v.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-xs">
            <tr>
              <td colSpan={6} className="py-2.5 px-4 text-right uppercase tracking-wider text-slate-300">
                Total Inward Purchases:
              </td>
              <td className="py-2.5 px-3 text-right text-orange-300 text-sm">
                {company.currencySymbol}{' '}
                {totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Invoice Items Viewer Modal */}
      {selectedVoucherForView && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg max-w-lg w-full p-5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-orange-300">
                  Purchase Invoice Breakdown: {selectedVoucherForView.voucherNo}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Ref: {selectedVoucherForView.referenceNo || 'N/A'} | Date: {selectedVoucherForView.date}
                </span>
              </div>
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="py-1.5 px-3">Item Description</th>
                    <th className="py-1.5 px-3 text-right">Qty</th>
                    <th className="py-1.5 px-3 text-right">Rate</th>
                    <th className="py-1.5 px-3 text-right text-orange-300">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedVoucherForView.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 text-white">{it.itemName}</td>
                      <td className="py-2 px-3 text-right">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-3 text-right">{it.rate.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-orange-300">
                        {it.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 border-t border-slate-700 font-bold">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right uppercase text-slate-400">
                      Total Invoice Value:
                    </td>
                    <td className="py-2 px-3 text-right text-orange-400">
                      {company.currencySymbol} {selectedVoucherForView.amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
