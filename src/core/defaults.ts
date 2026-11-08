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
export const ROUND_OFF_LEDGER_ID = 'led_round_off';
export const TDS_RECEIVABLE_LEDGER_ID = 'led_tds_receivable';
export const PROFESSIONAL_FEES_LEDGER_ID = 'led_fees';

// The same 28 groups TallyPrime creates: 15 primary and 13 sub-groups.
// Debtors and creditors carry the words a freelancer uses for them.
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
  { id: G.creditors, name: 'Sundry Creditors (Vendors)', parentId: G.currentLiabilities, nature: 'LIABILITY', isSystem: true },
  { id: G.stock, name: 'Stock-in-Hand', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.deposits, name: 'Deposits (Asset)', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.advances, name: 'Loans & Advances (Asset)', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.debtors, name: 'Sundry Debtors (Clients)', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.cash, name: 'Cash-in-Hand', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
  { id: G.bank, name: 'Bank Accounts', parentId: G.currentAssets, nature: 'ASSET', isSystem: true },
];

export type EditorMode = 'SIMPLE' | 'JOURNAL' | 'INVOICE' | 'NOTE' | 'STOCK_JOURNAL' | 'PHYSICAL' | 'PAYROLL' | 'ATTENDANCE';

export interface VoucherMeta {
  label: string;
  /** Tally's own name, shown so nothing is unfamiliar to people who know it. */
  tallyName: string;
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
  SALES: { label: 'Invoice', tallyName: 'Sales', prefix: 'INV', plain: 'Bill a client for your work.', key: 'F8', mode: 'INVOICE', accounts: true, stock: true },
  RECEIPT: { label: 'Receipt', tallyName: 'Receipt', prefix: 'REC', plain: 'A client paid you, or other money came in.', key: 'F6', mode: 'SIMPLE', accounts: true, stock: false },
  PAYMENT: { label: 'Payment', tallyName: 'Payment', prefix: 'PAY', plain: 'Money went out: an expense, a vendor, tax, or money you took for yourself.', key: 'F5', mode: 'SIMPLE', accounts: true, stock: false },
  PURCHASE: { label: 'Purchase', tallyName: 'Purchase', prefix: 'BILL', plain: 'A supplier or subcontractor billed you for goods or services, and you will pay later.', key: 'F9', mode: 'INVOICE', accounts: true, stock: true },
  CONTRA: { label: 'Transfer', tallyName: 'Contra', prefix: 'TRF', plain: 'Moving your own money: cash to bank, bank to cash, or bank to bank.', key: 'F4', mode: 'SIMPLE', accounts: true, stock: false },
  JOURNAL: { label: 'Journal', tallyName: 'Journal', prefix: 'JRN', plain: 'An adjustment with no cash involved, such as depreciation or a correction.', key: 'F7', mode: 'JOURNAL', accounts: true, stock: false },
  CREDIT_NOTE: { label: 'Credit Note', tallyName: 'Credit Note', prefix: 'CN', plain: 'You reduced what a client owes, such as a discount or refund on an invoice.', key: 'Ctrl+F8', mode: 'INVOICE', accounts: true, stock: true },
  DEBIT_NOTE: { label: 'Debit Note', tallyName: 'Debit Note', prefix: 'DN', plain: 'A vendor reduced what you owe them on a bill.', key: 'Ctrl+F9', mode: 'INVOICE', accounts: true, stock: true },
  MEMORANDUM: { label: 'Memo', tallyName: 'Memorandum', prefix: 'MEM', plain: 'A note of an entry you are unsure about. Stays out of your books until you convert it.', key: 'Ctrl+F10', mode: 'JOURNAL', accounts: false, stock: false },
  REVERSING_JOURNAL: { label: 'Reversing Journal', tallyName: 'Reversing Journal', prefix: 'RJ', plain: 'A what-if adjustment used only in scenario reports. Stays out of your books.', mode: 'JOURNAL', accounts: false, stock: false, feature: 'budgets' },
  SALES_ORDER: { label: 'Client Order', tallyName: 'Sales Order', prefix: 'SO', plain: 'A client ordered goods. Nothing moves until you deliver.', key: 'Alt+F5', mode: 'NOTE', accounts: false, stock: false, feature: 'orders' },
  PURCHASE_ORDER: { label: 'Vendor Order', tallyName: 'Purchase Order', prefix: 'PO', plain: 'You ordered goods from a vendor. Nothing moves until they arrive.', mode: 'NOTE', accounts: false, stock: false, feature: 'orders' },
  STOCK_JOURNAL: { label: 'Stock Journal', tallyName: 'Stock Journal', prefix: 'SJ', plain: 'Move stock between locations, or use materials to make finished goods.', key: 'Alt+F7', mode: 'STOCK_JOURNAL', accounts: false, stock: true, feature: 'inventory' },
  PHYSICAL_STOCK: { label: 'Physical Stock', tallyName: 'Physical Stock', prefix: 'PS', plain: 'Enter what you actually counted. The difference corrects your stock.', key: 'Ctrl+F7', mode: 'PHYSICAL', accounts: false, stock: true, feature: 'inventory' },
  DELIVERY_NOTE: { label: 'Delivery Note', tallyName: 'Delivery Note', prefix: 'DLN', plain: 'Goods sent to a client, not billed yet.', key: 'Alt+F8', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  RECEIPT_NOTE: { label: 'Receipt Note', tallyName: 'Receipt Note', prefix: 'GRN', plain: 'Goods received from a vendor, bill not recorded yet.', key: 'Alt+F9', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  REJECTION_IN: { label: 'Rejection In', tallyName: 'Rejection In', prefix: 'RIN', plain: 'A client sent back goods you delivered but had not billed.', key: 'Ctrl+F6', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  REJECTION_OUT: { label: 'Rejection Out', tallyName: 'Rejection Out', prefix: 'ROT', plain: 'You sent back goods you received but had not been billed for.', key: 'Alt+F6', mode: 'NOTE', accounts: false, stock: true, feature: 'inventory' },
  PAYROLL: { label: 'Payroll', tallyName: 'Payroll', prefix: 'PRL', plain: 'Calculate and record salaries, if you employ staff.', mode: 'PAYROLL', accounts: true, stock: false, feature: 'payroll' },
  ATTENDANCE: { label: 'Attendance', tallyName: 'Attendance', prefix: 'ATT', plain: 'Record days present, absent and overtime for your staff.', mode: 'ATTENDANCE', accounts: false, stock: false, feature: 'payroll' },
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

/** The seven emirates, in the order the VAT 201 return lists them (boxes 1a to 1g). */
export const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
export const OUTSIDE_UAE = 'Outside UAE';
export const UAE_PLACES = [...EMIRATES, OUTSIDE_UAE];

/** Marks an exempt supply (such as residential rent or some financial services): no VAT, reported in box 5. */
export const VAT_EXEMPT = -1;
export const STANDARD_VAT_RATE = 5;
/** Choices on invoices and ledgers: standard 5%, zero-rated 0% (exports, some education and health care), or exempt. */
export const VAT_RATES = [STANDARD_VAT_RATE, 0, VAT_EXEMPT];
export const vatRateLabel = (rate?: number) => (rate === undefined ? 'No VAT' : rate === VAT_EXEMPT ? 'Exempt' : `${rate}%`);

// A freelancer starts simple. Everything else is one switch away in Features (F11).
export const DEFAULT_FEATURES: Features = {
  inventory: false, vat: true, tds: false, tcs: false, costCentres: true, payroll: false,
  billWise: true, interest: false, budgets: false, orders: false, multiCurrency: false, batches: false,
};

export const FEATURE_INFO: { key: keyof Features; label: string; plain: string; group: string }[] = [
  { key: 'costCentres', label: 'Projects', plain: 'Tag income and spending to a project, and see the profit on each. Tally calls these cost centres.', group: 'Your work' },
  { key: 'billWise', label: 'Invoice tracking', plain: 'Track which invoices are paid, part paid or overdue. Tally calls this bill-wise details.', group: 'Your work' },
  { key: 'multiCurrency', label: 'Foreign clients', plain: 'Invoice and receive money in other currencies.', group: 'Your work' },
  { key: 'vat', label: 'UAE VAT', plain: 'Add 5% VAT to invoices and bills (or zero-rated and exempt), and get your VAT 201 return figures.', group: 'Tax' },
  { key: 'budgets', label: 'Budgets and scenarios', plain: 'Set spending targets, and test what-if entries.', group: 'Planning' },
  { key: 'interest', label: 'Interest calculation', plain: 'Work out interest on loans or late payments.', group: 'Planning' },
  { key: 'inventory', label: 'Inventory', plain: 'Track goods, stock levels and locations, if you sell products as well.', group: 'If your business grows' },
  { key: 'orders', label: 'Orders', plain: 'Client and vendor orders for goods. Needs Inventory.', group: 'If your business grows' },
  { key: 'batches', label: 'Batches and expiry', plain: 'Record a batch and expiry date on stock lines. Needs Inventory.', group: 'If your business grows' },
  { key: 'payroll', label: 'Payroll', plain: 'Employees, attendance, salaries and pay slips, if you hire staff.', group: 'If your business grows' },
];

export const DEFAULT_SAVINGS: SavingsConfig = {
  emergencyReservePct: 25, taxBufferPct: 30, expansionReservePct: 15, generalSavingsPct: 30,
  monthlyBurnRateEstimate: 10000, annualReturnRatePct: 4,
};

/** VAT you charge on sales (owed to the FTA) and VAT you pay on purchases (recoverable). */
export const VAT_LEDGERS: Ledger[] = [
  { id: 'led_vat_output', name: 'Output VAT', groupId: G.duties, openingBalance: 0, taxType: 'VAT', taxSide: 'OUTPUT', taxRate: STANDARD_VAT_RATE },
  { id: 'led_vat_input', name: 'Input VAT (Recoverable)', groupId: G.duties, openingBalance: 0, taxType: 'VAT', taxSide: 'INPUT', taxRate: STANDARD_VAT_RATE },
];

const expense = (id: string, name: string, groupId: string = G.indirectExpense): Ledger => ({ id, name, groupId, openingBalance: 0, costCentres: true });

// A new business starts with the accounts almost every freelancer needs on day one.
export const STARTER_LEDGERS: Ledger[] = [
  { id: CASH_LEDGER_ID, name: 'Cash', groupId: G.cash, openingBalance: 0, isSystem: true },
  { id: PNL_LEDGER_ID, name: 'Profit & Loss A/c', groupId: '', openingBalance: 0, isSystem: true },
  { id: 'led_capital', name: 'Owner Capital', groupId: G.capital, openingBalance: 0 },
  { id: 'led_drawings', name: 'Owner Drawings', groupId: G.capital, openingBalance: 0 },
  { id: PROFESSIONAL_FEES_LEDGER_ID, name: 'Professional Fees', groupId: G.sales, openingBalance: 0, costCentres: true },
  { id: 'led_purchase', name: 'Purchases', groupId: G.purchase, openingBalance: 0, costCentres: true },
  { id: ROUND_OFF_LEDGER_ID, name: 'Round Off', groupId: G.indirectExpense, openingBalance: 0 },
  expense('led_exp_subcontract', 'Subcontractor Fees', G.directExpense),
  expense('led_exp_software', 'Software & Subscriptions'),
  expense('led_exp_hosting', 'Cloud & Hosting'),
  expense('led_exp_internet', 'Internet & Phone'),
  expense('led_exp_rent', 'Office or Co-working Rent'),
  expense('led_exp_travel', 'Travel'),
  expense('led_exp_equipment', 'Equipment & Repairs'),
  expense('led_exp_learning', 'Books & Courses'),
  expense('led_exp_marketing', 'Marketing'),
  expense('led_exp_professional', 'Accounting & Legal Fees'),
  expense('led_exp_office', 'Office Expenses'),
  { id: 'led_exp_bank', name: 'Bank Charges', groupId: G.indirectExpense, openingBalance: 0 },
];

export interface NewCompanyInput {
  name: string;
  ownerName?: string;
  profession?: string;
  state?: string;
  address?: string;
  trn?: string;
  pan?: string;
  phone?: string;
  email?: string;
  currencySymbol?: string;
  currencyCode?: string;
  fyStart: string;
  features?: Partial<Features>;
  today: string;
  /** Creates a bank ledger straight away, so the first receipt has somewhere to go. */
  bankName?: string;
  bankOpening?: number;
  cashOpening?: number;
}

export function blankCompany(input: NewCompanyInput): CompanyData {
  const features = { ...DEFAULT_FEATURES, ...input.features };
  const fyEnd = `${Number(input.fyStart.slice(0, 4)) + 1}${input.fyStart.slice(4)}`;
  const company: CompanySettings = {
    id: `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    ownerName: input.ownerName,
    profession: input.profession,
    state: input.state,
    address: input.address,
    trn: input.trn,
    pan: input.pan,
    phone: input.phone,
    email: input.email,
    currencySymbol: input.currencySymbol ?? 'AED ',
    currencyCode: input.currencyCode ?? 'AED',
    fyStart: input.fyStart,
    booksFrom: input.fyStart,
    currentDate: input.today,
    periodFrom: input.fyStart,
    periodTo: previousDay(fyEnd),
    valuation: 'AVG',
    features,
  };
  const ledgers = [...STARTER_LEDGERS, ...(features.vat ? VAT_LEDGERS : [])].map(l => ({ ...l }));
  const cashOpening = input.cashOpening ?? 0;
  const bankOpening = input.bankOpening ?? 0;
  ledgers.find(l => l.id === CASH_LEDGER_ID)!.openingBalance = cashOpening;
  if (input.bankName) {
    ledgers.push({ id: 'led_bank_main', name: input.bankName, groupId: G.bank, openingBalance: bankOpening, bankName: input.bankName });
    company.invoiceBankLedgerId = 'led_bank_main';
  }
  // What you start with came from you, so opening money is balanced by owner capital.
  ledgers.find(l => l.id === 'led_capital')!.openingBalance = -(cashOpening + (input.bankName ? bankOpening : 0));
  return {
    version: 2,
    company,
    groups: DEFAULT_GROUPS.map(g => ({ ...g })),
    ledgers,
    voucherTypes: DEFAULT_VOUCHER_TYPES.map(t => ({ ...t })),
    vouchers: [],
    currencies: [],
    costCategories: [{ id: 'cc_primary', name: 'All Projects' }],
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
