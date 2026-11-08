// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompanyData, Voucher, VoucherLine } from './types.ts';
import { blankCompany, DEFAULT_GROUPS, G, OUTSIDE_UAE, PROFESSIONAL_FEES_LEDGER_ID, VAT_EXEMPT, VAT_LEDGERS } from './defaults.ts';
import {
  ageBuckets, autoAllocate, balanceSheet, bankRegister, billsOf, budgetActual, cashFlow, computePay, costCentreReport, expenseSummary, forexPositions, fundsFlow,
  interestFor, invoiceRows, isZero, itemPositions, ledgerBalances, ledgerStatement, nextVoucherNumber, openingDifference,
  orderStatus, partyRows, payrollLines, pnl, projectRows, ratios, stockValueAt, trialBalance, unbilledNotes, vatDocuments, vatReturn, verifyBooks, voucherInBooks,
} from './engine.ts';
import { computeInvoice } from './invoice.ts';
import { buildSampleCompany } from './sample.ts';
import { migrateV1, toUaeVat } from './migrate.ts';
import { amountInWords } from './format.ts';

const FY = { from: '2026-04-01', to: '2027-03-31' };
const CASH = 'led_cash';
/** The demo company keeps calendar-year books, as most UAE businesses do. */
const SFY = { from: '2026-01-01', to: '2026-12-31' };

let seq = 0;
const stamp = '2026-01-01T00:00:00.000Z';
const dr = (ledgerId: string, amount: number, extra: Partial<VoucherLine> = {}): VoucherLine => ({ id: `t${++seq}`, ledgerId, side: 'DR', amount, ...extra });
const cr = (ledgerId: string, amount: number, extra: Partial<VoucherLine> = {}): VoucherLine => ({ id: `t${++seq}`, ledgerId, side: 'CR', amount, ...extra });
const voucher = (type: Voucher['type'], date: string, lines: VoucherLine[], extra: Partial<Voucher> = {}): Voucher => ({
  id: `v${++seq}`, typeId: `vt_${type.toLowerCase()}`, type, number: `${type}-${seq}`, date, lines, createdAt: stamp, updatedAt: stamp, ...extra,
});

function fresh(): CompanyData {
  const d = blankCompany({ name: 'Test Co', state: 'Dubai', fyStart: FY.from, today: '2026-11-03' });
  d.ledgers.push(
    { id: 'bank', name: 'Bank', groupId: G.bank, openingBalance: 0 },
    { id: 'led_sales', name: 'Sales', groupId: G.sales, openingBalance: 0 },
    { id: 'cust', name: 'Customer', groupId: G.debtors, openingBalance: 0, billWise: true, creditDays: 30, state: 'Dubai' },
    { id: 'cust_ad', name: 'Abu Dhabi Customer', groupId: G.debtors, openingBalance: 0, billWise: true, state: 'Abu Dhabi' },
    { id: 'supp', name: 'Supplier', groupId: G.creditors, openingBalance: 0, billWise: true, state: 'Dubai' },
    { id: 'supp_abroad', name: 'Foreign Supplier', groupId: G.creditors, openingBalance: 0, billWise: true, state: 'Outside UAE' },
  );
  d.stockItems.push({ id: 'item', name: 'Widget', unitId: 'u_nos', openingQty: 10, openingRate: 100, vatRate: 5 });
  d.ledgers.find(l => l.id === 'led_capital')!.openingBalance = -1000;
  return d;
}

const assertBalanced = (d: CompanyData, asOf = FY.to) => {
  const bs = balanceSheet(d, asOf);
  assert.ok(isZero(bs.totalAssets - bs.totalLiabilities), `Balance Sheet ${bs.totalAssets} vs ${bs.totalLiabilities}`);
  const tb = trialBalance(d, FY.from > asOf ? asOf : FY.from, asOf);
  assert.ok(isZero(tb.totalDr - tb.totalCr), `Trial Balance ${tb.totalDr} vs ${tb.totalCr}`);
};

test('a new company has the 28 standard groups: 15 primary and 13 sub-groups', () => {
  assert.equal(DEFAULT_GROUPS.length, 28);
  assert.equal(DEFAULT_GROUPS.filter(g => g.parentId === null).length, 15);
});

test('the sample company balances and passes every check', () => {
  const d = buildSampleCompany();
  assert.equal(openingDifference(d), 0);
  assertBalanced(d);
  assertBalanced(d, '2026-10-31');
  const errors = verifyBooks(d);
  assert.deepEqual(errors, []);
  const profit = pnl(d, FY.from, FY.to);
  assert.ok(profit.sales > 0 && profit.netProfit !== 0);
});

