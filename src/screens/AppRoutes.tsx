// Every screen in the app, and the gate in front of them: loading, first-run setup, then the lock screen.
import { AuthGate } from './Login';
import React from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BooksProvider, useBooks, useGate } from '../store/BooksContext';
import { FeedbackProvider, Notice } from '../ui/kit';
import { Shell } from '../ui/Shell';
import { Home } from './Home';
import { LockScreen, Welcome } from './Welcome';
import { ExpensesPage, InvoicesPage, PartiesPage, PartyDetail, ProjectDetail, ProjectsPage } from './Work';
import { NewEntry, VoucherScreen } from './vouchers/VoucherScreen';
import { VoucherPrint } from './vouchers/VoucherPrint';
import {
  AttendanceTypesPage, BankingHub, BudgetsPage, CostCategoriesPage, CurrenciesPage, EmployeeGroupsPage, EmployeesPage, GodownsPage, GroupsPage, InventoryHub, LedgersPage, MastersHub,
  PayHeadsPage, PayrollHub, ReportsHub, ScenariosPage, StockCategoriesPage, StockGroupsPage, StockItemsPage, TaxHub, ToolsHub, UnitsPage, VoucherTypesPage,
} from './masters/Masters';
import { BalanceSheetPage, CashFlowPage, FundsFlowPage, ProfitLossPage, RatiosPage, TrialBalancePage } from './reports/Financial';
import {
  AgeingPage, BudgetReportPage, CashBankPage, CostCentreReportPage, DayBookPage, ExceptionsPage, ForexPage, GroupSummaryPage, InterestPage, LedgerStatementPage, OutstandingPage,
  RegisterPage, RegistersIndex, ScenarioReportPage, StatisticsPage,
} from './reports/Books';
import { GodownSummaryPage, MovementPage, NotesPage, OrdersPage, ReorderPage, StockAgeingPage, StockItemPage, StockSummaryPage } from './reports/Inventory';
import { ChequePrintPage, ChequesPage, DepositSlipPage, PaymentAdvicePage, PostDatedPage, ReconcilePage } from './reports/Banking';
import { AttendanceSheetPage, PaySheetPage, PaySlipsPage, StatutoryPage, TaxDeductionPage, VatRegisterPage, VatReturnPage } from './reports/TaxPayroll';
import {
  BackupPage, CompaniesPage, CompanyDetailsPage, ConfigurePage, EditLogPage, ExportPage, FeaturesPage, ImportPage, SavingsPage, SecurityPage, ShortcutsPage, VerifyPage,
} from './Tools';

/** If a screen ever fails, say so and keep the app usable. Your books are saved separately and are not affected. */
class ScreenGuard extends React.Component<{ resetKey: string; children: React.ReactNode }, { failed: Error | null }> {
  state = { failed: null as Error | null };

  static getDerivedStateFromError(failed: Error) {
    return { failed };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: null });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Notice tone="bad">
          <p className="font-semibold">This screen could not open.</p>
          <p className="mt-1">Your books are safe: they are saved separately from this screen. Choose another screen from the menu, and if this keeps happening, run Verify Data under Business & Tools.</p>
          <p className="hint mt-2 break-words">{this.state.failed.message}</p>
        </Notice>
      </div>
    );
  }
}

