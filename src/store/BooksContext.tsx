// Holds the open business, saves it to the local database file, and logs every change for the Edit Log.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuditEntry, CompanyData, CompanySettings, Features, SavingsConfig, Voucher } from '../core/types';
import { blankCompany, VAT_LEDGERS, VOUCHER_META, type NewCompanyInput } from '../core/defaults';
import { buildSampleCompany, SAMPLE_COMPANY_ID } from '../core/sample';
import { isV1Backup, migrateV1, toUaeVat } from '../core/migrate';
import { downloadFile, todayIso } from '../core/format';
import { voucherAmount, voucherParticulars } from '../core/engine';
import { api, type RemoteState } from './api';

const PENDING_PREFIX = 'tp2_pending_';
const OFFLINE_ACTIVE_KEY = 'tp2_active';
const V1_PREFIX = 'tally_edu_accounting_state_v1';
const V1_DONE_KEY = 'tp2_v1_migrated';
const AUDIT_LIMIT = 2000;
const RETRY_MS = 10000;

interface CompanyRef { id: string; name: string }

/** Lists on the company file that the generic master screens can edit. */
export type MasterKey =
  | 'groups' | 'ledgers' | 'voucherTypes' | 'currencies' | 'costCategories' | 'costCentres' | 'budgets' | 'scenarios'
  | 'stockGroups' | 'stockCategories' | 'units' | 'godowns' | 'stockItems' | 'employeeGroups' | 'employees' | 'payHeads' | 'attendanceTypes';

const MASTER_LABEL: Record<MasterKey, string> = {
  groups: 'Group', ledgers: 'Ledger', voucherTypes: 'Entry Type', currencies: 'Currency', costCategories: 'Project Category',
  costCentres: 'Project', budgets: 'Budget', scenarios: 'Scenario', stockGroups: 'Stock Group', stockCategories: 'Stock Category',
  units: 'Unit', godowns: 'Location', stockItems: 'Stock Item', employeeGroups: 'Employee Group', employees: 'Employee',
  payHeads: 'Pay Head', attendanceTypes: 'Attendance Type',
};

interface HasId { id: string; name?: string; symbol?: string; code?: string }

export type SaveState = 'saved' | 'saving' | 'error' | 'browser-only';

interface Gate {
  status: 'loading' | 'welcome' | 'ready';
  locked: boolean;
  bootError: string | null;
  companies: CompanyRef[];
  createCompany: (input: NewCompanyInput) => Promise<void>;
  openSample: () => Promise<void>;
  switchCompany: (id: string) => Promise<void>;
  importBackup: (text: string) => Promise<{ ok: boolean; message: string }>;
  unlock: (password: string) => Promise<boolean>;
}

interface Books {
  data: CompanyData;
  company: CompanySettings;
  features: Features;
  companies: CompanyRef[];
  saveState: SaveState;
  storageError: string | null;
  storagePath: string | null;
  setPassword: (password: string | null) => Promise<void>;
  switchCompany: (id: string) => Promise<void>;
  createCompany: (input: NewCompanyInput) => Promise<void>;
  openSample: () => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  updateCompany: (patch: Partial<CompanySettings>) => void;
  updateFeatures: (patch: Partial<Features>) => void;
  updateSavings: (patch: Partial<SavingsConfig>) => void;
  setPeriod: (from: string, to: string) => void;
  setCurrentDate: (date: string) => void;
  saveMaster: <T extends HasId>(key: MasterKey, record: T) => void;
  saveMasters: <T extends HasId>(key: MasterKey, records: T[]) => void;
  deleteMaster: (key: MasterKey, id: string) => void;
  saveVoucher: (v: Voucher) => void;
  deleteVoucher: (id: string) => void;
  setVoucherCancelled: (id: string, cancelled: boolean) => void;
  setBankDate: (voucherId: string, lineId: string, date: string) => void;
  exportBackup: () => void;
  importBackup: (text: string) => Promise<{ ok: boolean; message: string }>;
  restoreFromPoint: (day: string) => Promise<void>;
}