test('every sample voucher that posts to the ledgers has equal debits and credits', () => {
  const d = buildSampleCompany();
  for (const v of d.vouchers.filter(x => x.lines.length)) {
    const dSum = v.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0);
    const cSum = v.lines.filter(l => l.side === 'CR').reduce((s, l) => s + l.amount, 0);
    assert.ok(isZero(dSum - cSum), `${v.number}: ${dSum} vs ${cSum}`);
  }
});

test('profit equals income less expense with stock adjusted', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('SALES', '2026-05-01', [dr('bank', 500), cr('led_sales', 500)], { stock: [{ id: 's1', itemId: 'item', qty: 2, rate: 250, amount: 500, direction: 'OUT' }] }),
    voucher('PAYMENT', '2026-05-02', [dr('led_exp_rent', 120), cr('bank', 120)]),
  );
  const p = pnl(d, FY.from, FY.to);
  assert.equal(p.openingStock, 1000);
  assert.equal(p.closingStock, 800); // 8 left at the 100 cost
  assert.equal(p.grossProfit, 300); // 500 + 800 - 1000
  assert.equal(p.netProfit, 180);
  assertBalanced(d);
});

test('an expense with a net credit reduces expenses instead of adding to them', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('PAYMENT', '2026-05-01', [dr('led_exp_rent', 100), cr('bank', 100)]),
    voucher('RECEIPT', '2026-05-02', [dr('bank', 300), cr('led_exp_rent', 300)]),
  );
  assert.equal(pnl(d, FY.from, FY.to).indirectExpense, -200);
  assertBalanced(d);
});

test('cancelled, optional, memorandum and future post-dated vouchers stay out of the books', () => {
  const d = fresh();
  const pay = (extra: Partial<Voucher>, type: Voucher['type'] = 'PAYMENT', date = '2026-06-01') =>
    voucher(type, date, [dr('led_exp_rent', 100), cr('bank', 100)], extra);
  d.vouchers.push(
    pay({ isCancelled: true }), pay({ isOptional: true }), pay({}, 'MEMORANDUM'), pay({}, 'REVERSING_JOURNAL'),
    pay({ isPostDated: true }, 'PAYMENT', '2026-12-25'),
  );
  assert.equal(pnl(d, FY.from, FY.to).indirectExpense, 0);
  assert.equal(pnl(d, FY.from, FY.to, { includeOptional: true }).indirectExpense, 100);
  assert.equal(pnl(d, FY.from, FY.to, { includeMemo: true, includeReversing: true }).indirectExpense, 200);
  const postDated = d.vouchers[4];
  assert.equal(voucherInBooks(d, postDated), false);
  d.company.currentDate = '2026-12-31';
  const later = { ...d, company: { ...d.company } };
  assert.equal(voucherInBooks(later, postDated), true);
});

test('unbalanced opening balances are shown, and the statements still total', () => {
  const d = fresh();
  d.ledgers.find(l => l.id === 'bank')!.openingBalance = 500;
  assert.equal(openingDifference(d), 500);
  const bs = balanceSheet(d, FY.to);
  assert.ok(bs.liabilities.some(n => n.id === 'opening_diff'));
  assertBalanced(d);
  assert.ok(verifyBooks(d).some(i => i.message.includes('Opening balances differ')));
});

test('a second financial year carries profit forward and restarts income and expense ledgers', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('RECEIPT', '2026-06-01', [dr('bank', 1000), cr('led_sales', 1000)]),
    voucher('RECEIPT', '2027-06-01', [dr('bank', 400), cr('led_sales', 400)]),
  );
  const next = { from: '2027-04-01', to: '2028-03-31' };
  assert.equal(pnl(d, next.from, next.to).sales, 400);
  assert.equal(ledgerBalances(d, next.from, next.to).get('led_sales')!.opening, 0);
  const bs = balanceSheet(d, next.to);
  assert.equal(bs.profitBrought, 1000);
  assert.equal(bs.profitCurrent, 400);
  assert.ok(isZero(bs.totalAssets - bs.totalLiabilities));
  const tb = trialBalance(d, next.from, next.to);
  assert.ok(isZero(tb.totalDr - tb.totalCr), `${tb.totalDr} vs ${tb.totalCr}`);
});

test('a mid-year report keeps the period opening balance and only counts that period', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('PAYMENT', '2026-05-01', [dr('led_exp_rent', 100), cr('bank', 100)]),
    voucher('PAYMENT', '2026-08-01', [dr('led_exp_rent', 50), cr('bank', 50)]),
  );
  const s = ledgerStatement(d, 'led_exp_rent', '2026-07-01', '2026-09-30');
  assert.equal(s.opening, 100);
  assert.equal(s.rows.length, 1);
  assert.equal(s.closing, 150);
  assert.equal(pnl(d, '2026-07-01', '2026-09-30').indirectExpense, 50);
  const tb = trialBalance(d, '2026-07-01', '2026-09-30');
  assert.ok(isZero(tb.totalDr - tb.totalCr), `${tb.totalDr} vs ${tb.totalCr}`);
});

