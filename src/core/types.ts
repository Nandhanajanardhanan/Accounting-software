// Every data shape the app stores. A company's whole file is one CompanyData object.

export type VoucherBase =
  | 'CONTRA' | 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'SALES' | 'PURCHASE'
  | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'MEMORANDUM' | 'REVERSING_JOURNAL'
  | 'STOCK_JOURNAL' | 'PHYSICAL_STOCK' | 'DELIVERY_NOTE' | 'RECEIPT_NOTE'
  | 'REJECTION_IN' | 'REJECTION_OUT' | 'SALES_ORDER' | 'PURCHASE_ORDER'
  | 'PAYROLL' | 'ATTENDANCE';

export type Side = 'DR' | 'CR';
export type Nature = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
export type TaxType = 'VAT' | 'TDS' | 'TCS' | 'OTHER';
export type BankMode = 'CHEQUE' | 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CARD' | 'OTHER';
export type ValuationMethod = 'AVG' | 'FIFO' | 'LAST_PURCHASE';

export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  nature: Nature;
  /** True for groups that sit above the gross-profit line (trading account). */
  grossProfit?: boolean;
  isSystem?: boolean;
}

export interface OpeningBill {
  ref: string;
  date: string;
  /** Signed: Dr positive, Cr negative. */
  amount: number;
  dueDate?: string;
}

export interface Ledger {
  id: string;
  name: string;
  alias?: string;
  groupId: string;
  /** Signed: Dr positive, Cr negative. */
  openingBalance: number;
  isSystem?: boolean;
  // Party details
  mailingName?: string;
  address?: string;
  /** Emirate (or 'Outside UAE'). */
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  country?: string;
  /** UAE VAT Tax Registration Number (15 digits). */
  trn?: string;
  pan?: string;
  billWise?: boolean;
  creditDays?: number;
  creditLimit?: number;
  openingBills?: OpeningBill[];
  // Accounting options
  costCentres?: boolean;
  interestPct?: number;
  currencyId?: string;
  // Tax ledgers
  taxType?: TaxType;
  taxSide?: 'INPUT' | 'OUTPUT';
  taxRate?: number;
  section?: string;
  // Income, expense or service ledgers used on invoices: the VAT rate they usually carry.
  vatRate?: number;
  // Bank ledgers
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  branch?: string;
  // Stock-in-Hand ledgers kept without item-level inventory
  closingStockValue?: number;
  closingStockDate?: string;
}

export interface BillAlloc {
  type: 'NEW' | 'AGST' | 'ADVANCE' | 'ON_ACCOUNT';
  ref: string;
  amount: number;
  dueDate?: string;
}

export interface CostAlloc {
  centreId: string;
  amount: number;
}

export interface BankInfo {
  mode: BankMode;
  instrumentNo?: string;
  instrumentDate?: string;
  /** Date the transaction cleared at the bank. Empty means not reconciled yet. */
  bankDate?: string;
  favouring?: string;
}

export interface ForexInfo {
  currencyId: string;
  fcAmount: number;
  rate: number;
}

export interface VoucherLine {
  id: string;
  ledgerId: string;
  side: Side;
  amount: number;
  bills?: BillAlloc[];
  costs?: CostAlloc[];
  bank?: BankInfo;
  forex?: ForexInfo;
}

export interface StockLine {
  id: string;
  itemId: string;
  godownId?: string;
  qty: number;
  rate: number;
  discountPct?: number;
  amount: number;
  direction: 'IN' | 'OUT';
  vatRate?: number;
  batch?: string;
  expiry?: string;
}

/** A line of work on an invoice or bill: what was done, how much, and which ledger it posts to. */
export interface ServiceLine {
  id: string;
  description: string;
  ledgerId: string;
  qty: number;
  rate: number;
  /** In the company's own currency. */
  amount: number;
  vatRate?: number;
}

/**
 * VAT on one invoice, per rate. `rate` is 5 (standard), 0 (zero-rated) or VAT_EXEMPT (-1).
 * Reverse-charge rows are imports from outside the UAE: you account for the VAT yourself
 * and recover it in the same return, so the supplier is not paid any VAT.
 */
export interface VatRow {
  rate: number;
  taxable: number;
  vat: number;
  reverseCharge?: boolean;
}

export interface PayrollRow {
  employeeId: string;
  days: number;
  earnings: { headId: string; amount: number }[];
  deductions: { headId: string; amount: number }[];
  employer: { headId: string; amount: number }[];
  net: number;
}

export interface AttendanceRow {
  employeeId: string;
  typeId: string;
  value: number;
}

export interface Voucher {
  id: string;
  typeId: string;
  type: VoucherBase;
  number: string;
  date: string;
  lines: VoucherLine[];
  stock?: StockLine[];
  narration?: string;
  reference?: string;
  referenceDate?: string;
  partyId?: string;
  accountLedgerId?: string;
  dueDate?: string;
  isOptional?: boolean;
  isPostDated?: boolean;
  isCancelled?: boolean;
  /** Reversing journals apply up to this date. */
  applicableUpto?: string;
  services?: ServiceLine[];
  /** The project this whole invoice or bill belongs to. */
  projectId?: string;
  /** Currency the invoice was raised in; amounts on the lines stay in the company's own currency. */
  currencyId?: string;
  exchangeRate?: number;
  vat?: VatRow[];
  /** Emirate of supply, for the VAT return. Defaults to the party's emirate. */
  placeOfSupply?: string;
  /** On a receipt or payment made from the invoice screen: the invoice or purchase it settles. Kept in step with it. */
  settlesInvoiceId?: string;
  /** Sales or purchase order this delivery was made against. */
  orderId?: string;
  /** Delivery or receipt notes that an invoice bills. */
  noteIds?: string[];
  /** Goods already moved by a note, so this invoice must not move them again. */
  stockAlreadyMoved?: boolean;
  payroll?: PayrollRow[];
  payrollMonth?: string;
  attendance?: AttendanceRow[];
  createdAt: string;
  updatedAt: string;
}