const Screens: React.FC = () => {
  const { features } = useBooks();
  const location = useLocation();
  return (
    <Shell>
      <ScreenGuard resetKey={location.pathname + location.search}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewEntry />} />
        <Route path="/voucher/new/:base" element={<VoucherScreen />} />
        <Route path="/voucher/:id" element={<VoucherScreen />} />
        <Route path="/voucher/:id/print" element={<VoucherPrint />} />
        <Route path="/daybook" element={<DayBookPage />} />

        <Route path="/invoices" element={<InvoicesPage base="SALES" />} />
        <Route path="/bills" element={<InvoicesPage base="PURCHASE" />} />
        <Route path="/clients" element={<PartiesPage kind="client" />} />
        <Route path="/clients/:id" element={<PartyDetail kind="client" />} />
        <Route path="/vendors" element={<PartiesPage kind="vendor" />} />
        <Route path="/vendors/:id" element={<PartyDetail kind="vendor" />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/savings" element={<SavingsPage />} />

        <Route path="/masters" element={<MastersHub />} />
        <Route path="/masters/ledgers" element={<LedgersPage />} />
        <Route path="/masters/groups" element={<GroupsPage />} />
        <Route path="/masters/voucher-types" element={<VoucherTypesPage />} />
        <Route path="/masters/currencies" element={<CurrenciesPage />} />
        <Route path="/masters/cost-centres" element={<Navigate to="/projects" replace />} />
        <Route path="/masters/cost-categories" element={<CostCategoriesPage />} />
        <Route path="/masters/budgets" element={<BudgetsPage />} />
        <Route path="/masters/scenarios" element={<ScenariosPage />} />
        <Route path="/masters/stock-items" element={<StockItemsPage />} />
        <Route path="/masters/stock-groups" element={<StockGroupsPage />} />
        <Route path="/masters/stock-categories" element={<StockCategoriesPage />} />
        <Route path="/masters/units" element={<UnitsPage />} />
        <Route path="/masters/godowns" element={<GodownsPage />} />
        <Route path="/masters/employees" element={<EmployeesPage />} />
        <Route path="/masters/employee-groups" element={<EmployeeGroupsPage />} />
        <Route path="/masters/pay-heads" element={<PayHeadsPage />} />
        <Route path="/masters/attendance-types" element={<AttendanceTypesPage />} />

        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
        <Route path="/reports/pnl" element={<ProfitLossPage />} />
        <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
        <Route path="/reports/cash-flow" element={<CashFlowPage />} />
        <Route path="/reports/funds-flow" element={<FundsFlowPage />} />
        <Route path="/reports/ratios" element={<RatiosPage />} />
        <Route path="/reports/cash-bank" element={<CashBankPage />} />
        <Route path="/reports/ledger" element={<LedgerStatementPage />} />
        <Route path="/reports/ledger/:id" element={<LedgerStatementPage />} />
        <Route path="/reports/group" element={<GroupSummaryPage />} />
        <Route path="/reports/group/:id" element={<GroupSummaryPage />} />
        <Route path="/reports/register" element={<RegistersIndex />} />
        <Route path="/reports/register/:base" element={<RegisterPage />} />
        <Route path="/reports/register/:base/:month" element={<RegisterPage />} />
        <Route path="/reports/outstanding/:kind" element={<OutstandingPage />} />
        <Route path="/reports/ageing" element={<AgeingPage />} />
        <Route path="/reports/interest" element={<InterestPage />} />
        <Route path="/reports/cost-centres" element={<CostCentreReportPage />} />
        <Route path="/reports/budget" element={<BudgetReportPage />} />
        <Route path="/reports/scenario" element={<ScenarioReportPage />} />
        <Route path="/reports/forex" element={<ForexPage />} />
        <Route path="/reports/statistics" element={<StatisticsPage />} />
        <Route path="/reports/exceptions" element={<ExceptionsPage />} />

        <Route path="/inventory" element={features.inventory ? <InventoryHub /> : <Navigate to="/settings/features" replace />} />
        <Route path="/inventory/summary" element={<StockSummaryPage />} />
        <Route path="/inventory/item/:id" element={<StockItemPage />} />
        <Route path="/inventory/godowns" element={<GodownSummaryPage />} />
        <Route path="/inventory/movement" element={<MovementPage />} />
        <Route path="/inventory/ageing" element={<StockAgeingPage />} />
        <Route path="/inventory/reorder" element={<ReorderPage />} />
        <Route path="/inventory/orders" element={<OrdersPage />} />
        <Route path="/inventory/notes" element={<NotesPage />} />

        <Route path="/banking" element={<BankingHub />} />
        <Route path="/banking/reconcile" element={<ReconcilePage />} />
        <Route path="/banking/reconcile/:id" element={<ReconcilePage />} />
        <Route path="/banking/cheques" element={<ChequesPage />} />
        <Route path="/banking/cheque/:id" element={<ChequePrintPage />} />
        <Route path="/banking/post-dated" element={<PostDatedPage />} />
        <Route path="/banking/deposit-slip" element={<DepositSlipPage />} />
        <Route path="/banking/payment-advice" element={<PaymentAdvicePage />} />
        <Route path="/banking/payment-advice/:id" element={<PaymentAdvicePage />} />

        <Route path="/vat" element={<TaxHub />} />
        <Route path="/vat/return" element={<VatReturnPage />} />
        <Route path="/vat/register" element={<VatRegisterPage />} />
        <Route path="/gst/*" element={<Navigate to="/vat" replace />} />
        <Route path="/tax/:kind" element={<TaxDeductionPage />} />

        <Route path="/payroll" element={features.payroll ? <PayrollHub /> : <Navigate to="/settings/features" replace />} />
        <Route path="/payroll/sheet" element={<PaySheetPage />} />
        <Route path="/payroll/slips" element={<PaySlipsPage />} />
        <Route path="/payroll/attendance" element={<AttendanceSheetPage />} />
        <Route path="/payroll/statutory" element={<StatutoryPage />} />

        <Route path="/company" element={<CompaniesPage />} />
        <Route path="/tools" element={<ToolsHub />} />
        <Route path="/settings" element={<CompanyDetailsPage />} />
        <Route path="/settings/features" element={<FeaturesPage />} />
        <Route path="/settings/configure" element={<ConfigurePage />} />
        <Route path="/settings/security" element={<SecurityPage />} />
        <Route path="/tools/backup" element={<BackupPage />} />
        <Route path="/tools/import" element={<ImportPage />} />
        <Route path="/tools/export" element={<ExportPage />} />
        <Route path="/tools/edit-log" element={<EditLogPage />} />
        <Route path="/tools/verify" element={<VerifyPage />} />
        <Route path="/tools/shortcuts" element={<ShortcutsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ScreenGuard>
    </Shell>
  );
};

const Gate: React.FC = () => {
  const { status, locked } = useGate();
  if (status === 'loading') return <div className="h-screen flex items-center justify-center hint">Opening your books...</div>;
  if (status === 'welcome') return <Welcome />;
  if (locked) return <LockScreen />;
  return <Screens />;
};

export const AppRoot: React.FC = () => (
  <FeedbackProvider>
    <AuthGate>
      <BooksProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </BooksProvider>
    </AuthGate>
  </FeedbackProvider>
);