const withVat = () => {
  const d = fresh();
  d.company.features.vat = true;
  d.ledgers.push(...VAT_LEDGERS.map(l => ({ ...l })));
  return d;
};

test('a sale adds 5% VAT to Output VAT, charged to the client', () => {
  const d = withVat();
  const r = computeInvoice(d, { base: 'SALES', partyId: 'cust', accountLedgerId: 'led_sales', roundOff: false, charges: [], items: [{ itemId: 'item', qty: 2, rate: 500, vatRate: 5 }] });
  assert.deepEqual(r.errors, []);
  assert.equal(r.reverseCharge, false);
  assert.equal(r.total, 1050);
  assert.deepEqual(r.vat, [{ rate: 5, taxable: 1000, vat: 50 }]);
  assert.equal(r.lines[0].ledgerId, 'cust');
  assert.equal(r.lines[0].side, 'DR');
  assert.ok(r.lines.some(l => l.ledgerId === 'led_vat_output' && l.side === 'CR' && l.amount === 50));
});

test('zero-rated and exempt lines carry no VAT but are kept apart', () => {
  const d = withVat();
  const r = computeInvoice(d, {
    base: 'SALES', partyId: 'cust', roundOff: false,
    services: [
      { description: 'Export work', ledgerId: 'led_sales', qty: 1, rate: 1000, vatRate: 0 },
      { description: 'Exempt work', ledgerId: 'led_sales', qty: 1, rate: 400, vatRate: VAT_EXEMPT },
      { description: 'Local work', ledgerId: 'led_sales', qty: 1, rate: 200, vatRate: 5 },
    ],
  });
  assert.deepEqual(r.errors, []);
  assert.equal(r.total, 1610);
  assert.deepEqual(r.vat.map(x => [x.rate, x.taxable, x.vat]), [[0, 1000, 0], [VAT_EXEMPT, 400, 0], [5, 200, 10]]);
});

test('a bill from a supplier outside the UAE uses the reverse charge', () => {
  const d = withVat();
  const r = computeInvoice(d, { base: 'PURCHASE', partyId: 'supp_abroad', roundOff: false, services: [{ description: 'Hosting', ledgerId: 'led_exp_hosting', qty: 1, rate: 1000, vatRate: 5 }] });
  assert.deepEqual(r.errors, []);
  assert.equal(r.reverseCharge, true);
  assert.equal(r.total, 1000); // the supplier is paid no VAT
  assert.ok(r.lines.some(l => l.ledgerId === 'led_vat_input' && l.side === 'DR' && l.amount === 50));
  assert.ok(r.lines.some(l => l.ledgerId === 'led_vat_output' && l.side === 'CR' && l.amount === 50));
  const dSum = r.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0);
  const cSum = r.lines.filter(l => l.side === 'CR').reduce((s, l) => s + l.amount, 0);
  assert.ok(isZero(dSum - cSum));
});

test('amounts in words use dirhams, fils and millions', () => {
  assert.equal(amountInWords(1250000.5), 'UAE Dirhams One Million Two Hundred Fifty Thousand and Fifty Fils Only');
  assert.equal(amountInWords(0), 'UAE Dirhams Zero Only');
});

test('all four invoice types balance, including discount and round off', () => {
  const d = withVat();
  d.ledgers.push({ id: 'disc', name: 'Discount', groupId: G.indirectExpense, openingBalance: 0 });
  for (const base of ['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const) {
    const r = computeInvoice(d, {
      base, partyId: base === 'SALES' || base === 'CREDIT_NOTE' ? 'cust' : 'supp', accountLedgerId: base === 'SALES' || base === 'CREDIT_NOTE' ? 'led_sales' : 'led_purchase',
      roundOff: true, items: [{ itemId: 'item', qty: 3, rate: 333.33, discountPct: 2.5, vatRate: 5 }], charges: [{ ledgerId: 'disc', amount: -50 }],
    });
    const dSum = r.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0);
    const cSum = r.lines.filter(l => l.side === 'CR').reduce((s, l) => s + l.amount, 0);
    assert.ok(isZero(dSum - cSum), `${base}: ${dSum} vs ${cSum}`);
    assert.equal(r.total, Math.round(r.total));
  }
});

test('purchases raise average stock cost; sales and returns do not change it', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('PURCHASE', '2026-05-01', [dr('led_purchase', 3000), cr('supp', 3000)], { stock: [{ id: 'a', itemId: 'item', qty: 10, rate: 300, amount: 3000, direction: 'IN' }] }),
    voucher('SALES', '2026-05-02', [dr('cust', 5000), cr('led_sales', 5000)], { stock: [{ id: 'b', itemId: 'item', qty: 5, rate: 1000, amount: 5000, direction: 'OUT' }] }),
  );
  // (10 x 100 + 10 x 300) / 20 = 200 average, with 15 left.
  assert.equal(stockValueAt(d, FY.to), 3000);
  const row = itemPositions(d, FY.from, FY.to)[0];
  assert.equal(row.openQty, 10);
  assert.equal(row.inQty, 10);
  assert.equal(row.outQty, 5);
  assert.equal(row.closeQty, 15);
  assertBalanced(d);
});