const GateContext = createContext<Gate | null>(null);
const BooksContext = createContext<Books | null>(null);

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const keepAtLeastToday = (d: CompanyData): CompanyData => {
  const today = todayIso();
  return d.company.currentDate < today ? { ...d, company: { ...d.company, currentDate: today } } : d;
};

/** Entries made in the first version of this app, if any were saved in this browser. */
function findOldBrowserData(): CompanyData | null {
  if (localStorage.getItem(V1_DONE_KEY)) return null;
  const vouchers = readJson<{ id: string }[]>(`${V1_PREFIX}_vouchers`);
  const ledgers = readJson<unknown[]>(`${V1_PREFIX}_ledgers`);
  const company = readJson<Record<string, unknown>>(`${V1_PREFIX}_company`);
  if (!vouchers || !ledgers || vouchers.length === 0) return null;
  const untouchedDemo = vouchers.every(v => /^v_1\d\d$/.test(v.id));
  if (untouchedDemo) return null;
  const backup = { company: company ?? undefined, savingsConfig: readJson<SavingsConfig>(`${V1_PREFIX}_savings`) ?? undefined, ledgers, vouchers };
  return isV1Backup(backup) ? migrateV1(backup) : null;
}

function pendingCompanies(): CompanyData[] {
  const out: CompanyData[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PENDING_PREFIX)) continue;
    const d = readJson<CompanyData>(key);
    if (d) out.push(d);
  }
  return out;
}

const sha256 = async (text: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
};

const voucherSummary = (d: CompanyData, v: Voucher) =>
  `${v.date} · ${voucherParticulars(d, v)} · ${voucherAmount(v).toFixed(2)}`;

