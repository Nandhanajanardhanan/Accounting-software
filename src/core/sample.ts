// The demo business: a freelance software consultant in Dubai, registered for UAE VAT.
// Built through the same invoice code as real entries, so it stays correct.
import type { BankInfo, CompanyData, Ledger, Voucher, VoucherBase, VoucherLine } from './types.ts';
import { blankCompany, CASH_LEDGER_ID, G, OUTSIDE_UAE, PROFESSIONAL_FEES_LEDGER_ID, STANDARD_VAT_RATE } from './defaults.ts';
import { computeInvoice } from './invoice.ts';
import type { InvoiceBase, InvoiceInput } from './invoice.ts';

export const SAMPLE_COMPANY_ID = 'co_sample_freelance';

const addDaysLocal = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function buildSampleCompany(): CompanyData {
  const data = blankCompany({
    name: 'Apex Freelance & Consulting',
    ownerName: 'Alex Morgan',
    profession: 'Software Engineering & Cloud Consulting',
    state: 'Dubai',
    address: 'Office 402, Innov8 Co-working, Dubai Internet City',
    trn: '100123456700003',
    phone: '+971 50 123 4567',
    email: 'billing@apex-freelance.example',
    fyStart: '2026-01-01',
    today: '2026-11-03',
    features: { vat: true, tds: false, costCentres: true, billWise: true, budgets: true, multiCurrency: true },
    cashOpening: 500,
    bankName: 'Emirates NBD Current A/c',
    bankOpening: 15000,
  });
  data.company.id = SAMPLE_COMPANY_ID;
  data.company.invoiceTerms = 'Payment due within the agreed credit period. Thank you for your business.';

  const add = (ledger: Ledger) => data.ledgers.push(ledger);
  const bank = data.ledgers.find(l => l.id === 'led_bank_main')!;
  Object.assign(bank, { bankName: 'Emirates NBD', accountNo: '1012345678901', ifsc: 'AE070260001012345678901', branch: 'Dubai Internet City' });
  add({ id: 'led_bank_savings', name: 'ADCB Savings A/c', groupId: G.bank, openingBalance: 6000, bankName: 'ADCB', accountNo: '00451500123', ifsc: 'AE460030000000451500123', branch: 'Al Barsha' });
  add({ id: 'led_fa_laptop', name: 'Laptop & Equipment', groupId: G.fixedAssets, openingBalance: 12000 });
  add({ id: 'led_exp_depr', name: 'Depreciation', groupId: G.indirectExpense, openingBalance: 0 });
  add({ id: 'led_export_fees', name: 'Export of Services', groupId: G.sales, openingBalance: 0, costCentres: true, vatRate: 0 });
  add({ id: 'led_inc_interest', name: 'Bank Interest Received', groupId: G.indirectIncome, openingBalance: 0 });
  data.ledgers.find(l => l.id === PROFESSIONAL_FEES_LEDGER_ID)!.vatRate = STANDARD_VAT_RATE;

  // Opening balances: money and equipment you started with, one client still owing and one vendor to pay.
  add({
    id: 'led_client_alpha', name: 'Alpha Solutions LLC', groupId: G.debtors, openingBalance: 4000, billWise: true, creditDays: 30, contactPerson: 'Priya Nair',
    state: 'Abu Dhabi', address: 'Al Maryah Island, Abu Dhabi', phone: '+971 2 555 1111', trn: '100234567800003', email: 'accounts@alpha.example',
    openingBills: [{ ref: 'OB-ALPHA', date: '2025-12-10', dueDate: '2026-01-09', amount: 4000 }],
  });
  add({
    id: 'led_client_beta', name: 'Beta Global Technologies FZ-LLC', groupId: G.debtors, openingBalance: 0, billWise: true, creditDays: 30, contactPerson: 'Rohan Shah',
    state: 'Dubai', address: 'Dubai Silicon Oasis', phone: '+971 4 555 2222', trn: '100345678900003', email: 'finance@beta.example',
  });
  add({
    id: 'led_client_northwind', name: 'Northwind Labs Inc', groupId: G.debtors, openingBalance: 0, billWise: true, creditDays: 45, contactPerson: 'Sam Lee',
    state: OUTSIDE_UAE, country: 'United States', address: 'Austin, Texas', email: 'ap@northwind.example', currencyId: 'cur_usd',
  });
  add({
    id: 'led_vendor_zenith', name: 'Zenith IT Supplies LLC', groupId: G.creditors, openingBalance: -800, billWise: true, creditDays: 15,
    state: 'Sharjah', address: 'Sharjah Media City', trn: '100456789000003',
    openingBills: [{ ref: 'OB-ZENITH', date: '2025-12-20', dueDate: '2026-01-04', amount: -800 }],
  });
  add({ id: 'led_vendor_riya', name: 'Riya Sharma (Designer)', groupId: G.creditors, openingBalance: 0, billWise: true, creditDays: 15, state: 'Dubai' });
  add({ id: 'led_vendor_delta', name: 'Delta Electronics Trading', groupId: G.creditors, openingBalance: 0, billWise: true, creditDays: 30, state: 'Dubai', address: 'Al Fahidi Street, Bur Dubai', trn: '100567890100003' });
  add({ id: 'led_vendor_cloudhost', name: 'CloudHost Ltd (Ireland)', groupId: G.creditors, openingBalance: 0, billWise: true, creditDays: 30, state: OUTSIDE_UAE, country: 'Ireland' });

  // What you started with, less what you owed, is your capital.
  const openings = data.ledgers.filter(l => l.id !== 'led_capital').reduce((s, l) => s + l.openingBalance, 0);
  data.ledgers.find(l => l.id === 'led_capital')!.openingBalance = -openings;

  data.currencies = [{ id: 'cur_usd', code: 'USD', symbol: '$', name: 'US Dollar', rate: 3.6725 }];
  data.costCentres = [
    { id: 'prj_alpha', name: 'Alpha ERP Integration', categoryId: 'cc_primary', clientId: 'led_client_alpha', status: 'ACTIVE', quote: 40000, startDate: '2026-01-01' },
    { id: 'prj_beta', name: 'Beta Mobile App', categoryId: 'cc_primary', clientId: 'led_client_beta', status: 'ACTIVE', quote: 30000, startDate: '2026-05-01' },
    { id: 'prj_north', name: 'Northwind API Audit', categoryId: 'cc_primary', clientId: 'led_client_northwind', status: 'DONE', quote: 15000, startDate: '2026-08-01', endDate: '2026-10-30' },
  ];
  data.budgets = [{
    id: 'bud_fy', name: 'FY 2026 Plan', from: '2026-01-01', to: '2026-12-31',
    lines: [
      { kind: 'GROUP', refId: G.indirectExpense, amount: 35000 },
      { kind: 'LEDGER', refId: 'led_exp_rent', amount: 14400 },
      { kind: 'LEDGER', refId: 'led_exp_travel', amount: 4000 },
      { kind: 'GROUP', refId: G.sales, amount: 120000 },
    ],
  }];
  data.scenarios = [{ id: 'sc_prov', name: 'If my memos were real', includeOptional: true, includeMemo: true, includeReversing: true }];

  // ---- transactions, oldest first ----
  let lineSeq = 0;
  const stamp = '2026-11-03T09:00:00.000Z';
  const counters = new Map<VoucherBase, number>();
  const nextNo = (type: VoucherBase) => {
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    const prefix = data.voucherTypes.find(t => t.base === type)!.prefix;
    return `${prefix}-${String(n).padStart(3, '0')}`;
  };
  const push = (v: Omit<Voucher, 'id' | 'typeId' | 'number' | 'createdAt' | 'updatedAt'> & { number?: string }) => {
    const number = v.number ?? nextNo(v.type);
    const voucher: Voucher = {
      ...v, id: `v_${v.type.toLowerCase()}_${number.toLowerCase()}`,
      typeId: `vt_${v.type.toLowerCase()}`, number, createdAt: stamp, updatedAt: stamp,
    };
    data.vouchers.push(voucher);
    return voucher;
  };
  const line = (ledgerId: string, side: 'DR' | 'CR', amount: number, extra: Partial<VoucherLine> = {}): VoucherLine => ({
    id: `sl_${++lineSeq}`, ledgerId, side, amount, ...extra,
  });
  const transfer = (no: string, bankDate?: string): BankInfo => ({ mode: 'NEFT', instrumentNo: no, bankDate });
  const BANK = 'led_bank_main';

  const invoice = (base: InvoiceBase, date: string, input: Omit<InvoiceInput, 'base' | 'roundOff'>, extra: Partial<Voucher> = {}) => {
    const number = nextNo(base);
    const ledger = data.ledgers.find(l => l.id === input.partyId);
    const due = addDaysLocal(date, ledger?.creditDays ?? 0);
    const result = computeInvoice(data, { ...input, base, roundOff: !input.currencyId });
    if (result.errors.length) throw new Error(`Sample ${number}: ${result.errors.join(' ')}`);
    const party = result.lines.find(l => l.ledgerId === input.partyId)!;
    if (ledger?.billWise && !input.bills) party.bills = [{ type: 'NEW', ref: extra.reference ?? number, amount: party.amount, dueDate: due }];
    return push({
      type: base, number, date, lines: result.lines, stock: result.stock.length ? result.stock : undefined, services: result.services,
      vat: result.vat.length ? result.vat : undefined,
      partyId: input.partyId, projectId: input.projectId, dueDate: ledger?.billWise ? due : undefined,
      currencyId: input.currencyId, exchangeRate: input.exchangeRate,
      placeOfSupply: ledger?.state, ...extra,
    });
  };
  const work = (description: string, qty: number, rate: number, vatRate: number | undefined = STANDARD_VAT_RATE, ledgerId = PROFESSIONAL_FEES_LEDGER_ID) => ({ description, ledgerId, qty, rate, vatRate });
  const receipt = (date: string, ref: string, clientId: string, received: number, bankNo: string, cleared?: string, narration?: string) => push({
    type: 'RECEIPT', date, partyId: clientId, narration,
    lines: [
      line(BANK, 'DR', received, { bank: transfer(bankNo, cleared) }),
      line(clientId, 'CR', received, { bills: [{ type: 'AGST', ref, amount: received }] }),
    ],
  });
  const expense = (date: string, ledgerId: string, amount: number, from: string, narration: string, projectId?: string, bankInfo?: BankInfo) => push({
    type: 'PAYMENT', date, narration,
    lines: [
      line(ledgerId, 'DR', amount, projectId ? { costs: [{ centreId: projectId, amount }] } : {}),
      line(from, 'CR', amount, bankInfo ? { bank: bankInfo } : {}),
    ],
  });

  // January to April
  push({
    type: 'PAYMENT', date: '2026-01-12', partyId: 'led_vendor_zenith', narration: 'Cleared the opening balance with Zenith',
    lines: [line('led_vendor_zenith', 'DR', 800, { bills: [{ type: 'AGST', ref: 'OB-ZENITH', amount: 800 }] }), line(BANK, 'CR', 800, { bank: transfer('TRF0112001', '2026-01-12') })],
  });
  push({
    type: 'RECEIPT', date: '2026-01-20', partyId: 'led_client_alpha', narration: 'Last year\'s balance received',
    lines: [line(BANK, 'DR', 4000, { bank: transfer('TRF0120002', '2026-01-20') }), line('led_client_alpha', 'CR', 4000, { bills: [{ type: 'AGST', ref: 'OB-ALPHA', amount: 4000 }] })],
  });
  invoice('SALES', '2026-04-15', { partyId: 'led_client_alpha', projectId: 'prj_alpha', services: [work('ERP integration, phase 1', 40, 250)] }, { narration: 'Phase 1 of the ERP integration' });

  // Monthly running costs
  const months = ['04', '05', '06', '07', '08', '09', '10'];
  for (const m of months) {
    const date = (d: string) => `2026-${m}-${d}`;
    expense(date('05'), 'led_exp_rent', 1200, BANK, 'Co-working desk rent', undefined, transfer(`RENT${m}`, date('05')));
    expense(date('08'), 'led_exp_software', 280, BANK, 'GitHub, Figma and other tools', undefined, { mode: 'CARD', instrumentNo: `CARD${m}`, bankDate: date('09') });
    expense(date('14'), 'led_exp_internet', 150, CASH_LEDGER_ID, 'Broadband and mobile');
    if (m !== '04') push({
      type: 'PAYMENT', date: date('28'), narration: 'Taken out for personal use',
      lines: [line('led_drawings', 'DR', 3000), line(BANK, 'CR', 3000, { bank: transfer(`DRW${m}`, date('28')) })],
    });
  }

  // May to July
  receipt('2026-05-10', 'INV-001', 'led_client_alpha', 10500, 'TRF0510003', '2026-05-10', 'Alpha paid phase 1 in full, VAT included');
  invoice('SALES', '2026-05-20', { partyId: 'led_client_beta', projectId: 'prj_beta', services: [work('Mobile app design sprint', 30, 200)] });
  push({
    type: 'CONTRA', date: '2026-06-01', narration: 'Cash withdrawn from the bank',
    lines: [line(CASH_LEDGER_ID, 'DR', 1000), line(BANK, 'CR', 1000, { bank: { mode: 'OTHER', instrumentNo: 'ATM-0601', bankDate: '2026-06-01' } })],
  });
  invoice('PURCHASE', '2026-06-05', { partyId: 'led_vendor_delta', services: [{ description: '27-inch monitor and dock', ledgerId: 'led_fa_laptop', qty: 1, rate: 1800, vatRate: STANDARD_VAT_RATE }] }, { reference: 'DE-7781', referenceDate: '2026-06-05', narration: 'New monitor and dock for the office' });
  receipt('2026-06-15', 'INV-002', 'led_client_beta', 6300, 'TRF0615004', '2026-06-15', 'Beta paid the design sprint');
  expense('2026-06-18', 'led_exp_travel', 620, BANK, 'Client kick-off in Abu Dhabi', 'prj_alpha', { mode: 'CARD', instrumentNo: 'TRV-0618', bankDate: '2026-06-19' });
  invoice('SALES', '2026-06-25', { partyId: 'led_client_alpha', projectId: 'prj_alpha', services: [work('ERP integration, phase 2', 50, 250)] });
  push({
    type: 'PAYMENT', date: '2026-07-02', partyId: 'led_vendor_delta', narration: 'Paid Delta for the monitor',
    lines: [line('led_vendor_delta', 'DR', 1890, { bills: [{ type: 'AGST', ref: 'DE-7781', amount: 1890 }] }), line(BANK, 'CR', 1890, { bank: transfer('TRF0702005', '2026-07-02') })],
  });
  invoice('PURCHASE', '2026-07-10', {
    partyId: 'led_vendor_riya', projectId: 'prj_beta',
    services: [{ description: 'UI design for the mobile app (designer not VAT registered)', ledgerId: 'led_exp_subcontract', qty: 1, rate: 2500 }],
  }, { reference: 'RS-014', referenceDate: '2026-07-10', narration: 'Designer bill, no VAT charged' });
  push({
    type: 'PAYMENT', date: '2026-07-22', partyId: 'led_vendor_riya', narration: 'Paid Riya',
    lines: [line('led_vendor_riya', 'DR', 2500, { bills: [{ type: 'AGST', ref: 'RS-014', amount: 2500 }] }), line(BANK, 'CR', 2500, { bank: transfer('TRF0722006', '2026-07-22') })],
  });
  invoice('SALES', '2026-07-28', { partyId: 'led_client_beta', projectId: 'prj_beta', services: [work('App development, sprint 2', 45, 200)] });

  // August to November
  receipt('2026-08-05', 'INV-003', 'led_client_alpha', 13125, 'TRF0805007', '2026-08-05', 'Alpha paid phase 2');
  receipt('2026-08-25', 'INV-004', 'led_client_beta', 5000, 'TRF0825009', '2026-08-25', 'Part payment from Beta');
  invoice('SALES', '2026-08-30', {
    partyId: 'led_client_northwind', projectId: 'prj_north', currencyId: 'cur_usd', exchangeRate: 3.6725, accountLedgerId: 'led_export_fees',
    services: [work('API security audit', 40, 50, 0, 'led_export_fees')],
  }, { narration: 'Export of services to a client outside the UAE, zero-rated' });
  invoice('PURCHASE', '2026-09-10', {
    partyId: 'led_vendor_cloudhost', projectId: 'prj_beta',
    services: [{ description: 'Cloud hosting, Q3', ledgerId: 'led_exp_hosting', qty: 1, rate: 1200, vatRate: STANDARD_VAT_RATE }],
  }, { reference: 'CH-2209', referenceDate: '2026-09-10', narration: 'Imported service: VAT under the reverse charge' });
  push({
    type: 'RECEIPT', date: '2026-09-20', partyId: 'led_client_northwind', narration: 'USD 2,000 received at 3.6725',
    lines: [
      line(BANK, 'DR', 7345, { bank: { mode: 'OTHER', instrumentNo: 'SWIFT-0920', bankDate: '2026-09-21' } }),
      line('led_client_northwind', 'CR', 7345, { bills: [{ type: 'AGST', ref: 'INV-005', amount: 7345 }], forex: { currencyId: 'cur_usd', fcAmount: 2000, rate: 3.6725 } }),
    ],
  });
  invoice('SALES', '2026-09-28', { partyId: 'led_client_beta', projectId: 'prj_beta', services: [work('App development, sprint 3', 40, 200)] });
  push({
    type: 'JOURNAL', date: '2026-09-30', narration: 'Depreciation on equipment for the half year',
    lines: [line('led_exp_depr', 'DR', 1500), line('led_fa_laptop', 'CR', 1500)],
  });
  push({
    type: 'PAYMENT', date: '2026-10-08', partyId: 'led_vendor_cloudhost', narration: 'Paid CloudHost (no VAT paid to them)',
    lines: [line('led_vendor_cloudhost', 'DR', 1200, { bills: [{ type: 'AGST', ref: 'CH-2209', amount: 1200 }] }), line(BANK, 'CR', 1200, { bank: { mode: 'CARD', instrumentNo: 'CH-1008', bankDate: '2026-10-09' } })],
  });
  invoice('CREDIT_NOTE', '2026-10-05', {
    partyId: 'led_client_beta', projectId: 'prj_beta', bills: [{ type: 'AGST', ref: 'INV-006', amount: 1050 }],
    services: [work('Goodwill discount on sprint 3', 1, 1000)],
  }, { reference: 'INV-006', narration: 'Discount agreed after a delayed release' });
  invoice('SALES', '2026-10-20', { partyId: 'led_client_alpha', projectId: 'prj_alpha', services: [work('Support retainer, October', 1, 7500)] });
  invoice('SALES', '2026-10-30', {
    partyId: 'led_client_northwind', projectId: 'prj_north', currencyId: 'cur_usd', exchangeRate: 3.66,
    services: [work('Audit follow-up review', 30, 50, 0, 'led_export_fees')],
  }, { narration: 'Export of services, zero-rated' });
  expense('2026-10-31', 'led_exp_bank', 35, BANK, 'Bank charges for October', undefined, { mode: 'OTHER', instrumentNo: 'CHG-OCT' });
  push({
    type: 'RECEIPT', date: '2026-10-31', narration: 'Savings interest credited',
    lines: [line('led_bank_savings', 'DR', 145, { bank: { mode: 'OTHER', instrumentNo: 'INT-OCT' } }), line('led_inc_interest', 'CR', 145)],
  });
  expense('2026-11-01', 'led_exp_learning', 320, BANK, 'Cloud certification course', undefined, { mode: 'CARD', instrumentNo: 'CRS-1101' });

  push({
    type: 'MEMORANDUM', date: '2026-11-02', narration: 'Thinking about a laptop upgrade, not decided yet',
    lines: [line('led_fa_laptop', 'DR', 9000), line(BANK, 'CR', 9000)],
  });
  push({
    type: 'PAYMENT', date: '2026-12-10', isPostDated: true, partyId: 'led_vendor_riya', narration: 'Post-dated cheque given to Riya as an advance',
    lines: [
      line('led_vendor_riya', 'DR', 1000, { bills: [{ type: 'ADVANCE', ref: 'ADV-RIYA-1', amount: 1000 }] }),
      line(BANK, 'CR', 1000, { bank: { mode: 'CHEQUE', instrumentNo: '004513', instrumentDate: '2026-12-10', favouring: 'Riya Sharma' } }),
    ],
  });
  return data;
}