test('FIFO values remaining stock at the newest cost, last purchase at the latest rate', () => {
  const build = (valuation: CompanyData['company']['valuation']) => {
    const d = fresh();
    d.company.valuation = valuation;
    d.vouchers.push(
      voucher('PURCHASE', '2026-05-01', [dr('led_purchase', 3000), cr('supp', 3000)], { stock: [{ id: 'a', itemId: 'item', qty: 10, rate: 300, amount: 3000, direction: 'IN' }] }),
      voucher('SALES', '2026-05-02', [dr('cust', 5000), cr('led_sales', 5000)], { stock: [{ id: 'b', itemId: 'item', qty: 5, rate: 1000, amount: 5000, direction: 'OUT' }] }),
    );
    return d;
  };
  assert.equal(stockValueAt(build('FIFO'), FY.to), 10 * 300 + 5 * 100);
  assert.equal(stockValueAt(build('LAST_PURCHASE'), FY.to), 15 * 300);
});

test('a physical count corrects stock to what was counted', () => {
  const d = fresh();
  d.vouchers.push(voucher('PHYSICAL_STOCK', '2026-05-01', [], { stock: [{ id: 'c', itemId: 'item', qty: 7, rate: 100, amount: 700, direction: 'IN' }] }));
  assert.equal(itemPositions(d, FY.from, FY.to)[0].closeQty, 7);
  assert.equal(stockValueAt(d, FY.to), 700);
});

test('goods moved by a delivery note are not moved twice by its invoice', () => {
  const d = fresh();
  const note = voucher('DELIVERY_NOTE', '2026-05-01', [], { partyId: 'cust', stock: [{ id: 'n', itemId: 'item', qty: 4, rate: 500, amount: 2000, direction: 'OUT' }] });
  d.vouchers.push(note);
  assert.equal(unbilledNotes(d, 'DELIVERY_NOTE').length, 1);
  const withInvoice: CompanyData = {
    ...d,
    vouchers: [...d.vouchers, voucher('SALES', '2026-05-02', [dr('cust', 2000), cr('led_sales', 2000)], { noteIds: [note.id], stockAlreadyMoved: true, stock: [{ id: 'i', itemId: 'item', qty: 4, rate: 500, amount: 2000, direction: 'OUT' }] })],
  };
  assert.equal(itemPositions(withInvoice, FY.from, FY.to)[0].closeQty, 6);
  assert.equal(unbilledNotes(withInvoice, 'DELIVERY_NOTE').length, 0);
});

test('orders track what is pending and never move stock or money', () => {
  const d = fresh();
  const order = voucher('SALES_ORDER', '2026-05-01', [], { partyId: 'cust', stock: [{ id: 'o', itemId: 'item', qty: 5, rate: 500, amount: 2500, direction: 'OUT' }] });
  d.vouchers.push(order, voucher('DELIVERY_NOTE', '2026-05-02', [], { orderId: order.id, partyId: 'cust', stock: [{ id: 'n', itemId: 'item', qty: 2, rate: 500, amount: 1000, direction: 'OUT' }] }));
  const status = orderStatus(d, 'SALES_ORDER');
  assert.equal(status[0].delivered, 2);
  assert.equal(status[0].pending, 3);
  assert.equal(itemPositions(d, FY.from, FY.to)[0].closeQty, 8);
  assert.equal(pnl(d, FY.from, FY.to).sales, 0);
});

test('bills: a receipt settles the invoice it names, and the balance stays pending', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('SALES', '2026-05-01', [dr('cust', 1000, { bills: [{ type: 'NEW', ref: 'INV1', amount: 1000, dueDate: '2026-05-31' }] }), cr('led_sales', 1000)]),
    voucher('RECEIPT', '2026-05-10', [dr('bank', 600), cr('cust', 600, { bills: [{ type: 'AGST', ref: 'INV1', amount: 600 }] })]),
  );
  const bills = billsOf(d, FY.to);
  assert.equal(bills.length, 1);
  assert.equal(bills[0].pending, 400);
  assert.equal(ageBuckets(bills, '2026-06-15').d30, 400);
  assert.equal(ageBuckets(bills, '2026-05-15').current, 400);
});

