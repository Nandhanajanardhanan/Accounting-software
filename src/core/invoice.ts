// Turns what a person types on an invoice into balanced ledger lines, stock lines and GST rows.
import type { BillAlloc, CompanyData, GstRow, StockLine, VoucherBase, VoucherLine } from './types.ts';
import { ROUND_OFF_LEDGER_ID } from './defaults.ts';
import { itemOf, ledgerOf, round2 } from './engine.ts';

export type InvoiceBase = 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface InvoiceItemInput {
  id?: string;
  itemId: string;
  godownId?: string;
  qty: number;
  rate: number;
  discountPct?: number;
  gstRate?: number;
  batch?: string;
  expiry?: string;
}

export interface InvoiceChargeInput {
  id?: string;
  ledgerId: string;
  /** Positive adds to the invoice, negative reduces it (a discount, or TDS deducted). */
  amount: number;
  gstRate?: number;
  hsn?: string;
}

export interface InvoiceInput {
  base: InvoiceBase;
  partyId: string;
  /** Sales or purchase ledger the goods post to. */
  accountLedgerId: string;
  items: InvoiceItemInput[];
  charges: InvoiceChargeInput[];
  roundOff: boolean;
  /** Override for the state goods are supplied to; defaults to the party's state. */
  placeOfSupply?: string;
  bills?: BillAlloc[];
}

export interface InvoiceResult {
  lines: VoucherLine[];
  stock: StockLine[];
  gst: GstRow[];
  subtotal: number;
  taxTotal: number;
  roundOff: number;
  total: number;
  interState: boolean;
  errors: string[];
}

const newId = () => `l_${Math.random().toString(36).slice(2, 10)}`;

// Which way each invoice type posts: where the goods go, and which side the party sits on.
const SHAPE: Record<InvoiceBase, { main: 'DR' | 'CR'; stock: 'IN' | 'OUT'; taxSide: 'INPUT' | 'OUTPUT' }> = {
  SALES: { main: 'CR', stock: 'OUT', taxSide: 'OUTPUT' },
  CREDIT_NOTE: { main: 'DR', stock: 'IN', taxSide: 'OUTPUT' },
  PURCHASE: { main: 'DR', stock: 'IN', taxSide: 'INPUT' },
  DEBIT_NOTE: { main: 'CR', stock: 'OUT', taxSide: 'INPUT' },
};

export const isInvoiceBase = (b: VoucherBase): b is InvoiceBase => b in SHAPE;

export function isInterState(data: CompanyData, partyId: string, placeOfSupply?: string): boolean {
  const own = data.company.state;
  const place = placeOfSupply || ledgerOf(data, partyId)?.state;
  return !!own && !!place && own !== place;
}

export function findTaxLedger(data: CompanyData, type: 'CGST' | 'SGST' | 'IGST', side: 'INPUT' | 'OUTPUT') {
  return data.ledgers.find(l => l.taxType === type && l.taxSide === side);
}

