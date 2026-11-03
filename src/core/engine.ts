// The accounting engine: pure functions from a company file to balances and reports.
// Amounts are signed with debit positive and credit negative unless a name says otherwise.
import type {
  CompanyData, Group, Ledger, Nature, Scenario, StockItem, Voucher, VoucherBase, VoucherLine,
} from './types.ts';
import { G, PNL_LEDGER_ID, VOUCHER_META } from './defaults.ts';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const isZero = (n: number) => Math.abs(n) < 0.005;
const signedOf = (line: VoucherLine) => (line.side === 'DR' ? line.amount : -line.amount);

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const dayBefore = (iso: string) => addDays(iso, -1);
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** Start of the financial year containing `date`, using the company's year-start month and day. */
export function fyStartOf(data: CompanyData, date: string): string {
  const monthDay = data.company.fyStart.slice(5);
  const year = Number(date.slice(0, 4));
  const candidate = `${year}-${monthDay}`;
  return candidate <= date ? candidate : `${year - 1}-${monthDay}`;
}

// ---------------------------------------------------------------- indexes

export interface BookOptions {
  includeOptional?: boolean;
  includeMemo?: boolean;
  includeReversing?: boolean;
  asOf?: string;
}
const optionsKey = (o?: BookOptions) =>
  o ? `${o.includeOptional ? 1 : 0}${o.includeMemo ? 1 : 0}${o.includeReversing ? 1 : 0}|${o.asOf ?? ''}` : '';

export const scenarioOptions = (s: Scenario, asOf: string): BookOptions => ({
  includeOptional: s.includeOptional, includeMemo: s.includeMemo, includeReversing: s.includeReversing, asOf,
});

interface Index {
  groups: Map<string, Group>;
  ledgers: Map<string, Ledger>;
  items: Map<string, StockItem>;
  children: Map<string, Group[]>;
  ledgersByGroup: Map<string, Ledger[]>;
  cache: Map<string, unknown>;
}

const indexCache = new WeakMap<CompanyData, Index>();

export function indexOf(data: CompanyData): Index {
  let ix = indexCache.get(data);
  if (ix) return ix;
  const children = new Map<string, Group[]>();
  for (const g of data.groups) {
    const key = g.parentId ?? '';
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(g);
  }
  const ledgersByGroup = new Map<string, Ledger[]>();
  for (const l of data.ledgers) {
    if (!ledgersByGroup.has(l.groupId)) ledgersByGroup.set(l.groupId, []);
    ledgersByGroup.get(l.groupId)!.push(l);
  }
  ix = {
    groups: new Map(data.groups.map(g => [g.id, g])),
    ledgers: new Map(data.ledgers.map(l => [l.id, l])),
    items: new Map(data.stockItems.map(i => [i.id, i])),
    children,
    ledgersByGroup,
    cache: new Map(),
  };
  indexCache.set(data, ix);
  return ix;
}

function memo<T>(data: CompanyData, key: string, make: () => T): T {
  const { cache } = indexOf(data);
  if (cache.has(key)) return cache.get(key) as T;
  const value = make();
  cache.set(key, value);
  return value;
}

export const ledgerOf = (data: CompanyData, id: string) => indexOf(data).ledgers.get(id);
export const ledgerName = (data: CompanyData, id: string) => ledgerOf(data, id)?.name ?? '(deleted ledger)';
export const groupOf = (data: CompanyData, id: string) => indexOf(data).groups.get(id);
export const itemOf = (data: CompanyData, id: string) => indexOf(data).items.get(id);

export function primaryGroupOf(data: CompanyData, groupId: string): Group | undefined {
  let g = groupOf(data, groupId);
  while (g?.parentId) g = groupOf(data, g.parentId);
  return g;
}

export function natureOf(data: CompanyData, groupId: string): Nature {
  return primaryGroupOf(data, groupId)?.nature ?? 'LIABILITY';
}

export const isPnlLedger = (data: CompanyData, l: Ledger) => {
  const n = natureOf(data, l.groupId);
  return n === 'INCOME' || n === 'EXPENSE';
};

export function isInGroup(data: CompanyData, groupId: string, ancestorId: string): boolean {
  let g = groupOf(data, groupId);
  while (g) {
    if (g.id === ancestorId) return true;
    g = g.parentId ? groupOf(data, g.parentId) : undefined;
  }
  return false;
}

export function ledgersUnder(data: CompanyData, groupId: string): Ledger[] {
  const ix = indexOf(data);
  const out: Ledger[] = [...(ix.ledgersByGroup.get(groupId) ?? [])];
  for (const child of ix.children.get(groupId) ?? []) out.push(...ledgersUnder(data, child.id));
  return out;
}

export const childGroups = (data: CompanyData, groupId: string | null) => indexOf(data).children.get(groupId ?? '') ?? [];
export const isCashOrBank = (data: CompanyData, l: Ledger) =>
  isInGroup(data, l.groupId, G.cash) || isInGroup(data, l.groupId, G.bank) || isInGroup(data, l.groupId, G.bankOd);
export const isStockLedger = (data: CompanyData, l: Ledger) => isInGroup(data, l.groupId, G.stock);

// ---------------------------------------------------------------- postings

/** Whether a voucher counts toward the books under these options. */
export function voucherInBooks(data: CompanyData, v: Voucher, o?: BookOptions): boolean {
  if (v.isCancelled) return false;
  if (v.type === 'MEMORANDUM') return !!o?.includeMemo;
  if (v.type === 'REVERSING_JOURNAL') {
    return !!o?.includeReversing && (!v.applicableUpto || !o.asOf || v.applicableUpto >= o.asOf);
  }
  if (!VOUCHER_META[v.type].accounts) return false;
  if (v.isOptional) return !!o?.includeOptional;
  if (v.isPostDated && v.date > data.company.currentDate) return false;
  return true;
}

export interface Posting {
  voucher: Voucher;
  line: VoucherLine;
  signed: number;
}

export function postings(data: CompanyData, o?: BookOptions): Posting[] {
  return memo(data, `postings:${optionsKey(o)}`, () => {
    const out: Posting[] = [];
    for (const v of data.vouchers) {
      if (!voucherInBooks(data, v, o)) continue;
      for (const line of v.lines) out.push({ voucher: v, line, signed: signedOf(line) });
    }
    return out.sort((a, b) => (a.voucher.date < b.voucher.date ? -1 : a.voucher.date > b.voucher.date ? 1 : 0));
  });
}

interface Movement { dr: number; cr: number }

/** Debit and credit totals per ledger for vouchers dated from..to (either end may be open). */
export function movements(data: CompanyData, from: string | null, to: string | null, o?: BookOptions): Map<string, Movement> {
  return memo(data, `move:${from}:${to}:${optionsKey(o)}`, () => {
    const out = new Map<string, Movement>();
    for (const p of postings(data, o)) {
      const d = p.voucher.date;
      if ((from && d < from) || (to && d > to)) continue;
      let m = out.get(p.line.ledgerId);
      if (!m) out.set(p.line.ledgerId, (m = { dr: 0, cr: 0 }));
      if (p.line.side === 'DR') m.dr += p.line.amount;
      else m.cr += p.line.amount;
    }
    return out;
  });
}

const netOf = (m?: Movement) => (m ? m.dr - m.cr : 0);

export interface LedgerBalance { opening: number; dr: number; cr: number; closing: number }

/**
 * Balances for a period. Balance-sheet ledgers carry forward forever; income and expense
 * ledgers restart at each financial year, as their result has moved to Profit & Loss A/c.
 */