test('an opening balance with no bills listed still shows as owed, and can be settled', () => {
  const d = fresh();
  const led = d.ledgers.find(l => l.id === 'cust')!;
  led.openingBalance = 5000;
  d.ledgers.find(l => l.id === 'led_capital')!.openingBalance = -6000;
  assert.equal(billsOf(d, FY.to)[0].ref, 'Opening Balance');
  assert.equal(billsOf(d, FY.to)[0].pending, 5000);
  assert.deepEqual(autoAllocate(d, 'cust', 'CR', 2000, FY.to), [{ type: 'AGST', ref: 'Opening Balance', amount: 2000 }]);
  assertBalanced(d);
});

test('on-account amounts net off per party instead of looking like money owed both ways', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('SALES', '2026-05-01', [dr('cust', 1000), cr('led_sales', 1000)]),
    voucher('RECEIPT', '2026-05-02', [dr('bank', 400), cr('cust', 400)]),
  );
  const bills = billsOf(d, FY.to);
  assert.equal(bills.length, 1);
  assert.equal(bills[0].pending, 600);
  assert.equal(bills[0].isOnAccount, true);
});

test('automatic bill matching clears oldest first and leaves the rest on account', () => {
  const d = fresh();
  d.vouchers.push(
    voucher('SALES', '2026-05-01', [dr('cust', 100, { bills: [{ type: 'NEW', ref: 'A', amount: 100 }] }), cr('led_sales', 100)]),
    voucher('SALES', '2026-05-02', [dr('cust', 200, { bills: [{ type: 'NEW', ref: 'B', amount: 200 }] }), cr('led_sales', 200)]),
  );
  assert.deepEqual(autoAllocate(d, 'cust', 'CR', 350, FY.to), [
    { type: 'AGST', ref: 'A', amount: 100 },
    { type: 'AGST', ref: 'B', amount: 200 },
    { type: 'ON_ACCOUNT', ref: '', amount: 50 },
  ]);
});

test('payroll follows attendance, percentages and posts balanced lines', () => {
  const d = fresh();
  d.ledgers.push(
    { id: 'led_pf', name: 'PF Payable', groupId: G.duties, openingBalance: 0 },
    { id: 'led_salary', name: 'Salaries', groupId: G.indirectExpense, openingBalance: 0 },
    { id: 'led_epf', name: 'Employer PF', groupId: G.indirectExpense, openingBalance: 0 },
    { id: 'led_salary_payable', name: 'Salary Payable', groupId: G.currentLiabilities, openingBalance: 0 },
  );
  d.payHeads = [
    { id: 'ph_basic', name: 'Basic', kind: 'EARNING', calc: 'ATTENDANCE', ledgerId: 'led_salary' },
    { id: 'ph_hra', name: 'HRA', kind: 'EARNING', calc: 'FLAT', ledgerId: 'led_salary' },
    { id: 'ph_pf', name: 'PF', kind: 'DEDUCTION', calc: 'PERCENT', pct: 12, basisHeadIds: ['ph_basic'], ledgerId: 'led_pf' },
    { id: 'ph_epf', name: 'Employer PF', kind: 'EMPLOYER', calc: 'PERCENT', pct: 12, basisHeadIds: ['ph_basic'], ledgerId: 'led_epf', liabilityLedgerId: 'led_pf' },
  ];
  d.employees = [{ id: 'emp_ravi', name: 'Ravi', salary: [{ headId: 'ph_basic', amount: 18000 }, { headId: 'ph_hra', amount: 6000 }, { headId: 'ph_pf' }, { headId: 'ph_epf' }] }];
  d.vouchers.push(voucher('ATTENDANCE', '2026-10-31', [], { attendance: [{ employeeId: 'emp_ravi', typeId: 'at_absent', value: 1 }] }));
  const ravi = computePay(d, 'emp_ravi', '2026-10');
  assert.equal(ravi.days, 30); // 31 days less 1 absent
  const basic = ravi.earnings.find(e => e.headId === 'ph_basic')!.amount;
  assert.equal(basic, Math.round((18000 * 30 / 31) * 100) / 100);
  assert.equal(ravi.deductions.find(e => e.headId === 'ph_pf')!.amount, Math.round(basic * 12) / 100);
  const posted = payrollLines(d, [{ employeeId: ravi.employeeId, days: ravi.days, earnings: ravi.earnings, deductions: ravi.deductions, employer: ravi.employer, net: ravi.net }], 'led_salary_payable');
  const dSum = posted.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0);
  const cSum = posted.lines.filter(l => l.side === 'CR').reduce((s, l) => s + l.amount, 0);
  assert.ok(isZero(dSum - cSum));
});

