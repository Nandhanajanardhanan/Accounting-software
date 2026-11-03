import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Sliders,
  Printer,
} from 'lucide-react';

export const SavingsPage: React.FC = () => {
  const {
    company,
    savingsConfig,
    updateSavingsConfig,
    calculatePnL,
    getCashBook,
    calculateBalanceSheet,
  } = useAccounting();

  const pnl = calculatePnL();
  const cashBook = getCashBook();
  const balanceSheet = calculateBalanceSheet();

  // Income calculations
  const grossSales = pnl.salesRevenue;
  const directServices = pnl.directIncome;
  const otherIncome = pnl.indirectIncome;
  const totalGrossIncome = grossSales + directServices + otherIncome;

  const totalCOGS = pnl.cogs;
  const overheadExpenses = pnl.indirectExpenses;
  const totalCompanyOutflow = totalCOGS + overheadExpenses;

  const netOperatingProfit = Math.max(0, pnl.netProfit - pnl.netLoss);
  const liquidCashBankSavings = cashBook.closingBalance + balanceSheet.assets.bankBalances;

  // Savings Allocation Buckets
  const emergencyAmount = (netOperatingProfit * savingsConfig.emergencyReservePct) / 100;
  const taxBufferAmount = (netOperatingProfit * savingsConfig.taxBufferPct) / 100;
  const expansionAmount = (netOperatingProfit * savingsConfig.expansionReservePct) / 100;
  const generalSavingsAmount = (netOperatingProfit * savingsConfig.generalSavingsPct) / 100;

  // Monthly burn rate & runway
  const monthlyBurn = Math.max(1000, savingsConfig.monthlyBurnRateEstimate);
  const runwayMonths = (liquidCashBankSavings / monthlyBurn).toFixed(1);
  const runwayNumber = parseFloat(runwayMonths);

  // Future savings projections with compound interest: A = P(1 + r/n)^(nt)
  const annualRate = (savingsConfig.annualReturnRatePct || 7) / 100;
  const calculateCompoundSavings = (years: number) => {
    // Principal = current liquid savings
    // Monthly addition = estimated monthly net savings (netOperatingProfit / 12)
    const monthlyAddition = netOperatingProfit / 12;
    let balance = liquidCashBankSavings;
    for (let month = 1; month <= years * 12; month++) {
      balance = balance * (1 + annualRate / 12) + monthlyAddition;
    }
    return Math.round(balance);
  };

  const projection1Yr = calculateCompoundSavings(1);
  const projection3Yr = calculateCompoundSavings(3);
  const projection5Yr = calculateCompoundSavings(5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-yellow-950/80 text-yellow-400 border border-yellow-800">
            <PiggyBank className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Company Income Calculation & Corporate Savings Engine
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-900/60 text-yellow-300 border border-yellow-700">
                Route: /savings
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Corporate cash flow, profit retention, reserve buckets, and runway simulator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Gross Income */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Total Gross Income</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-300 mt-2">
            {company.currencySymbol} {totalGrossIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Sales + Services + Incomes</span>
        </div>

        {/* Total Cost Outflow */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Total Expenditures</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-300 mt-2">
            {company.currencySymbol} {totalCompanyOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">COGS + Operational Overhead</span>
        </div>

        {/* Net Profit / Operating Savings */}
        <div className="p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-lg">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] uppercase font-bold">Net Corporate Surplus</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-2">
            {company.currencySymbol} {netOperatingProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400">
            {totalGrossIncome > 0 ? ((netOperatingProfit / totalGrossIncome) * 100).toFixed(1) : 0}% Net Savings Margin
          </span>
        </div>

        {/* Current Total Liquid Savings */}
        <div className="p-4 bg-yellow-950/40 border border-yellow-900/60 rounded-lg">
          <div className="flex items-center justify-between text-yellow-300">
            <span className="text-[10px] uppercase font-bold">Liquid Treasury Reserves</span>
            <PiggyBank className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-yellow-300 mt-2">
            {company.currencySymbol} {liquidCashBankSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-yellow-200">
            Cash ({company.currencySymbol}{cashBook.closingBalance.toLocaleString('en-IN')}) + Bank ({company.currencySymbol}{balanceSheet.assets.bankBalances.toLocaleString('en-IN')})
          </span>
        </div>
      </div>

      {/* Corporate Financial Runway & Liquidity Buffer */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Company Survival Runway & Liquidity Assessment
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Monthly Burn Rate:</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-300">{company.currencySymbol}</span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={savingsConfig.monthlyBurnRateEstimate}
                onChange={(e) =>
                  updateSavingsConfig({ monthlyBurnRateEstimate: Math.max(1000, Number(e.target.value)) })
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="text-slate-400 text-[10px]">/mo</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Estimated Runway:</span>
            <div className="text-2xl font-bold flex items-baseline gap-2">
              <span
                className={
                  runwayNumber >= 6
                    ? 'text-emerald-400'
                    : runwayNumber >= 3
                    ? 'text-yellow-400'
                    : 'text-rose-400'
                }
              >
                {runwayMonths} Months
              </span>
              <span className="text-[11px] text-slate-400">without zero new revenue</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Runway Health Meter</span>
              <span
                className={`font-bold ${
                  runwayNumber >= 6
                    ? 'text-emerald-400'
                    : runwayNumber >= 3
                    ? 'text-yellow-400'
                    : 'text-rose-400'
                }`}
              >
                {runwayNumber >= 6 ? '✓ Safe (> 6 Months)' : runwayNumber >= 3 ? '⚠ Moderate (3-6 Months)' : 'Critical Alert (< 3 Months)'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  runwayNumber >= 6 ? 'bg-emerald-500' : runwayNumber >= 3 ? 'bg-yellow-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (runwayNumber / 12) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Savings Buckets Allocation Session */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Allocation Buckets Configuration */}
        <div className="border border-slate-800 rounded-lg p-5 bg-slate-950/70 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                Company Savings Allocation Buckets
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Total 100% of Net Surplus
            </span>
          </div>

          <div className="space-y-4">
            {/* 1. Emergency Reserve */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">1. Emergency Liquidity Reserve</span>
                <span className="font-bold text-emerald-400">
                  {savingsConfig.emergencyReservePct}% ({company.currencySymbol} {emergencyAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={savingsConfig.emergencyReservePct}
                onChange={(e) => updateSavingsConfig({ emergencyReservePct: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Covers unexpected client defaults, cash flow delays, and emergencies.
              </span>
            </div>

            {/* 2. Tax Provision Buffer */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">2. Corporate Tax Provision Buffer</span>
                <span className="font-bold text-sky-400">
                  {savingsConfig.taxBufferPct}% ({company.currencySymbol} {taxBufferAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={savingsConfig.taxBufferPct}
                onChange={(e) => updateSavingsConfig({ taxBufferPct: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Safeguards funds for advance income tax, GST reconciliations, and audit fees.
              </span>
            </div>

            {/* 3. Capital Expansion & Equipment */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">3. Capital Reinvestment & R&D</span>
                <span className="font-bold text-orange-400">
                  {savingsConfig.expansionReservePct}% ({company.currencySymbol} {expansionAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={savingsConfig.expansionReservePct}
                onChange={(e) => updateSavingsConfig({ expansionReservePct: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Dedicated for buying new computers, machinery, and business scaling.
              </span>
            </div>

            {/* 4. General Company Surplus / Retained Earnings */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">4. General Corporate Surplus (Retained)</span>
                <span className="font-bold text-yellow-400">
                  {savingsConfig.generalSavingsPct}% ({company.currencySymbol} {generalSavingsAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={savingsConfig.generalSavingsPct}
                onChange={(e) => updateSavingsConfig({ generalSavingsPct: Number(e.target.value) })}
                className="w-full accent-yellow-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Deposited in high-yield corporate fixed deposits or treasury accounts.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Compound Interest & Growth Simulator */}
        <div className="border border-slate-800 rounded-lg p-5 bg-slate-950/70 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-yellow-400" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                Corporate Treasury Growth Projections
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Est. Yield:</span>
              <input
                type="number"
                min="1"
                max="15"
                step="0.5"
                value={savingsConfig.annualReturnRatePct}
                onChange={(e) => updateSavingsConfig({ annualReturnRatePct: Number(e.target.value) })}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-300 font-bold focus:outline-none"
              />
              <span className="text-slate-400 text-[11px]">% p.a.</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Simulated treasury growth compounding starting from current liquid balances ({company.currencySymbol}{liquidCashBankSavings.toLocaleString('en-IN')}) plus ongoing surplus additions:
          </p>

          <div className="space-y-3 pt-2">
            {/* 1 Year Projection */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-300">1 Year Projected Balance</span>
                <div className="text-[10px] text-slate-500">12 Months Compounding</div>
              </div>
              <div className="text-base font-bold text-emerald-300">
                {company.currencySymbol} {projection1Yr.toLocaleString('en-IN')}
              </div>
            </div>

            {/* 3 Years Projection */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-300">3 Years Projected Balance</span>
                <div className="text-[10px] text-slate-500">36 Months Compounding</div>
              </div>
              <div className="text-base font-bold text-cyan-300">
                {company.currencySymbol} {projection3Yr.toLocaleString('en-IN')}
              </div>
            </div>

            {/* 5 Years Projection */}
            <div className="p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-yellow-300">5 Years Corporate Wealth Accumulation</span>
                <div className="text-[10px] text-yellow-500">60 Months Compounding with Retained Earnings</div>
              </div>
              <div className="text-lg font-bold text-yellow-300">
                {company.currencySymbol} {projection5Yr.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Quick Action note */}
          <div className="p-3 bg-black/40 border border-white/5 rounded text-[11px] text-slate-400">
            💡 <strong className="text-slate-200">Recommendation:</strong> Maintain at least 6 months of operating burn rate ({company.currencySymbol}{(monthlyBurn * 6).toLocaleString('en-IN')}) in liquid bank accounts before declaring dividends or capital investments.
          </div>
        </div>
      </div>
    </div>
  );
};
