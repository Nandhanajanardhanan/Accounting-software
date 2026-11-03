import React from 'react';
import { Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import {
  Wallet,
  Landmark,
  ShoppingCart,
  TrendingUp,
  Receipt,
  PiggyBank,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface GatewayPageProps {
  onOpenVoucher: (type: any) => void;
}

export const GatewayPage: React.FC<GatewayPageProps> = ({ onOpenVoucher }) => {
  const {
    company,
    getCashBook,
    calculatePnL,
    calculateBalanceSheet,
    savingsConfig,
    vouchers,
    ledgers,
  } = useAccounting();

  const isClassic = company.theme === 'classic';
  const cashBook = getCashBook();
  const pnl = calculatePnL();
  const balanceSheet = calculateBalanceSheet();

  // Financial summary
  const totalLiquidSavings = cashBook.closingBalance + balanceSheet.assets.bankBalances;
  const netProfit = pnl.netProfit - pnl.netLoss;
  const runwayMonths = (totalLiquidSavings / Math.max(1, savingsConfig.monthlyBurnRateEstimate)).toFixed(1);

  const menuSections = [
    {
      title: 'MASTERS',
      items: [
        { label: 'Accounts Info / Ledgers', path: '/ledgers', hotkey: 'A', desc: 'Chart of accounts & balances' },
      ],
    },
    {
      title: 'TRANSACTIONS & REGISTERS',
      items: [
        { label: 'Universal Input Session', path: '/session', hotkey: 'U', desc: 'Fast cash, bank, sales & purchase input' },
        { label: 'Cash Book', path: '/cash', hotkey: 'C', desc: 'Cash receipts, payments & till cash' },
        { label: 'Bank Book', path: '/bank', hotkey: 'B', desc: 'Deposits, cheques & bank statements' },
        { label: 'Purchase Register', path: '/purchase', hotkey: 'P', desc: 'Supplier invoices & inward bills' },
        { label: 'Sales Register', path: '/sale', hotkey: 'S', desc: 'Customer billing & revenue register' },
      ],
    },
    {
      title: 'SAVINGS & REPORTS',
      items: [
        { label: 'Income & Savings Planner', path: '/savings', hotkey: 'I', desc: 'Company income calc & surplus simulator', highlight: true },
        { label: 'Profit & Loss A/c', path: '/pnl', hotkey: 'L', desc: 'Trading & P&L horizontal statement' },
        { label: 'Balance Sheet', path: '/balance-sheet', hotkey: 'T', desc: 'Assets & Liabilities schedule' },
        { label: 'Trial Balance', path: '/trial-balance', hotkey: 'R', desc: 'Debit & Credit verification statement' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Cash in Hand */}
        <Link
          to="/cash"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400'
              : 'bg-[#0a2540] border-[#133e63] hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-emerald-300">
            {company.currencySymbol} {cashBook.closingBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Active Till Cash</span>
        </Link>

        {/* Bank Balances */}
        <Link
          to="/bank"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400'
              : 'bg-[#0a2540] border-[#133e63] hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Bank Balance</span>
            <Landmark className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-cyan-300">
            {company.currencySymbol} {balanceSheet.assets.bankBalances.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">HDFC & SBI Accounts</span>
        </Link>

        {/* Total Purchases */}
        <Link
          to="/purchase"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400'
              : 'bg-[#0a2540] border-[#133e63] hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Purchases</span>
            <ShoppingCart className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-orange-300">
            {company.currencySymbol} {pnl.purchases.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Inward Supplies</span>
        </Link>

        {/* Total Sales */}
        <Link
          to="/sale"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400'
              : 'bg-[#0a2540] border-[#133e63] hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sales Revenue</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-blue-300">
            {company.currencySymbol} {pnl.salesRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Total Billing</span>
        </Link>

        {/* Net Profit */}
        <Link
          to="/pnl"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400'
              : 'bg-[#0a2540] border-[#133e63] hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-amber-300">
            {company.currencySymbol} {netProfit.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">P&L Operating Surplus</span>
        </Link>

        {/* Company Savings / Reserves */}
        <Link
          to="/savings"
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-yellow-300 ring-1 ring-amber-400/30'
              : 'bg-[#0c2e4e] border-[#145388] hover:border-yellow-300 ring-1 ring-sky-400/30'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider text-yellow-300">Total Savings</span>
            <PiggyBank className="w-4 h-4 text-yellow-400 animate-bounce" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-yellow-300">
            {company.currencySymbol} {totalLiquidSavings.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">{runwayMonths} mo. runway</span>
        </Link>
      </div>

      {/* Main Gateway of Tally Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Company Financial Status & Book Info */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-4 rounded-lg border ${
              isClassic ? 'bg-[#002222] border-[#0c4e4e]' : 'bg-[#082036] border-[#0f446e]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Current Company Status
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                TallyEdu Active
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Company Name:</span>
                <span className="font-bold text-white uppercase text-right">{company.companyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Financial Period:</span>
                <span className="text-amber-200">{company.financialYearStart} to {company.financialYearEnd}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Accounting Date:</span>
                <span className="text-emerald-300 font-bold">{company.currentAccountingDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Total Active Ledgers:</span>
                <span className="font-bold text-slate-200">{ledgers.length} Accounts</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Total Vouchers Posted:</span>
                <span className="font-bold text-slate-200">{vouchers.length} Entries</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Balance Sheet Status:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  {balanceSheet.isBalanced ? '✓ In Equilibrium' : 'Difference Detected'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Transaction Action Session Card */}
          <div
            className={`p-4 rounded-lg border ${
              isClassic ? 'bg-[#002a2a] border-[#0d5959]' : 'bg-[#0d2c48] border-[#185381]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                Quick Voucher Input Desk
              </span>
              <span className="text-[10px] text-slate-400 font-mono">F4 - F9</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Directly input accounting vouchers for cash book, bank, purchase, or sale.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                onClick={() => onOpenVoucher('PAYMENT')}
                className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded font-semibold text-left transition-all"
              >
                <div className="text-[10px] text-rose-400">F5</div>
                Payment Voucher
              </button>
              <button
                onClick={() => onOpenVoucher('RECEIPT')}
                className="px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded font-semibold text-left transition-all"
              >
                <div className="text-[10px] text-emerald-400">F6</div>
                Receipt Voucher
              </button>
              <button
                onClick={() => onOpenVoucher('SALES')}
                className="px-3 py-2 bg-sky-950/70 hover:bg-sky-900 border border-sky-800 text-sky-200 rounded font-semibold text-left transition-all"
              >
                <div className="text-[10px] text-sky-400">F8</div>
                Sales Invoice
              </button>
              <button
                onClick={() => onOpenVoucher('PURCHASE')}
                className="px-3 py-2 bg-orange-950/70 hover:bg-orange-900 border border-orange-800 text-orange-200 rounded font-semibold text-left transition-all"
              >
                <div className="text-[10px] text-orange-400">F9</div>
                Purchase Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: The Iconic Gateway of Tally Menu */}
        <div className="lg:col-span-7">
          <div
            className={`border-2 rounded-lg shadow-2xl overflow-hidden font-mono ${
              isClassic
                ? 'bg-[#001d1d] border-[#0e6161]'
                : 'bg-[#061c2e] border-[#104b78]'
            }`}
          >
            {/* Tally Menu Header */}
            <div
              className={`py-2 px-4 text-center border-b font-bold uppercase tracking-wider text-xs ${
                isClassic
                  ? 'bg-[#002f2f] text-amber-300 border-[#0e6161]'
                  : 'bg-[#0a3152] text-cyan-200 border-[#104b78]'
              }`}
            >
              Gateway of Tally
            </div>

            {/* Menu Items Loop */}
            <div className="p-4 space-y-4">
              {menuSections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
                    {sec.title}
                  </div>

                  <div className="space-y-1">
                    {sec.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`group px-3 py-2 rounded flex items-center justify-between text-xs transition-colors border ${
                          item.highlight
                            ? isClassic
                              ? 'bg-amber-950/40 border-amber-600 text-amber-200 hover:bg-amber-900/60'
                              : 'bg-sky-950/40 border-sky-600 text-sky-200 hover:bg-sky-900/60'
                            : isClassic
                            ? 'bg-[#002828] border-transparent hover:border-[#0e6161] hover:bg-[#003838] text-slate-200'
                            : 'bg-[#08243c] border-transparent hover:border-[#135485] hover:bg-[#0c3150] text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded bg-black/40 flex items-center justify-center font-bold text-amber-300 text-[11px] group-hover:bg-amber-400 group-hover:text-black transition-colors">
                            {item.hotkey}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                              {item.label}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 transition-transform group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Educational Hint */}
            <div className="px-4 py-2 border-t border-white/10 bg-black/30 flex items-center justify-between text-[10px] text-slate-400">
              <span>Use highlighted keys for direct navigation</span>
              <span className="text-emerald-400 font-bold">Press F4 - F9 anytime for Vouchers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
