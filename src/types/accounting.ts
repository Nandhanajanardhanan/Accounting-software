export type VoucherType = 
  | 'CONTRA'    // F4: Cash <-> Bank, Bank <-> Bank
  | 'PAYMENT'   // F5: Outflow from Cash / Bank
  | 'RECEIPT'   // F6: Inflow to Cash / Bank
  | 'JOURNAL'   // F7: Non-cash adjustments
  | 'SALES'     // F8: Goods or services sold
  | 'PURCHASE'; // F9: Goods or raw materials bought

export type AccountGroup = 
  | 'CASH'
  | 'BANK'
  | 'SUNDRY_DEBTOR'     // Customers
  | 'SUNDRY_CREDITOR'   // Suppliers/Vendors
  | 'DIRECT_INCOME'     // Sales & Service Revenue
  | 'DIRECT_EXPENSE'    // Purchases, Freight, Manufacturing
  | 'INDIRECT_INCOME'   // Interest, Discount Received, Rebate
  | 'INDIRECT_EXPENSE'  // Rent, Salaries, Electricity, Taxes
  | 'FIXED_ASSET'       // Machinery, Computers, Furniture
  | 'CURRENT_ASSET'     // Inventory, Prepayments
  | 'CURRENT_LIABILITY' // Outstanding Expenses
  | 'CAPITAL_ACCOUNT';  // Share Capital, Owner's Equity, Reserves

export interface Ledger {
  id: string;
  name: string;
  group: AccountGroup;
  openingBalance: number; // Positive = Debit, Negative = Credit
  isSystem?: boolean;
  contactNumber?: string;
  taxNumber?: string;
}

export interface InvoiceItem {
  id: string;
  itemName: string;
  quantity: number;
  rate: number;
  unit: string;
  amount: number;
}

export interface VoucherEntry {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  date: string; // YYYY-MM-DD
  debitLedgerId: string;
  creditLedgerId: string;
  amount: number;
  narration: string;
  referenceNo?: string;
  paymentMode?: 'CASH' | 'BANK' | 'CREDIT';
  bankName?: string;
  chequeOrUtrNo?: string;
  items?: InvoiceItem[];
  category?: 'CASH' | 'BANK' | 'PURCHASE' | 'SALE' | 'GENERAL';
}

export interface CompanySettings {
  companyName: string;
  legalName: string;
  gstinOrTaxId: string;
  currencySymbol: string;
  financialYearStart: string; // YYYY-MM-DD
  financialYearEnd: string;   // YYYY-MM-DD
  currentAccountingDate: string;
  isEducationalMode: boolean;
  theme: 'classic' | 'prime'; // 'classic' = Tally ERP 9 green, 'prime' = Tally Prime navy
}

export interface SavingsConfig {
  emergencyReservePct: number;    // % of net profit to emergency
  taxBufferPct: number;           // % for future corporate tax
  expansionReservePct: number;    // % for capital reinvestment
  generalSavingsPct: number;      // % for company general savings
  monthlyBurnRateEstimate: number; // Estimated fixed monthly expenses
  annualReturnRatePct: number;    // Estimated interest on business savings (e.g. 7%)
}

export interface ProfitAndLossSummary {
  salesRevenue: number;
  directIncome: number;
  openingStock: number;
  purchases: number;
  directExpenses: number;
  closingStock: number;
  cogs: number;
  grossProfit: number;
  grossLoss: number;
  indirectIncome: number;
  indirectExpenses: number;
  netProfit: number;
  netLoss: number;
}

export interface BalanceSheetSummary {
  liabilities: {
    capitalAccount: number;
    reservesAndSurplus: number;
    netProfitAddition: number;
    sundryCreditors: number;
    currentLiabilities: number;
    total: number;
  };
  assets: {
    fixedAssets: number;
    closingStock: number;
    sundryDebtors: number;
    bankBalances: number;
    cashInHand: number;
    otherCurrentAssets: number;
    total: number;
  };
  isBalanced: boolean;
  difference: number;
}
