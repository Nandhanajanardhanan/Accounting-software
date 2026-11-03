import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { TallyHeader } from './components/TallyHeader';
import { TallySidebar } from './components/TallySidebar';
import { VoucherEntryModal } from './components/VoucherEntryModal';
import { GatewayPage } from './pages/GatewayPage';
import { CashBookPage } from './pages/CashBookPage';
import { BankBookPage } from './pages/BankBookPage';
import { ContraPage } from './pages/ContraPage';
import { PurchasePage } from './pages/PurchasePage';
import { SalePage } from './pages/SalePage';
import { PnLPage } from './pages/PnLPage';
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { SavingsPage } from './pages/SavingsPage';
import { VoucherSessionPage } from './pages/VoucherSessionPage';
import { LedgersPage } from './pages/LedgersPage';
import { TrialBalancePage } from './pages/TrialBalancePage';
import type { VoucherType } from './types/accounting';

const AppLayout: React.FC = () => {
  const { company } = useAccounting();
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalType, setVoucherModalType] = useState<VoucherType>('PAYMENT');
  const [defaultDr, setDefaultDr] = useState<string | undefined>();
  const [defaultCr, setDefaultCr] = useState<string | undefined>();

  const handleOpenVoucherModal = (type: VoucherType = 'PAYMENT', dr?: string, cr?: string) => {
    setVoucherModalType(type);
    setDefaultDr(dr);
    setDefaultCr(cr);
    setIsVoucherModalOpen(true);
  };

  const isClassic = company.theme === 'classic';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
        isClassic ? 'bg-[#001717] text-[#d6ded1]' : 'bg-slate-100 text-slate-800'
      }`}
    >
      {/* Top Tally Header in White & Blue */}
      <TallyHeader onOpenVoucherModal={handleOpenVoucherModal} />

      {/* Main Workspace with Right-Hand Shortcut Function Bar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Routed Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Routes>
            <Route path="/" element={<GatewayPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/cash" element={<CashBookPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/bank" element={<BankBookPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/contra" element={<ContraPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/purchase" element={<PurchasePage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/sale" element={<SalePage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/session" element={<VoucherSessionPage />} />
            <Route path="/pnl" element={<PnLPage />} />
            <Route path="/balance-sheet" element={<BalanceSheetPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/ledgers" element={<LedgersPage />} />
            <Route path="/trial-balance" element={<TrialBalancePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Tally Function Keys Bar on Right */}
        <TallySidebar onOpenVoucher={handleOpenVoucherModal} />
      </div>

      {/* Universal Voucher Entry Modal (F4-F9) */}
      <VoucherEntryModal
        isOpen={isVoucherModalOpen}
        initialType={voucherModalType}
        defaultDebitId={defaultDr}
        defaultCreditId={defaultCr}
        onClose={() => setIsVoucherModalOpen(false)}
      />

      {/* Bottom Status Bar in White & Blue */}
      <footer
        className={`px-4 py-1.5 text-xs border-t flex flex-wrap items-center justify-between select-none ${
          isClassic
            ? 'bg-[#001111] border-[#0c4e4e] text-slate-400'
            : 'bg-white border-slate-200 text-slate-600 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-700 font-mono">TallyEdu White & Blue</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-700">
            Company: <strong className="text-blue-900 font-semibold">{company.companyName}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-medium">● Double-Entry Active</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
          <span className="hover:text-blue-600">Alt+S: Savings</span>
          <span className="hover:text-blue-600">Alt+P: P&L</span>
          <span className="hover:text-blue-600">Alt+B: Balance Sheet</span>
          <span className="hover:text-blue-600">Esc: Back</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AccountingProvider>
      <Router>
        <AppLayout />
      </Router>
    </AccountingProvider>
  );
};

export default App;
