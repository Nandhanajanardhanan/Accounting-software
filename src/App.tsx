import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { TallyHeader } from './components/TallyHeader';
import { TallySidebar } from './components/TallySidebar';
import { VoucherEntryModal } from './components/VoucherEntryModal';
import { GatewayPage } from './pages/GatewayPage';
import { CashBookPage } from './pages/CashBookPage';
import { BankBookPage } from './pages/BankBookPage';
import { PurchasePage } from './pages/PurchasePage';
import { SalePage } from './pages/SalePage';
import { PnLPage } from './pages/PnLPage';
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { SavingsPage } from './pages/SavingsPage';
import { VoucherSessionPage } from './pages/VoucherSessionPage';
import { LedgersPage } from './pages/LedgersPage';
import { TrialBalancePage } from './pages/TrialBalancePage';
import { VoucherType } from './types/accounting';

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
      className={`min-h-screen flex flex-col font-mono selection:bg-amber-400 selection:text-black transition-colors duration-200 ${
        isClassic ? 'bg-[#001717] text-[#d6ded1]' : 'bg-[#041624] text-slate-100'
      }`}
    >
      {/* Top Tally Header */}
      <TallyHeader onOpenVoucherModal={handleOpenVoucherModal} />

      {/* Main Workspace with Right-Hand Shortcut Function Bar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Routed Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<GatewayPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/cash" element={<CashBookPage onOpenVoucher={handleOpenVoucherModal} />} />
            <Route path="/bank" element={<BankBookPage onOpenVoucher={handleOpenVoucherModal} />} />
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

        {/* Iconic Tally Function Keys Bar on Right */}
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

      {/* Bottom Status Ticker */}
      <footer
        className={`px-3 py-1 text-[11px] border-t flex flex-wrap items-center justify-between select-none ${
          isClassic
            ? 'bg-[#001111] border-[#0c4e4e] text-slate-400'
            : 'bg-[#02101b] border-[#0a3556] text-slate-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-300">TallyEdu v9.2</span>
          <span>|</span>
          <span className="text-slate-300">
            Company: <strong className="text-white">{company.companyName}</strong>
          </span>
          <span>|</span>
          <span>Double-Entry Arithmetic Engine</span>
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          <span>Alt+S: Savings</span>
          <span>Alt+P: P&L</span>
          <span>Alt+B: Balance Sheet</span>
          <span>Esc: Back</span>
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
