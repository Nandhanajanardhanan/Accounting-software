// Display helpers shared by every screen.

const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmt = (n: number) => num.format(n === 0 ? 0 : n);
export const fmtWhole = (n: number) => whole.format(Math.round(n));
/** Blank instead of 0.00, the way statements leave empty cells empty. */
export const fmtBlank = (n: number) => (Math.abs(n) < 0.005 ? '' : fmt(n));
export const money = (symbol: string, n: number) => `${n <= -0.005 ? '-' : ''}${symbol}${num.format(Math.abs(n))}`;
export const moneyWhole = (symbol: string, n: number) => {
  const rounded = Math.round(n);
  return `${rounded < 0 ? '-' : ''}${symbol}${whole.format(Math.abs(rounded))}`;
};
export const drCr = (n: number) => (Math.abs(n) < 0.005 ? '0.00' : `${num.format(Math.abs(n))} ${n > 0 ? 'Dr' : 'Cr'}`);

export function fmtQty(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(n);
}

export function fmtDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}

export const fmtMonth = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
export const fmtMonthShort = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)]); n %= 10; }
  if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

/** Amount in words using thousands, millions and billions, as printed on UAE invoices and cheques. */
export function amountInWords(amount: number, currency = 'UAE Dirhams', cents = 'Fils'): string {
  const abs = Math.abs(amount);
  let whole = Math.floor(abs);
  const fils = Math.round((abs - whole) * 100);
  if (whole === 0 && fils === 0) return `${currency} Zero Only`;
  const parts: string[] = [];
  for (const [size, name] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']] as const) {
    const n = Math.floor(whole / size);
    if (n) { parts.push(`${belowThousand(n)} ${name}`); whole %= size; }
  }
  if (whole) parts.push(belowThousand(whole));
  let out = parts.length ? `${currency} ${parts.join(' ')}` : '';
  if (fils) out += `${out ? ' and ' : ''}${belowThousand(fils)} ${cents}`;
  return `${out} Only`;
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Exports every table inside an element to one CSV file, so any report can be opened in Excel. */
export function exportTablesToCsv(root: Element, filename: string, heading: string[]) {
  const rows: string[] = heading.map(csvCell);
  root.querySelectorAll('table').forEach((table, i) => {
    if (i > 0 || heading.length) rows.push('');
    table.querySelectorAll('tr').forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th,td').forEach(cell => {
        const text = (cell as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
        cells.push(csvCell(text));
        const span = Number((cell as HTMLTableCellElement).colSpan) || 1;
        for (let k = 1; k < span; k++) cells.push('');
      });
      rows.push(cells.join(','));
    });
  });
  // The byte-order mark makes Excel read non-English text (such as Arabic names) correctly.
  downloadFile(filename, `﻿${rows.join('\r\n')}`, 'text/csv;charset=utf-8');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const clean = text.replace(/^﻿/, '');
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const BANK_MODE_LABEL: Record<string, string> = { NEFT: 'Bank transfer', RTGS: 'Bank transfer', IMPS: 'Bank transfer', UPI: 'Bank transfer', CARD: 'Card', CHEQUE: 'Cheque', OTHER: '' };
/** How money moved, in plain words: older entries saved NEFT and similar Indian modes, which read as a bank transfer. */
export const bankModeLabel = (mode?: string) => (mode ? BANK_MODE_LABEL[mode] ?? mode : '');
