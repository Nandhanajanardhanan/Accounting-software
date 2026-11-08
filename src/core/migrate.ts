// Brings data from the first version of this app (one debit and one credit per voucher) into today's format.
import type { CompanyData, Ledger, StockItem, VatRow, Voucher, VoucherBase, VoucherLine } from './types.ts';
import { blankCompany, CASH_LEDGER_ID, G, VAT_LEDGERS } from './defaults.ts';

interface V1Ledger { id: string; name: string; group: string; openingBalance: number; isSystem?: boolean; contactNumber?: string; taxNumber?: string }
interface V1Item { id: string; itemName: string; quantity: number; rate: number; unit: string; amount: number }
interface V1Voucher {
  id: string; voucherNo: string; voucherType: string; date: string; debitLedgerId: string; creditLedgerId: string; amount: number;
  narration?: string; referenceNo?: string; paymentMode?: string; bankName?: string; chequeOrUtrNo?: string; items?: V1Item[];
}
export interface V1Backup {
  company?: Record<string, unknown>;
  savingsConfig?: CompanyData['savings'];
  ledgers: V1Ledger[];
  vouchers: V1Voucher[];
}

const groupFor = (l: V1Ledger): string => {
  const name = l.name.toLowerCase();
  switch (l.group) {
    case 'CASH': return G.cash;
    case 'BANK': return G.bank;
    case 'SUNDRY_DEBTOR': return G.debtors;
    case 'SUNDRY_CREDITOR': return G.creditors;
    case 'DIRECT_INCOME': return name.includes('sale') ? G.sales : G.directIncome;
    case 'DIRECT_EXPENSE': return name.includes('purchase') ? G.purchase : G.directExpense;
    case 'INDIRECT_INCOME': return G.indirectIncome;
    case 'INDIRECT_EXPENSE': return G.indirectExpense;
    case 'FIXED_ASSET': return G.fixedAssets;
    case 'CURRENT_ASSET': return name.includes('stock') ? G.stock : G.currentAssets;
    case 'CURRENT_LIABILITY': return G.currentLiabilities;
    case 'CAPITAL_ACCOUNT': return name.includes('reserve') ? G.reserves : G.capital;
    default: return G.suspense;
  }
};

export function isV1Backup(x: unknown): x is V1Backup {
  const o = x as Partial<V1Backup> | null;
  return !!o && Array.isArray(o.ledgers) && Array.isArray(o.vouchers) && (o.ledgers.length === 0 || 'group' in (o.ledgers[0] as object));
}

export function migrateV1(v1: V1Backup): CompanyData {
  const c = (v1.company ?? {}) as Record<string, string>;
  const fyStart = c.financialYearStart || '2026-04-01';
  const today = c.currentAccountingDate || fyStart;
  const data = blankCompany({
    name: c.companyName || 'My Company',
    trn: c.gstinOrTaxId || undefined,
    currencySymbol: c.currencySymbol || '₹',
    fyStart,
    today,
    features: { inventory: true, vat: false, billWise: true },
  });
  data.company.mailingName = c.legalName || undefined;
  if (v1.savingsConfig) data.savings = v1.savingsConfig;

  // Old ledgers replace the starter set, keeping the two every company needs.
  const ledgers: Ledger[] = v1.ledgers.map(l => ({
    id: l.id, name: l.name, groupId: groupFor(l), openingBalance: l.openingBalance || 0,
    phone: l.contactNumber, trn: l.taxNumber,
    billWise: l.group === 'SUNDRY_DEBTOR' || l.group === 'SUNDRY_CREDITOR' ? true : undefined,
  }));
  data.ledgers = [
    ...ledgers,
    ...data.ledgers.filter(l => l.groupId === '' || l.id === 'led_round_off'),
    ...(ledgers.some(l => l.groupId === G.cash) ? [] : data.ledgers.filter(l => l.id === CASH_LEDGER_ID)),
  ];

  const items = new Map<string, StockItem>();
  const itemFor = (name: string, unit: string): StockItem => {
    const key = name.trim().toLowerCase();
    if (!items.has(key)) {
      let unitRow = data.units.find(u => u.symbol.toLowerCase() === (unit || 'nos').toLowerCase());
      if (!unitRow) {
        unitRow = { id: `u_${(unit || 'nos').toLowerCase()}`, symbol: unit || 'Nos', name: unit || 'Numbers', decimals: 0 };
        data.units.push(unitRow);
      }
      items.set(key, { id: `it_${items.size + 1}`, name: name.trim(), unitId: unitRow.id, openingQty: 0, openingRate: 0 });
    }
    return items.get(key)!;
  };

  const stamp = new Date(`${today}T00:00:00Z`).toISOString();
  data.vouchers = v1.vouchers.map((v, i): Voucher => {
    const type = (v.voucherType as VoucherBase) || 'JOURNAL';
    const bank = v.chequeOrUtrNo ? { mode: 'OTHER' as const, instrumentNo: v.chequeOrUtrNo } : undefined;
    const isBank = (id: string) => data.ledgers.find(l => l.id === id)?.groupId === G.bank;
    const lines: VoucherLine[] = [
      { id: `m${i}d`, ledgerId: v.debitLedgerId, side: 'DR', amount: v.amount, bank: isBank(v.debitLedgerId) ? bank : undefined },
      { id: `m${i}c`, ledgerId: v.creditLedgerId, side: 'CR', amount: v.amount, bank: isBank(v.creditLedgerId) ? bank : undefined },
    ];
    const direction = type === 'SALES' ? 'OUT' : 'IN';
    const moves = type === 'SALES' || type === 'PURCHASE';
    return {
      id: v.id, typeId: `vt_${type.toLowerCase()}`, type, number: v.voucherNo, date: v.date, lines,
      narration: v.narration, reference: v.referenceNo,
      partyId: type === 'SALES' ? v.debitLedgerId : type === 'PURCHASE' ? v.creditLedgerId : undefined,
      accountLedgerId: type === 'SALES' ? v.creditLedgerId : type === 'PURCHASE' ? v.debitLedgerId : undefined,
      stock: moves && v.items?.length
        ? v.items.map((it, n) => ({ id: `m${i}s${n}`, itemId: itemFor(it.itemName, it.unit).id, qty: it.quantity, rate: it.rate, amount: it.amount, direction }))
        : undefined,
      createdAt: stamp, updatedAt: stamp,
    };
  });
  data.stockItems = [...items.values()];
  return data;
}

