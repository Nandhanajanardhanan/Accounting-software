import type {
  CompanyData, CompanySettings, Features, Group, Ledger, SavingsConfig, VoucherBase, VoucherTypeMaster,
} from './types.ts';

// Group ids used by the engine and screens.
export const G = {
  capital: 'g_capital', loans: 'g_loans', currentLiabilities: 'g_cl', fixedAssets: 'g_fa',
  investments: 'g_inv', currentAssets: 'g_ca', branch: 'g_branch', misc: 'g_misc', suspense: 'g_suspense',
  sales: 'g_sales', purchase: 'g_purchase', directIncome: 'g_di', directExpense: 'g_de',
  indirectIncome: 'g_ii', indirectExpense: 'g_ie',
  reserves: 'g_reserves', bankOd: 'g_bank_od', secured: 'g_secured', unsecured: 'g_unsecured',
  duties: 'g_duties', provisions: 'g_provisions', creditors: 'g_creditors',
  stock: 'g_stock', deposits: 'g_deposits', advances: 'g_advances', debtors: 'g_debtors',
  cash: 'g_cash', bank: 'g_bank',
} as const;

export const PNL_LEDGER_ID = 'led_pnl';
export const CASH_LEDGER_ID = 'led_cash';

// The same 28 groups TallyPrime creates for every company: 15 primary and 13 sub-groups.
export const DEFAULT_GROUPS: Group[] = [
  { id: G.capital, name: 'Capital Account', parentId: null, nature: 'LIABILITY', isSystem: true },
  { id: G.loans, name: 'Loans (Liability)', parentId: null, nature: 'LIABILITY', isSystem: true },
  { id: G.currentLiabilities, name: 'Current Liabilities', parentId: null, nature: 'LIABILITY', isSystem: true },
  { id: G.fixedAssets, name: 'Fixed Assets', parentId: null, nature: 'ASSET', isSystem: true },
  { id: G.investments, name: 'Investments', parentId: null, nature: 'ASSET', isSystem: true },
  { id: G.currentAssets, name: 'Current Assets', parentId: null, nature: 'ASSET', isSystem: true },
  { id: G.branch, name: 'Branch / Divisions', parentId: null, nature: 'LIABILITY', isSystem: true },
  { id: G.misc, name: 'Misc. Expenses (ASSET)', parentId: null, nature: 'ASSET', isSystem: true },
  { id: G.suspense, name: 'Suspense A/c', parentId: null, nature: 'LIABILITY', isSystem: true },
  { id: G.sales, name: 'Sales Accounts', parentId: null, nature: 'INCOME', grossProfit: true, isSystem: true },
  { id: G.purchase, name: 'Purchase Accounts', parentId: null, nature: 'EXPENSE', grossProfit: true, isSystem: true },
  { id: G.directIncome, name: 'Direct Incomes', parentId: null, nature: 'INCOME', grossProfit: true, isSystem: true },
  { id: G.directExpense, name: 'Direct Expenses', parentId: null, nature: 'EXPENSE', grossProfit: true, isSystem: true },
  { id: G.indirectIncome, name: 'Indirect Incomes', parentId: null, nature: 'INCOME', isSystem: true },
  { id: G.indirectExpense, name: 'Indirect Expenses', parentId: null, nature: 'EXPENSE', isSystem: true },
  { id: G.reserves, name: 'Reserves & Surplus', parentId: G.capital, nature: 'LIABILITY', isSystem: true },
  { id: G.bankOd, name: 'Bank OD A/c', parentId: G.loans, nature: 'LIABILITY', isSystem: true },
  { id: G.secured, name: 'Secured Loans', parentId: G.loans, nature: 'LIABILITY', isSystem: true },
  { id: G.unsecured, name: 'Unsecured Loans', parentId: G.loans, nature: 'LIABILITY', isSystem: true },
  { id: G.duties, name: 'Duties & Taxes', parentId: G.currentLiabilities, nature: 'LIABILITY', isSystem: true },
  { id: G.provisions, name: 'Provisions', parentId: G.currentLiabilities, nature: 'LIABILITY', isSystem: true },
  { id: G.creditors, name: 'Sundry Creditors', parentId: G.currentLiabilities, nature: 'LIABILITY', isSystem: true },
  { id: G.stock, name: 'Stock-in-Hand', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.deposits, name: 'Deposits (Asset)', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.advances, name: 'Loans & Advances (Asset)', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.debtors, name: 'Sundry Debtors', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.cash, name: 'Cash-in-Hand', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.bank, name: 'Bank Accounts', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
];

export type EditorMode = 'SIMPLE' | 'JOURNAL' | 'INVOICE' | 'NOTE' | 'STOCK_JOURNAL' | 'PHYSICAL' | 'PAYROLL' | 'ATTENDANCE';

export interface VoucherMeta {
  label: string;
  prefix: string;
  /** Plain-language explanation shown on screen for people new to accounting. */
  plain: string;
  key?: string;
  mode: EditorMode;
  /** Posts to the ledgers. */
  accounts: boolean;
  /** Moves stock quantities. */
  stock: boolean;
  feature?: keyof Features;
}

export const VOUCHER_META: Record<VoucherBase, VoucherMeta> = {
  PAYMENT: { label: 'Payment', prefix: 'PAY', plain: 'Money going out: paying an expense or a supplier.', key: 'F5', mode: 'SIMPLE', accounts: true, stock: false },
  RECEIPT: { label: 'Receipt', prefix: 'REC', plain: 'Money coming in: a customer paid you, or other income.', key: 'F6', mode: 'SIMPLE', accounts: true, stock: false },
  CONTRA: { label: 'Contra', prefix: 'CNT', plain: 'Moving your own money: cash to bank, bank to cash, or bank to bank.', key: 'F4', mode: 'SIMPLE', accounts: true, stock: false },
  JOURNAL: { label: 'Journal', prefix: 'JRN', plain: 'Adjustments with no cash involved, such as depreciation or corrections.', key: 'F7', mode: 'JOURNAL', accounts: true, stock: false },
  SALES: { label: 'Sales', prefix: 'SAL', plain: 'You sold goods or services. Creates an invoice.', key: 'F8', mode: 'INVOICE', accounts: true, stock: true },
  PURCHASE: { label: 'Purchase', prefix: 'PUR', plain: 'You bought goods or services. Records the supplier bill.', key: 'F9', mode: 'INVOICE', accounts: true, stock: true },
  CREDIT_NOTE: { label: 'Credit Note', prefix: 'CN', plain: 'A customer returned goods, or you reduced their bill.', key: 'Ctrl+F8', mode: 'INVOICE', accounts: true, stock: true },
  DEBIT_NOTE: { label: 'Debit Note', prefix: 'DN', plain: 'You returned goods to a supplier, or they reduced your bill.', key: 'Ctrl+F9', mode: 'INVOICE', accounts: true, stock: true },
  MEMORANDUM: { label: 'Memorandum', prefix: 'MEM', plain: 'A note of an entry you are unsure about. Stays out of your books until converted.', key: 'Ctrl+F10', mode: 'JOURNAL', accounts: false, stock: false },
  REVERSING_JOURNAL: { label: 'Reversing Journal', prefix: 'RJ', plain: 'A what-if adjustment used only in scenario reports. Stays out of your books.', mode: 'JOURNAL', accounts: false, stock: false, feature: 'budgets' },
  STOCK_JOURNAL: { label: 'Stock Journal', prefix: 'SJ', plain: 'Move stock between godowns, or use materials to make finished goods.', key: 'Alt+F7', mode: 'STOCK_JOURNAL', accounts: false, stock: true, feature: 'inventory' },
  PHYSICAL_STOCK: { label: 'Physical Stock', prefix: 'PS', plain: 'Enter what you actually counted. The difference corrects your stock.', key: 'Ctrl+F7', mode: 'PHYSICAL', accounts: false, stock: true, feature: 'inventory' },
  DELIVERY_NOTE: { label: 'Delivery Note', prefix: 'DLN', plain: 'Goods sent to a customer, not billed yet.', key: 'Alt+F8', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  RECEIPT_NOTE: { label: 'Receipt Note', prefix: 'GRN', plain: 'Goods received from a supplier, bill not recorded yet.', key: 'Alt+F9', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  REJECTION_IN: { label: 'Rejection In', prefix: 'RIN', plain: 'A customer sent back goods you delivered but had not billed.', key: 'Ctrl+F6', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  REJECTION_OUT: { label: 'Rejection Out', prefix: 'ROT', plain: 'You sent back goods you received but had not been billed for.', key: 'Alt+F6', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  SALES_ORDER: { label: 'Sales Order', prefix: 'SO', plain: 'A customer placed an order. Nothing moves until you deliver.', key: 'Alt+F5', mode: 'NOTE', accounts: false, stock: false, feature: 'orders' },
  PURCHASE_ORDER: { label: 'Purchase Order', prefix: 'PO', plain: 'You placed an order with a supplier. Nothing moves until it arrives.', mode: 'NOTE', accounts: false, stock: false, feature: 'orders' },
  PAYROLL: { label: 'Payroll', prefix: 'PRL', plain: 'Calculate and record salaries for your employees.', mode: 'PAYROLL', accounts: true, stock: false, feature: 'payroll' },
  ATTENDANCE: { label: 'Attendance', prefix: 'ATT', plain: 'Record days present, absent and overtime for your employees.', mode: 'ATTENDANCE', accounts: false, stock: false, feature: 'payroll' },
};

export const VOUCHER_ORDER = Object.keys(VOUCHER_META) as VoucherBase[];

export const DEFAULT_VOUCHER_TYPES: VoucherTypeMaster[] = VOUCHER_ORDER.map(base => ({
  id: `vt_${base.toLowerCase()}`,
  name: VOUCHER_META[base].label,
  base,
  prefix: VOUCHER_META[base].prefix,
  autoNumber: true,
  isSystem: true,
}));

export const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const DEFAULT_FEATURES: Features = {
  inventory: true, gst: true, tds: false, tcs: false, costCentres: false, payroll: false,
  billWise: true, interest: false, budgets: false, orders: false, multiCurrency: false, batches: false,
};

export const DEFAULT_SAVINGS: SavingsConfig = {
  emergencyReservePct: 25, taxBufferPct: 20, expansionReservePct: 25, generalSavingsPct: 30,
  monthlyBurnRateEstimate: 45000, annualReturnRatePct: 7.5,
};

/** The Indian financial year containing a date: 1 April to 31 March. */
export function financialYearFor(date: string): { from: string; to: string } {
  const [y, m] = date.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

const gstLedger = (id: string, name: string, taxType: 'CGST' | 'SGST' | 'IGST', taxSide: 'INPUT' | 'OUTPUT'): Ledger => ({
  id, name, groupId: G.duties, openingBalance: 0, taxType, taxSide,
});

export const GST_LEDGERS: Ledger[] = [
  gstLedger('led_gst_out_cgst', 'Output CGST', 'CGST', 'OUTPUT'),
  gstLedger('led_gst_out_sgst', 'Output SGST', 'SGST', 'OUTPUT'),
  gstLedger('led_gst_out_igst', 'Output IGST', 'IGST', 'OUTPUT'),
  gstLedger('led_gst_in_cgst', 'Input CGST', 'CGST', 'INPUT'),
  gstLedger('led_gst_in_sgst', 'Input SGST', 'SGST', 'INPUT'),
  gstLedger('led_gst_in_igst', 'Input IGST', 'IGST', 'INPUT'),
];

export const ROUND_OFF_LEDGER_ID = 'led_round_off';

// A blank company starts with the ledgers almost every business needs on day one.
export const STARTER_LEDGERS: Ledger[] = [
  { id: CASH_LEDGER_ID, name: 'Cash', groupId: G.cash, openingBalance: 0, isSystem: true },
  { id: PNL_LEDGER_ID, name: 'Profit & Loss A/c', groupId: '', openingBalance: 0, isSystem: true },
  { id: 'led_capital', name: 'Capital Account', groupId: G.capital, openingBalance: 0 },
  { id: 'led_sales', name: 'Sales', groupId: G.sales, openingBalance: 0 },
  { id: 'led_purchase', name: 'Purchases', groupId: G.purchase, openingBalance: 0 },
  { id: ROUND_OFF_LEDGER_ID, name: 'Round Off', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_rent', name: 'Rent', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_salary', name: 'Salaries & Wages', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_power', name: 'Electricity', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_phone', name: 'Phone & Internet', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_travel', name: 'Travel', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_office', name: 'Office Expenses', groupId: G.indirectExpense, openingBalance: 0 },
  { id: 'led_exp_bank', name: 'Bank Charges', groupId: G.indirectExpense, openingBalance: 0 },
];

export interface NewCompanyInput {
  name: string;
  state?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  currencySymbol?: string;
  currencyCode?: string;
  fyStart: string;
  features?: Partial<Features>;
  today: string;
}

export function blankCompany(input: NewCompanyInput): CompanyData {
  const features = { ...DEFAULT_FEATURES, ...input.features };
  const fyEnd = `${Number(input.fyStart.slice(0, 4)) + 1}${input.fyStart.slice(4, 8)}${input.fyStart.slice(8)}`;
  const company: CompanySettings = {
    id: `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    state: input.state,
    address: input.address,
    gstin: input.gstin,
    pan: input.pan,
    phone: input.phone,
    email: input.email,
    currencySymbol: input.currencySymbol ?? '₹',
    currencyCode: input.currencyCode ?? 'INR',
    fyStart: input.fyStart,
    booksFrom: input.fyStart,
    currentDate: input.today,
    periodFrom: input.fyStart,
    periodTo: previousDay(fyEnd),
    valuation: 'AVG',
    features,
  };
  return {
    version: 2,
    company,
    groups: DEFAULT_GROUPS.map(g => ({ ...g })),
    ledgers: [...STARTER_LEDGERS, ...(features.gst ? GST_LEDGERS : [])].map(l => ({ ...l })),
    voucherTypes: DEFAULT_VOUCHER_TYPES.map(t => ({ ...t })),
    vouchers: [],
    currencies: [],
    costCategories: [{ id: 'cc_primary', name: 'Primary Cost Category' }],
    costCentres: [],
    budgets: [],
    scenarios: [],
    stockGroups: [],
    stockCategories: [],
    units: [
      { id: 'u_nos', symbol: 'Nos', name: 'Numbers', decimals: 0 },
      { id: 'u_pcs', symbol: 'Pcs', name: 'Pieces', decimals: 0 },
      { id: 'u_kg', symbol: 'Kg', name: 'Kilograms', decimals: 3 },
      { id: 'u_ltr', symbol: 'Ltr', name: 'Litres', decimals: 3 },
      { id: 'u_box', symbol: 'Box', name: 'Boxes', decimals: 0 },
    ],
    godowns: [{ id: 'gd_main', name: 'Main Location' }],
    stockItems: [],
    employeeGroups: [],
    employees: [],
    payHeads: [],
    attendanceTypes: [
      { id: 'at_present', name: 'Present', effect: 'PRESENT', unit: 'Days' },
      { id: 'at_absent', name: 'Absent', effect: 'ABSENT', unit: 'Days' },
      { id: 'at_ot', name: 'Overtime', effect: 'OVERTIME', unit: 'Hours' },
    ],
    savings: { ...DEFAULT_SAVINGS },
    auditLog: [],
  };
}

function previousDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
