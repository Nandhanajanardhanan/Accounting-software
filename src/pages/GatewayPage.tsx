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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Cash in Hand */}
        <Link
          to="/cash"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400 font-mono text-white'
              : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-emerald-700">
            {company.currencySymbol} {cashBook.closingBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Active Till Cash</span>
        </Link>

        {/* Bank Balances */}
        <Link
          to="/bank"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400 font-mono text-white'
              : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Bank Balance</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-blue-700">
            {company.currencySymbol} {balanceSheet.assets.bankBalances.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">HDFC & SBI Accounts</span>
        </Link>

        {/* Total Purchases */}
        <Link
          to="/purchase"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400 font-mono text-white'
              : 'bg-white border-slate-200 hover:border-orange-400 hover:shadow-md text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Purchases</span>
            <ShoppingCart className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-orange-700">
            {company.currencySymbol} {pnl.purchases.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Inward Supplies</span>
        </Link>

        {/* Total Sales */}
        <Link
          to="/sale"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400 font-mono text-white'
              : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sales Revenue</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-indigo-700">
            {company.currencySymbol} {pnl.salesRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Total Invoiced</span>
        </Link>

        {/* Net Profit */}
        <Link
          to="/pnl"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-amber-400 font-mono text-white'
              : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-emerald-700">
            {company.currencySymbol} {netProfit.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">P&L Operating Surplus</span>
        </Link>

        {/* Company Savings / Reserves */}
        <Link
          to="/savings"
          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
            isClassic
              ? 'bg-[#002626] border-[#0c4e4e] hover:border-yellow-300 ring-1 ring-amber-400/30 font-mono text-white'
              : 'bg-blue-50/80 border-blue-200 hover:border-blue-500 hover:shadow-md text-blue-900 ring-1 ring-blue-300/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Savings</span>
            <PiggyBank className="w-4 h-4 text-blue-600 animate-bounce" />
          </div>
          <div className="mt-2 text-base md:text-lg font-bold font-mono text-blue-900">
            {company.currencySymbol} {totalLiquidSavings.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700 font-bold">{runwayMonths} mo. runway</span>
        </Link>
      </div>

      {/* Main Gateway of Tally Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Company Financial Status & Quick Vouchers */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-5 rounded-xl border shadow-xs ${
              isClassic ? 'bg-[#002222] border-[#0c4e4e] text-white font-mono' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Current Company Status
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                isClassic ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Active Books
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Company Name:</span>
                <span className="font-bold text-slate-900 uppercase text-right">{company.companyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Financial Period:</span>
                <span className="text-blue-800 font-mono font-semibold">{company.financialYearStart} to {company.financialYearEnd}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Accounting Date:</span>
                <span className="text-emerald-700 font-mono font-bold">{company.currentAccountingDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Active Ledgers:</span>
                <span className="font-bold text-slate-800 font-mono">{ledgers.length} Accounts</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Vouchers Posted:</span>
                <span className="font-bold text-slate-800 font-mono">{vouchers.length} Entries</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Balance Sheet Status:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1 font-mono">
                  {balanceSheet.isBalanced ? '✓ In Equilibrium' : 'Difference Detected'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Transaction Action Session Card */}
          <div
            className={`p-5 rounded-xl border shadow-xs ${
              isClassic ? 'bg-[#002a2a] border-[#0d5959] text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Quick Voucher Entry Desk
              </span>
              <span className="text-[10px] text-slate-400 font-mono">F4 - F9</span>
            </div>
            <p className="text-xs text-slate-500 mb-3.5">
              Directly input accounting vouchers for cash book, bank, purchase, or sale.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onOpenVoucher('PAYMENT')}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg font-semibold text-left transition-all shadow-2xs"
              >
                <div className="text-[10px] text-rose-600 font-mono font-bold">F5</div>
                Payment Voucher
              </button>
              <button
                onClick={() => onOpenVoucher('RECEIPT')}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-left transition-all shadow-2xs"
              >
                <div className="text-[10px] text-emerald-600 font-mono font-bold">F6</div>
                Receipt Voucher
              </button>
              <button
                onClick={() => onOpenVoucher('SALES')}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg font-semibold text-left transition-all shadow-2xs"
              >
                <div className="text-[10px] text-blue-600 font-mono font-bold">F8</div>
                Sales Invoice
              </button>
              <button
                onClick={() => onOpenVoucher('PURCHASE')}
                className="px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-lg font-semibold text-left transition-all shadow-2xs"
              >
                <div className="text-[10px] text-orange-600 font-mono font-bold">F9</div>
                Purchase Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: The Iconic Gateway of Tally Menu in White & Blue */}
        <div className="lg:col-span-7">
          <div
            className={`border rounded-xl shadow-md overflow-hidden ${
              isClassic
                ? 'bg-[#001d1d] border-[#0e6161] font-mono text-white'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Tally Menu Header */}
            <div
              className={`py-3 px-5 text-center font-bold uppercase tracking-wider text-xs border-b ${
                isClassic
                  ? 'bg-[#002f2f] text-amber-300 border-[#0e6161]'
                  : 'bg-[#003366] text-white border-blue-900 shadow-sm'
              }`}
            >
              Gateway of Tally
            </div>

            {/* Menu Items Loop */}
            <div className="p-5 space-y-4">
              {menuSections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 font-mono">
                    {sec.title}
                  </div>

                  <div className="space-y-1">
                    {sec.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`group px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs transition-all border ${
                          item.highlight
                            ? isClassic
                              ? 'bg-amber-950/40 border-amber-600 text-amber-200 hover:bg-amber-900/60'
                              : 'bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/70 shadow-2xs font-semibold'
                            : isClassic
                            ? 'bg-[#002828] border-transparent hover:border-[#0e6161] hover:bg-[#003838] text-slate-200'
                            : 'bg-slate-50/60 border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] font-mono transition-colors ${
                            isClassic
                              ? 'bg-black/40 text-amber-300 group-hover:bg-amber-400 group-hover:text-black'
                              : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                          }`}>
                            {item.hotkey}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {item.label}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Educational Hint */}
            <div className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] ${
              isClassic ? 'border-white/10 bg-black/30 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500 font-mono'
            }`}>
              <span>Use hotkeys for instant navigation</span>
              <span className="text-blue-700 font-bold">Press F4 - F9 anytime for Vouchers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
