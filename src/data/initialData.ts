import { CompanySettings, Ledger, VoucherEntry, SavingsConfig } from '../types/accounting';

export const DEFAULT_COMPANY: CompanySettings = {
  companyName: 'MY ENTERPRISE (PVT) LTD',
  legalName: 'My Enterprise Private Limited',
  gstinOrTaxId: '27AAAAA0000A1Z5',
  currencySymbol: '₹',
  financialYearStart: '2026-04-01',
  financialYearEnd: '2027-03-31',
  currentAccountingDate: '2026-11-03',
  isEducationalMode: true,
  theme: 'white-blue',
};

export const DEFAULT_SAVINGS_CONFIG: SavingsConfig = {
  emergencyReservePct: 25,
  taxBufferPct: 20,
  expansionReservePct: 25,
  generalSavingsPct: 30,
  monthlyBurnRateEstimate: 25000,
  annualReturnRatePct: 7.0,
};

// Clean base Chart of Accounts with 0 opening balance ready for user input
export const DEFAULT_LEDGERS: Ledger[] = [
  // Cash & Bank Masters
  { id: 'led_cash', name: 'Cash A/c', group: 'CASH', openingBalance: 0, isSystem: true },
  { id: 'led_bank_main', name: 'Main Bank Current A/c', group: 'BANK', openingBalance: 0, isSystem: true },
  { id: 'led_bank_secondary', name: 'Secondary Savings Bank A/c', group: 'BANK', openingBalance: 0 },

  // Capital & Equity
  { id: 'led_capital', name: 'Share Capital / Owner Equity', group: 'CAPITAL_ACCOUNT', openingBalance: 0, isSystem: true },
  { id: 'led_reserves', name: 'General Reserves & Surplus', group: 'CAPITAL_ACCOUNT', openingBalance: 0 },

  // Fixed Assets
  { id: 'led_fa_equip', name: 'Office Equipment & Computers', group: 'FIXED_ASSET', openingBalance: 0 },
  { id: 'led_fa_furn', name: 'Furniture & Fixtures', group: 'FIXED_ASSET', openingBalance: 0 },

  // Current Assets / Inventory
  { id: 'led_stock', name: 'Stock in Hand (Inventory)', group: 'CURRENT_ASSET', openingBalance: 0 },

  // Direct Incomes & Direct Purchases
  { id: 'led_sales', name: 'Sales Account', group: 'DIRECT_INCOME', openingBalance: 0, isSystem: true },
  { id: 'led_services', name: 'Service / Consulting Revenue', group: 'DIRECT_INCOME', openingBalance: 0 },
  { id: 'led_purchase', name: 'Purchase Account', group: 'DIRECT_EXPENSE', openingBalance: 0, isSystem: true },
  { id: 'led_freight', name: 'Freight & Cartage Inward', group: 'DIRECT_EXPENSE', openingBalance: 0 },

  // Debtors (Customers) & Creditors (Suppliers)
  { id: 'led_cust_1', name: 'Customer Account 1', group: 'SUNDRY_DEBTOR', openingBalance: 0 },
  { id: 'led_supp_1', name: 'Vendor / Supplier 1', group: 'SUNDRY_CREDITOR', openingBalance: 0 },

  // Indirect Expenses
  { id: 'led_exp_rent', name: 'Office Rent Expense', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_salary', name: 'Salaries & Staff Wages', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_electric', name: 'Electricity & Utility Bills', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_office', name: 'General Office Expenses', group: 'INDIRECT_EXPENSE', openingBalance: 0 },

  // Indirect Incomes
  { id: 'led_inc_interest', name: 'Bank Interest Received', group: 'INDIRECT_INCOME', openingBalance: 0 },
  { id: 'led_inc_discount', name: 'Discount Received', group: 'INDIRECT_INCOME', openingBalance: 0 },
];

// No cached dummy vouchers — 100% clean slate for user input
export const DEFAULT_VOUCHERS: VoucherEntry[] = [];
