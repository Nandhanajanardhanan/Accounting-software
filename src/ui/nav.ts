// Every destination in the app, in one list. The sidebar, hub pages and the Go To search all read from it.
import type { Features, VoucherBase } from '../core/types';

export interface Destination {
  label: string;
  to: string;
  section: string;
  /** One plain sentence on what the screen is for. */
  plain: string;
  feature?: keyof Features;
  keywords?: string;
}

export const newVoucher = (base: VoucherBase) => `/voucher/new/${base}`;

export const DESTINATIONS: Destination[] = [
  // Your work
  { label: 'Invoices', to: '/invoices', section: 'Your work', plain: 'What you have billed clients, and what they still owe.', keywords: 'sales invoice billing unpaid' },
  { label: 'Purchases', to: '/bills', section: 'Your work', plain: 'What suppliers have billed you, and what you still owe.', keywords: 'purchase bills vendor supplier' },
  { label: 'Clients', to: '/clients', section: 'Your work', plain: 'Who you work for.', keywords: 'customer debtors party' },
  { label: 'Vendors', to: '/vendors', section: 'Your work', plain: 'Who you buy from or subcontract to.', keywords: 'supplier creditors subcontractor party' },
  { label: 'Projects', to: '/projects', section: 'Your work', plain: 'The profit on each piece of work.', feature: 'costCentres', keywords: 'cost centre job' },
  // Masters
  { label: 'Ledgers', to: '/masters/ledgers', section: 'Accounts', plain: 'Every account: customers, suppliers, banks, expenses and income.', keywords: 'accounts party customer supplier chart of accounts' },
  { label: 'Groups', to: '/masters/groups', section: 'Accounts', plain: 'How ledgers are organised on your Balance Sheet and Profit & Loss.', keywords: 'chart of accounts' },
  { label: 'Entry Types', to: '/masters/voucher-types', section: 'Accounts', plain: 'Kinds of entry and how they are numbered. Add your own, such as Retainer Invoice.', keywords: 'voucher types' },
  { label: 'Currencies', to: '/masters/currencies', section: 'Accounts', plain: 'Foreign currencies and their exchange rates.', feature: 'multiCurrency', keywords: 'forex exchange' },
  { label: 'Project Categories', to: '/masters/cost-categories', section: 'Accounts', plain: 'Optional groupings for your projects.', feature: 'costCentres', keywords: 'cost categories' },
  { label: 'Budgets', to: '/masters/budgets', section: 'Accounts', plain: 'Spending and income targets for a period.', feature: 'budgets' },
  { label: 'Scenarios', to: '/masters/scenarios', section: 'Accounts', plain: 'What-if views that include entries kept out of your books.', feature: 'budgets' },
  // Inventory masters
  { label: 'Stock Items', to: '/masters/stock-items', section: 'Inventory', plain: 'The goods you buy and sell, with prices, VAT and opening stock.', feature: 'inventory', keywords: 'product goods' },
  { label: 'Stock Groups', to: '/masters/stock-groups', section: 'Inventory', plain: 'Group similar items together.', feature: 'inventory' },
  { label: 'Stock Categories', to: '/masters/stock-categories', section: 'Inventory', plain: 'A second, optional way to classify items.', feature: 'inventory' },
  { label: 'Units of Measure', to: '/masters/units', section: 'Inventory', plain: 'Pieces, boxes, kilograms and so on.', feature: 'inventory', keywords: 'uom' },
  { label: 'Stock Locations', to: '/masters/godowns', section: 'Inventory', plain: 'The places you keep stock.', feature: 'inventory', keywords: 'godowns warehouse' },
  // Inventory reports
  { label: 'Stock Summary', to: '/inventory/summary', section: 'Inventory Reports', plain: 'What you have, what came in, what went out, and its value.', feature: 'inventory', keywords: 'closing stock valuation' },
  { label: 'Stock by Location', to: '/inventory/godowns', section: 'Inventory Reports', plain: 'How much of each item is at each location.', feature: 'inventory', keywords: 'godown summary warehouse' },
  { label: 'Movement Analysis', to: '/inventory/movement', section: 'Inventory Reports', plain: 'Who you bought from and sold to, item by item.', feature: 'inventory' },
  { label: 'Stock Ageing', to: '/inventory/ageing', section: 'Inventory Reports', plain: 'How long your stock has been sitting unsold.', feature: 'inventory', keywords: 'ageing analysis' },
  { label: 'Reorder Status', to: '/inventory/reorder', section: 'Inventory Reports', plain: 'Items running low that you should buy again.', feature: 'inventory', keywords: 'reorder level low' },
  { label: 'Order Outstandings', to: '/inventory/orders', section: 'Inventory Reports', plain: 'Client and vendor orders still waiting to be delivered.', feature: 'orders', keywords: 'pending sales order purchase order' },
  { label: 'Goods Not Billed', to: '/inventory/notes', section: 'Inventory Reports', plain: 'Goods sent or received with no invoice recorded yet.', feature: 'inventory', keywords: 'delivery note receipt note pending bills' },
  // Financial reports
  { label: 'Balance Sheet', to: '/reports/balance-sheet', section: 'Financial Statements', plain: 'What the business owns and owes on a date.', keywords: 'assets liabilities' },
  { label: 'Profit & Loss', to: '/reports/pnl', section: 'Financial Statements', plain: 'Income less expenses: did you make money?', keywords: 'pnl income statement trading account' },
  { label: 'Trial Balance', to: '/reports/trial-balance', section: 'Financial Statements', plain: 'Every ledger balance. Total debits must equal total credits.' },
  { label: 'Cash Flow', to: '/reports/cash-flow', section: 'Financial Statements', plain: 'Money in and out of cash and bank, month by month.' },
  { label: 'Funds Flow', to: '/reports/funds-flow', section: 'Financial Statements', plain: 'Where funds came from and where they went.' },
  { label: 'Ratio Analysis', to: '/reports/ratios', section: 'Financial Statements', plain: 'Key health figures such as current ratio and profit margin.' },
  // Books
  { label: 'Day Book', to: '/daybook', section: 'Books & Registers', plain: 'Every entry for a period, in date order.', keywords: 'transactions list vouchers' },
  { label: 'Cash Book', to: '/reports/ledger/led_cash', section: 'Books & Registers', plain: 'Every cash receipt and payment, with the running cash balance.', keywords: 'cash in hand petty cash' },
  { label: 'Cash & Bank Books', to: '/reports/cash-bank', section: 'Books & Registers', plain: 'Balances and statements of each cash and bank account.', keywords: 'cash book bank book' },
  { label: 'Ledger Statement', to: '/reports/ledger', section: 'Books & Registers', plain: 'All entries in any one account.', keywords: 'ledger vouchers account statement' },
  { label: 'Group Summary', to: '/reports/group', section: 'Books & Registers', plain: 'Balances of all ledgers in a group.' },
  { label: 'Sales Register', to: '/reports/register/SALES', section: 'Books & Registers', plain: 'All sales, month by month.', keywords: 'sale invoices' },
  { label: 'Purchase Register', to: '/reports/register/PURCHASE', section: 'Books & Registers', plain: 'All purchases, month by month.', keywords: 'bills' },
  { label: 'Payment Register', to: '/reports/register/PAYMENT', section: 'Books & Registers', plain: 'All payments, month by month.' },
  { label: 'Receipt Register', to: '/reports/register/RECEIPT', section: 'Books & Registers', plain: 'All receipts, month by month.' },
  { label: 'Journal Register', to: '/reports/register/JOURNAL', section: 'Books & Registers', plain: 'All journal entries, month by month.' },
  { label: 'Other Registers', to: '/reports/register', section: 'Books & Registers', plain: 'Contra, credit notes, debit notes and every other entry type.', keywords: 'contra credit note debit note' },
  // Statements of accounts
  { label: 'Money to Collect', to: '/reports/outstanding/receivable', section: 'Outstandings', plain: 'Unpaid client invoices, with how late they are.', keywords: 'receivables debtors bills receivable overdue' },
  { label: 'Money to Pay', to: '/reports/outstanding/payable', section: 'Outstandings', plain: 'Unpaid vendor bills, with due dates.', keywords: 'payables creditors bills payable overdue' },
  { label: 'Ageing Analysis', to: '/reports/ageing', section: 'Outstandings', plain: 'Overdue amounts per party, split by how long overdue.', feature: 'billWise' },
  { label: 'Interest Calculation', to: '/reports/interest', section: 'Outstandings', plain: 'Interest due on ledgers that carry an interest rate.', feature: 'interest' },
  { label: 'Project Break-up', to: '/reports/cost-centres', section: 'Analysis', plain: 'Income and spending per project, account by account.', feature: 'costCentres', keywords: 'cost centre category summary' },
  { label: 'Budget vs Actual', to: '/reports/budget', section: 'Analysis', plain: 'How your actual figures compare with your budgets.', feature: 'budgets', keywords: 'variance' },
  { label: 'Scenario Report', to: '/reports/scenario', section: 'Analysis', plain: 'Profit if your what-if entries were real.', feature: 'budgets' },
  { label: 'Forex Gain or Loss', to: '/reports/forex', section: 'Analysis', plain: 'Unrealised gain or loss on foreign-currency balances.', feature: 'multiCurrency', keywords: 'currency exchange' },
  { label: 'Statistics', to: '/reports/statistics', section: 'Analysis', plain: 'How many entries and masters are in this company.', keywords: 'count' },
  { label: 'Exceptions', to: '/reports/exceptions', section: 'Analysis', plain: 'Things to check: negative balances, negative stock, overdue bills, memos.', keywords: 'negative stock negative ledger memorandum optional post-dated cancelled' },
  // Banking
  { label: 'Bank Reconciliation', to: '/banking/reconcile', section: 'Banking', plain: 'Match your books to your bank statement.', keywords: 'brs reconcile statement' },
  { label: 'Cheque Register', to: '/banking/cheques', section: 'Banking', plain: 'All cheques issued and received, and whether they cleared.', keywords: 'cheque book' },
  { label: 'Post-Dated Entries', to: '/banking/post-dated', section: 'Banking', plain: 'Entries dated in the future that are not in your books yet.', keywords: 'pdc summary' },
  { label: 'Deposit Slip', to: '/banking/deposit-slip', section: 'Banking', plain: 'A printable slip for cheques you are depositing.' },
  { label: 'Payment Advice', to: '/banking/payment-advice', section: 'Banking', plain: 'A printable note telling a vendor what you paid them for.' },
  // Statutory
  { label: 'VAT Return (VAT 201)', to: '/vat/return', section: 'VAT & Tax', plain: 'Output VAT by emirate, recoverable input VAT, and the net payable to the FTA.', feature: 'vat', keywords: 'vat 201 return fta emaratax payable' },
  { label: 'VAT Register', to: '/vat/register', section: 'VAT & Tax', plain: 'VAT on every sale and purchase invoice, with TRNs.', feature: 'vat', keywords: 'input output tax trn' },
  { label: 'TDS Report', to: '/tax/TDS', section: 'VAT & Tax', plain: 'TDS clients cut from your payments, and TDS you deducted from vendors.', feature: 'tds', keywords: '26q deducted at source' },
  { label: 'TCS Report', to: '/tax/TCS', section: 'VAT & Tax', plain: 'Tax you collected on sales, and what is still to deposit.', feature: 'tcs', keywords: '27eq collected at source' },
  // Payroll
  { label: 'Employees', to: '/masters/employees', section: 'Payroll', plain: 'Your staff and their salary structure.', feature: 'payroll', keywords: 'staff salary structure' },
  { label: 'Employee Groups', to: '/masters/employee-groups', section: 'Payroll', plain: 'Groups of staff, such as departments.', feature: 'payroll' },
  { label: 'Pay Heads', to: '/masters/pay-heads', section: 'Payroll', plain: 'Salary parts such as basic pay, HRA, PF and professional tax.', feature: 'payroll', keywords: 'earnings deductions' },
  { label: 'Attendance Types', to: '/masters/attendance-types', section: 'Payroll', plain: 'What you record: present, absent, overtime.', feature: 'payroll' },
  { label: 'Pay Sheet', to: '/payroll/sheet', section: 'Payroll Reports', plain: 'Salaries for a month, employee by employee.', feature: 'payroll' },
  { label: 'Pay Slips', to: '/payroll/slips', section: 'Payroll Reports', plain: 'A printable slip for each employee.', feature: 'payroll', keywords: 'payslip salary slip' },
  { label: 'Attendance Sheet', to: '/payroll/attendance', section: 'Payroll Reports', plain: 'Attendance recorded for a month.', feature: 'payroll' },
  { label: 'PF & PT Summary', to: '/payroll/statutory', section: 'Payroll Reports', plain: 'Provident fund and professional tax due for a month.', feature: 'payroll', keywords: 'esi challan statutory' },
  // Daily
  { label: 'Expenses', to: '/expenses', section: 'Daily', plain: 'See where your money goes, and add an expense quickly.', keywords: 'spending' },
  { label: 'Savings Planner', to: '/savings', section: 'Daily', plain: 'Set aside profit, see your runway, and project savings growth.', keywords: 'income reserve runway' },
  // Company and tools
  { label: 'Businesses', to: '/company', section: 'Business & Tools', plain: 'Open, create or remove a set of books.', keywords: 'company switch select shut create' },
  { label: 'Business Details', to: '/settings', section: 'Business & Tools', plain: 'Name, address, tax numbers and what prints on your invoices.', keywords: 'company alter trn vat' },
  { label: 'Features', to: '/settings/features', section: 'Business & Tools', plain: 'Turn on only what you need. Everything else stays out of sight.', keywords: 'f11 inventory vat payroll' },
  { label: 'Configure', to: '/settings/configure', section: 'Business & Tools', plain: 'Stock valuation method and other preferences.', keywords: 'f12 valuation' },
  { label: 'Security', to: '/settings/security', section: 'Business & Tools', plain: 'Lock this company with a password.', keywords: 'password lock' },
  { label: 'Backup & Restore', to: '/tools/backup', section: 'Business & Tools', plain: 'Save your data to a file, or bring it back.', keywords: 'export json' },
  { label: 'Import Data', to: '/tools/import', section: 'Business & Tools', plain: 'Bring in ledgers, stock items or entries from a CSV file.', keywords: 'excel csv' },
  { label: 'Export Data', to: '/tools/export', section: 'Business & Tools', plain: 'Save accounts, entries and projects as CSV for Excel.', keywords: 'masters excel csv' },
  { label: 'Edit Log', to: '/tools/edit-log', section: 'Business & Tools', plain: 'A record of everything created, changed or deleted.', keywords: 'audit trail history' },
  { label: 'Verify Data', to: '/tools/verify', section: 'Business & Tools', plain: 'Check that all your entries balance and nothing is broken.', keywords: 'repair check' },
  { label: 'Keyboard Shortcuts', to: '/tools/shortcuts', section: 'Business & Tools', plain: 'All the keys, the same as TallyPrime wherever a browser allows.', keywords: 'help hotkeys' },
];

export const destinationsIn = (features: Features, ...sections: string[]) =>
  DESTINATIONS.filter(d => sections.includes(d.section) && (!d.feature || features[d.feature]));