test('bank reconciliation: the bank balance excludes what has not cleared', () => {
  const d = fresh();
  d.ledgers.find(l => l.id === 'bank')!.openingBalance = 1000;
  d.ledgers.find(l => l.id === 'led_capital')!.openingBalance = -2000;
  d.vouchers.push(
    voucher('PAYMENT', '2026-05-01', [dr('led_exp_rent', 300), cr('bank', 300, { bank: { mode: 'CHEQUE', instrumentNo: '1', bankDate: '2026-05-03' } })]),
    voucher('PAYMENT', '2026-05-02', [dr('led_exp_rent', 200), cr('bank', 200, { bank: { mode: 'CHEQUE', instrumentNo: '2' } })]),
  );
  const reg = bankRegister(d, 'bank', '2026-05-31');
  assert.equal(reg.bookBalance, 500);
  assert.equal(reg.notInBank, -200);
  assert.equal(reg.bankBalance, 700);
});

test('cash flow net movement matches the change in cash and bank', () => {
  const d = buildSampleCompany();
  const flow = cashFlow(d, FY.from, FY.to);
  const net = flow.months.reduce((s, m) => s + m.net, 0);
  assert.ok(isZero(flow.opening + net - flow.closing), `${flow.opening} + ${net} vs ${flow.closing}`);
});

test('funds flow: sources less uses equals the change in working capital', () => {
  const d = buildSampleCompany();
  const f = fundsFlow(d, FY.from, FY.to);
  const sources = f.sources.reduce((s, x) => s + x.amount, 0);
  const uses = f.uses.reduce((s, x) => s + x.amount, 0);
  assert.ok(isZero(sources - uses - f.workingCapitalChange), `${sources} - ${uses} vs ${f.workingCapitalChange}`);
});

test('VAT 201: outputs by emirate, zero-rated exports, reverse charge, and the net payable', () => {
  const d = buildSampleCompany();
  const r = vatReturn(d, SFY.from, SFY.to);
  const box = (b: string) => [...r.outputs, ...r.inputs].find(x => x.box === b)!;
  // Alpha in Abu Dhabi: 10000 + 12500 + 7500. Beta in Dubai: 6000 + 9000 + 8000, less the 1000 credit note.
  assert.deepEqual([box('1a').amount, box('1a').vat], [30000, 1500]);
  assert.deepEqual([box('1b').amount, box('1b').vat], [22000, 1100]);
  assert.equal(box('1c').amount, 0);
  // Exports to Northwind: USD 2000 at 3.6725 and USD 1500 at 3.66.
  assert.equal(box('4').amount, 7345 + 5490);
  // CloudHost in Ireland: reverse charge in both box 3 and box 10.
  assert.deepEqual([box('3').amount, box('3').vat], [1200, 60]);
  assert.deepEqual([box('10').amount, box('10').vat], [1200, 60]);
  // The monitor from Delta; the designer charged no VAT.
  assert.deepEqual([box('9').amount, box('9').vat], [1800, 90]);
  assert.equal(r.due, 1500 + 1100 + 60);
  assert.equal(r.recoverable, 90 + 60);
  assert.equal(r.payable, r.due - r.recoverable);
  const sales = vatDocuments(d, ['SALES'], SFY.from, SFY.to);
  assert.equal(sales.filter(x => x.party?.trn).length, 6); // Alpha and Beta are registered
});

test('the Output and Input VAT ledgers agree with the VAT return', () => {
  const d = buildSampleCompany();
  const r = vatReturn(d, SFY.from, SFY.to);
  const bal = ledgerBalances(d, SFY.from, SFY.to);
  assert.equal(-bal.get('led_vat_output')!.closing, r.due);
  assert.equal(bal.get('led_vat_input')!.closing, r.recoverable);
});

test('projects show income, spending and profit from what was tagged to them', () => {
  const d = buildSampleCompany();
  const rows = costCentreReport(d, SFY.from, SFY.to);
  assert.equal(rows.find(r => r.centreId === 'prj_alpha')!.expense, 620);
  const beta = projectRows(d, SFY.from, SFY.to).find(r => r.project.id === 'prj_beta')!;
  assert.equal(beta.income, 6000 + 9000 + 8000 - 1000); // income excludes VAT
  assert.equal(beta.expense, 2500 + 1200); // the designer, and hosting imported under the reverse charge
  assert.equal(beta.profit, beta.income - beta.expense);
  assert.equal(beta.clientName, 'Beta Global Technologies FZ-LLC');
});

test('invoice status follows payments and due dates', () => {
  const d = buildSampleCompany();
  const rows = invoiceRows(d, 'SALES', SFY.from, SFY.to);
  const by = (no: string) => rows.find(r => r.voucher.number === no)!;
  assert.equal(by('INV-001').status, 'PAID');
  assert.equal(by('INV-004').status, 'OVERDUE');
  assert.equal(by('INV-004').received, 5000);
  assert.equal(by('INV-004').balance, 9450 - 5000);
  assert.equal(by('INV-007').status, 'UNPAID');
  assert.equal(by('INV-005').status, 'PAID');
  assert.equal(by('INV-005').total, 7345);
});

