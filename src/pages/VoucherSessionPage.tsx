import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Layers,
  Wallet,
  Landmark,
  ShoppingCart,
  Receipt,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { InvoiceItem } from '../types/accounting';

export const VoucherSessionPage: React.FC = () => {
  const { company, ledgers, addVoucher, vouchers, deleteVoucher, getLedgerBalance } = useAccounting();

  const [activeTab, setActiveTab] = useState<'CASH' | 'BANK' | 'PURCHASE' | 'SALE'>('CASH');

  const [date, setDate] = useState<string>(company.currentAccountingDate);
  const [amount, setAmount] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');

  const [cashDirection, setCashDirection] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [cashPartyLedgerId, setCashPartyLedgerId] = useState<string>('');

  const [bankSubtype, setBankSubtype] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'CONTRA_TO_CASH'>('DEPOSIT');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    ledgers.find((l) => l.group === 'BANK')?.id || ''
  );
  const [bankPartyLedgerId, setBankPartyLedgerId] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');

  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string>('');
  const [purchasePaymentMode, setPurchasePaymentMode] = useState<'CREDIT' | 'CASH' | 'BANK'>('CREDIT');
  const [purchaseItems, setPurchaseItems] = useState<InvoiceItem[]>([]);
  const [pItemName, setPItemName] = useState('');
  const [pItemQty, setPItemQty] = useState('1');
  const [pItemRate, setPItemRate] = useState('');

  const [saleCustomerId, setSaleCustomerId] = useState<string>('');
  const [salePaymentMode, setSalePaymentMode] = useState<'CREDIT' | 'CASH' | 'BANK'>('CREDIT');
  const [saleItems, setSaleItems] = useState<InvoiceItem[]>([]);
  const [sItemName, setSItemName] = useState('');
  const [sItemQty, setSItemQty] = useState('1');
  const [sItemRate, setSItemRate] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const cashLedger = ledgers.find((l) => l.group === 'CASH');
  const bankLedgers = ledgers.filter((l) => l.group === 'BANK');
  const purchaseLedger = ledgers.find((l) => l.id === 'led_purchase' || l.group === 'DIRECT_EXPENSE');
  const salesLedger = ledgers.find((l) => l.id === 'led_sales' || l.group === 'DIRECT_INCOME');

  const handleAddPurchaseItem = () => {
    if (!pItemName.trim() || !pItemRate || Number(pItemRate) <= 0) return;
    const qty = Math.max(1, Number(pItemQty) || 1);
    const rate = Number(pItemRate);
    const itemTotal = qty * rate;
    const item: InvoiceItem = {
      id: `pi_${Date.now()}`,
      itemName: pItemName.trim(),
      quantity: qty,
      rate,
      unit: 'nos',
      amount: itemTotal,
    };
    const updated = [...purchaseItems, item];
    setPurchaseItems(updated);
    setAmount(updated.reduce((s, it) => s + it.amount, 0).toString());
    setPItemName('');
    setPItemQty('1');
    setPItemRate('');
  };

  const handleAddSaleItem = () => {
    if (!sItemName.trim() || !sItemRate || Number(sItemRate) <= 0) return;
    const qty = Math.max(1, Number(sItemQty) || 1);
    const rate = Number(sItemRate);
    const itemTotal = qty * rate;
    const item: InvoiceItem = {
      id: `si_${Date.now()}`,
      itemName: sItemName.trim(),
      quantity: qty,
      rate,
      unit: 'nos',
      amount: itemTotal,
    };
    const updated = [...saleItems, item];
    setSaleItems(updated);
    setAmount(updated.reduce((s, it) => s + it.amount, 0).toString());
    setSItemName('');
    setSItemQty('1');
    setSItemRate('');
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid amount greater than 0.' });
      return;
    }

    try {
      if (activeTab === 'CASH') {
        if (!cashPartyLedgerId) {
          setFeedback({ type: 'error', message: 'Please select corresponding party or expense/income ledger.' });
          return;
        }

        if (cashDirection === 'INFLOW') {
          addVoucher({
            voucherType: 'RECEIPT',
            date,
            debitLedgerId: cashLedger?.id || 'led_cash',
            creditLedgerId: cashPartyLedgerId,
            amount: parsedAmount,
            narration: narration || 'Being cash received into till',
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'CASH',
            category: 'CASH',
          });
        } else {
          addVoucher({
            voucherType: 'PAYMENT',
            date,
            debitLedgerId: cashPartyLedgerId,
            creditLedgerId: cashLedger?.id || 'led_cash',
            amount: parsedAmount,
            narration: narration || 'Being cash payment disbursed',
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'CASH',
            category: 'CASH',
          });
        }
      } else if (activeTab === 'BANK') {
        const bankId = selectedBankId || bankLedgers[0]?.id;
        if (!bankId) {
          setFeedback({ type: 'error', message: 'No bank account ledger found.' });
          return;
        }

        if (bankSubtype === 'CONTRA_TO_CASH') {
          addVoucher({
            voucherType: 'CONTRA',
            date,
            debitLedgerId: bankId,
            creditLedgerId: cashLedger?.id || 'led_cash',
            amount: parsedAmount,
            narration: narration || 'Being cash deposited into bank account',
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'BANK',
            chequeOrUtrNo: chequeNo.trim() || undefined,
            category: 'BANK',
          });
        } else if (bankSubtype === 'DEPOSIT') {
          if (!bankPartyLedgerId) {
            setFeedback({ type: 'error', message: 'Please select customer or source ledger.' });
            return;
          }
          addVoucher({
            voucherType: 'RECEIPT',
            date,
            debitLedgerId: bankId,
            creditLedgerId: bankPartyLedgerId,
            amount: parsedAmount,
            narration: narration || 'Being bank receipt credited via transfer/cheque',
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'BANK',
            chequeOrUtrNo: chequeNo.trim() || undefined,
            category: 'BANK',
          });
        } else {
          if (!bankPartyLedgerId) {
            setFeedback({ type: 'error', message: 'Please select payee / expense ledger.' });
            return;
          }
          addVoucher({
            voucherType: 'PAYMENT',
            date,
            debitLedgerId: bankPartyLedgerId,
            creditLedgerId: bankId,
            amount: parsedAmount,
            narration: narration || 'Being payment debited from bank account',
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'BANK',
            chequeOrUtrNo: chequeNo.trim() || undefined,
            category: 'BANK',
          });
        }
      } else if (activeTab === 'PURCHASE') {
        if (!purchaseSupplierId) {
          setFeedback({ type: 'error', message: 'Please select a supplier or settlement account.' });
          return;
        }

        let creditAccId = purchaseSupplierId;
        if (purchasePaymentMode === 'CASH') {
          creditAccId = cashLedger?.id || 'led_cash';
        } else if (purchasePaymentMode === 'BANK') {
          creditAccId = selectedBankId || bankLedgers[0]?.id;
        }

        addVoucher({
          voucherType: 'PURCHASE',
          date,
          debitLedgerId: purchaseLedger?.id || 'led_purchase',
          creditLedgerId: creditAccId,
          amount: parsedAmount,
          narration: narration || 'Being inventory purchases recorded',
          referenceNo: referenceNo.trim() || undefined,
          paymentMode: purchasePaymentMode,
          items: purchaseItems.length > 0 ? purchaseItems : undefined,
          category: 'PURCHASE',
        });
      } else if (activeTab === 'SALE') {
        if (!saleCustomerId) {
          setFeedback({ type: 'error', message: 'Please select a customer or settlement account.' });
          return;
        }

        let debitAccId = saleCustomerId;
        if (salePaymentMode === 'CASH') {
          debitAccId = cashLedger?.id || 'led_cash';
        } else if (salePaymentMode === 'BANK') {
          debitAccId = selectedBankId || bankLedgers[0]?.id;
        }

        addVoucher({
          voucherType: 'SALES',
          date,
          debitLedgerId: debitAccId,
          creditLedgerId: salesLedger?.id || 'led_sales',
          amount: parsedAmount,
          narration: narration || 'Being sales invoice recorded to customer',
          referenceNo: referenceNo.trim() || undefined,
          paymentMode: salePaymentMode,
          items: saleItems.length > 0 ? saleItems : undefined,
          category: 'SALE',
        });
      }

      setFeedback({
        type: 'success',
        message: `✓ ${activeTab} transaction successfully recorded into company books!`,
      });

      setAmount('');
      setReferenceNo('');
      setNarration('');
      setPurchaseItems([]);
      setSaleItems([]);
      setChequeNo('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record transaction.' });
    }
  };

  const recentVouchers = [...vouchers].reverse().slice(0, 6);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 text-xs font-sans">
      {/* Session Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Universal Transaction Input Session
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                  Route: /session
                </span>
              </div>
              <p className="text-xs text-slate-500">
                A single unified session where you can give inputs for Cash Book, Bank, Purchases, and Sales
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Accounting Date: <strong className="text-blue-900 font-mono">{company.currentAccountingDate}</strong>
          </div>
        </div>
      </div>

      {/* 4 Primary Input Session Tabs in White & Blue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setActiveTab('CASH');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'CASH'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Wallet className={`w-5 h-5 ${activeTab === 'CASH' ? 'text-white' : 'text-emerald-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Cash Book Input</div>
              <div className={`text-[10px] ${activeTab === 'CASH' ? 'text-blue-100' : 'text-slate-400'}`}>Receipts & Payments</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-75" />
        </button>

        <button
          onClick={() => {
            setActiveTab('BANK');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'BANK'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Landmark className={`w-5 h-5 ${activeTab === 'BANK' ? 'text-white' : 'text-blue-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Bank Book Input</div>
              <div className={`text-[10px] ${activeTab === 'BANK' ? 'text-blue-100' : 'text-slate-400'}`}>Deposits, RTGS, Contra</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-75" />
        </button>

        <button
          onClick={() => {
            setActiveTab('PURCHASE');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'PURCHASE'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'PURCHASE' ? 'text-white' : 'text-orange-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Purchase Input</div>
              <div className={`text-[10px] ${activeTab === 'PURCHASE' ? 'text-blue-100' : 'text-slate-400'}`}>Vendor Bills & Inward</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-75" />
        </button>

        <button
          onClick={() => {
            setActiveTab('SALE');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'SALE'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Receipt className={`w-5 h-5 ${activeTab === 'SALE' ? 'text-white' : 'text-blue-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Sale Input</div>
              <div className={`text-[10px] ${activeTab === 'SALE' ? 'text-blue-100' : 'text-slate-400'}`}>Customer Tax Invoices</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-75" />
        </button>
      </div>

      {/* Main Input Form Container */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-xs space-y-4">
        {feedback && (
          <div
            className={`p-3.5 rounded-lg flex items-center gap-2.5 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSessionSubmit} className="space-y-4">
          {/* Row 1: Date & Common Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold text-xs">Transaction Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold text-xs">Reference / Bill / Cheque No.</label>
              <input
                type="text"
                placeholder={activeTab === 'PURCHASE' ? 'BILL-101' : activeTab === 'SALE' ? 'INV-101' : 'REF-001'}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-800 mb-1 font-bold text-blue-900 text-xs">
                Amount ({company.currencySymbol})
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border-2 border-blue-600 rounded-lg px-3 py-1.5 font-bold text-blue-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* TAB 1: CASH BOOK INPUT */}
          {activeTab === 'CASH' && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-emerald-900 font-bold uppercase text-[11px]">
                <span>Cash Book Entry Options</span>
                <span className="font-mono">Active Till: {getLedgerBalance('led_cash').formatted}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Cash Movement Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCashDirection('INFLOW')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all text-xs ${
                        cashDirection === 'INFLOW'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Cash Receipt (Inflow)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashDirection('OUTFLOW')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all text-xs ${
                        cashDirection === 'OUTFLOW'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Cash Payment (Outflow)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    {cashDirection === 'INFLOW' ? 'Received From (Account/Party):' : 'Paid Towards (Account/Expense):'}
                  </label>
                  <select
                    required
                    value={cashPartyLedgerId}
                    onChange={(e) => setCashPartyLedgerId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                  >
                    <option value="">-- Select Party or Ledger --</option>
                    {ledgers
                      .filter((l) => l.group !== 'CASH')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.group.replace('_', ' ')}]
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK BOOK INPUT */}
          {activeTab === 'BANK' && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-blue-900 font-bold uppercase text-[11px]">
                <span>Bank Book Entry Options</span>
                <span>Electronic & Contra Banking</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {bankLedgers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Transaction Type</label>
                  <select
                    value={bankSubtype}
                    onChange={(e) => setBankSubtype(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="DEPOSIT">Bank Deposit / Receipt</option>
                    <option value="WITHDRAWAL">Bank Payment / Withdrawal</option>
                    <option value="CONTRA_TO_CASH">Contra: Deposit Cash to Bank</option>
                  </select>
                </div>

                {bankSubtype !== 'CONTRA_TO_CASH' && (
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Party / Ledger Account</label>
                    <select
                      required
                      value={bankPartyLedgerId}
                      onChange={(e) => setBankPartyLedgerId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                    >
                      <option value="">-- Select Ledger --</option>
                      {ledgers
                        .filter((l) => l.group !== 'BANK')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} [{l.group.replace('_', ' ')}]
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASE INPUT */}
          {activeTab === 'PURCHASE' && (
            <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-orange-900 font-bold uppercase text-[11px]">
                <span>Purchase Voucher Input (Inward Inventory)</span>
                <span>Auto-posts to Trading Account & Stock</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Supplier / Vendor Ledger</label>
                  <select
                    required
                    value={purchaseSupplierId}
                    onChange={(e) => setPurchaseSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Supplier --</option>
                    {ledgers
                      .filter((l) => l.group === 'SUNDRY_CREDITOR' || l.group === 'CASH' || l.group === 'BANK')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.group.replace('_', ' ')}]
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Payment Terms / Mode</label>
                  <select
                    value={purchasePaymentMode}
                    onChange={(e) => setPurchasePaymentMode(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="CREDIT">Supplier Credit (Payable later)</option>
                    <option value="CASH">Immediate Cash</option>
                    <option value="BANK">Online Bank / Cheque</option>
                  </select>
                </div>
              </div>

              {/* Itemized row */}
              <div className="pt-2 border-t border-orange-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700">Add Items to Purchase Bill:</span>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Item / Material description"
                    value={pItemName}
                    onChange={(e) => setPItemName(e.target.value)}
                    className="col-span-5 bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={pItemQty}
                    onChange={(e) => setPItemQty(e.target.value)}
                    className="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Rate"
                    value={pItemRate}
                    onChange={(e) => setPItemRate(e.target.value)}
                    className="col-span-3 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddPurchaseItem}
                    className="col-span-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded text-xs"
                  >
                    + Add Item
                  </button>
                </div>

                {purchaseItems.length > 0 && (
                  <div className="text-xs text-orange-800 font-semibold pt-1 font-mono">
                    {purchaseItems.length} items added (Total: {amount})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SALE INPUT */}
          {activeTab === 'SALE' && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-blue-900 font-bold uppercase text-[11px]">
                <span>Sales Invoice Input (Customer Billing)</span>
                <span>Auto-posts to Sales Account & Income</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Customer / Client Ledger</label>
                  <select
                    required
                    value={saleCustomerId}
                    onChange={(e) => setSaleCustomerId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Customer --</option>
                    {ledgers
                      .filter((l) => l.group === 'SUNDRY_DEBTOR' || l.group === 'CASH' || l.group === 'BANK')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.group.replace('_', ' ')}]
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Settlement Terms / Mode</label>
                  <select
                    value={salePaymentMode}
                    onChange={(e) => setSalePaymentMode(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="CREDIT">Customer Credit (30-day)</option>
                    <option value="CASH">Cash Counter Payment</option>
                    <option value="BANK">Bank / Online Settlement</option>
                  </select>
                </div>
              </div>

              {/* Itemized row */}
              <div className="pt-2 border-t border-blue-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700">Add Items to Sales Bill:</span>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Product / Service description"
                    value={sItemName}
                    onChange={(e) => setSItemName(e.target.value)}
                    className="col-span-5 bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={sItemQty}
                    onChange={(e) => setSItemQty(e.target.value)}
                    className="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Rate"
                    value={sItemRate}
                    onChange={(e) => setSItemRate(e.target.value)}
                    className="col-span-3 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddSaleItem}
                    className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs"
                  >
                    + Add Item
                  </button>
                </div>

                {saleItems.length > 0 && (
                  <div className="text-xs text-blue-800 font-semibold pt-1 font-mono">
                    {saleItems.length} items added (Total: {amount})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Narration */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold text-xs">Narration / Voucher Notes</label>
            <input
              type="text"
              placeholder="Being..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Record & Post to Books</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Session Transactions Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="font-bold text-slate-900 uppercase text-xs">Recent Entries Posted in Session</span>
          <span className="text-[11px] text-slate-500 font-mono">Total Vouchers: {vouchers.length}</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] font-sans">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Vch No.</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Debit Ledger (Dr)</th>
              <th className="py-2.5 px-3">Credit Ledger (Cr)</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentVouchers.map((v) => {
              const dr = ledgers.find((l) => l.id === v.debitLedgerId)?.name || 'Dr Acc';
              const cr = ledgers.find((l) => l.id === v.creditLedgerId)?.name || 'Cr Acc';
              return (
                <tr key={v.id} className="hover:bg-blue-50/30">
                  <td className="py-2.5 px-3 text-slate-600 font-sans">{v.date}</td>
                  <td className="py-2.5 px-3 font-bold text-blue-900">{v.voucherNo}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 font-semibold font-sans">{dr}</td>
                  <td className="py-2.5 px-3 text-rose-700 font-semibold font-sans">{cr}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {company.currencySymbol} {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 text-center font-sans">
                    <button
                      onClick={() => deleteVoucher(v.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