export function ledgerBalances(data: CompanyData, from: string, to: string, o?: BookOptions): Map<string, LedgerBalance> {
  return memo(data, `bal:${from}:${to}:${optionsKey(o)}`, () => {
    const inPeriod = movements(data, from, to, o);
    const beforeAll = movements(data, null, dayBefore(from), o);
    const fy = fyStartOf(data, from);
    const beforeInYear = movements(data, fy, dayBefore(from), o);
    const out = new Map<string, LedgerBalance>();
    for (const l of data.ledgers) {
      const m = inPeriod.get(l.id);
      const opening = isPnlLedger(data, l)
        ? (fy <= data.company.booksFrom ? l.openingBalance : 0) + netOf(beforeInYear.get(l.id))
        : l.openingBalance + netOf(beforeAll.get(l.id));
      const dr = m?.dr ?? 0;
      const cr = m?.cr ?? 0;
      out.set(l.id, { opening, dr, cr, closing: opening + dr - cr });
    }
    return out;
  });
}

/** Current balance of one ledger at the company's current date. */
export function ledgerBalanceNow(data: CompanyData, ledgerId: string): number {
  const c = data.company;
  return ledgerBalances(data, fyStartOf(data, c.currentDate), c.periodTo > c.currentDate ? c.periodTo : c.currentDate).get(ledgerId)?.closing ?? 0;
}

// ---------------------------------------------------------------- stock

export interface StockMove {
  voucher: Voucher | null;
  date: string;
  itemId: string;
  godownId?: string;
  /** Signed quantity: positive in, negative out. */
  qty: number;
  rate: number;
  value: number;
  /** Counts toward the item's cost (purchases and production). */
  costIn: boolean;
  /** Reduces cost pool (purchase returns). */
  costOut: boolean;
  batch?: string;
  expiry?: string;
}

export function voucherMovesStock(v: Voucher): boolean {
  return VOUCHER_META[v.type].stock && !v.isCancelled && !v.isOptional && !v.stockAlreadyMoved;
}

/** All stock movements after opening, oldest first. Physical counts become the difference from book quantity. */
export function stockMoves(data: CompanyData): StockMove[] {
  return memo(data, 'stockMoves', () => {
    const vouchers = data.vouchers.filter(voucherMovesStock).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const onHand = new Map<string, number>();
    const key = (itemId: string, godownId?: string) => `${itemId}|${godownId ?? ''}`;
    for (const it of data.stockItems) onHand.set(key(it.id, it.openingGodownId), it.openingQty);

    const out: StockMove[] = [];
    for (const v of vouchers) {
      const lines = v.stock ?? [];
      const consumed = new Set(lines.filter(l => l.direction === 'OUT').map(l => l.itemId));
      for (const l of lines) {
        const k = key(l.itemId, l.godownId);
        let qty = l.direction === 'IN' ? l.qty : -l.qty;
        if (v.type === 'PHYSICAL_STOCK') qty = l.qty - (onHand.get(k) ?? 0);
        onHand.set(k, (onHand.get(k) ?? 0) + qty);
        const isInflow =
          (v.type === 'PURCHASE' || v.type === 'RECEIPT_NOTE') && l.direction === 'IN' ||
          (v.type === 'STOCK_JOURNAL' && l.direction === 'IN' && !consumed.has(l.itemId));
        const isPurchaseReturn = v.type === 'DEBIT_NOTE' || v.type === 'REJECTION_OUT';
        if (qty === 0) continue;
        out.push({
          voucher: v, date: v.date, itemId: l.itemId, godownId: l.godownId, qty,
          rate: l.rate, value: Math.abs(qty) * l.rate,
          costIn: isInflow, costOut: isPurchaseReturn,
          batch: l.batch, expiry: l.expiry,
        });
      }
    }
    return out;
  });
}

export interface ItemPosition {
  item: StockItem;
  openQty: number; openValue: number;
  inQty: number; inValue: number;
  outQty: number; outValue: number;
  closeQty: number; closeRate: number; closeValue: number;
}

function valueOfStock(data: CompanyData, item: StockItem, asOf: string): { qty: number; rate: number; value: number } {
  const moves = stockMoves(data).filter(m => m.itemId === item.id && m.date <= asOf);
  const qty = item.openingQty + moves.reduce((s, m) => s + m.qty, 0);
  const layers: { qty: number; rate: number }[] = item.openingQty ? [{ qty: item.openingQty, rate: item.openingRate }] : [];
  for (const m of moves) {
    if (m.costIn) layers.push({ qty: m.qty, rate: m.rate });
    if (m.costOut) layers.push({ qty: m.qty, rate: m.rate });
  }
  const costQty = layers.reduce((s, l) => s + l.qty, 0);
  const costValue = layers.reduce((s, l) => s + l.qty * l.rate, 0);
  const fallback = item.purchasePrice ?? item.openingRate ?? 0;
  const avg = costQty > 0 ? costValue / costQty : fallback;
  const inward = layers.filter(l => l.qty > 0);

  if (data.company.valuation === 'LAST_PURCHASE') {
    const rate = inward.length ? inward[inward.length - 1].rate : fallback;
    return { qty, rate, value: round2(qty * rate) };
  }
  if (data.company.valuation === 'FIFO' && qty > 0) {
    // Goods issued first are the oldest, so what remains sits in the newest layers.
    let remaining = qty;
    let value = 0;
    for (let i = inward.length - 1; i >= 0 && remaining > 0; i--) {
      const take = Math.min(remaining, inward[i].qty);
      value += take * inward[i].rate;
      remaining -= take;
    }
    value += remaining * avg;
    return { qty, rate: value / qty, value: round2(value) };
  }
  return { qty, rate: avg, value: round2(qty * avg) };
}

/** Value of all item-level stock at a date. Before the books start, this is the opening stock. */
export function itemStockValue(data: CompanyData, asOf: string): number {
  return memo(data, `itemValue:${asOf}:${data.company.valuation}`, () =>
    round2(data.stockItems.reduce((s, it) => s + valueOfStock(data, it, asOf).value, 0)));
}

/** Stock-in-Hand ledgers hold stock for businesses that track value only, not items. */
function stockLedgerValue(data: CompanyData, l: Ledger, asOf: string): number {
  if (l.closingStockValue !== undefined && l.closingStockDate && asOf >= l.closingStockDate) return l.closingStockValue;
  return l.openingBalance;
}

export const stockLedgers = (data: CompanyData) => ledgersUnder(data, G.stock);

export function stockValueAt(data: CompanyData, asOf: string): number {
  return round2(itemStockValue(data, asOf) + stockLedgers(data).reduce((s, l) => s + stockLedgerValue(data, l, asOf), 0));
}

export function itemPositions(data: CompanyData, from: string, to: string): ItemPosition[] {
  return memo(data, `positions:${from}:${to}:${data.company.valuation}`, () => {
    const before = dayBefore(from);
    return data.stockItems.map(item => {
      const open = valueOfStock(data, item, before);
      const close = valueOfStock(data, item, to);
      let inQty = 0, inValue = 0, outQty = 0, outValue = 0;
      for (const m of stockMoves(data)) {
        if (m.itemId !== item.id || m.date < from || m.date > to) continue;
        if (m.qty > 0) { inQty += m.qty; inValue += m.value; }
        else { outQty += -m.qty; outValue += m.value; }
      }
      return {
        item,
        openQty: open.qty, openValue: open.value,
        inQty, inValue: round2(inValue), outQty, outValue: round2(outValue),
        closeQty: close.qty, closeRate: close.rate, closeValue: close.value,
      };
    });
  });
}

