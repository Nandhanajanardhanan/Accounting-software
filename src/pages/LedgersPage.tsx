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

  // New Ledger Form Modal
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
    // Positive = Dr, Negative = Cr
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-mono text-xs">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                Chart of Accounts & Ledger Statements
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700">
                Route: /ledgers
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Accounts info, ledger master directory, and detailed account statement drill-down
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ledger (Alt+C)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-black/20 border border-white/5 rounded-lg">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ledger by name or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="text-xs text-slate-400">
          Total Ledgers: <strong className="text-purple-300">{ledgers.length}</strong>
        </div>
      </div>

      {/* Ledgers Grid Table */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-xl bg-slate-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <th className="py-2.5 px-4">Ledger Name</th>
              <th className="py-2.5 px-4">Under Group</th>
              <th className="py-2.5 px-4 text-right">Opening Balance</th>
              <th className="py-2.5 px-4 text-right text-amber-300">Current Balance</th>
              <th className="py-2.5 px-3 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-200">
            {filteredLedgers.map((l) => {
              const currentBal = getLedgerBalance(l.id);
              const opBalFormatted = `${company.currencySymbol} ${Math.abs(l.openingBalance).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })} ${l.openingBalance >= 0 ? 'Dr' : 'Cr'}`;

              return (
                <tr key={l.id} className="hover:bg-slate-900/70 transition-colors">
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => setSelectedLedgerId(l.id)}
                      className="font-bold text-white hover:text-purple-300 text-left flex items-center gap-2 group"
                    >
                      <span>{l.name}</span>
                      <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300" />
                    </button>
                    {l.isSystem && (
                      <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">
                        System Account
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800">
                      {l.group.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400 font-mono">
                    {opBalFormatted}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-amber-300 font-mono text-xs">
                    {currentBal.formatted}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedLedgerId(l.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
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
                          className="text-slate-500 hover:text-rose-400 p-1"
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg max-w-4xl w-full p-5 shadow-2xl font-mono text-xs space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-purple-300">
                  Ledger Statement: {selectedLedger.name}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Group: {selectedLedger.group.replace('_', ' ')} | Period: {company.financialYearStart} to {company.financialYearEnd}
                </span>
              </div>
              <button
                onClick={() => setSelectedLedgerId(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Vch No.</th>
                    <th className="py-2 px-3">Vch Type</th>
                    <th className="py-2 px-3">Particulars (Opposite Acc)</th>
                    <th className="py-2 px-3 text-right text-emerald-400">Debit (Dr)</th>
                    <th className="py-2 px-3 text-right text-rose-400">Credit (Cr)</th>
                    <th className="py-2 px-3 text-right text-amber-300">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {/* Opening row */}
                  <tr className="bg-slate-950/40 italic text-slate-400">
                    <td className="py-1.5 px-3">{company.financialYearStart}</td>
                    <td className="py-1.5 px-3">--</td>
                    <td className="py-1.5 px-3">OPENING</td>
                    <td className="py-1.5 px-3">To/By Opening Balance b/f</td>
                    <td className="py-1.5 px-3 text-right">
                      {selectedLedger.openingBalance >= 0 ? selectedLedger.openingBalance.toFixed(2) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {selectedLedger.openingBalance < 0 ? Math.abs(selectedLedger.openingBalance).toFixed(2) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-amber-300">
                      {Math.abs(selectedLedger.openingBalance).toFixed(2)} {selectedLedger.openingBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>

                  {ledgerStatement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No transactions recorded for this ledger during the current period.
                      </td>
                    </tr>
                  ) : (
                    ledgerStatement.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-slate-300">{entry.date}</td>
                        <td className="py-2 px-3 text-slate-200 font-bold">{entry.voucherNo}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                            {entry.voucherType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white font-semibold">{entry.particulars}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-400">
                          {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">
                          {entry.balance.toFixed(2)} {entry.isDebit ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="font-bold text-amber-300">
                Closing Ledger Balance: {getLedgerBalance(selectedLedger.id).formatted}
              </span>
              <button
                onClick={() => setSelectedLedgerId(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Ledger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg max-w-md w-full p-5 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-purple-300">
                Create New Ledger Account
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLedger} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Ledger Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal & Professional Fees / Supplier XYZ"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Under Group</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as AccountGroup)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Opening Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newOpeningBal}
                    onChange={(e) => setNewOpeningBal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Dr / Cr</label>
                  <select
                    value={newBalType}
                    onChange={(e) => setNewBalType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="Dr">Dr (Asset/Exp)</option>
                    <option value="Cr">Cr (Liab/Inc)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded"
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
