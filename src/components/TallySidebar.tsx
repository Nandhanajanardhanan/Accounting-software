import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import type { VoucherType } from '../types/accounting';

interface TallySidebarProps {
  onOpenVoucher: (type: VoucherType) => void;
}

export const TallySidebar: React.FC<TallySidebarProps> = ({ onOpenVoucher }) => {
  const navigate = useNavigate();
  const { company } = useAccounting();
  const isClassic = company.theme === 'classic';

  // Global Keyboard Listener for Tally Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent standard browser key behavior for F4-F9
      if (['F4', 'F5', 'F6', 'F7', 'F8', 'F9'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'F4':
          onOpenVoucher('CONTRA');
          break;
        case 'F5':
          onOpenVoucher('PAYMENT');
          break;
        case 'F6':
          onOpenVoucher('RECEIPT');
          break;
        case 'F7':
          onOpenVoucher('JOURNAL');
          break;
        case 'F8':
          onOpenVoucher('SALES');
          break;
        case 'F9':
          onOpenVoucher('PURCHASE');
          break;
        case 'Escape':
          navigate('/');
          break;
        default:
          break;
      }

      // Alt shortcuts
      if (e.altKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          navigate('/savings');
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          navigate('/pnl');
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          navigate('/balance-sheet');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenVoucher, navigate]);

  const buttons = [
    { key: 'F4', label: 'Contra', desc: 'Bank/Cash', action: () => onOpenVoucher('CONTRA'), color: 'text-amber-600' },
    { key: 'F5', label: 'Payment', desc: 'Expenses', action: () => onOpenVoucher('PAYMENT'), color: 'text-rose-600' },
    { key: 'F6', label: 'Receipt', desc: 'Incomes', action: () => onOpenVoucher('RECEIPT'), color: 'text-emerald-600' },
    { key: 'F7', label: 'Journal', desc: 'Adjust', action: () => onOpenVoucher('JOURNAL'), color: 'text-purple-600' },
    { key: 'F8', label: 'Sales', desc: 'Billing', action: () => onOpenVoucher('SALES'), color: 'text-blue-600' },
    { key: 'F9', label: 'Purchase', desc: 'Inward', action: () => onOpenVoucher('PURCHASE'), color: 'text-orange-600' },
    { key: 'Alt+S', label: 'Savings', desc: 'Surplus', action: () => navigate('/savings'), color: 'text-indigo-600' },
    { key: 'Alt+P', label: 'P & L', desc: 'Account', action: () => navigate('/pnl'), color: 'text-sky-600' },
    { key: 'Alt+B', label: 'B/Sheet', desc: 'Capital', action: () => navigate('/balance-sheet'), color: 'text-teal-600' },
    { key: 'Esc', label: 'Gateway', desc: 'Home', action: () => navigate('/'), color: 'text-slate-600' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col w-28 shrink-0 border-l select-none font-mono text-xs shadow-xs ${
        isClassic
          ? 'bg-[#002626] border-[#0c4e4e]'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      <div className={`py-2.5 text-center text-[10px] font-bold uppercase tracking-wider border-b ${
        isClassic ? 'text-slate-400 border-white/10' : 'text-blue-900 bg-blue-50/70 border-slate-200'
      }`}>
        Tally Keys
      </div>

      <div className={`flex-1 flex flex-col divide-y overflow-y-auto ${
        isClassic ? 'divide-white/10' : 'divide-slate-100'
      }`}>
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={btn.action}
            className={`w-full py-2.5 px-2 flex flex-col items-center justify-center transition-all text-left group ${
              isClassic
                ? 'hover:bg-[#073f3f] active:bg-[#0b4f4f]'
                : 'hover:bg-blue-50/80 active:bg-blue-100 text-slate-800'
            }`}
          >
            <span className={`font-bold text-xs tracking-tight ${btn.color} group-hover:scale-105 transition-transform`}>
              {btn.key}
            </span>
            <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
              {btn.label}
            </span>
            <span className="text-[9px] text-slate-400 group-hover:text-slate-600 transition-colors">
              {btn.desc}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};