/** Quantity on hand per godown at a date. */
export function godownQuantities(data: CompanyData, asOf: string): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  const add = (godownId: string, itemId: string, qty: number) => {
    if (!out.has(godownId)) out.set(godownId, new Map());
    const m = out.get(godownId)!;
    m.set(itemId, (m.get(itemId) ?? 0) + qty);
  };
  const fallback = data.godowns[0]?.id ?? '';
  for (const it of data.stockItems) if (it.openingQty) add(it.openingGodownId ?? fallback, it.id, it.openingQty);
  for (const m of stockMoves(data)) if (m.date <= asOf) add(m.godownId ?? fallback, m.itemId, m.qty);
  return out;
}

export function itemQtyNow(data: CompanyData, itemId: string): number {
  const item = itemOf(data, itemId);
  if (!item) return 0;
  return item.openingQty + stockMoves(data).filter(m => m.itemId === itemId && m.date <= data.company.currentDate).reduce((s, m) => s + m.qty, 0);
}

export function itemCostNow(data: CompanyData, itemId: string): number {
  const item = itemOf(data, itemId);
  return item ? valueOfStock(data, item, data.company.currentDate).rate : 0;
}

// ---------------------------------------------------------------- statements

export interface Node {
  id: string;
  name: string;
  kind: 'group' | 'ledger' | 'special';
  /** Positive on the side this statement reports. */
  amount: number;
  children: Node[];
}

/** A group's tree with amounts per ledger; empty branches are dropped. */
function groupNode(data: CompanyData, group: Group, amountOf: (l: Ledger) => number): Node {
  const ix = indexOf(data);
  const children: Node[] = [];
  for (const g of ix.children.get(group.id) ?? []) {
    const n = groupNode(data, g, amountOf);
    if (n.children.length) children.push(n);
  }
  for (const l of ix.ledgersByGroup.get(group.id) ?? []) {
    const amount = amountOf(l);
    if (!isZero(amount)) children.push({ id: l.id, name: l.name, kind: 'ledger', amount, children: [] });
  }
  return { id: group.id, name: group.name, kind: 'group', amount: children.reduce((s, c) => s + c.amount, 0), children };
}

export interface PnL {
  from: string; to: string;
  openingStock: number; closingStock: number;
  tradingExpenses: Node[]; tradingIncomes: Node[];
  indirectExpenses: Node[]; indirectIncomes: Node[];
  sales: number; purchases: number; directIncome: number; directExpense: number;
  indirectIncome: number; indirectExpense: number;
  grossProfit: number; netProfit: number;
}

export function pnl(data: CompanyData, from: string, to: string, o?: BookOptions): PnL {
  return memo(data, `pnl:${from}:${to}:${optionsKey(o)}:${data.company.valuation}`, () => {
    const booksFrom = data.company.booksFrom;
    const move = movements(data, from, to, o);
    const amountOf = (l: Ledger) => {
      const opening = from <= booksFrom ? l.openingBalance : 0;
      return opening + netOf(move.get(l.id));
    };
    const primaries = childGroups(data, null);
    const nodes = (nature: Nature, gross: boolean, sign: number) =>
      primaries.filter(g => g.nature === nature && !!g.grossProfit === gross).map(g => {
        const n = groupNode(data, g, l => sign * amountOf(l));
        return n;
      }).filter(n => n.children.length);

    const tradingExpenses = nodes('EXPENSE', true, 1);
    const tradingIncomes = nodes('INCOME', true, -1);
    const indirectExpenses = nodes('EXPENSE', false, 1);
    const indirectIncomes = nodes('INCOME', false, -1);

    // Any direct posting to a stock ledger is a purchase-side cost; stock itself comes from the valuation.
    const stockAdjust = stockLedgers(data)
      .map(l => ({ id: l.id, name: l.name, kind: 'ledger' as const, amount: netOf(move.get(l.id)), children: [] }))
      .filter(n => !isZero(n.amount));
    if (stockAdjust.length) {
      tradingExpenses.push({ id: 'stock_adjust', name: 'Stock Adjustments', kind: 'special', amount: stockAdjust.reduce((s, n) => s + n.amount, 0), children: stockAdjust });
    }

    const sumOf = (list: Node[]) => list.reduce((s, n) => s + n.amount, 0);
    const pick = (list: Node[], id: string) => list.find(n => n.id === id)?.amount ?? 0;
    const openingStock = from <= booksFrom ? stockValueAt(data, dayBefore(booksFrom)) : stockValueAt(data, dayBefore(from));
    const closingStock = stockValueAt(data, to);
    const grossProfit = sumOf(tradingIncomes) + closingStock - openingStock - sumOf(tradingExpenses);
    const netProfit = grossProfit + sumOf(indirectIncomes) - sumOf(indirectExpenses);
    return {
      from, to, openingStock, closingStock, tradingExpenses, tradingIncomes, indirectExpenses, indirectIncomes,
      sales: pick(tradingIncomes, G.sales),
      purchases: pick(tradingExpenses, G.purchase),
      directIncome: pick(tradingIncomes, G.directIncome),
      directExpense: pick(tradingExpenses, G.directExpense),
      indirectIncome: sumOf(indirectIncomes),
      indirectExpense: sumOf(indirectExpenses),
      grossProfit: round2(grossProfit),
      netProfit: round2(netProfit),
    };
  });
}

/** Opening-balance gap: all ledger openings plus item opening stock. Zero when the books start balanced. */
export function openingDifference(data: CompanyData): number {
  const ledgers = data.ledgers.reduce((s, l) => s + l.openingBalance, 0);
  const items = data.stockItems.reduce((s, it) => s + it.openingQty * it.openingRate, 0);
  return round2(ledgers + items);
}

export interface BalanceSheet {
  asOf: string;
  liabilities: Node[];
  assets: Node[];
  totalLiabilities: number;
  totalAssets: number;
  profitCurrent: number;
  profitBrought: number;
  closingStock: number;
  openingDiff: number;
}