export interface VoucherTypeMaster {
  id: string;
  name: string;
  base: VoucherBase;
  prefix: string;
  autoNumber: boolean;
  isSystem?: boolean;
}

export interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  /** Value of one unit in the company's base currency. */
  rate: number;
}

export interface CostCategory { id: string; name: string }

/** A project. Tally calls these cost centres; income and spending can be tagged to one. */
export interface CostCentre {
  id: string;
  name: string;
  categoryId?: string;
  parentId?: string;
  clientId?: string;
  status?: 'ACTIVE' | 'ON_HOLD' | 'DONE';
  /** The price agreed with the client. */
  quote?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface BudgetLine { kind: 'GROUP' | 'LEDGER'; refId: string; amount: number }
export interface Budget { id: string; name: string; from: string; to: string; lines: BudgetLine[] }

export interface Scenario {
  id: string;
  name: string;
  includeOptional: boolean;
  includeMemo: boolean;
  includeReversing: boolean;
}

export interface StockGroup { id: string; name: string; parentId?: string }
export interface StockCategory { id: string; name: string }
export interface Unit { id: string; symbol: string; name: string; decimals: number }
export interface Godown { id: string; name: string; address?: string }

export interface BomLine { itemId: string; qty: number }

export interface StockItem {
  id: string;
  name: string;
  alias?: string;
  groupId?: string;
  categoryId?: string;
  unitId: string;
  vatRate?: number;
  openingQty: number;
  openingRate: number;
  openingGodownId?: string;
  purchasePrice?: number;
  salePrice?: number;
  reorderLevel?: number;
  minOrderQty?: number;
  bom?: BomLine[];
}

export interface EmployeeGroup { id: string; name: string }

export interface SalaryLine {
  headId: string;
  /** Monthly amount for flat heads; ignored for percentage heads. */
  amount?: number;
}

export interface Employee {
  id: string;
  name: string;
  groupId?: string;
  code?: string;
  designation?: string;
  joinDate?: string;
  pan?: string;
  pfNo?: string;
  esiNo?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  salary: SalaryLine[];
}

export type PayHeadKind = 'EARNING' | 'DEDUCTION' | 'EMPLOYER';
export type PayCalc = 'FLAT' | 'ATTENDANCE' | 'PERCENT';

export interface PayHead {
  id: string;
  name: string;
  kind: PayHeadKind;
  calc: PayCalc;
  pct?: number;
  /** Heads the percentage is worked out on. */
  basisHeadIds?: string[];
  /** Ledger the head posts to. Employer heads post expense here and owe the liability ledger. */
  ledgerId: string;
  liabilityLedgerId?: string;
  statutory?: 'PF' | 'ESI' | 'PT' | 'TDS';
}

export interface AttendanceType {
  id: string;
  name: string;
  effect: 'PRESENT' | 'ABSENT' | 'OVERTIME';
  unit: string;
}

export interface SavingsConfig {
  emergencyReservePct: number;
  taxBufferPct: number;
  expansionReservePct: number;
  generalSavingsPct: number;
  monthlyBurnRateEstimate: number;
  annualReturnRatePct: number;
}

export interface Features {
  inventory: boolean;
  vat: boolean;
  tds: boolean;
  tcs: boolean;
  costCentres: boolean;
  payroll: boolean;
  billWise: boolean;
  interest: boolean;
  budgets: boolean;
  orders: boolean;
  multiCurrency: boolean;
  batches: boolean;
}

export interface CompanySettings {
  id: string;
  name: string;
  ownerName?: string;
  profession?: string;
  mailingName?: string;
  address?: string;
  /** Emirate (or 'Outside UAE'). */
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  upiId?: string;
  /** Bank account printed on invoices so clients know where to pay. */
  invoiceBankLedgerId?: string;
  invoiceTerms?: string;
  /** UAE VAT Tax Registration Number (15 digits). */
  trn?: string;
  pan?: string;
  tan?: string;
  currencySymbol: string;
  currencyCode: string;
  fyStart: string;
  booksFrom: string;
  currentDate: string;
  periodFrom: string;
  periodTo: string;
  valuation: ValuationMethod;
  features: Features;
  /** SHA-256 of salt + password. A screen lock only; the file itself is not encrypted. */
  passwordSalt?: string;
  passwordHash?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  action: 'CREATE' | 'ALTER' | 'DELETE' | 'CANCEL' | 'RESTORE';
  entity: string;
  refId: string;
  label: string;
  before?: string;
  after?: string;
}

export interface CompanyData {
  version: 2;
  company: CompanySettings;
  groups: Group[];
  ledgers: Ledger[];
  voucherTypes: VoucherTypeMaster[];
  vouchers: Voucher[];
  currencies: Currency[];
  costCategories: CostCategory[];
  costCentres: CostCentre[];
  budgets: Budget[];
  scenarios: Scenario[];
  stockGroups: StockGroup[];
  stockCategories: StockCategory[];
  units: Unit[];
  godowns: Godown[];
  stockItems: StockItem[];
  employeeGroups: EmployeeGroup[];
  employees: Employee[];
  payHeads: PayHead[];
  attendanceTypes: AttendanceType[];
  savings: SavingsConfig;
  auditLog: AuditEntry[];
}