export function computeInvoice(data: CompanyData, input: InvoiceInput): InvoiceResult {
  const shape = SHAPE[input.base];
  const errors: string[] = [];
  const useGst = data.company.features.gst;
  const interState = isInterState(data, input.partyId, input.placeOfSupply);
  const rows = new Map<string, GstRow>();

  const addTaxable = (taxable: number, rate: number | undefined, hsn?: string) => {
    if (!useGst || !rate) {
      if (useGst && rate === 0) bump(0, hsn, taxable, 0, 0, 0);
      return;
    }
    const tax = (taxable * rate) / 100;
    if (interState) bump(rate, hsn, taxable, 0, 0, tax);
    else bump(rate, hsn, taxable, tax / 2, tax / 2, 0);
  };
  const bump = (rate: number, hsn: string | undefined, taxable: number, cgst: number, sgst: number, igst: number) => {
    const key = `${rate}|${hsn ?? ''}`;
    if (!rows.has(key)) rows.set(key, { rate, hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
    const r = rows.get(key)!;
    r.taxable += taxable; r.cgst += cgst; r.sgst += sgst; r.igst += igst;
  };

  const stock: StockLine[] = input.items.map(row => {
    const item = itemOf(data, row.itemId);
    const gross = row.qty * row.rate;
    const amount = round2(gross - (gross * (row.discountPct ?? 0)) / 100);
    addTaxable(amount, row.gstRate, item?.hsn);
    return {
      id: row.id ?? newId(), itemId: row.itemId, godownId: row.godownId, qty: row.qty, rate: row.rate,
      discountPct: row.discountPct, amount, direction: shape.stock, gstRate: row.gstRate, batch: row.batch, expiry: row.expiry,
    };
  });
  const itemsTotal = round2(stock.reduce((s, l) => s + l.amount, 0));

  const opposite = (s: 'DR' | 'CR') => (s === 'DR' ? 'CR' : 'DR');
  const lines: VoucherLine[] = [];
  if (itemsTotal !== 0) {
    if (!input.accountLedgerId) errors.push('Choose the sales or purchase ledger.');
    lines.push({ id: newId(), ledgerId: input.accountLedgerId, side: shape.main, amount: itemsTotal });
  }

  let chargesTotal = 0;
  for (const c of input.charges) {
    if (!c.ledgerId || !c.amount) continue;
    const led = ledgerOf(data, c.ledgerId);
    const rate = c.gstRate ?? led?.gstRate;
    if (rate !== undefined) addTaxable(c.amount, rate, c.hsn ?? led?.hsn);
    chargesTotal += c.amount;
    lines.push({ id: c.id ?? newId(), ledgerId: c.ledgerId, side: c.amount > 0 ? shape.main : opposite(shape.main), amount: round2(Math.abs(c.amount)) });
  }

  const gst = [...rows.values()].map(r => ({
    rate: r.rate, hsn: r.hsn, taxable: round2(r.taxable), cgst: round2(r.cgst), sgst: round2(r.sgst), igst: round2(r.igst),
  }));
  const taxes = {
    CGST: round2(gst.reduce((s, r) => s + r.cgst, 0)),
    SGST: round2(gst.reduce((s, r) => s + r.sgst, 0)),
    IGST: round2(gst.reduce((s, r) => s + r.igst, 0)),
  };
  for (const type of ['CGST', 'SGST', 'IGST'] as const) {
    if (!taxes[type]) continue;
    const led = findTaxLedger(data, type, shape.taxSide);
    if (!led) errors.push(`No ${shape.taxSide === 'OUTPUT' ? 'Output' : 'Input'} ${type} ledger found. Turn GST on again in Features to create it.`);
    else lines.push({ id: newId(), ledgerId: led.id, side: shape.main, amount: taxes[type] });
  }
  const taxTotal = round2(taxes.CGST + taxes.SGST + taxes.IGST);
  const subtotal = round2(itemsTotal + chargesTotal);
  const beforeRound = round2(subtotal + taxTotal);
  const total = input.roundOff ? Math.round(beforeRound) : beforeRound;
  const roundOff = round2(total - beforeRound);
  if (roundOff !== 0) {
    if (!ledgerOf(data, ROUND_OFF_LEDGER_ID)) errors.push('Round Off ledger is missing.');
    else lines.push({ id: newId(), ledgerId: ROUND_OFF_LEDGER_ID, side: roundOff > 0 ? shape.main : opposite(shape.main), amount: Math.abs(roundOff) });
  }

  if (input.partyId) {
    lines.unshift({ id: newId(), ledgerId: input.partyId, side: opposite(shape.main), amount: total, bills: input.bills });
  } else {
    errors.push('Choose the party.');
  }
  if (!input.items.length && !input.charges.some(c => c.ledgerId && c.amount)) errors.push('Add at least one item or charge.');
  if (total <= 0) errors.push('The invoice total must be more than zero.');

  return { lines, stock, gst, subtotal, taxTotal, roundOff, total, interState, errors };
}
