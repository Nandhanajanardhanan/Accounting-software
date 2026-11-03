import { CompanySettings, Ledger, VoucherEntry, SavingsConfig } from '../types/accounting';

export const DEFAULT_COMPANY: CompanySettings = {
  companyName: 'APEX CORP TECHNOLOGIES LTD',
  legalName: 'Apex Corp Technologies Private Limited',
  gstinOrTaxId: '27AABCA1234F1Z8',
  currencySymbol: '₹',
  financialYearStart: '2026-04-01',
  financialYearEnd: '2027-03-31',
  currentAccountingDate: '2026-11-03',
  isEducationalMode: true,
  theme: 'white-blue', // Modern White & Blue theme by default
};

export const DEFAULT_SAVINGS_CONFIG: SavingsConfig = {
  emergencyReservePct: 25,
  taxBufferPct: 20,
  expansionReservePct: 25,
  generalSavingsPct: 30,
  monthlyBurnRateEstimate: 45000,
  annualReturnRatePct: 7.5,
};

export const DEFAULT_LEDGERS: Ledger[] = [
  // Cash & Bank
  { id: 'led_cash', name: 'Cash A/c', group: 'CASH', openingBalance: 25000, isSystem: true },
  { id: 'led_bank_hdfc', name: 'HDFC Current A/c No. 9821', group: 'BANK', openingBalance: 185000, isSystem: true },
  { id: 'led_bank_sbi', name: 'State Bank of India A/c 5402', group: 'BANK', openingBalance: 65000 },

  // Capital & Equity
  { id: 'led_capital', name: 'Share Capital / Owner Equity', group: 'CAPITAL_ACCOUNT', openingBalance: -250000, isSystem: true }, // Credit
  { id: 'led_reserves', name: 'General Reserves & Surplus', group: 'CAPITAL_ACCOUNT', openingBalance: -25000 },

  // Fixed Assets
  { id: 'led_fa_equip', name: 'Office Computers & Servers', group: 'FIXED_ASSET', openingBalance: 60000 },
  { id: 'led_fa_furn', name: 'Office Furniture & Fixtures', group: 'FIXED_ASSET', openingBalance: 25000 },

  // Current Assets / Inventory
  { id: 'led_stock', name: 'Opening Stock (Inventory)', group: 'CURRENT_ASSET', openingBalance: 35000 },

  // Direct Incomes & Direct Purchases
  { id: 'led_sales', name: 'Sales Account (Domestic)', group: 'DIRECT_INCOME', openingBalance: 0, isSystem: true },
  { id: 'led_services', name: 'Consulting & Tech Service Income', group: 'DIRECT_INCOME', openingBalance: 0 },
  { id: 'led_purchase', name: 'Purchase Account', group: 'DIRECT_EXPENSE', openingBalance: 0, isSystem: true },
  { id: 'led_freight', name: 'Freight Inward & Handling', group: 'DIRECT_EXPENSE', openingBalance: 0 },

  // Customers (Sundry Debtors)
  { id: 'led_cust_alpha', name: 'Alpha Solutions Enterprise', group: 'SUNDRY_DEBTOR', openingBalance: 42000, contactNumber: '+91 98765 43210' },
  { id: 'led_cust_beta', name: 'Beta Global Infotech', group: 'SUNDRY_DEBTOR', openingBalance: 18000, contactNumber: '+91 98221 11223' },
  { id: 'led_cust_gamma', name: 'Gamma Digital Retailers', group: 'SUNDRY_DEBTOR', openingBalance: 0 },

  // Suppliers / Vendors (Sundry Creditors)
  { id: 'led_supp_hardware', name: 'Delta Hardware & Electronics', group: 'SUNDRY_CREDITOR', openingBalance: -28000, contactNumber: '+91 98111 22334' }, // Credit
  { id: 'led_supp_cloud', name: 'Zenith Cloud & Network Suppliers', group: 'SUNDRY_CREDITOR', openingBalance: -14000 },

  // Indirect Expenses
  { id: 'led_exp_rent', name: 'Office Rent Expense', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_salary', name: 'Staff Salaries & Wages', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_electric', name: 'Electricity & Utility Bills', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_internet', name: 'Internet & SaaS Subscriptions', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
  { id: 'led_exp_bankchg', name: 'Bank Charges & Commission', group: 'INDIRECT_EXPENSE', openingBalance: 0 },

  // Indirect Incomes
  { id: 'led_inc_interest', name: 'Bank Savings Interest Received', group: 'INDIRECT_INCOME', openingBalance: 0 },
  { id: 'led_inc_discount', name: 'Discount Received from Vendors', group: 'INDIRECT_INCOME', openingBalance: 0 },
];

export const DEFAULT_VOUCHERS: VoucherEntry[] = [
  // 1. Cash Sale
  {
    id: 'v_101',
    voucherNo: 'SAL-001',
    voucherType: 'SALES',
    date: '2026-10-02',
    debitLedgerId: 'led_cash', // Cash received
    creditLedgerId: 'led_sales',
    amount: 14500,
    narration: 'Being retail goods sold for immediate cash payment',
    referenceNo: 'INV-2026-001',
    paymentMode: 'CASH',
    category: 'SALE',
    items: [
      { id: 'i1', itemName: 'Wireless Keyboard & Mouse Kit', quantity: 10, rate: 1450, unit: 'pcs', amount: 14500 }
    ]
  },
  // 2. Credit Sale to Alpha Solutions
  {
    id: 'v_102',
    voucherNo: 'SAL-002',
    voucherType: 'SALES',
    date: '2026-10-05',
    debitLedgerId: 'led_cust_alpha', // Debtor
    creditLedgerId: 'led_sales',
    amount: 58000,
    narration: 'Being ERP accounting setup & enterprise hardware sold on 30-day credit',
    referenceNo: 'INV-2026-002',
    paymentMode: 'CREDIT',
    category: 'SALE',
    items: [
      { id: 'i2', itemName: 'Enterprise Server Node v4', quantity: 2, rate: 29000, unit: 'units', amount: 58000 }
    ]
  },
  // 3. Purchase from Delta Hardware (Credit)
  {
    id: 'v_103',
    voucherNo: 'PUR-001',
    voucherType: 'PURCHASE',
    date: '2026-10-08',
    debitLedgerId: 'led_purchase',
    creditLedgerId: 'led_supp_hardware', // Creditor
    amount: 32000,
    narration: 'Being computer components & inventory bought on supplier credit terms',
    referenceNo: 'BILL-DH-901',
    paymentMode: 'CREDIT',
    category: 'PURCHASE',
    items: [
      { id: 'i3', itemName: 'DDR5 32GB RAM Modules', quantity: 8, rate: 4000, unit: 'pcs', amount: 32000 }
    ]
  },
  // 4. Cash Purchase
  {
    id: 'v_104',
    voucherNo: 'PUR-002',
    voucherType: 'PURCHASE',
    date: '2026-10-10',
    debitLedgerId: 'led_purchase',
    creditLedgerId: 'led_cash', // Paid in cash
    amount: 6500,
    narration: 'Being urgent packaging boxes & retail consumables purchased in cash',
    referenceNo: 'CASH-REC-104',
    paymentMode: 'CASH',
    category: 'PURCHASE',
    items: [
      { id: 'i4', itemName: 'Packaging & ESD Protective Bags', quantity: 100, rate: 65, unit: 'pack', amount: 6500 }
    ]
  },
  // 5. Payment of Rent via Bank (F5)
  {
    id: 'v_105',
    voucherNo: 'PAY-001',
    voucherType: 'PAYMENT',
    date: '2026-10-12',
    debitLedgerId: 'led_exp_rent',
    creditLedgerId: 'led_bank_hdfc',
    amount: 18000,
    narration: 'Being monthly commercial office rent paid via HDFC NetBanking',
    referenceNo: 'NEFT-8839201',
    paymentMode: 'BANK',
    bankName: 'HDFC Current A/c No. 9821',
    chequeOrUtrNo: 'UTR20261012908',
    category: 'BANK'
  },
  // 6. Payment of Salaries in Cash (F5)
  {
    id: 'v_106',
    voucherNo: 'PAY-002',
    voucherType: 'PAYMENT',
    date: '2026-10-15',
    debitLedgerId: 'led_exp_salary',
    creditLedgerId: 'led_cash',
    amount: 12000,
    narration: 'Being office assistant and support staff salary disbursed in cash',
    referenceNo: 'VCH-SAL-10',
    paymentMode: 'CASH',
    category: 'CASH'
  },
  // 7. Receipt from Customer via Bank (F6)
  {
    id: 'v_107',
    voucherNo: 'REC-001',
    voucherType: 'RECEIPT',
    date: '2026-10-18',
    debitLedgerId: 'led_bank_hdfc',
    creditLedgerId: 'led_cust_alpha',
    amount: 40000,
    narration: 'Being partial payment received against Invoice INV-2026-002 via RTGS',
    referenceNo: 'RTGS-ALPHA-49',
    paymentMode: 'BANK',
    bankName: 'HDFC Current A/c No. 9821',
    chequeOrUtrNo: 'RTGS88720199',
    category: 'BANK'
  },
  // 8. Contra Voucher: Cash Deposited into SBI Bank (F4)
  {
    id: 'v_108',
    voucherNo: 'CNT-001',
    voucherType: 'CONTRA',
    date: '2026-10-22',
    debitLedgerId: 'led_bank_sbi',
    creditLedgerId: 'led_cash',
    amount: 10000,
    narration: 'Being surplus till cash deposited into State Bank of India account',
    referenceNo: 'CHQ-DEP-002',
    paymentMode: 'BANK',
    bankName: 'State Bank of India A/c 5402',
    category: 'BANK'
  },
  // 9. Payment to Supplier Delta Hardware via Bank (F5)
  {
    id: 'v_109',
    voucherNo: 'PAY-003',
    voucherType: 'PAYMENT',
    date: '2026-10-25',
    debitLedgerId: 'led_supp_hardware',
    creditLedgerId: 'led_bank_hdfc',
    amount: 20000,
    narration: 'Being vendor payment released towards purchase bill BILL-DH-901',
    referenceNo: 'NEFT-DH-771',
    paymentMode: 'BANK',
    bankName: 'HDFC Current A/c No. 9821',
    chequeOrUtrNo: 'UTR2026102577',
    category: 'BANK'
  },
  // 10. Service Income direct into Bank (F6)
  {
    id: 'v_110',
    voucherNo: 'REC-002',
    voucherType: 'RECEIPT',
    date: '2026-10-28',
    debitLedgerId: 'led_bank_hdfc',
    creditLedgerId: 'led_services',
    amount: 35000,
    narration: 'Being annual software maintenance contract fee received from client',
    referenceNo: 'AMC-REC-2026',
    paymentMode: 'BANK',
    bankName: 'HDFC Current A/c No. 9821',
    category: 'BANK'
  },
  // 11. Bank Interest Received (F6)
  {
    id: 'v_111',
    voucherNo: 'REC-003',
    voucherType: 'RECEIPT',
    date: '2026-10-31',
    debitLedgerId: 'led_bank_hdfc',
    creditLedgerId: 'led_inc_interest',
    amount: 2150,
    narration: 'Being quarterly corporate savings interest credited by bank',
    referenceNo: 'INT-OCT-26',
    paymentMode: 'BANK',
    bankName: 'HDFC Current A/c No. 9821',
    category: 'BANK'
  },
  // 12. Cash Receipt from Beta Global (F6)
  {
    id: 'v_112',
    voucherNo: 'REC-004',
    voucherType: 'RECEIPT',
    date: '2026-11-01',
    debitLedgerId: 'led_cash',
    creditLedgerId: 'led_cust_beta',
    amount: 10000,
    narration: 'Being cash collected from Beta Global against outstanding ledger balance',
    referenceNo: 'CR-BETA-01',
    paymentMode: 'CASH',
    category: 'CASH'
  }
];

