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
    { path: '/contra', label: 'Contra (F4)' },
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
      <header className={`w-full border-b select-none transition-colors duration-200 shadow-sm ${
        isClassic 
          ? 'bg-[#002626] border-[#0e5c5c] text-[#e0e7d7]' 
          : 'bg-[#003366] border-[#002447] text-white'
      }`}>
        {/* Topmost System Info Row */}
        <div className={`px-4 py-1.5 flex flex-wrap items-center justify-between text-xs border-b gap-2 ${
          isClassic ? 'border-black/20' : 'border-blue-900/60 bg-[#00274e]'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 font-bold uppercase rounded text-[11px] tracking-wider ${
              isClassic ? 'bg-amber-400 text-black' : 'bg-white text-blue-950 font-black shadow-sm'
            }`}>
              TallyEdu ERP
            </span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {company.isEducationalMode ? 'Educational Mode' : 'Licensed Enterprise'}
            </span>
            <span className="text-blue-300/40 hidden sm:inline">|</span>
            <span className="hidden sm:inline font-mono text-blue-100 text-xs">
              Tax ID: <strong className="text-amber-300">{company.gstinOrTaxId}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <button
              onClick={() => onOpenVoucherModal()}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow transition-all active:scale-95"
              title="Add New Accounting Voucher (Ctrl+V)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Voucher Entry</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-all font-medium ${
                isClassic 
                  ? 'border-emerald-600 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200' 
                  : 'border-blue-400/50 bg-blue-800/40 hover:bg-blue-800 text-white'
              }`}
              title="Toggle Theme"
            >
              <Palette className="w-3 h-3" />
              <span>{isClassic ? 'Retro Green' : 'White & Blue'}</span>
            </button>

            <button
              onClick={() => setShowKeyHelp(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-blue-400/40 hover:bg-blue-800/60 text-white text-[11px]"
              title="Keyboard Shortcuts Guide"
            >
              <Keyboard className="w-3 h-3" />
              <span className="hidden md:inline">Hotkeys</span>
            </button>

            <div className="flex items-center gap-1 border-l border-blue-800/80 pl-2">
              <button
                onClick={exportBackupJson}
                className="p-1 rounded hover:bg-white/10 text-blue-200 hover:text-white"
                title="Export Company Backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="p-1 rounded hover:bg-white/10 text-blue-200 hover:text-white"
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
                className="p-1 rounded hover:bg-rose-500/20 text-rose-300 hover:text-rose-200"
                title="Reset to Sample Company Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Company Header Row */}
        <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-4 ${
          isClassic ? '' : 'bg-[#003366]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg font-bold flex items-center justify-center shadow ${
              isClassic ? 'bg-[#043333] text-amber-300 border border-[#0d5555]' : 'bg-white text-blue-800 border border-blue-200'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-wide uppercase text-white font-sans">
                  {company.companyName}
                </h1>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  isClassic ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-800/80 text-blue-100 border border-blue-400/40'
                }`}>
                  Live Financials
                </span>
              </div>
              <p className="text-xs text-blue-200 font-sans">
                {company.legalName}
              </p>
            </div>
          </div>

          {/* Current Period & Date Display */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className={`px-3 py-1.5 rounded border ${
              isClassic 
                ? 'bg-[#032b2b] border-[#0c4e4e] text-amber-100' 
                : 'bg-white/10 border-blue-400/30 text-white backdrop-blur-sm'
            }`}>
              <div className="text-[10px] uppercase text-blue-200">Financial Period</div>
              <div className="font-bold text-white">
                {company.financialYearStart} to {company.financialYearEnd}
              </div>
            </div>

            <div className={`px-3 py-1.5 rounded border ${
              isClassic 
                ? 'bg-[#032b2b] border-[#0c4e4e] text-amber-100' 
                : 'bg-white/10 border-blue-400/30 text-white backdrop-blur-sm'
            }`}>
              <div className="text-[10px] uppercase text-blue-200 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>Accounting Date</span>
              </div>
              <div className="font-bold text-emerald-300">
                {company.currentAccountingDate}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Menu / Routes */}
        <nav className={`px-4 flex items-center overflow-x-auto text-xs font-medium border-t transition-colors ${
          isClassic 
            ? 'bg-[#051c1c] border-[#0c4e4e]' 
            : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}>
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-2.5 whitespace-nowrap transition-all flex items-center gap-1.5 border-b-2 font-semibold ${
                  isActive
                    ? isClassic
                      ? 'border-amber-400 text-amber-300 bg-[#082929]'
                      : 'border-blue-600 text-blue-700 bg-blue-50/80 font-bold'
                    : isClassic
                    ? 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
                    : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                {item.label === 'Savings & Income' && <PiggyBank className="w-3.5 h-3.5 text-blue-600" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {showKeyHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-blue-800">
                <Keyboard className="w-5 h-5 text-blue-600" />
                Tally Keyboard Shortcuts
              </h3>
              <button 
                onClick={() => setShowKeyHelp(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-blue-900">
                <span className="font-bold text-blue-700">F4</span>: Contra (Bank ⇄ Cash)
              </div>
              <div className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-100 text-rose-900">
                <span className="font-bold text-rose-700">F5</span>: Payment (Expenses)
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100 text-emerald-900">
                <span className="font-bold text-emerald-700">F6</span>: Receipt (Incomes)
              </div>
              <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-100 text-purple-900">
                <span className="font-bold text-purple-700">F7</span>: Journal (Adjust)
              </div>
              <div className="p-2.5 bg-sky-50/60 rounded-lg border border-sky-100 text-sky-900">
                <span className="font-bold text-sky-700">F8</span>: Sales (Billing)
              </div>
              <div className="p-2.5 bg-orange-50/60 rounded-lg border border-orange-100 text-orange-900">
                <span className="font-bold text-orange-700">F9</span>: Purchase (Inward)
              </div>
              <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-800">
                <span className="font-bold text-slate-900">Esc</span>: Close Modal / Back
              </div>
              <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-800">
                <span className="font-bold text-slate-900">Ctrl + V</span>: Quick New Voucher
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowKeyHelp(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold text-white shadow"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-blue-800">
                <Upload className="w-5 h-5 text-blue-600" />
                Restore / Import Accounting Data
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Option A: Upload Backup JSON File</label>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleFileImport}
                  className="block w-full text-slate-700 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer border border-slate-200 rounded p-1"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-slate-700 mb-1 font-semibold">Option B: Paste JSON Backup</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste JSON content here..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-white text-xs font-semibold"
                >
                  Import From Text
                </button>
              </div>

              {importStatus && (
                <div className={`p-2.5 rounded text-xs font-bold ${
                  importStatus.includes('success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {importStatus}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-semibold text-slate-700"
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