test('each client row shows what was billed, settled and is still open', () => {
  const d = buildSampleCompany();
  const alpha = partyRows(d, G.debtors, SFY.from, SFY.to).find(r => r.ledger.id === 'led_client_alpha')!;
  assert.equal(alpha.billed, 10500 + 13125 + 7875); // VAT included
  assert.equal(alpha.settled, 4000 + 10500 + 13125);
  assert.equal(alpha.balance, 7875);
  assert.equal(alpha.invoices, 3);
});

test('a foreign-currency invoice posts in dirhams and remembers the dollars', () => {
  const d = buildSampleCompany();
  const inv = d.vouchers.find(v => v.number === 'INV-008')!;
  const party = inv.lines.find(l => l.ledgerId === 'led_client_northwind')!;
  assert.equal(party.amount, 1500 * 3.66);
  assert.equal(party.forex!.fcAmount, 1500);
  const north = forexPositions(d, SFY.to).find(p => p.ledger.id === 'led_client_northwind')!;
  assert.equal(north.fcBalance, 1500);
  assert.ok(isZero(north.gain - (1500 * 3.6725 - 1500 * 3.66)));
});

test('a project tag on an invoice reaches the income ledger, not the party or the tax', () => {
  const d = buildSampleCompany();
  const inv = d.vouchers.find(v => v.number === 'INV-001')!;
  const income = inv.lines.find(l => l.ledgerId === PROFESSIONAL_FEES_LEDGER_ID)!;
  assert.deepEqual(income.costs, [{ centreId: 'prj_alpha', amount: 10000 }]);
  assert.ok(inv.lines.filter(l => l.ledgerId !== PROFESSIONAL_FEES_LEDGER_ID).every(l => !l.costs));
});

test('expense summary counts expenses only, and matches the month totals', () => {
  const d = buildSampleCompany();
  const e = expenseSummary(d, FY.from, FY.to);
  assert.ok(e.ledgers.some(r => r.ledger.id === 'led_exp_rent'));
  assert.ok(!e.ledgers.some(r => r.ledger.id === 'led_drawings'));
  assert.ok(isZero(e.months.reduce((s, m) => s + m.amount, 0) - e.total));
});

test('a new business starts clean and balanced, with money you bring in as capital', () => {
  const d = blankCompany({ name: 'Me', fyStart: FY.from, today: '2026-11-03', bankName: 'My Bank', bankOpening: 50000, cashOpening: 2000 });
  assert.equal(d.vouchers.length, 0);
  assert.equal(openingDifference(d), 0);
  assert.equal(d.ledgers.find(l => l.id === 'led_capital')!.openingBalance, -52000);
  assertBalanced(d);
  assert.deepEqual(verifyBooks(d), []);
});

test('interest accrues on the running daily balance', () => {
  const d = fresh();
  const led = d.ledgers.find(l => l.id === 'cust')!;
  led.openingBalance = 36500;
  led.interestPct = 10;
  // 10% on 36,500 is 10 a day for all 365 days.
  assert.equal(interestFor(d, led, FY.from, FY.to).interest, 3650);
});

test('budget actual reads spend from the period only', () => {
  const d = fresh();
  d.vouchers.push(voucher('PAYMENT', '2026-05-01', [dr('led_exp_rent', 100), cr('bank', 100)]));
  assert.equal(budgetActual(d, 'LEDGER', 'led_exp_rent', FY.from, FY.to), 100);
  assert.equal(budgetActual(d, 'GROUP', G.indirectExpense, FY.from, FY.to), 100);
  assert.equal(budgetActual(d, 'LEDGER', 'led_exp_rent', '2026-06-01', FY.to), 0);
});

test('voucher numbers continue from the highest used, even after a delete', () => {
  const d = fresh();
  d.vouchers.push(voucher('PAYMENT', '2026-05-01', [], { number: 'PAY-007' }), voucher('PAYMENT', '2026-05-01', [], { number: 'PAY-002' }));
  assert.equal(nextVoucherNumber(d, 'vt_payment'), 'PAY-008');
});

test('ratios are worked out from the books and stay finite', () => {
  const d = buildSampleCompany();
  const r = ratios(d, FY.from, FY.to);
  assert.ok(r.currentRatio !== null && r.currentRatio > 0);
  assert.ok(Number.isFinite(r.workingCapital));
});