const logged = (d: CompanyData, entry: Omit<AuditEntry, 'id' | 'at'>): AuditEntry[] => [
  { ...entry, id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() },
  ...d.auditLog,
].slice(0, AUDIT_LIMIT);

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Gate['status']>('loading');
  const [data, setData] = useState<CompanyData | null>(null);
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [locked, setLocked] = useState(false);
  const [online, setOnline] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const latest = useRef<CompanyData | null>(null);
  latest.current = data;
  const lastSaved = useRef<CompanyData | null>(null);
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const keepInBrowser = (d: CompanyData) => {
    try {
      localStorage.setItem(`${PENDING_PREFIX}${d.company.id}`, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  };

  const writeOut = useCallback(async (d: CompanyData) => {
    if (!onlineRef.current) {
      const kept = keepInBrowser(d);
      lastSaved.current = d;
      setSaveState('browser-only');
      if (!kept) setStorageError('Your browser storage is full, so recent changes are not saved. Export a backup now.');
      return;
    }
    setSaveState('saving');
    try {
      await api.save(d);
      localStorage.removeItem(`${PENDING_PREFIX}${d.company.id}`);
      lastSaved.current = d;
      if (latest.current === d) setSaveState('saved');
      setStorageError(null);
    } catch (err) {
      // Never lose an entry: hold it in the browser and keep trying until the file takes it.
      const kept = keepInBrowser(d);
      setSaveState('error');
      setStorageError(kept
        ? `Could not save to your data file, so your latest entries are being held in this browser and will be retried. (${(err as Error).message})`
        : 'Could not save to your data file, and browser storage is full. Export a backup now.');
    }
  }, []);

  // Save shortly after each change.
  useEffect(() => {
    if (!data || data === lastSaved.current) return;
    const t = setTimeout(() => void writeOut(data), 300);
    return () => clearTimeout(t);
  }, [data, writeOut]);

  // Keep retrying a failed save.
  useEffect(() => {
    if (saveState !== 'error') return;
    const t = setInterval(() => { if (latest.current) void writeOut(latest.current); }, RETRY_MS);
    return () => clearInterval(t);
  }, [saveState, writeOut]);

  // A change made in the last moment before the window closes is held in the browser, then saved on next open.
  useEffect(() => {
    const flush = () => {
      if (latest.current && latest.current !== lastSaved.current) keepInBrowser(latest.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const showCompany = useCallback((opened: CompanyData) => {
    // Books saved under the old Indian GST setup are converted to UAE VAT, then saved.
    const d = toUaeVat(opened);
    const next = keepAtLeastToday(d);
    lastSaved.current = next === opened ? opened : null;
    setData(next);
    setLocked(!!d.company.passwordHash);
    setStatus('ready');
    setCompanies(list => list.some(c => c.id === d.company.id)
      ? list.map(c => (c.id === d.company.id ? { id: c.id, name: d.company.name } : c))
      : [...list, { id: d.company.id, name: d.company.name }]);
    if (onlineRef.current) void api.setActive(d.company.id).catch(() => {});
    else try { localStorage.setItem(OFFLINE_ACTIVE_KEY, d.company.id); } catch { /* only a convenience */ }
  }, []);

  /** Saves the business currently open before moving to another. */
  const openCompany = useCallback(async (next: CompanyData) => {
    if (latest.current && latest.current !== lastSaved.current) await writeOut(latest.current);
    if (onlineRef.current) {
      try {
        await api.save(next);
      } catch {
        keepInBrowser(next);
      }
    } else {
      keepInBrowser(next);
    }
    lastSaved.current = next;
    showCompany(next);
  }, [showCompany, writeOut]);

  // Start-up
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let remote: RemoteState | null = null;
      try {
        remote = await api.state();
      } catch {
        remote = null;
      }
      if (cancelled) return;

      if (!remote) {
        // No server: work from the browser's copy and say so plainly.
        setOnline(false);
        onlineRef.current = false;
        setSaveState('browser-only');
        const held = pendingCompanies();
        setCompanies(held.map(d => ({ id: d.company.id, name: d.company.name })));
        const active = held.find(d => d.company.id === localStorage.getItem(OFFLINE_ACTIVE_KEY)) ?? held[0];
        if (active) showCompany(active);
        else setStatus('welcome');
        return;
      }

      setStoragePath(remote.storage.path);
      // Anything held in the browser since the last session goes to the file first.
      for (const held of pendingCompanies()) {
        try {
          await api.save(held);
          localStorage.removeItem(`${PENDING_PREFIX}${held.company.id}`);
          if (!remote.companies.some(c => c.id === held.company.id)) remote.companies.push({ id: held.company.id, name: held.company.name, updatedAt: '' });
        } catch (err) {
          setBootError(`Some entries are still held in this browser: ${(err as Error).message}`);
        }
      }
      setCompanies(remote.companies.map(c => ({ id: c.id, name: c.name })));

      const activeId = remote.activeId && remote.companies.some(c => c.id === remote!.activeId) ? remote.activeId : remote.companies[0]?.id;
      if (activeId) {
        try {
          const d = await api.company(activeId);
          if (!cancelled) showCompany(d);
        } catch (err) {
          setBootError((err as Error).message);
          setStatus('welcome');
        }
        return;
      }

      const old = findOldBrowserData();
      if (old) {
        await openCompany(old);
        // Only once, so removing that business later does not bring it back.
        try { localStorage.setItem(V1_DONE_KEY, '1'); } catch { /* it would only be offered again */ }
      } else {
        setStatus('welcome');
      }
    })();
    return () => { cancelled = true; };
    // Start-up runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCompany = useCallback(async (id: string) => {
    if (latest.current?.company.id === id) { setLocked(!!latest.current.company.passwordHash); return; }
    if (latest.current && latest.current !== lastSaved.current) await writeOut(latest.current);
    const next = onlineRef.current ? await api.company(id) : readJson<CompanyData>(`${PENDING_PREFIX}${id}`);
    if (next) { lastSaved.current = next; showCompany(next); }
  }, [showCompany, writeOut]);

  const createCompany = useCallback((input: NewCompanyInput) => openCompany(blankCompany(input)), [openCompany]);

  const openSample = useCallback(async () => {
    if (companies.some(c => c.id === SAMPLE_COMPANY_ID)) await switchCompany(SAMPLE_COMPANY_ID);
    else await openCompany(buildSampleCompany());
  }, [companies, openCompany, switchCompany]);

  const importBackup = useCallback(async (text: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, message: 'That file is not a valid backup. It could not be read.' };
    }
    if (isV1Backup(parsed)) {
      await openCompany(migrateV1(parsed));
      return { ok: true, message: 'Backup from the older version converted and opened.' };
    }
    const file = parsed as CompanyData;
    if (file?.version === 2 && file.company?.id && Array.isArray(file.ledgers) && Array.isArray(file.vouchers)) {
      await openCompany(file);
      return { ok: true, message: `${file.company.name} restored from backup.` };
    }
    return { ok: false, message: 'That file is not a backup from this software.' };
  }, [openCompany]);

  const unlock = useCallback(async (password: string) => {
    const c = latest.current?.company;
    if (!c) return false;
    const ok = (await sha256(`${c.passwordSalt}${password}`)) === c.passwordHash;
    if (ok) setLocked(false);
    return ok;
  }, []);

  const change = useCallback((fn: (d: CompanyData) => CompanyData) => {
    setData(d => (d ? fn(d) : d));
  }, []);

  const books = useMemo<Books | null>(() => {
    if (!data) return null;
    return {
      data,
      company: data.company,
      features: data.company.features,
      companies,
      saveState,
      storageError,
      storagePath,

      setPassword: async password => {
        if (!password) {
          change(d => ({ ...d, company: { ...d.company, passwordHash: undefined, passwordSalt: undefined } }));
          return;
        }
        const salt = crypto.randomUUID();
        const hash = await sha256(`${salt}${password}`);
        change(d => ({ ...d, company: { ...d.company, passwordSalt: salt, passwordHash: hash } }));
      },

      switchCompany,
      createCompany,
      openSample,
      deleteCompany: async id => {
        if (onlineRef.current) await api.remove(id);
        localStorage.removeItem(`${PENDING_PREFIX}${id}`);
        const rest = companies.filter(c => c.id !== id);
        setCompanies(rest);
        if (latest.current?.company.id === id) {
          lastSaved.current = null;
          setData(null);
          if (rest[0]) await switchCompany(rest[0].id);
          else setStatus('welcome');
        }
      },

      updateCompany: patch => {
        change(d => ({ ...d, company: { ...d.company, ...patch }, auditLog: logged(d, { action: 'ALTER', entity: 'Business', refId: d.company.id, label: `Details changed: ${Object.keys(patch).join(', ')}` }) }));
        if (patch.name) setCompanies(list => list.map(c => (c.id === latest.current?.company.id ? { ...c, name: patch.name! } : c)));
      },
      updateFeatures: patch => change(d => {
        const features = { ...d.company.features, ...patch };
        // Turning VAT on makes sure the Input and Output VAT ledgers invoices post to are there.
        const missing = features.vat ? VAT_LEDGERS.filter(g => !d.ledgers.some(l => l.taxType === g.taxType && l.taxSide === g.taxSide)) : [];
        return { ...d, company: { ...d.company, features }, ledgers: [...d.ledgers, ...missing.map(l => ({ ...l }))] };
      }),
      updateSavings: patch => change(d => ({ ...d, savings: { ...d.savings, ...patch } })),
      setPeriod: (from, to) => change(d => ({ ...d, company: { ...d.company, periodFrom: from, periodTo: to } })),
      setCurrentDate: date => change(d => ({ ...d, company: { ...d.company, currentDate: date } })),

      saveMaster: <T extends HasId>(key: MasterKey, record: T) => change(d => {
        const list = d[key] as unknown as HasId[];
        const exists = list.some(x => x.id === record.id);
        const next = exists ? list.map(x => (x.id === record.id ? record : x)) : [...list, record];
        return {
          ...d, [key]: next,
          auditLog: logged(d, { action: exists ? 'ALTER' : 'CREATE', entity: MASTER_LABEL[key], refId: record.id, label: record.name ?? record.symbol ?? record.code ?? record.id }),
        };
      }),
      saveMasters: (key, records) => change(d => {
        const list = d[key] as unknown as HasId[];
        return {
          ...d, [key]: [...list, ...records],
          auditLog: logged(d, { action: 'CREATE', entity: MASTER_LABEL[key], refId: 'import', label: `${records.length} imported from a file` }),
        };
      }),
      deleteMaster: (key, id) => change(d => {
        const list = d[key] as unknown as HasId[];
        const gone = list.find(x => x.id === id);
        return {
          ...d, [key]: list.filter(x => x.id !== id),
          auditLog: logged(d, { action: 'DELETE', entity: MASTER_LABEL[key], refId: id, label: gone?.name ?? gone?.symbol ?? gone?.code ?? id }),
        };
      }),

      saveVoucher: v => change(d => {
        const before = d.vouchers.find(x => x.id === v.id);
        const next = { ...d, vouchers: before ? d.vouchers.map(x => (x.id === v.id ? v : x)) : [...d.vouchers, v] };
        return {
          ...next,
          auditLog: logged(d, {
            action: before ? 'ALTER' : 'CREATE', entity: VOUCHER_META[v.type].label, refId: v.id, label: v.number,
            before: before ? voucherSummary(d, before) : undefined, after: voucherSummary(next, v),
          }),
        };
      }),
      deleteVoucher: id => change(d => {
        const v = d.vouchers.find(x => x.id === id);
        if (!v) return d;
        // A receipt or payment saved with an invoice goes with it.
        const linked = d.vouchers.filter(x => x.settlesInvoiceId === id);
        let auditLog = logged(d, { action: 'DELETE', entity: VOUCHER_META[v.type].label, refId: id, label: v.number, before: voucherSummary(d, v) });
        for (const l of linked) auditLog = logged({ ...d, auditLog }, { action: 'DELETE', entity: VOUCHER_META[l.type].label, refId: l.id, label: l.number, before: voucherSummary(d, l) });
        return { ...d, vouchers: d.vouchers.filter(x => x.id !== id && x.settlesInvoiceId !== id), auditLog };
      }),
      setVoucherCancelled: (id, cancelled) => change(d => {
        const v = d.vouchers.find(x => x.id === id);
        if (!v) return d;
        return {
          // A receipt or payment saved with an invoice is cancelled or restored with it.
          ...d, vouchers: d.vouchers.map(x => (x.id === id || x.settlesInvoiceId === id ? { ...x, isCancelled: cancelled, updatedAt: new Date().toISOString() } : x)),
          auditLog: logged(d, { action: cancelled ? 'CANCEL' : 'RESTORE', entity: VOUCHER_META[v.type].label, refId: id, label: v.number, before: voucherSummary(d, v) }),
        };
      }),
      setBankDate: (voucherId, lineId, date) => change(d => ({
        ...d,
        vouchers: d.vouchers.map(v => v.id !== voucherId ? v : {
          ...v,
          lines: v.lines.map(l => (l.id !== lineId ? l : { ...l, bank: { mode: l.bank?.mode ?? 'OTHER', ...l.bank, bankDate: date || undefined } })),
        }),
      })),

      exportBackup: () => {
        const d = latest.current;
        if (d) downloadFile(`${d.company.name.replace(/[^\w]+/g, '_')}_backup_${todayIso()}.json`, JSON.stringify(d, null, 1), 'application/json');
      },
      importBackup,
      restoreFromPoint: async day => {
        const id = latest.current?.company.id;
        if (!id) return;
        const point = await api.restorePoint(id, day);
        await openCompany(point);
      },
    };
  }, [data, companies, saveState, storageError, storagePath, change, switchCompany, createCompany, openSample, importBackup, openCompany]);

  const gate = useMemo<Gate>(() => ({
    status, locked, bootError, companies, createCompany, openSample, switchCompany, importBackup, unlock,
  }), [status, locked, bootError, companies, createCompany, openSample, switchCompany, importBackup, unlock]);

  return (
    <GateContext.Provider value={gate}>
      <BooksContext.Provider value={books}>{children}</BooksContext.Provider>
    </GateContext.Provider>
  );
};

export const useGate = () => {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useGate must be used inside BooksProvider');
  return ctx;
};

export const useBooks = () => {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error('useBooks must be used once a business is open');
  return ctx;
};

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