export function balanceSheet(data: CompanyData, asOf: string, o?: BookOptions): BalanceSheet {
  return memo(data, `bs:${asOf}:${optionsKey(o)}:${data.company.valuation}`, () => {
    const booksFrom = data.company.booksFrom;
    const fy = fyStartOf(data, asOf);
    const start = fy < booksFrom ? booksFrom : fy;
    const move = movements(data, null, asOf, o);
    const amountOf = (l: Ledger) => l.openingBalance + netOf(move.get(l.id));
    const isStock = (l: Ledger) => isStockLedger(data, l);
    const primaries = childGroups(data, null);

    const liabilities = primaries.filter(g => g.nature === 'LIABILITY')
      .map(g => groupNode(data, g, l => -amountOf(l)))
      .filter(n => n.children.length);
    const closingStock = stockValueAt(data, asOf);
    const assets = primaries.filter(g => g.nature === 'ASSET')
      .map(g => groupNode(data, g, l => (isStock(l) ? 0 : amountOf(l))))
      .filter(n => n.children.length || g_isCurrentAssets(n.id));

    // Stock appears once, at its valued closing figure, however it is tracked.
    const stockNode: Node = { id: 'closing_stock', name: 'Closing Stock', kind: 'special', amount: closingStock, children: [] };
    let currentAssets = assets.find(n => n.id === G.currentAssets);
    if (!currentAssets && !isZero(closingStock)) {
      currentAssets = groupNode(data, groupOf(data, G.currentAssets)!, () => 0);
      assets.push(currentAssets);
    }
    if (currentAssets) {
      currentAssets.children.unshift(stockNode);
      currentAssets.amount += closingStock;
    }

    const profitCurrent = pnl(data, start, asOf, o).netProfit;
    const profitBrought = start > booksFrom ? pnl(data, booksFrom, dayBefore(start), o).netProfit : 0;
    const pnlLedger = ledgerOf(data, PNL_LEDGER_ID);
    const ledgerPart = pnlLedger ? -amountOf(pnlLedger) : 0;
    const pnlChildren: Node[] = [];
    if (!isZero(ledgerPart + profitBrought)) pnlChildren.push({ id: 'pnl_opening', name: 'Opening Balance', kind: 'special', amount: ledgerPart + profitBrought, children: [] });
    pnlChildren.push({ id: 'pnl_current', name: 'Current Period', kind: 'special', amount: profitCurrent, children: [] });
    liabilities.push({
      id: PNL_LEDGER_ID, name: 'Profit & Loss A/c', kind: 'special',
      amount: ledgerPart + profitBrought + profitCurrent, children: pnlChildren,
    });

    const diff = openingDifference(data);
    if (!isZero(diff)) {
      // A debit excess is shown on the liabilities side, and the reverse, so the sheet still totals.
      const row: Node = { id: 'opening_diff', name: 'Difference in Opening Balances', kind: 'special', amount: Math.abs(diff), children: [] };
      (diff > 0 ? liabilities : assets).push(row);
    }
    const total = (list: Node[]) => round2(list.reduce((s, n) => s + n.amount, 0));
    return {
      asOf, liabilities, assets,
      totalLiabilities: total(liabilities), totalAssets: total(assets),
      profitCurrent, profitBrought, closingStock, openingDiff: diff,
    };
  });
}

function g_isCurrentAssets(id: string) { return id === G.currentAssets; }

export interface TrialBalance {
  from: string; to: string;
  /** Rows carry the closing balance signed Dr positive. */
  groups: Node[];
  specials: { id: string; name: string; amount: number }[];
  totalDr: number;
  totalCr: number;
}

export function trialBalance(data: CompanyData, from: string, to: string, o?: BookOptions): TrialBalance {
  return memo(data, `tb:${from}:${to}:${optionsKey(o)}:${data.company.valuation}`, () => {
    const balances = ledgerBalances(data, from, to, o);
    const fy = fyStartOf(data, from);
    const yearStart = fy < data.company.booksFrom ? data.company.booksFrom : fy;
    const closing = (l: Ledger) => {
      if (isStockLedger(data, l)) {
        // Only movements on a stock ledger appear here; its opening is inside Opening Stock.
        return balances.get(l.id)!.closing - l.openingBalance;
      }
      return l.id === PNL_LEDGER_ID ? 0 : balances.get(l.id)!.closing;
    };
    const groups = childGroups(data, null).map(g => groupNode(data, g, closing)).filter(n => n.children.length);

    const specials: TrialBalance['specials'] = [];
    const openingStock = yearStart <= data.company.booksFrom
      ? stockValueAt(data, dayBefore(data.company.booksFrom))
      : stockValueAt(data, dayBefore(yearStart));
    if (!isZero(openingStock)) specials.push({ id: 'opening_stock', name: 'Opening Stock', amount: openingStock });

    const pnlLedger = ledgerOf(data, PNL_LEDGER_ID);
    const brought = yearStart > data.company.booksFrom ? pnl(data, data.company.booksFrom, dayBefore(yearStart), o).netProfit : 0;
    const pnlAmount = (pnlLedger ? balances.get(pnlLedger.id)!.closing : 0) - brought;
    if (!isZero(pnlAmount)) specials.push({ id: PNL_LEDGER_ID, name: 'Profit & Loss A/c', amount: pnlAmount });

    const diff = openingDifference(data);
    if (!isZero(diff)) specials.push({ id: 'opening_diff', name: 'Difference in Opening Balances', amount: -diff });

    let totalDr = 0, totalCr = 0;
    const tally = (n: number) => { if (n > 0) totalDr += n; else totalCr += -n; };
    const walk = (node: Node) => { if (node.kind === 'ledger') tally(node.amount); node.children.forEach(walk); };
    groups.forEach(walk);
    specials.forEach(s => tally(s.amount));
    return { from, to, groups, specials, totalDr: round2(totalDr), totalCr: round2(totalCr) };
  });
}

/** Immediate children of a group with their closing balance (Dr positive), for drill-down. */
export function groupSummary(data: CompanyData, groupId: string, from: string, to: string): { node: Node; opening: number; dr: number; cr: number }[] {
  const balances = ledgerBalances(data, from, to);
  const ix = indexOf(data);
  const rollup = (ledgers: Ledger[]) => ledgers.reduce((s, l) => {
    const b = balances.get(l.id)!;
    return { opening: s.opening + b.opening, dr: s.dr + b.dr, cr: s.cr + b.cr, closing: s.closing + b.closing };
  }, { opening: 0, dr: 0, cr: 0, closing: 0 });
  const out: { node: Node; opening: number; dr: number; cr: number }[] = [];
  for (const g of ix.children.get(groupId) ?? []) {
    const r = rollup(ledgersUnder(data, g.id));
    out.push({ node: { id: g.id, name: g.name, kind: 'group', amount: r.closing, children: [] }, opening: r.opening, dr: r.dr, cr: r.cr });
  }
  for (const l of ix.ledgersByGroup.get(groupId) ?? []) {
    const b = balances.get(l.id)!;
    out.push({ node: { id: l.id, name: l.name, kind: 'ledger', amount: b.closing, children: [] }, opening: b.opening, dr: b.dr, cr: b.cr });
  }
  return out;
}

// ---------------------------------------------------------------- ledger statement and voucher helpers

export const voucherAmount = (v: Voucher) => {
  if (v.lines.length) return round2(v.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0));
  return round2((v.stock ?? []).reduce((s, l) => s + l.amount, 0));
};

/** The name to show for a voucher in a list: the party, or the first other ledger. */
export function voucherParticulars(data: CompanyData, v: Voucher, forLedgerId?: string): string {
  if (forLedgerId) {
    const others = v.lines.filter(l => l.ledgerId !== forLedgerId);
    if (others.length === 1) return ledgerName(data, others[0].ledgerId);
    if (others.length > 1) {
      const main = [...others].sort((a, b) => b.amount - a.amount)[0];
      return `${ledgerName(data, main.ledgerId)} and others`;
    }
    return ledgerName(data, forLedgerId);
  }
  if (v.partyId) return ledgerName(data, v.partyId);
  if (v.type === 'PAYMENT' || v.type === 'CONTRA') {
    const line = v.lines.find(l => l.side === 'DR');
    if (line) return ledgerName(data, line.ledgerId);
  }
  if (v.type === 'RECEIPT') {
    const line = v.lines.find(l => l.side === 'CR');
    if (line) return ledgerName(data, line.ledgerId);
  }
  if (v.lines.length) return ledgerName(data, v.lines[0].ledgerId);
  if (v.stock?.length) return itemOf(data, v.stock[0].itemId)?.name ?? 'Stock';
  if (v.payrollMonth) return `Payroll ${v.payrollMonth}`;
  if (v.attendance?.length) return 'Employee attendance';
  return VOUCHER_META[v.type].label;
}

