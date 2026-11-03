import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Layers,
  Wallet,
  Landmark,
  ShoppingCart,
  Receipt,
  Repeat,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { InvoiceItem } from '../types/accounting';

export const VoucherSessionPage: React.FC = () => {
  const { company, ledgers, addVoucher, vouchers, deleteVoucher, getLedgerBalance } = useAccounting();

  // Active Session Tab: 'CASH' | 'BANK' | 'CONTRA' | 'PURCHASE' | 'SALE'
  const [activeTab, setActiveTab] = useState<'CASH' | 'BANK' | 'CONTRA' | 'PURCHASE' | 'SALE'>('CASH');

  const [date, setDate] = useState<string>(company.currentAccountingDate);
  const [amount, setAmount] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');

  // 1. Cash Book state:
  const [cashDirection, setCashDirection] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [cashPartyLedgerId, setCashPartyLedgerId] = useState<string>('');

  // 2. Bank Book state:
  const [bankSubtype, setBankSubtype] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    ledgers.find((l) => l.group === 'BANK')?.id || ''
  );
  const [bankPartyLedgerId, setBankPartyLedgerId] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');

  // 3. Contra state:
  const [contraType, setContraType] = useState<'CASH_TO_BANK' | 'BANK_TO_CASH' | 'BANK_TO_BANK'>('CASH_TO_BANK');
  const [contraPrimaryBankId, setContraPrimaryBankId] = useState<string>(
    ledgers.find((l) => l.group === 'BANK')?.id || ''
  );
  const [contraSecondaryBankId, setContraSecondaryBankId] = useState<string>(
    ledgers.filter((l) => l.group === 'BANK')[1]?.id || ledgers.find((l) => l.group === 'BANK')?.id || ''
  );

  // 4. Purchase state:
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string>('');
  const [purchasePaymentMode, setPurchasePaymentMode] = useState<'CREDIT' | 'CASH' | 'BANK'>('CREDIT');
  const [purchaseItems, setPurchaseItems] = useState<InvoiceItem[]>([]);
  const [pItemName, setPItemName] = useState('');
  const [pItemQty, setPItemQty] = useState('1');
  const [pItemRate, setPItemRate] = useState('');

  // 5. Sale state:
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

        if (bankSubtype === 'DEPOSIT') {
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
      } else if (activeTab === 'CONTRA') {
        const targetBankId = contraPrimaryBankId || bankLedgers[0]?.id;
        if (!targetBankId) {
          setFeedback({ type: 'error', message: 'No bank account ledger found for Contra entry.' });
          return;
        }

        if (contraType === 'CASH_TO_BANK') {
          // Debit Bank (Receiver), Credit Cash (Giver)
          addVoucher({
            voucherType: 'CONTRA',
            date,
            debitLedgerId: targetBankId,
            creditLedgerId: cashLedger?.id || 'led_cash',
            amount: parsedAmount,
            narration: narration || `Being cash deposited into ${ledgers.find(l => l.id === targetBankId)?.name}`,
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'BANK',
            chequeOrUtrNo: chequeNo.trim() || undefined,
            category: 'BANK',
          });
        } else if (contraType === 'BANK_TO_CASH') {
          // Debit Cash (Receiver), Credit Bank (Giver)
          addVoucher({
            voucherType: 'CONTRA',
            date,
            debitLedgerId: cashLedger?.id || 'led_cash',
            creditLedgerId: targetBankId,
            amount: parsedAmount,
            narration: narration || `Being cash withdrawn from ${ledgers.find(l => l.id === targetBankId)?.name} for office use`,
            referenceNo: referenceNo.trim() || undefined,
            paymentMode: 'CASH',
            chequeOrUtrNo: chequeNo.trim() || undefined,
            category: 'CASH',
          });
        } else {
          // Bank to Bank
          if (!contraSecondaryBankId || contraPrimaryBankId === contraSecondaryBankId) {
            setFeedback({ type: 'error', message: 'Please select two different bank accounts for inter-bank transfer.' });
            return;
          }
          // Debit Destination (Primary), Credit Source (Secondary)
          addVoucher({
            voucherType: 'CONTRA',
            date,
            debitLedgerId: contraPrimaryBankId,
            creditLedgerId: contraSecondaryBankId,
            amount: parsedAmount,
            narration: narration || 'Being funds transferred between corporate bank accounts',
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

  const recentVouchers = [...vouchers].reverse().slice(0, 8);

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
                Single unified workspace to give inputs for Cash Book, Bank, Contra, Purchases, and Sales
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Accounting Date: <strong className="text-blue-900 font-mono">{company.currentAccountingDate}</strong>
          </div>
        </div>
      </div>

      {/* 5 Primary Input Session Tabs including Contra */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* TAB 1: CASH */}
        <button
          onClick={() => {
            setActiveTab('CASH');
            setFeedback(null);
          }}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'CASH'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Wallet className={`w-5 h-5 ${activeTab === 'CASH' ? 'text-white' : 'text-emerald-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Cash Book</div>
              <div className={`text-[10px] ${activeTab === 'CASH' ? 'text-blue-100' : 'text-slate-400'}`}>Receipt & Pay</div>
            </div>
          </div>
        </button>

        {/* TAB 2: BANK */}
        <button
          onClick={() => {
            setActiveTab('BANK');
            setFeedback(null);
          }}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'BANK'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Landmark className={`w-5 h-5 ${activeTab === 'BANK' ? 'text-white' : 'text-blue-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Bank Book</div>
              <div className={`text-[10px] ${activeTab === 'BANK' ? 'text-blue-100' : 'text-slate-400'}`}>Deposit & Pay</div>
            </div>
          </div>
        </button>

        {/* TAB 3: CONTRA ENTRY (PROMINENT) */}
        <button
          onClick={() => {
            setActiveTab('CONTRA');
            setFeedback(null);
          }}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'CONTRA'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Repeat className={`w-5 h-5 ${activeTab === 'CONTRA' ? 'text-white' : 'text-amber-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Contra (F4)</div>
              <div className={`text-[10px] ${activeTab === 'CONTRA' ? 'text-blue-100' : 'text-slate-400'}`}>Cash ⇄ Bank</div>
            </div>
          </div>
        </button>

        {/* TAB 4: PURCHASE */}
        <button
          onClick={() => {
            setActiveTab('PURCHASE');
            setFeedback(null);
          }}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'PURCHASE'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'PURCHASE' ? 'text-white' : 'text-orange-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Purchase</div>
              <div className={`text-[10px] ${activeTab === 'PURCHASE' ? 'text-blue-100' : 'text-slate-400'}`}>Inward Bills</div>
            </div>
          </div>
        </button>

        {/* TAB 5: SALE */}
        <button
          onClick={() => {
            setActiveTab('SALE');
            setFeedback(null);
          }}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            activeTab === 'SALE'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Receipt className={`w-5 h-5 ${activeTab === 'SALE' ? 'text-white' : 'text-blue-600'}`} />
            <div className="text-left">
              <div className="font-bold text-xs uppercase">Sale</div>
              <div className={`text-[10px] ${activeTab === 'SALE' ? 'text-blue-100' : 'text-slate-400'}`}>Tax Invoices</div>
            </div>
          </div>
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
              <label className="block text-slate-700 mb-1 font-semibold text-xs">Reference / Cheque / Slip No.</label>
              <input
                type="text"
                placeholder={
                  activeTab === 'CONTRA'
                    ? 'DEP-SLIP-01'
                    : activeTab === 'PURCHASE'
                    ? 'BILL-101'
                    : activeTab === 'SALE'
                    ? 'INV-101'
                    : 'REF-001'
                }
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
                <span className="font-mono">Current Till Cash: {getLedgerBalance('led_cash').formatted}</span>
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
                    {cashDirection === 'INFLOW' ? 'Received From (Customer/Income/Capital):' : 'Paid Towards (Expense/Supplier):'}
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
                <span>Electronic Banking & Party Transactions</span>
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
                  <label className="block text-slate-700 mb-1 font-semibold">Bank Action</label>
                  <select
                    value={bankSubtype}
                    onChange={(e) => setBankSubtype(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="DEPOSIT">Bank Deposit / Receipt</option>
                    <option value="WITHDRAWAL">Bank Payment / Cheque Issued</option>
                  </select>
                </div>

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
              </div>
            </div>
          )}

          {/* TAB 3: CONTRA ENTRY (PROMINENT INPUT) */}
          {activeTab === 'CONTRA' && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between text-amber-900 font-bold uppercase text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-amber-700" />
                  Contra Voucher (F4) - Internal Fund Transfers
                </span>
                <span className="text-slate-600 font-mono">
                  Cash Till: {getLedgerBalance('led_cash').formatted}
                </span>
              </div>

              {/* Contra Mode Selector */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Select Contra Movement</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContraType('CASH_TO_BANK');
                      setNarration('Being cash deposited into bank account');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all border text-left ${
                      contraType === 'CASH_TO_BANK'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="font-bold">1. Deposit Cash to Bank</div>
                    <div className="text-[10px] opacity-80 font-mono">Dr Bank / Cr Cash</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContraType('BANK_TO_CASH');
                      setNarration('Being cash withdrawn from bank for office use');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all border text-left ${
                      contraType === 'BANK_TO_CASH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="font-bold">2. Withdraw Cash from Bank</div>
                    <div className="text-[10px] opacity-80 font-mono">Dr Cash / Cr Bank</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContraType('BANK_TO_BANK');
                      setNarration('Being funds transferred between bank accounts');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all border text-left ${
                      contraType === 'BANK_TO_BANK'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="font-bold">3. Inter-Bank Transfer</div>
                    <div className="text-[10px] opacity-80 font-mono">Dr Bank A / Cr Bank B</div>
                  </button>
                </div>
              </div>

              {/* Contra Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {contraType === 'CASH_TO_BANK' && (
                  <>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Destination Bank (Debit / Deposited Into):
                      </label>
                      <select
                        value={contraPrimaryBankId}
                        onChange={(e) => setContraPrimaryBankId(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-amber-600 shadow-2xs"
                      >
                        {bankLedgers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (Balance: {getLedgerBalance(b.id).formatted})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Source Account (Credit / Withdrawn From):
                      </label>
                      <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold flex items-center justify-between">
                        <span>Cash A/c (Till Cash)</span>
                        <span className="font-mono text-xs text-blue-900">{getLedgerBalance('led_cash').formatted}</span>
                      </div>
                    </div>
                  </>
                )}

                {contraType === 'BANK_TO_CASH' && (
                  <>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Destination Account (Debit / Inflow):
                      </label>
                      <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold flex items-center justify-between">
                        <span>Cash A/c (Office Cash in Hand)</span>
                        <span className="font-mono text-xs text-blue-900">{getLedgerBalance('led_cash').formatted}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Source Bank (Credit / Withdrawn From):
                      </label>
                      <select
                        value={contraPrimaryBankId}
                        onChange={(e) => setContraPrimaryBankId(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-amber-600 shadow-2xs"
                      >
                        {bankLedgers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (Balance: {getLedgerBalance(b.id).formatted})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {contraType === 'BANK_TO_BANK' && (
                  <>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Destination Bank (Debit / Receiver):
                      </label>
                      <select
                        value={contraPrimaryBankId}
                        onChange={(e) => setContraPrimaryBankId(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-amber-600 shadow-2xs"
                      >
                        {bankLedgers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Source Bank (Credit / Sender):
                      </label>
                      <select
                        value={contraSecondaryBankId}
                        onChange={(e) => setContraSecondaryBankId(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-amber-600 shadow-2xs"
                      >
                        {bankLedgers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PURCHASE INPUT */}
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

          {/* TAB 5: SALE INPUT */}
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

        {recentVouchers.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No vouchers recorded yet. Choose any tab above and submit your first entry!
          </div>
        ) : (
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.voucherType === 'CONTRA'
                          ? 'bg-amber-100 text-amber-800'
                          : v.voucherType === 'RECEIPT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.voucherType === 'PAYMENT'
                          ? 'bg-rose-100 text-rose-800'
                          : v.voucherType === 'SALES'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
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
        )}
      </div>
    </div>
  );
};