test('old version 1 data is converted without losing any amounts', () => {
  const v1 = {
    company: { companyName: 'Old Co', legalName: 'Old Co Pvt Ltd', gstinOrTaxId: 'ABC', currencySymbol: '₹', financialYearStart: '2026-04-01', financialYearEnd: '2027-03-31', currentAccountingDate: '2026-11-03' },
    savingsConfig: { emergencyReservePct: 10, taxBufferPct: 20, expansionReservePct: 30, generalSavingsPct: 40, monthlyBurnRateEstimate: 1000, annualReturnRatePct: 5 },
    ledgers: [
      { id: 'c', name: 'Cash', group: 'CASH', openingBalance: 500 },
      { id: 'o', name: 'Owner', group: 'CAPITAL_ACCOUNT', openingBalance: -500 },
      { id: 's', name: 'Sales', group: 'DIRECT_INCOME', openingBalance: 0 },
      { id: 'r', name: 'Rent', group: 'INDIRECT_EXPENSE', openingBalance: 0 },
    ],
    vouchers: [
      { id: 'x', voucherNo: 'SAL-001', voucherType: 'SALES', date: '2026-05-01', debitLedgerId: 'c', creditLedgerId: 's', amount: 200, narration: 'Sale', items: [{ id: 'i', itemName: 'Thing', quantity: 2, rate: 100, unit: 'pcs', amount: 200 }] },
      { id: 'y', voucherNo: 'PAY-001', voucherType: 'PAYMENT', date: '2026-05-02', debitLedgerId: 'r', creditLedgerId: 'c', amount: 50, narration: 'Rent', chequeOrUtrNo: 'UTR1' },
    ],
  };
  const d = migrateV1(v1);
  assert.equal(d.company.name, 'Old Co');
  assert.equal(d.vouchers.length, 2);
  assert.equal(d.savings.emergencyReservePct, 10);
  assert.equal(d.stockItems.length, 1);
  assert.equal(pnl(d, FY.from, FY.to).sales, 200);
  assert.equal(pnl(d, FY.from, FY.to).indirectExpense, 50);
  assertBalanced(d);
});

test('books saved under Indian GST open as UAE VAT books without losing anything', () => {
  const old = fresh() as unknown as Record<string, any>;
  old.company = { ...old.company, currencySymbol: '₹', currencyCode: 'INR', gstin: '27AABCA1234F1Z8', features: { ...old.company.features, gst: true } };
  delete old.company.features.vat;
  old.ledgers.push({ id: 'old_cgst', name: 'Output CGST', groupId: G.duties, openingBalance: 0, taxType: 'CGST', taxSide: 'OUTPUT' });
  old.ledgers.find((l: { id: string }) => l.id === 'cust').gstin = '29AAFCA5678K1Z2';
  old.vouchers.push({ ...voucher('SALES', '2026-05-01', [dr('cust', 1180), cr('led_sales', 1000), cr('old_cgst', 180)]), gst: [{ rate: 18, taxable: 1000, cgst: 90, sgst: 90, igst: 0 }] });
  const d = toUaeVat(old as unknown as CompanyData);
  assert.equal(d.company.currencyCode, 'AED');
  assert.equal(d.company.features.vat, true);
  assert.equal(d.company.trn, '27AABCA1234F1Z8');
  assert.ok(!('gst' in d.company.features));
  assert.equal(d.ledgers.find(l => l.id === 'cust')!.trn, '29AAFCA5678K1Z2');
  assert.equal(d.ledgers.find(l => l.id === 'old_cgst')!.taxType, 'OTHER');
  assert.ok(d.ledgers.some(l => l.taxType === 'VAT' && l.taxSide === 'OUTPUT'));
  assert.deepEqual(d.vouchers.at(-1)!.vat, [{ rate: 18, taxable: 1000, vat: 180 }]);
  assertBalanced(d);
  assert.equal(toUaeVat(d), d); // already converted: nothing changes
});

test('invoices not tracked one by one show unpaid until the client actually pays', () => {
  let d = fresh();
  d.ledgers.push({ id: 'walkin', name: 'Walk-in Client', groupId: G.debtors, openingBalance: 0 });
  d.vouchers.push(
    voucher('SALES', '2026-05-01', [dr('walkin', 2000), cr('led_sales', 2000)], { partyId: 'walkin', number: 'INV-A' }),
    voucher('SALES', '2026-06-01', [dr('walkin', 3000), cr('led_sales', 3000)], { partyId: 'walkin', number: 'INV-B' }),
  );
  const status = () => Object.fromEntries(invoiceRows(d, 'SALES', FY.from, FY.to).map(r => [r.voucher.number, [r.status, r.balance]]));
  d.company.currentDate = '2026-04-15';
  assert.deepEqual(status(), { 'INV-A': ['UNPAID', 2000], 'INV-B': ['UNPAID', 3000] });
  // 2500 received: the older invoice is cleared first, the newer one is part paid.
  // Books are replaced, never edited in place, as the app does.
  d = { ...d, vouchers: [...d.vouchers, voucher('RECEIPT', '2026-06-10', [dr(CASH, 2500), cr('walkin', 2500)], { partyId: 'walkin' })] };
  assert.deepEqual(status(), { 'INV-A': ['PAID', 0], 'INV-B': ['PART_PAID', 2500] });
});
