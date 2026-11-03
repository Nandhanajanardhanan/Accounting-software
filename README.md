# TallyEdu - Multi-Accounting & Company Savings Software

A full-featured accounting web application modeled after **Tally.ERP 9 / Tally Prime (Educational Mode)**, engineered for company income calculation, corporate savings management, and double-entry bookkeeping.

---

## 🚀 Key Features

### 1. **Tally Education Interface & Shortcuts**
- Signature **Gateway of Tally** menu layout.
- Classic **Tally ERP 9 Green/Yellow** theme and Modern **Tally Prime Blue/Slate** theme toggle.
- Full keyboard shortcut support:
  - **F4**: Contra Voucher (Cash ⇄ Bank)
  - **F5**: Payment Voucher (Expenses & Creditors)
  - **F6**: Receipt Voucher (Incomes & Debtors)
  - **F7**: Journal Voucher (General adjustments)
  - **F8**: Sales Voucher (Customer tax billing)
  - **F9**: Purchase Voucher (Supplier inward bills)
  - **Alt+C**: Quick create new ledger account
  - **Alt+S**: Jump to Company Savings & Income Planner
  - **Alt+P**: Jump to Profit & Loss Account
  - **Alt+B**: Jump to Balance Sheet
  - **Esc**: Back to Gateway / Close Modal

### 2. **Dedicated Routes & Registers**
- **Gateway of Tally (`/`)**: High-level KPI cards (Cash in Hand, Bank Balances, Sales, Purchases, Net Profit, Liquid Reserves) and menu.
- **Cash Book (`/cash`)**: Daily receipts, cash disbursements, opening/closing till balance, and running cash flow.
- **Bank Book (`/bank`)**: Multiple bank accounts (HDFC, SBI), RTGS/NEFT/Cheque references, contra transfers, and bank reconciliation.
- **Purchase Register (`/purchase`)**: Supplier bills, cash vs credit purchases, itemized inventory breakdowns, and total payables.
- **Sales Register (`/sale`)**: Customer tax invoices, revenue tracking, receivables, and itemized billing.
- **Universal Input Session (`/session`)**: A unified transaction input desk allowing immediate input into Cash Book, Bank Book, Purchases, and Sales in one place.
- **Profit & Loss Account (`/pnl`)**: Dual-format (Tally Horizontal T-Account view & Schedule view) showing Trading Account (COGS, Gross Profit) and P&L Account (Operating expenses, Net profit margin).
- **Balance Sheet (`/balance-sheet`)**: Mathematical equilibrium verification (Total Liabilities = Total Assets) with Capital Account, Net Profit additions, Sundry Debtors/Creditors, and Bank/Cash assets.
- **Company Income & Savings Planner (`/savings`)**:
  - Detailed gross income & operating cost calculations.
  - Liquid treasury savings counter (Cash + Bank balances).
  - Corporate savings allocation buckets (Emergency Reserve, Tax Buffer, Capital Expansion, General Surplus).
  - Financial Runway Calculator (how many months company can operate at zero sales).
  - Compound interest savings simulator for 1-year, 3-year, and 5-year projections.
- **Chart of Accounts & Ledgers (`/ledgers`)**: Full ledger master directory with drill-down account statements.
- **Trial Balance (`/trial-balance`)**: Dual-column debit vs credit audit equilibrium.

### 3. **Data Resilience & Portability**
- Real-time persistent browser storage (`localStorage`).
- One-click **JSON Backup Export** & **Restore/Import** capability.
- One-click **Reset to Sample Company Data** for testing.
- **Print & CSV Export** on all registers and financial statements.

---

## 💻 How to Run Locally

### Development Server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Production Build & Preview:
```bash
npm run build
npm run preview
```
Open your browser at `http://localhost:4173`.
