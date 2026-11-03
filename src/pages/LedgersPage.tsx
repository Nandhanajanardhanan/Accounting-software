import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Trash2,
  X,
} from 'lucide-react';
import type { AccountGroup } from '../types/accounting';

export const LedgersPage: React.FC = () => {
  const { company, ledgers, addLedger, deleteLedger, getLedgerBalance, getLedgerStatement } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<AccountGroup>('INDIRECT_EXPENSE');
  const [newOpeningBal, setNewOpeningBal] = useState('0');
  const [newBalType, setNewBalType] = useState<'Dr' | 'Cr'>('Dr');

  const groups: AccountGroup[] = [
    'CASH',
    'BANK',
    'SUNDRY_DEBTOR',
    'SUNDRY_CREDITOR',
    'DIRECT_INCOME',
    'DIRECT_EXPENSE',
    'INDIRECT_INCOME',
    'INDIRECT_EXPENSE',
    'FIXED_ASSET',
    'CURRENT_ASSET',
    'CURRENT_LIABILITY',
    'CAPITAL_ACCOUNT',
  ];

  const filteredLedgers = ledgers.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const balVal = parseFloat(newOpeningBal) || 0;
    const signedBal = newBalType === 'Dr' ? balVal : -balVal;

    addLedger({
      name: newName.trim(),
      group: newGroup,
      openingBalance: signedBal,
    });

    setShowAddModal(false);
    setNewName('');
    setNewOpeningBal('0');
  };

  const selectedLedger = ledgers.find((l) => l.id === selectedLedgerId);
  const ledgerStatement = selectedLedgerId ? getLedgerStatement(selectedLedgerId) : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-xs font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Chart of Accounts & Ledger Statements
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                Route: /ledgers
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Accounts info, ledger master directory, and account statement drill-down
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ledger (Alt+C)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ledger by name or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total Ledgers: <strong className="text-blue-900 font-mono">{ledgers.length}</strong>
        </div>
      </div>

      {/* Ledgers Grid Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Ledger Name</th>
              <th className="py-3 px-4">Under Group</th>
              <th className="py-3 px-4 text-right">Opening Balance</th>
              <th className="py-3 px-4 text-right text-blue-900">Current Balance</th>
              <th className="py-3 px-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
            {filteredLedgers.map((l) => {
              const currentBal = getLedgerBalance(l.id);
              const opBalFormatted = `${company.currencySymbol} ${Math.abs(l.openingBalance).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })} ${l.openingBalance >= 0 ? 'Dr' : 'Cr'}`;

              return (
                <tr key={l.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4 font-sans">
                    <button
                      onClick={() => setSelectedLedgerId(l.id)}
                      className="font-bold text-slate-900 hover:text-blue-600 text-left flex items-center gap-2 group transition-colors"
                    >
                      <span>{l.name}</span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                    </button>
                    {l.isSystem && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                        System Account
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                      {l.group.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    {opBalFormatted}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900 text-xs">
                    {currentBal.formatted}
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedLedgerId(l.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                      >
                        Statement
                      </button>
                      {!l.isSystem && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ledger ${l.name}?`)) {
                              const deleted = deleteLedger(l.id);
                              if (!deleted) {
                                alert('Cannot delete a ledger that has existing transactions.');
                              }
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete Ledger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ledger Drill-Down Statement Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl font-sans text-xs space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-blue-900">
                  Ledger Statement: {selectedLedger.name}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Group: {selectedLedger.group.replace('_', ' ')} | Period: {company.financialYearStart} to {company.financialYearEnd}
                </span>
              </div>
              <button
                onClick={() => setSelectedLedgerId(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-sans font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Vch No.</th>
                    <th className="py-2.5 px-3">Vch Type</th>
                    <th className="py-2.5 px-3">Particulars (Opposite Acc)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Debit (Dr)</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Credit (Cr)</th>
                    <th className="py-2.5 px-3 text-right text-blue-900">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening row */}
                  <tr className="bg-slate-50/70 italic text-slate-500">
                    <td className="py-2 px-3 font-sans">{company.financialYearStart}</td>
                    <td className="py-2 px-3">--</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">OPENING</span>
                    </td>
                    <td className="py-2 px-3 font-sans">To/By Opening Balance b/f</td>
                    <td className="py-2 px-3 text-right text-emerald-700">
                      {selectedLedger.openingBalance >= 0 ? selectedLedger.openingBalance.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-700">
                      {selectedLedger.openingBalance < 0 ? Math.abs(selectedLedger.openingBalance).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-blue-900">
                      {Math.abs(selectedLedger.openingBalance).toFixed(2)} {selectedLedger.openingBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>

                  {ledgerStatement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                        No transactions recorded for this ledger during the current period.
                      </td>
                    </tr>
                  ) : (
                    ledgerStatement.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40">
                        <td className="py-2.5 px-3 text-slate-600 font-sans">{entry.date}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-bold">{entry.voucherNo}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
                            {entry.voucherType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-sans font-semibold">{entry.particulars}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                          {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                          {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-900">
                          {entry.balance.toFixed(2)} {entry.isDebit ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="font-bold text-blue-900 font-mono text-xs">
                Closing Ledger Balance: {getLedgerBalance(selectedLedger.id).formatted}
              </span>
              <button
                onClick={() => setSelectedLedgerId(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Ledger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl font-sans text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-blue-900">
                Create New Ledger Account
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLedger} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Ledger Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Fees / Client ABC / Machinery"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Under Account Group</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as AccountGroup)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div className="col-span-2">
                  <label className="block text-slate-700 mb-1 font-semibold font-sans">Opening Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newOpeningBal}
                    onChange={(e) => setNewOpeningBal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold font-sans">Dr / Cr</label>
                  <select
                    value={newBalType}
                    onChange={(e) => setNewBalType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-sans"
                  >
                    <option value="Dr">Dr (Asset/Exp)</option>
                    <option value="Cr">Cr (Liab/Inc)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
