import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { VoucherType, InvoiceItem } from '../types/accounting';
import { Plus, Trash2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface VoucherEntryModalProps {
  initialType?: VoucherType;
  isOpen: boolean;
  onClose: () => void;
  defaultDebitId?: string;
  defaultCreditId?: string;
}

export const VoucherEntryModal: React.FC<VoucherEntryModalProps> = ({
  initialType = 'PAYMENT',
  isOpen,
  onClose,
  defaultDebitId,
  defaultCreditId,
}) => {
  const { company, ledgers, addVoucher, getLedgerBalance } = useAccounting();

  const [voucherType, setVoucherType] = useState<VoucherType>(initialType);
  const [date, setDate] = useState<string>(company.currentAccountingDate);
  const [debitLedgerId, setDebitLedgerId] = useState<string>('');
  const [creditLedgerId, setCreditLedgerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'CREDIT'>('BANK');
  const [bankName, setBankName] = useState<string>('');
  const [chequeOrUtrNo, setChequeOrUtrNo] = useState<string>('');

  // Invoice Items for Sales / Purchase
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');

  // Status message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVoucherType(initialType);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDefaultAccountsForType(initialType);
    }
  }, [isOpen, initialType]);

  const setDefaultAccountsForType = (type: VoucherType) => {
    const cashLedger = ledgers.find(l => l.group === 'CASH')?.id || '';
    const bankLedger = ledgers.find(l => l.group === 'BANK')?.id || '';
    const salesLedger = ledgers.find(l => l.id === 'led_sales' || l.group === 'DIRECT_INCOME')?.id || '';
    const purchaseLedger = ledgers.find(l => l.id === 'led_purchase' || l.group === 'DIRECT_EXPENSE')?.id || '';
    const debtorLedger = ledgers.find(l => l.group === 'SUNDRY_DEBTOR')?.id || '';
    const creditorLedger = ledgers.find(l => l.group === 'SUNDRY_CREDITOR')?.id || '';
    const expenseLedger = ledgers.find(l => l.group === 'INDIRECT_EXPENSE')?.id || '';

    switch (type) {
      case 'CONTRA':
        setDebitLedgerId(bankLedger);
        setCreditLedgerId(cashLedger);
        setPaymentMode('BANK');
        setNarration('Being cash deposited into bank account');
        break;
      case 'PAYMENT':
        setDebitLedgerId(defaultDebitId || expenseLedger || creditorLedger);
        setCreditLedgerId(defaultCreditId || bankLedger);
        setPaymentMode('BANK');
        setNarration('Being payment cleared towards business expense');
        break;
      case 'RECEIPT':
        setDebitLedgerId(defaultDebitId || bankLedger);
        setCreditLedgerId(defaultCreditId || debtorLedger || salesLedger);
        setPaymentMode('BANK');
        setNarration('Being payment received from customer / client');
        break;
      case 'SALES':
        setDebitLedgerId(defaultDebitId || debtorLedger || cashLedger);
        setCreditLedgerId(salesLedger);
        setPaymentMode('CREDIT');
        setNarration('Being goods sold on tax invoice');
        break;
      case 'PURCHASE':
        setDebitLedgerId(purchaseLedger);
        setCreditLedgerId(defaultCreditId || creditorLedger || bankLedger);
        setPaymentMode('CREDIT');
        setNarration('Being inventory purchased from vendor');
        break;
      case 'JOURNAL':
        setDebitLedgerId('');
        setCreditLedgerId('');
        setPaymentMode('CREDIT');
        setNarration('Being general adjustment entry recorded');
        break;
    }
  };

  const handleTypeChange = (type: VoucherType) => {
    setVoucherType(type);
    setDefaultAccountsForType(type);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemRate || Number(newItemRate) <= 0) {
      return;
    }
    const qty = Math.max(1, Number(newItemQty) || 1);
    const rate = Number(newItemRate);
    const itemTotal = qty * rate;

    const item: InvoiceItem = {
      id: `it_${Date.now()}`,
      itemName: newItemName.trim(),
      quantity: qty,
      rate,
      unit: 'nos',
      amount: itemTotal,
    };

    const updatedItems = [...items, item];
    setItems(updatedItems);

    const totalFromItems = updatedItems.reduce((sum, it) => sum + it.amount, 0);
    setAmount(totalFromItems.toString());

    setNewItemName('');
    setNewItemQty('1');
    setNewItemRate('');
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    if (updated.length > 0) {
      const totalFromItems = updated.reduce((sum, it) => sum + it.amount, 0);
      setAmount(totalFromItems.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid transaction amount greater than 0.');
      return;
    }

    if (!debitLedgerId) {
      setErrorMsg('Please select a Debit (Dr) account ledger.');
      return;
    }

    if (!creditLedgerId) {
      setErrorMsg('Please select a Credit (Cr) account ledger.');
      return;
    }

    if (debitLedgerId === creditLedgerId) {
      setErrorMsg('Debit and Credit ledgers cannot be identical.');
      return;
    }

    let category: 'CASH' | 'BANK' | 'PURCHASE' | 'SALE' | 'GENERAL' = 'GENERAL';
    const drLedger = ledgers.find(l => l.id === debitLedgerId);
    const crLedger = ledgers.find(l => l.id === creditLedgerId);

    if (voucherType === 'PURCHASE') {
      category = 'PURCHASE';
    } else if (voucherType === 'SALES') {
      category = 'SALE';
    } else if (drLedger?.group === 'CASH' || crLedger?.group === 'CASH') {
      category = 'CASH';
    } else if (drLedger?.group === 'BANK' || crLedger?.group === 'BANK') {
      category = 'BANK';
    }

    addVoucher({
      voucherType,
      date,
      debitLedgerId,
      creditLedgerId,
      amount: parsedAmount,
      narration: narration || `Being ${voucherType.toLowerCase()} transaction posted`,
      referenceNo: referenceNo.trim() || undefined,
      paymentMode,
      bankName: paymentMode === 'BANK' ? bankName : undefined,
      chequeOrUtrNo: paymentMode === 'BANK' ? chequeOrUtrNo : undefined,
      items: items.length > 0 ? items : undefined,
      category,
    });

    setSuccessMsg(`Voucher recorded successfully into ${category} register!`);
    setTimeout(() => {
      onClose();
      setAmount('');
      setItems([]);
      setReferenceNo('');
      setChequeOrUtrNo('');
    }, 800);
  };

  if (!isOpen) return null;

  const isClassic = company.theme === 'classic';
  const debitBal = debitLedgerId ? getLedgerBalance(debitLedgerId) : null;
  const creditBal = creditLedgerId ? getLedgerBalance(creditLedgerId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden text-xs my-6 ${
          isClassic
            ? 'bg-[#002222] border-[#0c5c5c] text-slate-100 font-mono'
            : 'bg-white border-slate-200 text-slate-800 font-sans'
        }`}
      >
        {/* Header with Voucher Function Tabs */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
            isClassic ? 'bg-[#001717] border-[#0c5c5c]' : 'bg-[#003366] text-white border-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded font-black text-xs uppercase shadow-sm ${
              isClassic ? 'bg-amber-400 text-black' : 'bg-white text-blue-900'
            }`}>
              {voucherType} ENTRY
            </span>
            <span className={isClassic ? 'text-slate-400 text-xs' : 'text-blue-100 text-xs'}>
              Voucher Session
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {(['CONTRA', 'PAYMENT', 'RECEIPT', 'SALES', 'PURCHASE', 'JOURNAL'] as VoucherType[]).map(
              (type) => {
                const keyLabelMap: Record<VoucherType, string> = {
                  CONTRA: 'F4 Contra',
                  PAYMENT: 'F5 Payment',
                  RECEIPT: 'F6 Receipt',
                  JOURNAL: 'F7 Journal',
                  SALES: 'F8 Sales',
                  PURCHASE: 'F9 Purchase',
                };
                const isSelected = voucherType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-tight transition-all ${
                      isSelected
                        ? isClassic ? 'bg-amber-400 text-black' : 'bg-blue-500 text-white shadow'
                        : isClassic ? 'bg-white/5 text-slate-300' : 'bg-white/10 hover:bg-white/20 text-blue-100'
                    }`}
                  >
                    {keyLabelMap[type]}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Date, Reference, Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold text-xs">
                Voucher Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold text-xs">
                Invoice / Reference No.
              </label>
              <input
                type="text"
                placeholder={voucherType === 'SALES' ? 'INV-001' : voucherType === 'PURCHASE' ? 'BILL-901' : 'REF-123'}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold text-xs">
                Settlement Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              >
                <option value="BANK">Bank / Online / Cheque</option>
                <option value="CASH">Cash in Hand</option>
                <option value="CREDIT">Credit (On Account)</option>
              </select>
            </div>
          </div>

          {/* Double Entry Particulars Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              Double-Entry Accounting Particulars
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debit Side (Dr) */}
              <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      By / Dr
                    </span>
                    <span>Debit Account</span>
                  </label>
                  {debitBal && (
                    <span className="text-[11px] text-emerald-800 font-mono">
                      Current: <strong>{debitBal.formatted}</strong>
                    </span>
                  )}
                </div>

                <select
                  required
                  value={debitLedgerId}
                  onChange={(e) => setDebitLedgerId(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 shadow-xs"
                >
                  <option value="">-- Select Debit Ledger --</option>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.group.replace('_', ' ')}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Credit Side (Cr) */}
              <div className="p-3.5 bg-rose-50/50 rounded-lg border border-rose-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-rose-800 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                      To / Cr
                    </span>
                    <span>Credit Account</span>
                  </label>
                  {creditBal && (
                    <span className="text-[11px] text-rose-800 font-mono">
                      Current: <strong>{creditBal.formatted}</strong>
                    </span>
                  )}
                </div>

                <select
                  required
                  value={creditLedgerId}
                  onChange={(e) => setCreditLedgerId(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-rose-600 shadow-xs"
                >
                  <option value="">-- Select Credit Ledger --</option>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.group.replace('_', ' ')}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bank details */}
          {paymentMode === 'BANK' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
              <div>
                <label className="block text-blue-900 mb-1 font-semibold text-xs">
                  Bank Name / Account
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Current A/c"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-blue-900 mb-1 font-semibold text-xs">
                  Cheque / NEFT / UTR No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR88291040"
                  value={chequeOrUtrNo}
                  onChange={(e) => setChequeOrUtrNo(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Itemized Table (Purchase/Sales) */}
          {(voucherType === 'SALES' || voucherType === 'PURCHASE') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-blue-800">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Itemized Stock Breakdown
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Items auto-sum into voucher amount
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Item Name / Description"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="col-span-5 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  className="col-span-3 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {items.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="py-1.5 px-3">Item</th>
                        <th className="py-1.5 px-3 text-right">Qty</th>
                        <th className="py-1.5 px-3 text-right">Rate</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                        <th className="py-1.5 px-3 text-center w-8">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-1.5 px-3 text-slate-800 font-medium">{it.itemName}</td>
                          <td className="py-1.5 px-3 text-right text-slate-600">{it.quantity}</td>
                          <td className="py-1.5 px-3 text-right text-slate-600">{it.rate.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-blue-700">
                            {it.amount.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Amount & Narration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-slate-800 mb-1 font-bold text-blue-900">
                Total Amount ({company.currencySymbol})
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border-2 border-blue-600 rounded-lg px-3 py-1.5 text-base font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 mb-1 font-semibold text-xs">
                Narration / Remarks
              </label>
              <input
                type="text"
                placeholder="Being..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
            <span className="text-[11px] text-slate-500">
              Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">Esc</kbd> to cancel
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel (Esc)
              </button>

              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Accept & Save Voucher
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
