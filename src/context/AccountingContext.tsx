import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Ledger,
  VoucherEntry,
  CompanySettings,
  SavingsConfig,
  ProfitAndLossSummary,
  BalanceSheetSummary,
  VoucherType,
  AccountGroup,
} from '../types/accounting';
import {
  DEFAULT_COMPANY,
  DEFAULT_SAVINGS_CONFIG,
  DEFAULT_LEDGERS,
  DEFAULT_VOUCHERS,
} from '../data/initialData';

interface CashBookRow {
  voucher: VoucherEntry;
  type: 'RECEIPT' | 'PAYMENT';
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface BankBookRow {
  voucher: VoucherEntry;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  bankLedger: Ledger;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface AccountingContextType {
  company: CompanySettings;
  updateCompany: (updates: Partial<CompanySettings>) => void;
  savingsConfig: SavingsConfig;
  updateSavingsConfig: (updates: Partial<SavingsConfig>) => void;

  ledgers: Ledger[];
  vouchers: VoucherEntry[];

  addLedger: (ledger: Omit<Ledger, 'id'>) => Ledger;
  updateLedger: (id: string, updates: Partial<Ledger>) => void;
  deleteLedger: (id: string) => boolean;

  addVoucher: (voucher: Omit<VoucherEntry, 'id' | 'voucherNo'> & { voucherNo?: string }) => VoucherEntry;
  updateVoucher: (id: string, updates: Partial<VoucherEntry>) => void;
  deleteVoucher: (id: string) => void;

  getLedgerById: (id: string) => Ledger | undefined;
  getLedgerBalance: (ledgerId: string) => { amount: number; isDebit: boolean; formatted: string };
  getLedgerStatement: (ledgerId: string) => Array<{
    date: string;
    voucherNo: string;
    voucherType: VoucherType;
    particulars: string;
    debit: number;
    credit: number;
    balance: number;
    isDebit: boolean;
  }>;

  // Book computations
  getCashBook: () => {
    openingBalance: number;
    rows: CashBookRow[];
    totalReceipts: number;
    totalPayments: number;
    closingBalance: number;
  };

  getBankBook: (bankLedgerId?: string) => {
    selectedBankId: string;
    openingBalance: number;
    rows: BankBookRow[];
    totalDeposits: number;
    totalWithdrawals: number;
    closingBalance: number;
  };

  getPurchasesList: () => VoucherEntry[];
  getSalesList: () => VoucherEntry[];

  // Financial Reports
  calculatePnL: () => ProfitAndLossSummary;
  calculateBalanceSheet: () => BalanceSheetSummary;
  calculateTrialBalance: () => Array<{
    ledger: Ledger;
    debit: number;
    credit: number;
  }>;

  // Utilities
  resetToSampleData: () => void;
  clearAllData: () => void;
  exportBackupJson: () => void;
  importBackupJson: (jsonString: string) => boolean;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'tally_edu_accounting_state_v1';

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_company`);
    return saved ? JSON.parse(saved) : DEFAULT_COMPANY;
  });

  const [savingsConfig, setSavingsConfig] = useState<SavingsConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_savings`);
    return saved ? JSON.parse(saved) : DEFAULT_SAVINGS_CONFIG;
  });

  const [ledgers, setLedgers] = useState<Ledger[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_ledgers`);
    return saved ? JSON.parse(saved) : DEFAULT_LEDGERS;
  });

  const [vouchers, setVouchers] = useState<VoucherEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_vouchers`);
    return saved ? JSON.parse(saved) : DEFAULT_VOUCHERS;
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_company`, JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_savings`, JSON.stringify(savingsConfig));
  }, [savingsConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ledgers`, JSON.stringify(ledgers));
  }, [ledgers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_vouchers`, JSON.stringify(vouchers));
  }, [vouchers]);

  const updateCompany = (updates: Partial<CompanySettings>) => {
    setCompany(prev => ({ ...prev, ...updates }));
  };

  const updateSavingsConfig = (updates: Partial<SavingsConfig>) => {
    setSavingsConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleTheme = () => {
    setCompany(prev => ({
      ...prev,
      theme: prev.theme === 'white-blue' ? 'classic' : 'white-blue',
    }));
  };

  const getLedgerById = (id: string): Ledger | undefined => {
    return ledgers.find(l => l.id === id);
  };

  const addLedger = (ledgerData: Omit<Ledger, 'id'>): Ledger => {
    const newId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLedger: Ledger = { ...ledgerData, id: newId };
    setLedgers(prev => [...prev, newLedger]);
    return newLedger;
  };

  const updateLedger = (id: string, updates: Partial<Ledger>) => {
    setLedgers(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  const deleteLedger = (id: string): boolean => {
    const hasVouchers = vouchers.some(v => v.debitLedgerId === id || v.creditLedgerId === id);
    if (hasVouchers) {
      return false; // Cannot delete ledger with active vouchers
    }
    setLedgers(prev => prev.filter(l => l.id !== id));
    return true;
  };

  const getNextVoucherNo = (type: VoucherType): string => {
    const prefixMap: Record<VoucherType, string> = {
      CONTRA: 'CNT',
      PAYMENT: 'PAY',
      RECEIPT: 'REC',
      JOURNAL: 'JRN',
      SALES: 'SAL',
      PURCHASE: 'PUR',
    };
    const prefix = prefixMap[type] || 'VCH';
    const typeCount = vouchers.filter(v => v.voucherType === type).length + 1;
    return `${prefix}-${String(typeCount).padStart(3, '0')}`;
  };

  const addVoucher = (
    voucherData: Omit<VoucherEntry, 'id' | 'voucherNo'> & { voucherNo?: string }
  ): VoucherEntry => {
    const newId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const voucherNo = voucherData.voucherNo || getNextVoucherNo(voucherData.voucherType);
    const newVoucher: VoucherEntry = {
      ...voucherData,
      id: newId,
      voucherNo,
    };
    setVouchers(prev => [...prev, newVoucher]);
    return newVoucher;
  };

  const updateVoucher = (id: string, updates: Partial<VoucherEntry>) => {
    setVouchers(prev => prev.map(v => (v.id === id ? { ...v, ...updates } : v)));
  };

  const deleteVoucher = (id: string) => {
    setVouchers(prev => prev.filter(v => v.id !== id));
  };

  // Helper to determine normal account nature
  const isDebitNormal = (group: AccountGroup): boolean => {
    return [
      'CASH',
      'BANK',
      'SUNDRY_DEBTOR',
      'FIXED_ASSET',
      'CURRENT_ASSET',
      'DIRECT_EXPENSE',
      'INDIRECT_EXPENSE',
    ].includes(group);
  };

  // Calculate current balance for any ledger
  const getLedgerBalance = (ledgerId: string) => {
    const ledger = getLedgerById(ledgerId);
    if (!ledger) {
      return { amount: 0, isDebit: true, formatted: '0.00 Dr' };
    }

    // Start with opening balance (positive = Dr, negative = Cr)
    let netDebit = ledger.openingBalance;

    for (const v of vouchers) {
      if (v.debitLedgerId === ledgerId) {
        netDebit += v.amount;
      }
      if (v.creditLedgerId === ledgerId) {
        netDebit -= v.amount;
      }
    }

    const isDebit = netDebit >= 0;
    const absAmount = Math.abs(netDebit);
    const formatted = `${company.currencySymbol} ${absAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${isDebit ? 'Dr' : 'Cr'}`;

    return { amount: absAmount, isDebit, formatted };
  };

  // Full ledger drill-down statement
  const getLedgerStatement = (ledgerId: string) => {
    const ledger = getLedgerById(ledgerId);
    if (!ledger) return [];

    let currentBalance = ledger.openingBalance;

    const sortedVouchers = [...vouchers]
      .filter(v => v.debitLedgerId === ledgerId || v.creditLedgerId === ledgerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedVouchers.map(v => {
      const isDebit = v.debitLedgerId === ledgerId;
      const otherLedgerId = isDebit ? v.creditLedgerId : v.debitLedgerId;
      const otherLedger = getLedgerById(otherLedgerId);

      const debit = isDebit ? v.amount : 0;
      const credit = isDebit ? 0 : v.amount;

      currentBalance = currentBalance + debit - credit;

      return {
        date: v.date,
        voucherNo: v.voucherNo,
        voucherType: v.voucherType,
        particulars: otherLedger ? otherLedger.name : 'Unknown Account',
        debit,
        credit,
        balance: Math.abs(currentBalance),
        isDebit: currentBalance >= 0,
      };
    });
  };

  // Cash Book Computation
  const getCashBook = () => {
    const cashLedger = ledgers.find(l => l.group === 'CASH') || ledgers[0];
    const cashLedgerId = cashLedger?.id || 'led_cash';
    const openingBalance = cashLedger?.openingBalance || 0;

    let runningBalance = openingBalance;
    let totalReceipts = 0;
    let totalPayments = 0;

    const relevantVouchers = vouchers
      .filter(v => v.debitLedgerId === cashLedgerId || v.creditLedgerId === cashLedgerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows: CashBookRow[] = relevantVouchers.map(v => {
      const isReceipt = v.debitLedgerId === cashLedgerId;
      const particularsLedger = getLedgerById(isReceipt ? v.creditLedgerId : v.debitLedgerId);

      const debit = isReceipt ? v.amount : 0;
      const credit = isReceipt ? 0 : v.amount;

      if (isReceipt) {
        totalReceipts += v.amount;
        runningBalance += v.amount;
      } else {
        totalPayments += v.amount;
        runningBalance -= v.amount;
      }

      return {
        voucher: v,
        type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        particulars: particularsLedger?.name || 'General Cash Entry',
        debit,
        credit,
        runningBalance,
      };
    });

    return {
      openingBalance,
      rows,
      totalReceipts,
      totalPayments,
      closingBalance: runningBalance,
    };
  };

  // Bank Book Computation
  const getBankBook = (bankLedgerId?: string) => {
    const bankLedgers = ledgers.filter(l => l.group === 'BANK');
    const selectedBank = bankLedgerId
      ? bankLedgers.find(b => b.id === bankLedgerId) || bankLedgers[0]
      : bankLedgers[0];

    const currentBankId = selectedBank?.id || '';
    const openingBalance = selectedBank?.openingBalance || 0;

    let runningBalance = openingBalance;
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const relevantVouchers = vouchers
      .filter(v => v.debitLedgerId === currentBankId || v.creditLedgerId === currentBankId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows: BankBookRow[] = relevantVouchers.map(v => {
      const isDeposit = v.debitLedgerId === currentBankId;
      const otherLedger = getLedgerById(isDeposit ? v.creditLedgerId : v.debitLedgerId);

      const debit = isDeposit ? v.amount : 0;
      const credit = isDeposit ? 0 : v.amount;

      if (isDeposit) {
        totalDeposits += v.amount;
        runningBalance += v.amount;
      } else {
        totalWithdrawals += v.amount;
        runningBalance -= v.amount;
      }

      let type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' = isDeposit ? 'DEPOSIT' : 'WITHDRAWAL';
      if (v.voucherType === 'CONTRA') {
        type = 'TRANSFER';
      }

      return {
        voucher: v,
        type,
        bankLedger: selectedBank,
        particulars: otherLedger?.name || 'Bank Transaction',
        debit,
        credit,
        runningBalance,
      };
    });

    return {
      selectedBankId: currentBankId,
      openingBalance,
      rows,
      totalDeposits,
      totalWithdrawals,
      closingBalance: runningBalance,
    };
  };

  // Purchases list
  const getPurchasesList = () => {
    return vouchers
      .filter(v => v.voucherType === 'PURCHASE' || v.category === 'PURCHASE')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Sales list
  const getSalesList = () => {
    return vouchers
      .filter(v => v.voucherType === 'SALES' || v.category === 'SALE')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Profit and Loss calculation
  const calculatePnL = (): ProfitAndLossSummary => {
    // 1. Direct Income (Sales + Other direct receipts)
    let salesRevenue = 0;
    let directIncome = 0;
    const directIncomeLedgers = ledgers.filter(l => l.group === 'DIRECT_INCOME');
    directIncomeLedgers.forEach(l => {
      const bal = getLedgerBalance(l.id);
      if (l.id === 'led_sales' || l.name.toLowerCase().includes('sale')) {
        salesRevenue += bal.amount;
      } else {
        directIncome += bal.amount;
      }
    });

    // 2. Direct Expenses (Purchases + Direct Manufacturing/Freight)
    let purchases = 0;
    let directExpenses = 0;
    const directExpenseLedgers = ledgers.filter(l => l.group === 'DIRECT_EXPENSE');
    directExpenseLedgers.forEach(l => {
      const bal = getLedgerBalance(l.id);
      if (l.id === 'led_purchase' || l.name.toLowerCase().includes('purchase')) {
        purchases += bal.amount;
      } else {
        directExpenses += bal.amount;
      }
    });

    // Opening Stock & Closing Stock
    const stockLedger = ledgers.find(l => l.id === 'led_stock' || l.name.toLowerCase().includes('stock'));
    const openingStock = stockLedger ? Math.max(0, stockLedger.openingBalance) : 0;
    // Estimated Closing Stock: Opening Stock + 40% of purchases (or default standard stock buffer)
    const closingStock = Math.round(openingStock + purchases * 0.45);

    // COGS = Opening Stock + Purchases + Direct Expenses - Closing Stock
    const totalTradingDebit = openingStock + purchases + directExpenses;
    const totalTradingCredit = salesRevenue + directIncome + closingStock;

    const grossMargin = totalTradingCredit - totalTradingDebit;
    const grossProfit = grossMargin >= 0 ? grossMargin : 0;
    const grossLoss = grossMargin < 0 ? Math.abs(grossMargin) : 0;

    // 3. Indirect Incomes
    let indirectIncome = 0;
    ledgers
      .filter(l => l.group === 'INDIRECT_INCOME')
      .forEach(l => {
        indirectIncome += getLedgerBalance(l.id).amount;
      });

    // 4. Indirect Expenses
    let indirectExpenses = 0;
    ledgers
      .filter(l => l.group === 'INDIRECT_EXPENSE')
      .forEach(l => {
        indirectExpenses += getLedgerBalance(l.id).amount;
      });

    const netMargin = (grossProfit - grossLoss) + indirectIncome - indirectExpenses;
    const netProfit = netMargin >= 0 ? netMargin : 0;
    const netLoss = netMargin < 0 ? Math.abs(netMargin) : 0;

    return {
      salesRevenue,
      directIncome,
      openingStock,
      purchases,
      directExpenses,
      closingStock,
      cogs: Math.max(0, totalTradingDebit - closingStock),
      grossProfit,
      grossLoss,
      indirectIncome,
      indirectExpenses,
      netProfit,
      netLoss,
    };
  };

  // Balance Sheet calculation
  const calculateBalanceSheet = (): BalanceSheetSummary => {
    const pnl = calculatePnL();
    const netProfitAddition = pnl.netProfit - pnl.netLoss;

    // Liabilities
    let capitalAccount = 0;
    let reservesAndSurplus = 0;
    ledgers
      .filter(l => l.group === 'CAPITAL_ACCOUNT')
      .forEach(l => {
        const bal = getLedgerBalance(l.id).amount;
        if (l.name.toLowerCase().includes('reserve')) {
          reservesAndSurplus += bal;
        } else {
          capitalAccount += bal;
        }
      });

    let sundryCreditors = 0;
    ledgers
      .filter(l => l.group === 'SUNDRY_CREDITOR')
      .forEach(l => {
        sundryCreditors += getLedgerBalance(l.id).amount;
      });

    let currentLiabilities = 0;
    ledgers
      .filter(l => l.group === 'CURRENT_LIABILITY')
      .forEach(l => {
        currentLiabilities += getLedgerBalance(l.id).amount;
      });

    const totalLiabilities =
      capitalAccount + reservesAndSurplus + netProfitAddition + sundryCreditors + currentLiabilities;

    // Assets
    let fixedAssets = 0;
    ledgers
      .filter(l => l.group === 'FIXED_ASSET')
      .forEach(l => {
        fixedAssets += getLedgerBalance(l.id).amount;
      });

    let sundryDebtors = 0;
    ledgers
      .filter(l => l.group === 'SUNDRY_DEBTOR')
      .forEach(l => {
        sundryDebtors += getLedgerBalance(l.id).amount;
      });

    let bankBalances = 0;
    ledgers
      .filter(l => l.group === 'BANK')
      .forEach(l => {
        bankBalances += getLedgerBalance(l.id).amount;
      });

    let cashInHand = 0;
    ledgers
      .filter(l => l.group === 'CASH')
      .forEach(l => {
        cashInHand += getLedgerBalance(l.id).amount;
      });

    let otherCurrentAssets = 0;
    ledgers
      .filter(l => l.group === 'CURRENT_ASSET' && l.id !== 'led_stock')
      .forEach(l => {
        otherCurrentAssets += getLedgerBalance(l.id).amount;
      });

    const closingStock = pnl.closingStock;

    const totalAssets =
      fixedAssets + closingStock + sundryDebtors + bankBalances + cashInHand + otherCurrentAssets;

    const difference = Math.abs(totalLiabilities - totalAssets);
    const isBalanced = difference < 1; // Under 1 rupee tolerance for rounding

    return {
      liabilities: {
        capitalAccount,
        reservesAndSurplus,
        netProfitAddition,
        sundryCreditors,
        currentLiabilities,
        total: totalLiabilities,
      },
      assets: {
        fixedAssets,
        closingStock,
        sundryDebtors,
        bankBalances,
        cashInHand,
        otherCurrentAssets,
        total: totalAssets,
      },
      isBalanced,
      difference,
    };
  };

  // Trial Balance calculation
  const calculateTrialBalance = () => {
    return ledgers.map(l => {
      let netDebit = l.openingBalance;
      for (const v of vouchers) {
        if (v.debitLedgerId === l.id) netDebit += v.amount;
        if (v.creditLedgerId === l.id) netDebit -= v.amount;
      }
      return {
        ledger: l,
        debit: netDebit >= 0 ? netDebit : 0,
        credit: netDebit < 0 ? Math.abs(netDebit) : 0,
      };
    });
  };

  // Reset & Clear utilities
  const resetToSampleData = () => {
    setCompany(DEFAULT_COMPANY);
    setSavingsConfig(DEFAULT_SAVINGS_CONFIG);
    setLedgers(DEFAULT_LEDGERS);
    setVouchers(DEFAULT_VOUCHERS);
    localStorage.removeItem(`${STORAGE_KEY}_company`);
    localStorage.removeItem(`${STORAGE_KEY}_savings`);
    localStorage.removeItem(`${STORAGE_KEY}_ledgers`);
    localStorage.removeItem(`${STORAGE_KEY}_vouchers`);
  };

  const clearAllData = () => {
    setVouchers([]);
    setLedgers(DEFAULT_LEDGERS.map(l => ({ ...l, openingBalance: 0 })));
  };

  const exportBackupJson = () => {
    const backupData = {
      company,
      savingsConfig,
      ledgers,
      vouchers,
      exportedAt: new Date().toISOString(),
      app: 'TallyEdu Multi-Accounting System',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TALLY_EDU_BACKUP_${company.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackupJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.company && data.ledgers && data.vouchers) {
        setCompany(data.company);
        if (data.savingsConfig) setSavingsConfig(data.savingsConfig);
        setLedgers(data.ledgers);
        setVouchers(data.vouchers);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AccountingContext.Provider
      value={{
        company,
        updateCompany,
        savingsConfig,
        updateSavingsConfig,
        ledgers,
        vouchers,
        addLedger,
        updateLedger,
        deleteLedger,
        addVoucher,
        updateVoucher,
        deleteVoucher,
        getLedgerById,
        getLedgerBalance,
        getLedgerStatement,
        getCashBook,
        getBankBook,
        getPurchasesList,
        getSalesList,
        calculatePnL,
        calculateBalanceSheet,
        calculateTrialBalance,
        resetToSampleData,
        clearAllData,
        exportBackupJson,
        importBackupJson,
        toggleTheme,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};

