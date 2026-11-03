import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { 
  Building2, 
  Calendar, 
  RotateCcw, 
  Download, 
  Upload, 
  Palette, 
  Keyboard, 
  PlusCircle,
  PiggyBank
} from 'lucide-react';

interface TallyHeaderProps {
  onOpenVoucherModal: (type?: any) => void;
}

export const TallyHeader: React.FC<TallyHeaderProps> = ({ onOpenVoucherModal }) => {
  const { company, toggleTheme, resetToSampleData, exportBackupJson, importBackupJson } = useAccounting();
  const location = useLocation();
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const isClassic = company.theme === 'classic';

  const navLinks = [
    { path: '/', label: 'Gateway' },
    { path: '/cash', label: 'Cash Book' },
    { path: '/bank', label: 'Bank Book' },
    { path: '/purchase', label: 'Purchases' },
    { path: '/sale', label: 'Sales' },
    { path: '/session', label: 'Input Session' },
    { path: '/pnl', label: 'P&L A/c' },
    { path: '/balance-sheet', label: 'Balance Sheet' },
    { path: '/savings', label: 'Savings & Income' },
    { path: '/ledgers', label: 'Ledgers' },
  ];

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
        }, 1200);
      } else {
        setImportStatus('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    const success = importBackupJson(importText);
    if (success) {
      setImportStatus('Backup restored successfully!');
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
        setImportText('');
      }, 1200);
    } else {
      setImportStatus('Invalid JSON string format.');
    }
  };

  return (
    <>
      {/* Top Banner - Tally System Bar */}
      <header className={`w-full border-b select-none transition-colors duration-200 ${
        isClassic 
          ? 'bg-[#002626] border-[#0e5c5c] text-[#e0e7d7]' 
          : 'bg-[#002b49] border-[#0b4870] text-slate-100'
      }`}>
        {/* Topmost System Info Row */}
        <div className="px-3 py-1.5 flex flex-wrap items-center justify-between text-xs border-b border-black/20 gap-2">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 font-bold uppercase rounded text-[11px] tracking-wider ${
              isClassic ? 'bg-amber-400 text-black' : 'bg-amber-300 text-slate-900 font-black'
            }`}>
              Tally.ERP 9 / Prime
            </span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {company.isEducationalMode ? 'Educational Mode (Active)' : 'Licensed Enterprise'}
            </span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="hidden sm:inline font-mono text-slate-300">
              Tax ID: <strong className="text-amber-200">{company.gstinOrTaxId}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onOpenVoucherModal()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-all"
              title="Add New Accounting Voucher (Ctrl+V)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Voucher Entry</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-all ${
                isClassic 
                  ? 'border-emerald-600 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200' 
                  : 'border-sky-500 bg-sky-950/50 hover:bg-sky-900 text-sky-200'
              }`}
              title="Toggle between Classic Tally ERP 9 Green & Modern Tally Prime Blue"
            >
              <Palette className="w-3 h-3" />
              <span>{isClassic ? 'ERP 9 Theme' : 'Prime Theme'}</span>
            </button>

            <button
              onClick={() => setShowKeyHelp(true)}
              className="flex items-center gap-1 px-2 py-1 rounded border border-slate-600 hover:bg-slate-700/60 text-slate-200 text-[11px]"
              title="Keyboard Shortcuts Guide"
            >
              <Keyboard className="w-3 h-3" />
              <span className="hidden md:inline">Hotkeys</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={exportBackupJson}
                className="p-1 rounded hover:bg-black/30 text-slate-300 hover:text-white"
                title="Export Company Backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="p-1 rounded hover:bg-black/30 text-slate-300 hover:text-white"
                title="Restore / Import Backup"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Reset all company accounts and load clean Tally sample data?')) {
                    resetToSampleData();
                  }
                }}
                className="p-1 rounded hover:bg-rose-900/40 text-amber-300 hover:text-rose-300"
                title="Reset to Sample Company Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Company Header Row */}
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded font-bold text-lg flex items-center justify-center ${
              isClassic ? 'bg-[#043333] text-amber-300 border border-[#0d5555]' : 'bg-[#0f3d64] text-cyan-300 border border-sky-700'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-wide uppercase text-white font-mono">
                  {company.companyName}
                </h1>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Active Books
                </span>
              </div>
              <p className="text-xs text-slate-300/80 font-mono">
                {company.legalName}
              </p>
            </div>
          </div>

          {/* Current Period & Date Display (Signature Tally Block) */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className={`px-3 py-1.5 rounded border ${
              isClassic 
                ? 'bg-[#032b2b] border-[#0c4e4e] text-amber-100' 
                : 'bg-[#093252] border-[#134e7a] text-sky-100'
            }`}>
              <div className="text-[10px] uppercase text-slate-400">Current Period</div>
              <div className="font-bold text-amber-300">
                {company.financialYearStart} to {company.financialYearEnd}
              </div>
            </div>

            <div className={`px-3 py-1.5 rounded border ${
              isClassic 
                ? 'bg-[#032b2b] border-[#0c4e4e] text-amber-100' 
                : 'bg-[#093252] border-[#134e7a] text-sky-100'
            }`}>
              <div className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>Current Date</span>
              </div>
              <div className="font-bold text-emerald-300">
                {company.currentAccountingDate}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Menu / Routes */}
        <nav className={`px-3 flex items-center overflow-x-auto text-xs font-mono font-medium border-t ${
          isClassic ? 'bg-[#051c1c] border-[#0c4e4e]' : 'bg-[#071f33] border-[#0c3f66]'
        }`}>
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                  isActive
                    ? isClassic
                      ? 'border-amber-400 text-amber-300 bg-[#082929] font-bold'
                      : 'border-sky-400 text-sky-200 bg-[#0c2f4d] font-bold'
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label === 'Savings & Income' && <PiggyBank className="w-3.5 h-3.5 text-amber-400" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {showKeyHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-amber-400 font-mono">
                <Keyboard className="w-5 h-5" />
                Tally Keyboard Shortcuts
              </h3>
              <button 
                onClick={() => setShowKeyHelp(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F4</span>: Contra Voucher (Bank/Cash)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F5</span>: Payment Voucher (Expenses)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F6</span>: Receipt Voucher (Incomes)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F7</span>: Journal Voucher (Adjustments)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F8</span>: Sales Voucher (Billing)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">F9</span>: Purchase Voucher (Inward)
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">Esc</span>: Close Modal / Back
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <span className="font-bold text-amber-300">Ctrl + V</span>: Quick New Voucher
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowKeyHelp(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold text-white"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-cyan-400 font-mono">
                <Upload className="w-5 h-5" />
                Restore / Import Accounting Data
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Option A: Upload Backup JSON File</label>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleFileImport}
                  className="block w-full text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                />
              </div>

              <div className="border-t border-slate-800 pt-3">
                <label className="block text-slate-300 mb-1 font-semibold">Option B: Paste JSON Backup</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste JSON content here..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  className="mt-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded text-white text-xs font-semibold"
                >
                  Import From Text
                </button>
              </div>

              {importStatus && (
                <div className={`p-2 rounded text-xs font-bold ${
                  importStatus.includes('success') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {importStatus}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
