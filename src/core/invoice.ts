// Turns what a person types on an invoice or bill into balanced ledger lines, stock lines and UAE VAT rows.
import type { BillAlloc, CompanyData, CostAlloc, ServiceLine, StockLine, VatRow, VoucherBase, VoucherLine } from './types.ts';
import { OUTSIDE_UAE, ROUND_OFF_LEDGER_ID, VAT_EXEMPT } from './defaults.ts';
import { isPnlLedger, ledgerOf, round2 } from './engine.ts';

export type InvoiceBase = 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface InvoiceServiceInput {
  id?: string;
  description: string;
  ledgerId: string;
  qty: number;
  /** In the invoice's currency. */
  rate: number;
  vatRate?: number;
}

export interface InvoiceItemInput {
  id?: string;
  itemId: string;
  godownId?: string;
  qty: number;
  rate: number;
  discountPct?: number;
  vatRate?: number;
  batch?: string;
  expiry?: string;
}

export interface InvoiceChargeInput {
  id?: string;
  ledgerId: string;
  /** Positive adds to the invoice, negative reduces it (a discount). */
  amount: number;
  vatRate?: number;
}

export interface InvoiceInput {
  base: InvoiceBase;
  partyId: string;
  /** Ledger goods post to. Only needed when the invoice has stock items. */
  accountLedgerId?: string;
  services?: InvoiceServiceInput[];
  items?: InvoiceItemInput[];
  charges?: InvoiceChargeInput[];
  roundOff: boolean;
  placeOfSupply?: string;
  bills?: BillAlloc[];
  projectId?: string;
  /** Foreign-currency invoice: rates are typed in this currency and converted here. */
  currencyId?: string;
  exchangeRate?: number;
}

export interface InvoiceResult {
  lines: VoucherLine[];
  stock: StockLine[];
  services: ServiceLine[];
  vat: VatRow[];
  subtotal: number;
  taxTotal: number;
  roundOff: number;
  total: number;
  /** Total in the invoice's own currency; equals total for a local invoice. */
  fcTotal: number;
  /** A bill from a supplier outside the UAE: VAT is self-accounted, not paid to the supplier. */
  reverseCharge: boolean;
  errors: string[];
}

const newId = () => `l_${Math.random().toString(36).slice(2, 10)}`;

// Which way each type posts: the income or expense side, where goods go, and which tax ledgers apply.
const SHAPE: Record<InvoiceBase, { main: 'DR' | 'CR'; stock: 'IN' | 'OUT'; taxSide: 'INPUT' | 'OUTPUT' }> = {
  SALES: { main: 'CR', stock: 'OUT', taxSide: 'OUTPUT' },
  CREDIT_NOTE: { main: 'DR', stock: 'IN', taxSide: 'OUTPUT' },
  PURCHASE: { main: 'DR', stock: 'IN', taxSide: 'INPUT' },
  DEBIT_NOTE: { main: 'CR', stock: 'OUT', taxSide: 'INPUT' },
};

export const isInvoiceBase = (b: VoucherBase): b is InvoiceBase => b in SHAPE;

/** Emirate the supply happens in: the one chosen on the invoice, else the party's, else your own. */
export function placeOf(data: CompanyData, partyId: string | undefined, placeOfSupply?: string): string | undefined {
  return placeOfSupply || (partyId ? ledgerOf(data, partyId)?.state : undefined) || data.company.state;
}

/** Bills from suppliers outside the UAE fall under the reverse charge: you account for the VAT yourself. */
export function isReverseCharge(data: CompanyData, base: InvoiceBase, partyId: string, placeOfSupply?: string): boolean {
  if (base !== 'PURCHASE' && base !== 'DEBIT_NOTE') return false;
  return (placeOfSupply || ledgerOf(data, partyId)?.state) === OUTSIDE_UAE;
}

export function findTaxLedger(data: CompanyData, side: 'INPUT' | 'OUTPUT') {
  return data.ledgers.find(l => l.taxType === 'VAT' && l.taxSide === side);
}

