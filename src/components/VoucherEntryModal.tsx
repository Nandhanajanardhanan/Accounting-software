import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { VoucherType, InvoiceItem } from '../types/accounting';
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

  // Sync initial type when opened
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

  // Add item to invoice table
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

    // Auto-calculate total amount from items
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

    // Determine category
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
      // Reset form
      setAmount('');
      setItems([]);
      setReferenceNo('');
      setChequeOrUtrNo('');
    }, 900);
  };

  if (!isOpen) return null;

  const isClassic = company.theme === 'classic';
  const debitBal = debitLedgerId ? getLedgerBalance(debitLedgerId) : null;
  const creditBal = creditLedgerId ? getLedgerBalance(creditLedgerId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-y-auto">
      <div
        className={`w-full max-w-3xl rounded-lg border shadow-2xl overflow-hidden font-mono text-xs my-6 ${
          isClassic
            ? 'bg-[#002222] border-[#0c5c5c] text-slate-100'
            : 'bg-[#00223a] border-[#0f5485] text-slate-100'
        }`}
      >
        {/* Header with Voucher Function Tabs */}
        <div
          className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
            isClassic ? 'bg-[#001717] border-[#0c5c5c]' : 'bg-[#001a2e] border-[#0f5485]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-black text-xs uppercase">
              {voucherType} ENTRY
            </span>
            <span className="text-slate-400 text-xs">Accounting Voucher Session</span>
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
                        ? 'bg-amber-400 text-black shadow'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-700 text-rose-200 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Date, Reference, Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Voucher Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Invoice / Reference No.
              </label>
              <input
                type="text"
                placeholder={voucherType === 'SALES' ? 'INV-001' : voucherType === 'PURCHASE' ? 'BILL-901' : 'REF-123'}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Settlement Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="BANK">Bank / Online / Cheque</option>
                <option value="CASH">Cash in Hand</option>
                <option value="CREDIT">Credit (On Account)</option>
              </select>
            </div>
          </div>

          {/* Double Entry Ledgers Selection */}
          <div className="p-3.5 bg-black/30 border border-white/10 rounded-lg space-y-3">
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Double-Entry Accounting Particulars
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debit Side (Dr) */}
              <div className="p-3 bg-slate-900/90 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      By / Dr
                    </span>
                    <span>Debit Account</span>
                  </label>
                  {debitBal && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Current: <strong className="text-slate-200">{debitBal.formatted}</strong>
                    </span>
                  )}
                </div>

                <select
                  required
                  value={debitLedgerId}
                  onChange={(e) => setDebitLedgerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
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
              <div className="p-3 bg-slate-900/90 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-rose-400 flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                      To / Cr
                    </span>
                    <span>Credit Account</span>
                  </label>
                  {creditBal && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Current: <strong className="text-slate-200">{creditBal.formatted}</strong>
                    </span>
                  )}
                </div>

                <select
                  required
                  value={creditLedgerId}
                  onChange={(e) => setCreditLedgerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
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

          {/* Bank Specific Details */}
          {paymentMode === 'BANK' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sky-950/30 border border-sky-800/60 rounded">
              <div>
                <label className="block text-sky-200 mb-1 font-semibold text-[11px]">
                  Bank Name / Instrument
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank A/c / SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-sky-200 mb-1 font-semibold text-[11px]">
                  Cheque / NEFT / UTR Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR88291040"
                  value={chequeOrUtrNo}
                  onChange={(e) => setChequeOrUtrNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Itemized Table (for Purchase & Sales) */}
          {(voucherType === 'SALES' || voucherType === 'PURCHASE') && (
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <FileText className="w-3.5 h-3.5" />
                  Itemized Stock / Invoice Breakdown (Optional)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Items auto-sum into voucher amount
                </span>
              </div>

              {/* Add item inputs */}
              <div className="grid grid-cols-12 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Item Name / Description"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="col-span-5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  className="col-span-3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="col-span-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="mt-2 border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="py-1 px-2">Item</th>
                        <th className="py-1 px-2 text-right">Qty</th>
                        <th className="py-1 px-2 text-right">Rate</th>
                        <th className="py-1 px-2 text-right">Amount</th>
                        <th className="py-1 px-2 text-center w-8">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-900/40">
                          <td className="py-1 px-2 text-slate-200">{it.itemName}</td>
                          <td className="py-1 px-2 text-right">{it.quantity}</td>
                          <td className="py-1 px-2 text-right">{it.rate.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-bold text-amber-300">
                            {it.amount.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3 h-3 mx-auto" />
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

          {/* Amount and Narration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-slate-300 mb-1 font-bold text-amber-400">
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
                className="w-full bg-slate-950 border-2 border-amber-400 rounded px-3 py-1.5 text-base font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 mb-1 font-semibold">
                Narration / Remarks
              </label>
              <input
                type="text"
                placeholder="Being..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
            <span className="text-[11px] text-slate-400">
              Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Esc</kbd> to cancel
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel (Esc)
              </button>

              <button
                type="submit"
                className="px-5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg transition-transform active:scale-95"
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