export interface StatementRow {
  voucher: Voucher;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

export function ledgerStatement(data: CompanyData, ledgerId: string, from: string, to: string, o?: BookOptions) {
  const bal = ledgerBalances(data, from, to, o).get(ledgerId) ?? { opening: 0, dr: 0, cr: 0, closing: 0 };
  let running = bal.opening;
  const rows: StatementRow[] = [];
  for (const p of postings(data, o)) {
    if (p.line.ledgerId !== ledgerId || p.voucher.date < from || p.voucher.date > to) continue;
    running += p.signed;
    rows.push({
      voucher: p.voucher,
      particulars: voucherParticulars(data, p.voucher, ledgerId),
      debit: p.line.side === 'DR' ? p.line.amount : 0,
      credit: p.line.side === 'CR' ? p.line.amount : 0,
      balance: running,
    });
  }
  return { ...bal, rows };
}

export function nextVoucherNumber(data: CompanyData, typeId: string): string {
  const type = data.voucherTypes.find(t => t.id === typeId);
  if (!type) return '1';
  let max = 0;
  for (const v of data.vouchers) {
    if (v.typeId !== typeId || !v.number.startsWith(`${type.prefix}-`)) continue;
    const n = Number(v.number.slice(type.prefix.length + 1));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${type.prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = to.slice(0, 7);
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > end) return out;
    out.push(key);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
}

// ---------------------------------------------------------------- bills and outstanding

export interface Bill {
  ledgerId: string;
  ref: string;
  date: string;
  dueDate: string;
  /** Signed: Dr positive. Bills to collect are positive, bills to pay are negative. */
  amount: number;
  pending: number;
  isAdvance?: boolean;
  isOnAccount?: boolean;
  voucherId?: string;
}

export function billsOf(data: CompanyData, asOf: string, excludeVoucherId?: string): Bill[] {
  const bills = new Map<string, Bill>();
  const keyOf = (ledgerId: string, ref: string) => `${ledgerId}|${ref}`;
  for (const l of data.ledgers) {
    for (const b of l.openingBills ?? []) {
      bills.set(keyOf(l.id, b.ref), {
        ledgerId: l.id, ref: b.ref, date: b.date, dueDate: b.dueDate ?? b.date, amount: b.amount, pending: b.amount,
      });
    }
  }
  for (const p of postings(data)) {
    const { voucher: v, line, signed } = p;
    if (v.date > asOf || v.id === excludeVoucherId) continue;
    const ledger = ledgerOf(data, line.ledgerId);
    if (!ledger?.billWise) continue;
    const sign = signed >= 0 ? 1 : -1;
    const allocations = line.bills?.length ? line.bills : [{ type: 'ON_ACCOUNT' as const, ref: '', amount: line.amount }];
    for (const a of allocations) {
      const value = sign * a.amount;
      if (a.type === 'AGST') {
        const b = bills.get(keyOf(line.ledgerId, a.ref));
        if (b) b.pending += value;
        else bills.set(keyOf(line.ledgerId, a.ref), { ledgerId: line.ledgerId, ref: a.ref, date: v.date, dueDate: v.date, amount: value, pending: value, voucherId: v.id });
      } else if (a.type === 'ON_ACCOUNT') {
        const ref = `On Account ${v.number}`;
        bills.set(keyOf(line.ledgerId, `${ref}|${a.amount}|${bills.size}`), {
          ledgerId: line.ledgerId, ref, date: v.date, dueDate: v.date, amount: value, pending: value, isOnAccount: true, voucherId: v.id,
        });
      } else {
        const existing = bills.get(keyOf(line.ledgerId, a.ref));
        if (existing) { existing.amount += value; existing.pending += value; }
        else bills.set(keyOf(line.ledgerId, a.ref), {
          ledgerId: line.ledgerId, ref: a.ref, date: v.date, dueDate: a.dueDate ?? v.date,
          amount: value, pending: value, isAdvance: a.type === 'ADVANCE', voucherId: v.id,
        });
      }
    }
  }
  return [...bills.values()].filter(b => !isZero(b.pending));
}

/** Named bills on one ledger still open against this side, oldest first. On-account amounts are excluded. */
export function pendingBillsFor(data: CompanyData, ledgerId: string, side: 'DR' | 'CR', asOf: string, excludeVoucherId?: string): Bill[] {
  return billsOf(data, asOf, excludeVoucherId)
    .filter(b => b.ledgerId === ledgerId && !b.isOnAccount && (side === 'DR' ? b.pending < 0 : b.pending > 0))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Default settlement: clear oldest open bills first and leave any balance on account. */
export function autoAllocate(data: CompanyData, ledgerId: string, side: 'DR' | 'CR', amount: number, asOf: string, excludeVoucherId?: string) {
  const out: { type: 'AGST' | 'ON_ACCOUNT'; ref: string; amount: number }[] = [];
  let left = amount;
  for (const b of pendingBillsFor(data, ledgerId, side, asOf, excludeVoucherId)) {
    if (left <= 0.004) break;
    const take = Math.min(left, Math.abs(b.pending));
    out.push({ type: 'AGST', ref: b.ref, amount: round2(take) });
    left -= take;
  }
  if (left > 0.004) out.push({ type: 'ON_ACCOUNT', ref: '', amount: round2(left) });
  return out;
}

export interface AgeBuckets { current: number; d30: number; d60: number; d90: number; older: number }

/** Days overdue measured from the due date. */
export function ageBuckets(bills: Bill[], asOf: string): AgeBuckets {
  const out: AgeBuckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 };
  for (const b of bills) {
    const late = daysBetween(b.dueDate, asOf);
    const value = Math.abs(b.pending);
    if (late <= 0) out.current += value;
    else if (late <= 30) out.d30 += value;
    else if (late <= 60) out.d60 += value;
    else if (late <= 90) out.d90 += value;
    else out.older += value;
  }
  return out;
}

// ---------------------------------------------------------------- cash, funds and ratios

export interface CashFlowMonth { month: string; inflow: number; outflow: number; net: number }

export function cashFlow(data: CompanyData, from: string, to: string) {
  const months = new Map(monthsBetween(from, to).map(m => [m, { month: m, inflow: 0, outflow: 0, net: 0 } as CashFlowMonth]));
  const byGroup = new Map<string, { name: string; inflow: number; outflow: number }>();
  const opening = ledgerBalancesFor(data, from, to, l => isCashOrBank(data, l), 'opening');
  const closing = ledgerBalancesFor(data, from, to, l => isCashOrBank(data, l), 'closing');
  for (const v of data.vouchers) {
    if (v.date < from || v.date > to || !voucherInBooks(data, v)) continue;
    const isCash = (l: VoucherLine) => { const led = ledgerOf(data, l.ledgerId); return !!led && isCashOrBank(data, led); };
    const cashNet = v.lines.filter(isCash).reduce((s, l) => s + signedOf(l), 0);
    if (isZero(cashNet)) continue;
    const others = v.lines.filter(l => !isCash(l));
    const othersTotal = others.reduce((s, l) => s + l.amount, 0) || 1;
    const month = months.get(v.date.slice(0, 7));
    if (month) {
      if (cashNet > 0) month.inflow += cashNet;
      else month.outflow += -cashNet;
      month.net += cashNet;
    }
    for (const o of others) {
      const led = ledgerOf(data, o.ledgerId);
      const primary = led ? primaryGroupOf(data, led.groupId) : undefined;
      const key = primary?.id ?? 'other';
      if (!byGroup.has(key)) byGroup.set(key, { name: primary?.name ?? 'Other', inflow: 0, outflow: 0 });
      const share = Math.abs(cashNet) * (o.amount / othersTotal);
      const row = byGroup.get(key)!;
      if (cashNet > 0) row.inflow += share;
      else row.outflow += share;
    }
  }
  return { opening, closing, months: [...months.values()], byGroup: [...byGroup.values()] };
}

function ledgerBalancesFor(data: CompanyData, from: string, to: string, test: (l: Ledger) => boolean, field: 'opening' | 'closing') {
  const b = ledgerBalances(data, from, to);
  return round2(data.ledgers.filter(test).reduce((s, l) => s + b.get(l.id)![field], 0));
}

const netWorkingCapital = (data: CompanyData, asOf: string) => {
  const m = movements(data, null, asOf);
  const sum = (groupId: string, skip?: (l: Ledger) => boolean) => ledgersUnder(data, groupId)
    .filter(l => !skip?.(l)).reduce((s, l) => s + l.openingBalance + netOf(m.get(l.id)), 0);
  return {
    assets: sum(G.currentAssets, l => isStockLedger(data, l)) + stockValueAt(data, asOf),
    liabilities: -sum(G.currentLiabilities),
  };
};

export function fundsFlow(data: CompanyData, from: string, to: string) {
  const before = dayBefore(from);
  const startWc = netWorkingCapital(data, before);
  const endWc = netWorkingCapital(data, to);
  const start = movements(data, null, before);
  const end = movements(data, null, to);
  const change = (groupId: string) => ledgersUnder(data, groupId).reduce((s, l) => s + netOf(end.get(l.id)) - netOf(start.get(l.id)), 0);
  const sources: { name: string; amount: number }[] = [];
  const uses: { name: string; amount: number }[] = [];
  const add = (name: string, amount: number) => {
    if (isZero(amount)) return;
    if (amount > 0) sources.push({ name, amount: round2(amount) });
    else uses.push({ name, amount: round2(-amount) });
  };
  const fy = fyStartOf(data, from);
  add('Net profit for the period', pnl(data, from < fy ? fy : from, to).netProfit);
  add('Capital introduced', -change(G.capital));
  add('Loans taken (repaid)', -change(G.loans));
  add('Sale (purchase) of fixed assets', -change(G.fixedAssets));
  add('Sale (purchase) of investments', -change(G.investments));
  add('Misc. expenses written off (paid)', -change(G.misc));
  add('Suspense and branch', -change(G.suspense) - change(G.branch));
  add('Profit & Loss A/c adjustments', -(netOf(end.get(PNL_LEDGER_ID)) - netOf(start.get(PNL_LEDGER_ID))));
  const wcStart = startWc.assets - startWc.liabilities;
  const wcEnd = endWc.assets - endWc.liabilities;
  return {
    sources, uses,
    workingCapitalStart: round2(wcStart),
    workingCapitalEnd: round2(wcEnd),
    workingCapitalChange: round2(wcEnd - wcStart),
  };
}

export function ratios(data: CompanyData, from: string, to: string) {
  const profit = pnl(data, from, to);
  const m = movements(data, null, to);
  const balanceOf = (groupId: string) => ledgersUnder(data, groupId).reduce((s, l) => s + l.openingBalance + netOf(m.get(l.id)), 0);
  const stock = stockValueAt(data, to);
  const cash = balanceOf(G.cash);
  const bank = balanceOf(G.bank);
  const bankOd = -balanceOf(G.bankOd);
  const debtors = balanceOf(G.debtors);
  const creditors = -balanceOf(G.creditors);
  const currentAssets = balanceOf(G.currentAssets) - stockLedgers(data).reduce((s, l) => s + l.openingBalance + netOf(m.get(l.id)), 0) + stock;
  const currentLiabilities = -balanceOf(G.currentLiabilities);
  const loans = -balanceOf(G.loans);
  const pnlLedger = ledgerOf(data, PNL_LEDGER_ID);
  const capital = -balanceOf(G.capital) + (pnlLedger ? -(pnlLedger.openingBalance + netOf(m.get(pnlLedger.id))) : 0) + profit.netProfit;
  const workingCapital = currentAssets - currentLiabilities;
  const netSales = profit.sales;
  const purchases = profit.purchases;
  const days = Math.max(1, daysBetween(from, to) + 1);
  const div = (a: number, b: number) => (isZero(b) ? null : a / b);
  const cogs = netSales + profit.directIncome - profit.grossProfit;
  return {
    workingCapital, cash, bank, bankOd, debtors, creditors, sales: netSales, purchases, stock,
    netProfit: profit.netProfit, grossProfit: profit.grossProfit,
    currentRatio: div(currentAssets, currentLiabilities),
    quickRatio: div(currentAssets - stock, currentLiabilities),
    debtEquity: div(loans, capital),
    grossProfitPct: div(profit.grossProfit * 100, netSales + profit.directIncome),
    netProfitPct: div(profit.netProfit * 100, netSales + profit.directIncome),
    returnOnInvestment: div(profit.netProfit * 100, capital + loans),
    returnOnWorkingCapital: div(profit.netProfit * 100, workingCapital),
    inventoryTurnover: div(cogs, (profit.openingStock + profit.closingStock) / 2),
    debtorDays: div(debtors * days, netSales),
    creditorDays: div(creditors * days, purchases),
  };
}

// ---------------------------------------------------------------- expenses

export interface ExpenseSummary {
  total: number;
  ledgers: { ledger: Ledger; amount: number; budget?: number }[];
  months: { month: string; amount: number }[];
}

/** Everything that counts as an expense: direct and indirect expense groups, not purchases of goods. */
export function expenseSummary(data: CompanyData, from: string, to: string): ExpenseSummary {
  const m = movements(data, from, to);
  const list = [...ledgersUnder(data, G.indirectExpense), ...ledgersUnder(data, G.directExpense)];
  const ids = new Set(list.map(l => l.id));
  const ledgers = list.map(ledger => ({ ledger, amount: netOf(m.get(ledger.id)) })).filter(r => !isZero(r.amount)).sort((a, b) => b.amount - a.amount);
  const months = new Map(monthsBetween(from, to).map(k => [k, 0]));
  for (const p of postings(data)) {
    if (!ids.has(p.line.ledgerId) || p.voucher.date < from || p.voucher.date > to) continue;
    const k = p.voucher.date.slice(0, 7);
    if (months.has(k)) months.set(k, months.get(k)! + p.signed);
  }
  return {
    total: round2(ledgers.reduce((s, r) => s + r.amount, 0)),
    ledgers,
    months: [...months.entries()].map(([month, amount]) => ({ month, amount: round2(amount) })),
  };
}

// ---------------------------------------------------------------- cost centres, budgets, interest

export function costCentreReport(data: CompanyData, from: string, to: string) {
  const out = new Map<string, { centreId: string; income: number; expense: number; ledgers: Map<string, number> }>();
  for (const p of postings(data)) {
    if (p.voucher.date < from || p.voucher.date > to || !p.line.costs?.length) continue;
    const led = ledgerOf(data, p.line.ledgerId);
    if (!led) continue;
    const nature = natureOf(data, led.groupId);
    for (const c of p.line.costs) {
      if (!out.has(c.centreId)) out.set(c.centreId, { centreId: c.centreId, income: 0, expense: 0, ledgers: new Map() });
      const row = out.get(c.centreId)!;
      const signed = p.line.side === 'DR' ? c.amount : -c.amount;
      if (nature === 'INCOME') row.income += -signed;
      else row.expense += signed;
      row.ledgers.set(led.id, (row.ledgers.get(led.id) ?? 0) + signed);
    }
  }
  return [...out.values()];
}

export function budgetActual(data: CompanyData, kind: 'GROUP' | 'LEDGER', refId: string, from: string, to: string): number {
  const m = movements(data, from, to);
  const ledgers = kind === 'LEDGER' ? [ledgerOf(data, refId)].filter(Boolean) as Ledger[] : ledgersUnder(data, refId);
  const net = ledgers.reduce((s, l) => s + netOf(m.get(l.id)), 0);
  // Budgets read as a positive spend or income figure.
  return Math.abs(net);
}

/** Simple interest on the running daily balance of one ledger. */
export function interestFor(data: CompanyData, ledger: Ledger, from: string, to: string) {
  const rate = ledger.interestPct ?? 0;
  const statement = ledgerStatement(data, ledger.id, from, to);
  let balance = statement.opening;
  let cursor = from;
  let interest = 0;
  const accrue = (until: string) => {
    const days = Math.max(0, daysBetween(cursor, until));
    interest += (balance * rate * days) / 36500;
  };
  for (const row of statement.rows) {
    accrue(row.voucher.date);
    cursor = row.voucher.date;
    balance += row.debit - row.credit;
  }
  accrue(addDays(to, 1));
  return { rate, closing: balance, interest: round2(interest) };
}

// ---------------------------------------------------------------- orders and notes

export interface OrderLineStatus {
  order: Voucher;
  itemId: string;
  ordered: number;
  delivered: number;
  pending: number;
  rate: number;
}

export function orderStatus(data: CompanyData, base: 'SALES_ORDER' | 'PURCHASE_ORDER'): OrderLineStatus[] {
  const orders = data.vouchers.filter(v => v.type === base && !v.isCancelled);
  const fulfilment: VoucherBase[] = base === 'SALES_ORDER' ? ['DELIVERY_NOTE', 'SALES'] : ['RECEIPT_NOTE', 'PURCHASE'];
  const out: OrderLineStatus[] = [];
  for (const order of orders) {
    const delivered = new Map<string, number>();
    for (const v of data.vouchers) {
      if (v.orderId !== order.id || v.isCancelled || !fulfilment.includes(v.type)) continue;
      // An invoice raised from a note has the same goods; count them once.
      if (v.stockAlreadyMoved) continue;
      for (const l of v.stock ?? []) delivered.set(l.itemId, (delivered.get(l.itemId) ?? 0) + l.qty);
    }
    for (const l of order.stock ?? []) {
      const d = delivered.get(l.itemId) ?? 0;
      out.push({ order, itemId: l.itemId, ordered: l.qty, delivered: d, pending: Math.max(0, l.qty - d), rate: l.rate });
    }
  }
  return out;
}

export function unbilledNotes(data: CompanyData, base: 'DELIVERY_NOTE' | 'RECEIPT_NOTE'): Voucher[] {
  const billed = new Set<string>();
  for (const v of data.vouchers) if (!v.isCancelled) for (const id of v.noteIds ?? []) billed.add(id);
  return data.vouchers.filter(v => v.type === base && !v.isCancelled && !billed.has(v.id));
}

// ---------------------------------------------------------------- bank reconciliation

export function bankRegister(data: CompanyData, bankLedgerId: string, asOf: string) {
  const rows = postings(data).filter(p => p.line.ledgerId === bankLedgerId && p.voucher.date <= asOf);
  const ledger = ledgerOf(data, bankLedgerId);
  const bookBalance = (ledger?.openingBalance ?? 0) + rows.reduce((s, p) => s + p.signed, 0);
  const uncleared = rows.filter(p => !p.line.bank?.bankDate || p.line.bank.bankDate > asOf);
  const notInBank = uncleared.reduce((s, p) => s + p.signed, 0);
  return { rows, bookBalance: round2(bookBalance), uncleared, notInBank: round2(notInBank), bankBalance: round2(bookBalance - notInBank) };
}

// ---------------------------------------------------------------- GST

const gstTypes: VoucherBase[] = ['SALES', 'CREDIT_NOTE', 'PURCHASE', 'DEBIT_NOTE'];

export interface GstDoc {
  voucher: Voucher;
  party: Ledger | undefined;
  invoiceValue: number;
  taxable: number; cgst: number; sgst: number; igst: number;
}

export function gstDocuments(data: CompanyData, types: VoucherBase[], from: string, to: string): GstDoc[] {
  const out: GstDoc[] = [];
  for (const v of data.vouchers) {
    if (!types.includes(v.type) || !gstTypes.includes(v.type) || !voucherInBooks(data, v) || v.date < from || v.date > to || !v.gst?.length) continue;
    const sum = (k: 'taxable' | 'cgst' | 'sgst' | 'igst') => round2(v.gst!.reduce((s, r) => s + r[k], 0));
    const party = v.partyId ? ledgerOf(data, v.partyId) : undefined;
    out.push({
      voucher: v, party, invoiceValue: voucherAmount(v),
      taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'),
    });
  }
  return out.sort((a, b) => (a.voucher.date < b.voucher.date ? -1 : 1));
}

export function gstr1(data: CompanyData, from: string, to: string) {
  const sales = gstDocuments(data, ['SALES'], from, to);
  const notes = gstDocuments(data, ['CREDIT_NOTE'], from, to);
  // Inter-state consumer invoices above this value are reported invoice by invoice.
  const b2clLimit = 100000;
  const isB2B = (d: GstDoc) => !!d.party?.gstin;
  const b2b = sales.filter(isB2B);
  const b2cl = sales.filter(d => !isB2B(d) && d.igst > 0 && d.invoiceValue > b2clLimit);
  const b2cs = sales.filter(d => !isB2B(d) && !(d.igst > 0 && d.invoiceValue > b2clLimit));
  const hsn = new Map<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  const addHsn = (list: GstDoc[], sign: number) => {
    for (const d of list) for (const r of d.voucher.gst ?? []) {
      const key = `${r.hsn ?? ''}|${r.rate}`;
      if (!hsn.has(key)) hsn.set(key, { hsn: r.hsn ?? '', rate: r.rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
      const row = hsn.get(key)!;
      row.taxable += sign * r.taxable; row.cgst += sign * r.cgst; row.sgst += sign * r.sgst; row.igst += sign * r.igst;
    }
  };
  addHsn(sales, 1);
  addHsn(notes, -1);
  return { b2b, b2cl, b2cs, notes, hsn: [...hsn.values()] };
}

export function gstr3b(data: CompanyData, from: string, to: string) {
  const total = (list: GstDoc[]) => list.reduce((s, d) => ({
    taxable: s.taxable + d.taxable, cgst: s.cgst + d.cgst, sgst: s.sgst + d.sgst, igst: s.igst + d.igst,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
  const minus = (a: ReturnType<typeof total>, b: ReturnType<typeof total>) => ({
    taxable: a.taxable - b.taxable, cgst: a.cgst - b.cgst, sgst: a.sgst - b.sgst, igst: a.igst - b.igst,
  });
  const outward = minus(total(gstDocuments(data, ['SALES'], from, to)), total(gstDocuments(data, ['CREDIT_NOTE'], from, to)));
  const itc = minus(total(gstDocuments(data, ['PURCHASE'], from, to)), total(gstDocuments(data, ['DEBIT_NOTE'], from, to)));
  const payable = { cgst: outward.cgst - itc.cgst, sgst: outward.sgst - itc.sgst, igst: outward.igst - itc.igst };
  return { outward, itc, payable, totalPayable: round2(payable.cgst + payable.sgst + payable.igst) };
}

export function taxDeductionRegister(data: CompanyData, taxType: 'TDS' | 'TCS', from: string, to: string) {
  const ledgers = data.ledgers.filter(l => l.taxType === taxType);
  const ids = new Set(ledgers.map(l => l.id));
  const rows: { voucher: Voucher; ledger: Ledger; party: string; deducted: number; paid: number }[] = [];
  for (const p of postings(data)) {
    if (!ids.has(p.line.ledgerId) || p.voucher.date < from || p.voucher.date > to) continue;
    const others = p.voucher.lines.filter(l => l.ledgerId !== p.line.ledgerId);
    const partyLine = others.find(l => { const x = ledgerOf(data, l.ledgerId); return !!x && (isInGroup(data, x.groupId, G.creditors) || isInGroup(data, x.groupId, G.debtors)); });
    rows.push({
      voucher: p.voucher,
      ledger: ledgerOf(data, p.line.ledgerId)!,
      party: partyLine ? ledgerName(data, partyLine.ledgerId) : voucherParticulars(data, p.voucher, p.line.ledgerId),
      deducted: p.line.side === 'CR' ? p.line.amount : 0,
      paid: p.line.side === 'DR' ? p.line.amount : 0,
    });
  }
  const deducted = round2(rows.reduce((s, r) => s + r.deducted, 0));
  const paid = round2(rows.reduce((s, r) => s + r.paid, 0));
  return { rows, deducted, paid, outstanding: round2(deducted - paid) };
}

// ---------------------------------------------------------------- payroll

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, days: last };
}

/** Pay for one employee and month, from their salary structure and any attendance recorded. */
export function computePay(data: CompanyData, employeeId: string, month: string) {
  const employee = data.employees.find(e => e.id === employeeId);
  const { from, to, days } = monthRange(month);
  let present = 0, absent = 0, overtime = 0;
  for (const v of data.vouchers) {
    if (v.type !== 'ATTENDANCE' || v.isCancelled || v.date < from || v.date > to) continue;
    for (const a of v.attendance ?? []) {
      if (a.employeeId !== employeeId) continue;
      const type = data.attendanceTypes.find(t => t.id === a.typeId);
      if (type?.effect === 'PRESENT') present += a.value;
      if (type?.effect === 'ABSENT') absent += a.value;
      if (type?.effect === 'OVERTIME') overtime += a.value;
    }
  }
  const paidDays = present > 0 ? Math.min(days, present) : Math.max(0, days - absent);
  const factor = paidDays / days;
  const values = new Map<string, number>();
  const salary = employee?.salary ?? [];
  const heads = salary.map(s => ({ line: s, head: data.payHeads.find(h => h.id === s.headId) })).filter(x => x.head);

  // Flat and attendance heads first, so percentages can be worked out on them.
  for (const { line, head } of heads) {
    if (head!.calc === 'PERCENT') continue;
    const base = line.amount ?? 0;
    values.set(head!.id, round2(head!.calc === 'ATTENDANCE' ? base * factor : base));
  }
  for (const { head } of heads) {
    if (head!.calc !== 'PERCENT') continue;
    const basis = (head!.basisHeadIds ?? []).reduce((s, id) => s + (values.get(id) ?? 0), 0);
    values.set(head!.id, round2((basis * (head!.pct ?? 0)) / 100));
  }
  const pick = (kind: 'EARNING' | 'DEDUCTION' | 'EMPLOYER') => heads
    .filter(x => x.head!.kind === kind)
    .map(x => ({ headId: x.head!.id, amount: values.get(x.head!.id) ?? 0 }))
    .filter(x => x.amount !== 0);
  const earnings = pick('EARNING');
  const deductions = pick('DEDUCTION');
  const employer = pick('EMPLOYER');
  const gross = round2(earnings.reduce((s, x) => s + x.amount, 0));
  const totalDeductions = round2(deductions.reduce((s, x) => s + x.amount, 0));
  return { employeeId, days: paidDays, monthDays: days, present, absent, overtime, earnings, deductions, employer, gross, totalDeductions, net: round2(gross - totalDeductions) };
}

// ---------------------------------------------------------------- checks

export interface VerifyIssue { severity: 'error' | 'warning'; message: string; voucherId?: string }

/** Audits the whole file: every voucher balanced, every reference valid, and allocations adding up. */
export function verifyBooks(data: CompanyData): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  for (const v of data.vouchers) {
    const label = `${VOUCHER_META[v.type].label} ${v.number}`;
    if (!v.isCancelled && VOUCHER_META[v.type].accounts) {
      const dr = v.lines.filter(l => l.side === 'DR').reduce((s, l) => s + l.amount, 0);
      const cr = v.lines.filter(l => l.side === 'CR').reduce((s, l) => s + l.amount, 0);
      if (!isZero(dr - cr)) issues.push({ severity: 'error', message: `${label} is not balanced: Dr ${round2(dr)} and Cr ${round2(cr)}.`, voucherId: v.id });
    }
    for (const l of v.lines) {
      if (!ledgerOf(data, l.ledgerId)) issues.push({ severity: 'error', message: `${label} uses a ledger that no longer exists.`, voucherId: v.id });
      if (l.bills?.length && !isZero(l.bills.reduce((s, b) => s + b.amount, 0) - l.amount)) {
        issues.push({ severity: 'warning', message: `${label}: bill details do not add up to ${ledgerName(data, l.ledgerId)}.`, voucherId: v.id });
      }
      if (l.costs?.length && !isZero(l.costs.reduce((s, c) => s + c.amount, 0) - l.amount)) {
        issues.push({ severity: 'warning', message: `${label}: cost centres do not add up to ${ledgerName(data, l.ledgerId)}.`, voucherId: v.id });
      }
    }
    for (const s of v.stock ?? []) {
      if (!itemOf(data, s.itemId)) issues.push({ severity: 'error', message: `${label} uses a stock item that no longer exists.`, voucherId: v.id });
    }
  }
  const diff = openingDifference(data);
  if (!isZero(diff)) issues.push({ severity: 'warning', message: `Opening balances differ by ${round2(Math.abs(diff))} ${diff > 0 ? 'Dr' : 'Cr'}. Correct them in the ledgers or stock items.` });
  const to = data.company.periodTo;
  const bs = balanceSheet(data, to);
  if (!isZero(bs.totalAssets - bs.totalLiabilities)) {
    issues.push({ severity: 'error', message: `Balance Sheet does not total: assets ${bs.totalAssets}, liabilities ${bs.totalLiabilities}.` });
  }
  return issues;
}

export function statistics(data: CompanyData) {
  const voucherCounts = new Map<VoucherBase, number>();
  for (const v of data.vouchers) voucherCounts.set(v.type, (voucherCounts.get(v.type) ?? 0) + 1);
  return {
    voucherCounts,
    masters: {
      Groups: data.groups.length, Ledgers: data.ledgers.length, 'Voucher Types': data.voucherTypes.length,
      'Cost Centres': data.costCentres.length, Budgets: data.budgets.length, Scenarios: data.scenarios.length,
      'Stock Items': data.stockItems.length, 'Stock Groups': data.stockGroups.length, 'Stock Categories': data.stockCategories.length,
      Units: data.units.length, Godowns: data.godowns.length, Employees: data.employees.length, 'Pay Heads': data.payHeads.length,
    },
  };
}