export function computeInvoice(data: CompanyData, input: InvoiceInput): InvoiceResult {
  const shape = SHAPE[input.base];
  const errors: string[] = [];
  const useVat = data.company.features.vat;
  const reverseCharge = useVat && isReverseCharge(data, input.base, input.partyId, input.placeOfSupply);
  const fx = input.exchangeRate && input.exchangeRate > 0 ? input.exchangeRate : 1;
  const rows = new Map<number, VatRow>();

  const addTaxable = (taxable: number, rate: number | undefined) => {
    if (!useVat || rate === undefined) return;
    const vat = rate === VAT_EXEMPT ? 0 : (taxable * rate) / 100;
    if (!rows.has(rate)) rows.set(rate, { rate, taxable: 0, vat: 0, ...(reverseCharge ? { reverseCharge: true } : {}) });
    const r = rows.get(rate)!;
    r.taxable += taxable;
    r.vat += vat;
  };

  /** Tags a line to the project when it is income or an expense. */
  const costsFor = (ledgerId: string, amount: number): CostAlloc[] | undefined => {
    if (!input.projectId) return undefined;
    const led = ledgerOf(data, ledgerId);
    return led && isPnlLedger(data, led) ? [{ centreId: input.projectId, amount }] : undefined;
  };

  const lines: VoucherLine[] = [];
  const opposite = (s: 'DR' | 'CR') => (s === 'DR' ? 'CR' : 'DR');
  const addMainLine = (ledgerId: string, amount: number) => {
    const existing = lines.find(l => l.ledgerId === ledgerId && l.side === shape.main);
    if (existing) {
      existing.amount = round2(existing.amount + amount);
      if (existing.costs) existing.costs = costsFor(ledgerId, existing.amount);
    } else {
      lines.push({ id: newId(), ledgerId, side: shape.main, amount: round2(amount), costs: costsFor(ledgerId, round2(amount)) });
    }
  };

  // Lines of work
  const services: ServiceLine[] = [];
  for (const s of input.services ?? []) {
    if (!s.ledgerId && !s.description && !s.rate) continue;
    if (!s.ledgerId) { errors.push(`Choose an account for "${s.description || 'the line of work'}".`); continue; }
    const amount = round2(s.qty * s.rate * fx);
    if (amount === 0) continue;
    const led = ledgerOf(data, s.ledgerId);
    const rate = s.vatRate ?? led?.vatRate;
    addTaxable(amount, rate);
    addMainLine(s.ledgerId, amount);
    services.push({ id: s.id ?? newId(), description: s.description, ledgerId: s.ledgerId, qty: s.qty, rate: s.rate, amount, vatRate: rate });
  }
  const servicesTotal = round2(services.reduce((t, s) => t + s.amount, 0));

  // Stock items
  const stock: StockLine[] = (input.items ?? []).map(row => {
    const gross = row.qty * row.rate * fx;
    const amount = round2(gross - (gross * (row.discountPct ?? 0)) / 100);
    addTaxable(amount, row.vatRate);
    return {
      id: row.id ?? newId(), itemId: row.itemId, godownId: row.godownId, qty: row.qty, rate: round2(row.rate * fx),
      discountPct: row.discountPct, amount, direction: shape.stock, vatRate: row.vatRate, batch: row.batch, expiry: row.expiry,
    };
  });
  const itemsTotal = round2(stock.reduce((t, l) => t + l.amount, 0));
  if (itemsTotal !== 0) {
    if (!input.accountLedgerId) errors.push('Choose the sales or purchase ledger for the items.');
    else addMainLine(input.accountLedgerId, itemsTotal);
  }

  // Extra charges, discounts and tax deducted
  let chargesTotal = 0;
  for (const c of input.charges ?? []) {
    if (!c.ledgerId || !c.amount) continue;
    const led = ledgerOf(data, c.ledgerId);
    const rate = c.vatRate ?? led?.vatRate;
    if (rate !== undefined) addTaxable(c.amount, rate);
    chargesTotal += c.amount;
    const amount = round2(Math.abs(c.amount));
    lines.push({ id: c.id ?? newId(), ledgerId: c.ledgerId, side: c.amount > 0 ? shape.main : opposite(shape.main), amount, costs: costsFor(c.ledgerId, amount) });
  }

  const vat = [...rows.values()].map(r => ({ ...r, taxable: round2(r.taxable), vat: round2(r.vat) }));
  const vatAmount = round2(vat.reduce((t, r) => t + r.vat, 0));
  const missing = (side: 'INPUT' | 'OUTPUT') => errors.push(`No ${side === 'OUTPUT' ? 'Output' : 'Input'} VAT ledger found. Turn VAT off and on again in Features to create it.`);
  if (vatAmount) {
    const led = findTaxLedger(data, shape.taxSide);
    if (!led) missing(shape.taxSide);
    else lines.push({ id: newId(), ledgerId: led.id, side: shape.main, amount: vatAmount });
    // Reverse charge: the same VAT is also owed as output tax, so the supplier's total stays VAT-free.
    if (reverseCharge) {
      const out = findTaxLedger(data, 'OUTPUT');
      if (!out) missing('OUTPUT');
      else lines.push({ id: newId(), ledgerId: out.id, side: opposite(shape.main), amount: vatAmount });
    }
  }
  const taxTotal = reverseCharge ? 0 : vatAmount;
  const subtotal = round2(servicesTotal + itemsTotal + chargesTotal);
  const beforeRound = round2(subtotal + taxTotal);
  const total = input.roundOff ? Math.round(beforeRound) : beforeRound;
  const roundOff = round2(total - beforeRound);
  if (roundOff !== 0) {
    if (!ledgerOf(data, ROUND_OFF_LEDGER_ID)) errors.push('Round Off ledger is missing.');
    else lines.push({ id: newId(), ledgerId: ROUND_OFF_LEDGER_ID, side: roundOff > 0 ? shape.main : opposite(shape.main), amount: Math.abs(roundOff) });
  }

  const fcTotal = round2(total / fx);
  if (input.partyId) {
    lines.unshift({
      id: newId(), ledgerId: input.partyId, side: opposite(shape.main), amount: total, bills: input.bills,
      forex: input.currencyId ? { currencyId: input.currencyId, fcAmount: fcTotal, rate: fx } : undefined,
    });
  } else {
    errors.push('Choose who this is for.');
  }
  if (!services.length && !stock.length && !(input.charges ?? []).some(c => c.ledgerId && c.amount)) errors.push('Add at least one line of work or item.');
  if (total <= 0) errors.push('The total must be more than zero.');

  return { lines, stock, services, vat, subtotal, taxTotal, roundOff, total, fcTotal, reverseCharge, errors };
}
