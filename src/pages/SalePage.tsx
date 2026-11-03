import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Receipt,
  Plus,
  Printer,
  Download,
  Search,
  Layers,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import type { VoucherEntry } from '../types/accounting';

interface SalePageProps {
  onOpenVoucher: (type: any) => void;
}

export const SalePage: React.FC<SalePageProps> = ({ onOpenVoucher }) => {
  const { company, ledgers, getSalesList, deleteVoucher } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<VoucherEntry | null>(null);

  const sales = getSalesList();

  const totalSalesAmount = sales.reduce((sum, v) => sum + v.amount, 0);
  const cashSales = sales.filter((v) => v.paymentMode === 'CASH');
  const creditSales = sales.filter((v) => v.paymentMode === 'CREDIT' || !v.paymentMode);
  const bankSales = sales.filter((v) => v.paymentMode === 'BANK');

  const totalCashSales = cashSales.reduce((sum, v) => sum + v.amount, 0);
  const totalCreditSales = creditSales.reduce((sum, v) => sum + v.amount, 0);
  const totalBankSales = bankSales.reduce((sum, v) => sum + v.amount, 0);

  const filteredSales = sales.filter((s) => {
    const customer = ledgers.find((l) => l.id === s.debitLedgerId)?.name || '';
    return (
      customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.referenceNo && s.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.narration && s.narration.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher No', 'Customer Account', 'Invoice Ref', 'Payment Mode', 'Amount', 'Narration'];
    const csvRows = [
      headers.join(','),
      ...filteredSales.map((s) => {
        const customer = ledgers.find((l) => l.id === s.debitLedgerId)?.name || 'Direct / Cash';
        return [
          s.date,
          `"${s.voucherNo}"`,
          `"${customer}"`,
          `"${s.referenceNo || ''}"`,
          s.paymentMode || 'CREDIT',
          s.amount,
          `"${s.narration || ''}"`,
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SalesRegister_${company.companyName}_${company.currentAccountingDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Sales Register (Customer Invoicing & Receivables)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /sale
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Commercial tax invoices, cash receipts, and customer credit billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenVoucher('SALES')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Sale (F8)</span>
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
            title="Print Sales Register"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Revenue</span>
          <div className="text-lg font-bold text-blue-800 font-mono mt-1">
            {company.currencySymbol} {totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-sans">{sales.length} Outward Invoices</span>
        </div>

        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-blue-800 font-bold tracking-wider">Credit Sales (Debtors)</span>
          <div className="text-base font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {totalCreditSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Trade Receivables</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Cash Sales</span>
          <div className="text-base font-bold text-emerald-800 font-mono mt-1">
            {company.currencySymbol} {totalCashSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-sans">Counter Cash Collected</span>
        </div>

        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase text-blue-800 font-bold tracking-wider">Bank / Online Sales</span>
          <div className="text-base font-bold text-blue-900 font-mono mt-1">
            {company.currencySymbol} {totalBankSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Direct Bank Settlements</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, invoice no, narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong className="text-blue-800 font-mono">{filteredSales.length}</strong> sales invoices
        </div>
      </div>

      {/* Sales Register Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-3">Vch No.</th>
              <th className="py-3 px-4">Customer / Account</th>
              <th className="py-3 px-3">Inv Ref No.</th>
              <th className="py-3 px-3">Payment Mode</th>
              <th className="py-3 px-3">Items</th>
              <th className="py-3 px-4 text-right text-blue-800">Sales Amount</th>
              <th className="py-3 px-2 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No sales invoices recorded yet. Click "New Sale (F8)" to create your first bill.
                </td>
              </tr>
            ) : (
              filteredSales.map((v) => {
                const customer = ledgers.find((l) => l.id === v.debitLedgerId);
                const hasItems = v.items && v.items.length > 0;

                return (
                  <tr key={v.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-sans">{v.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{v.voucherNo}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900">
                        {customer?.name || 'Cash Counter Customer'}
                      </div>
                      {v.narration && (
                        <div className="text-[11px] text-slate-400 truncate max-w-sm">
                          {v.narration}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-amber-700 font-semibold">
                      {v.referenceNo || '-'}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.paymentMode === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.paymentMode === 'BANK'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {v.paymentMode || 'CREDIT'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {hasItems ? (
                        <button
                          onClick={() => setSelectedVoucherForView(v)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{v.items!.length} item(s)</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Direct Entry</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-800 text-xs">
                      {company.currencySymbol} {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center flex items-center justify-center gap-1 font-sans">
                      {hasItems && (
                        <button
                          onClick={() => setSelectedVoucherForView(v)}
                          className="text-slate-400 hover:text-blue-600 p-1"
                          title="View Invoice Items"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete sales voucher ${v.voucherNo}?`)) {
                            deleteVoucher(v.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
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
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800 font-mono">
            <tr>
              <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider font-sans text-slate-600">
                Total Outward Sales:
              </td>
              <td className="py-3 px-4 text-right text-blue-800 text-sm">
                {company.currencySymbol}{' '}
                {totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Invoice Items Viewer Modal */}
      {selectedVoucherForView && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-blue-900">
                  Sales Invoice Breakdown: {selectedVoucherForView.voucherNo}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ref: {selectedVoucherForView.referenceNo || 'N/A'} | Date: {selectedVoucherForView.date}
                </span>
              </div>
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-600 font-sans">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right text-blue-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucherForView.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 text-slate-800 font-sans">{it.itemName}</td>
                      <td className="py-2 px-3 text-right">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-3 text-right">{it.rate.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-800">
                        {it.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold font-sans">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-slate-600">
                      Total Invoice Value:
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-800 font-mono text-xs">
                      {company.currencySymbol} {selectedVoucherForView.amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
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