// ---------------------------------------------------------------- Indian GST to UAE VAT

type Legacy = Record<string, unknown>;

/**
 * Books saved before the switch to UAE VAT used Indian GST fields and rupees.
 * This converts them in place the first time they open: VAT on, AED, GSTIN to TRN,
 * GST rates and rows to VAT, and the Input and Output VAT ledgers added.
 * Returns the same object when there is nothing to convert.
 */
export function toUaeVat(opened: CompanyData): CompanyData {
  // Purchases used to be called Bills; keep a renamed entry type in step with the screens.
  const d = opened.voucherTypes.some(t => t.id === 'vt_purchase' && t.name === 'Bill')
    ? { ...opened, voucherTypes: opened.voucherTypes.map(t => (t.id === 'vt_purchase' && t.name === 'Bill' ? { ...t, name: 'Purchase' } : t)) }
    : opened;
  const features = d.company.features as unknown as Legacy;
  const company = d.company as unknown as Legacy;
  const needs = 'gst' in features || 'gstin' in company || d.company.currencyCode === 'INR'
    || d.ledgers.some(l => 'gstin' in l || 'gstRate' in l || ['CGST', 'SGST', 'IGST'].includes(l.taxType as string))
    || d.vouchers.some(v => 'gst' in v);
  if (!needs) return d;

  const renameKeys = <T extends object>(o: T): T => {
    const x = { ...o } as Legacy;
    if ('gstin' in x) { if (x.gstin && !x.trn) x.trn = x.gstin; delete x.gstin; }
    if ('gstRate' in x) { if (x.gstRate !== undefined && x.vatRate === undefined) x.vatRate = x.gstRate === 0 ? 0 : 5; delete x.gstRate; }
    delete x.hsn;
    return x as T;
  };

  const { gst, ...restFeatures } = features;
  void gst;
  const next: CompanyData = {
    ...d,
    company: {
      ...renameKeys(d.company),
      features: { ...(restFeatures as unknown as CompanyData['company']['features']), vat: true, tds: false, tcs: false },
      ...(d.company.currencyCode === 'INR' || d.company.currencySymbol === '₹' ? { currencyCode: 'AED', currencySymbol: 'AED ' } : {}),
    },
    ledgers: d.ledgers.map(l => {
      const x = renameKeys(l);
      // Old GST tax ledgers keep their history but are no longer used for new entries.
      if (['CGST', 'SGST', 'IGST'].includes(x.taxType as string)) return { ...x, taxType: 'OTHER' as const };
      return x;
    }),
    stockItems: d.stockItems.map(renameKeys),
    vouchers: d.vouchers.map(v => {
      const legacy = v as unknown as Legacy;
      if (!('gst' in legacy) && !v.services?.some(s => 'gstRate' in s) && !v.stock?.some(s => 'gstRate' in s)) return v;
      const { gst: oldRows, ...rest } = legacy;
      const vat: VatRow[] | undefined = Array.isArray(oldRows)
        ? (oldRows as { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[]).map(r => ({ rate: r.rate, taxable: r.taxable, vat: r.cgst + r.sgst + r.igst }))
        : undefined;
      const out = rest as unknown as Voucher;
      return {
        ...out,
        ...(vat?.length ? { vat } : {}),
        services: out.services?.map(renameKeys),
        stock: out.stock?.map(renameKeys),
      };
    }),
  };
  for (const vl of VAT_LEDGERS) {
    if (!next.ledgers.some(l => l.taxType === 'VAT' && l.taxSide === vl.taxSide)) next.ledgers.push({ ...vl });
  }
  return next;
}
