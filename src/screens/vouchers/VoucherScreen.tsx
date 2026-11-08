// The one entry screen: picks the right form for the entry type and handles saving, numbering and actions.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Printer, Trash2, Undo2, XCircle } from 'lucide-react';
import type { Voucher, VoucherBase } from '../../core/types';
import { VOUCHER_META, VOUCHER_ORDER } from '../../core/defaults';
import { nextVoucherNumber, orderStatus } from '../../core/engine';
import { isInvoiceBase } from '../../core/invoice';
import { fmtDate } from '../../core/format';
import { newId, useBooks } from '../../store/BooksContext';
import { Field, Input, Notice, Page, Pill, Select, Toggle, useEnterToNext, useFeedback } from '../../ui/kit';
import { unsaved, useGuardedNavigate, useTrackUnsaved } from '../../ui/Shell';
import { newVoucher } from '../../ui/nav';
import { Hub } from '../../ui/report';
import { AccountingEditor } from './AccountingEditor';
import { InvoiceEditor } from './InvoiceEditor';
import { AttendanceEditor, NoteEditor, PayrollEditor, PhysicalEditor, StockJournalEditor } from './OtherEditors';
import { type Builder, Errors } from './parts';

const TABS: VoucherBase[] = ['SALES', 'RECEIPT', 'PAYMENT', 'PURCHASE', 'CONTRA', 'JOURNAL'];

export const VoucherScreen: React.FC = () => {
  const { base: baseParam, id } = useParams();
  const [params] = useSearchParams();
  const { data, features } = useBooks();
  const [formKey, setFormKey] = useState(0);

  const existing = id ? data.vouchers.find(v => v.id === id) : undefined;
  const base = (existing?.type ?? baseParam) as VoucherBase;
  if (id && !existing) return <Page><p className="hint">That entry no longer exists. <Link className="text-brand-700 font-semibold" to="/daybook">Go to the Day Book</Link></p></Page>;
  if (!VOUCHER_META[base]) return <Page><p className="hint">Unknown entry type.</p></Page>;
  const feature = VOUCHER_META[base].feature;
  if (feature && !features[feature] && !existing) {
    return <Page><p>{VOUCHER_META[base].label} is switched off for this business. <Link className="text-brand-700 font-semibold" to="/settings/features">Turn it on in Features</Link></p></Page>;
  }
  return <VoucherForm key={`${base}|${id ?? ''}|${params.toString()}|${formKey}`} base={base} existing={existing} onSavedNew={() => setFormKey(k => k + 1)} />;
};

const VoucherForm: React.FC<{ base: VoucherBase; existing?: Voucher; onSavedNew: () => void }> = ({ base, existing, onSavedNew }) => {
  const { data, company, saveVoucher, deleteVoucher, setVoucherCancelled } = useBooks();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const go = useGuardedNavigate();
  const { toast, confirm } = useFeedback();
  const meta = VOUCHER_META[base];
  const builder = useRef<Builder>(() => ({ errors: [] }));
  const enter = useEnterToNext<HTMLDivElement>();

  const types = useMemo(() => data.voucherTypes.filter(t => t.base === base), [data.voucherTypes, base]);

  // Where a new entry can start from: a copy of another, or goods on a note or order.
  const source = useMemo<Voucher | undefined>(() => {
    const copy = params.get('copy');
    if (copy) return data.vouchers.find(v => v.id === copy);
    const fromNote = params.get('fromNote');
    if (fromNote) {
      const note = data.vouchers.find(v => v.id === fromNote);
      return note ? { ...note, noteIds: [note.id], stockAlreadyMoved: true } : undefined;
    }
    const fromOrder = params.get('fromOrder');
    if (fromOrder) {
      const order = data.vouchers.find(v => v.id === fromOrder);
      if (!order) return undefined;
      const status = orderStatus(data, order.type as 'SALES_ORDER' | 'PURCHASE_ORDER').filter(s => s.order.id === order.id);
      return {
        ...order, orderId: order.id,
        stock: (order.stock ?? []).map(l => ({ ...l, qty: status.find(s => s.itemId === l.itemId)?.pending ?? l.qty })).filter(l => l.qty > 0),
      };
    }
    return undefined;
    // Only read when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const [typeId, setTypeId] = useState(existing?.typeId ?? (types.find(t => t.id === params.get('type')) ?? types[0])?.id ?? `vt_${base.toLowerCase()}`);
  const [date, setDate] = useState(existing?.date ?? company.currentDate);
  const [numberEdit, setNumberEdit] = useState<string | null>(existing?.number ?? null);
  const [narration, setNarration] = useState(existing?.narration ?? source?.narration ?? '');
  const [isOptional, setOptional] = useState(!!existing?.isOptional);
  const [postDated, setPostDated] = useState(!!existing?.isPostDated);
  const [applicableUpto, setApplicableUpto] = useState(existing?.applicableUpto ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  useTrackUnsaved({ date, narration, isOptional, postDated, applicableUpto });

  const number = numberEdit ?? nextVoucherNumber(data, typeId);
  const isFuture = date > company.currentDate;

  const registerBuilder = (b: Builder) => { builder.current = b; };

  const save = (print = false) => {
    const r = builder.current();
    const problems = [...r.errors];
    if (!date) problems.push('Enter a date.');
    else if (date < company.booksFrom) problems.push(`Your books start on ${fmtDate(company.booksFrom)}, so entries cannot be dated before that.`);
    if (!number.trim()) problems.push('Enter a number for this entry.');
    if (data.vouchers.some(v => v.typeId === typeId && v.number === number.trim() && v.id !== existing?.id)) problems.push(`${number} is already used. Choose another number.`);
    if (problems.length) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    const now = new Date().toISOString();
    const voucher: Voucher = {
      id: existing?.id ?? newId('v'),
      typeId, type: base, number: number.trim(), date,
      lines: [], narration: narration.trim() || undefined,
      isOptional: isOptional || undefined,
      isPostDated: postDated || undefined,
      isCancelled: existing?.isCancelled,
      applicableUpto: applicableUpto || undefined,
      settlesInvoiceId: existing?.settlesInvoiceId,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
      ...r.patch,
    };
    saveVoucher(voucher);
    // Money paid on the invoice screen is kept as its own receipt or payment, linked to this invoice.
    if (r.settlement !== undefined) {
      const linked = data.vouchers.find(v => v.settlesInvoiceId === voucher.id);
      if (r.settlement === null) {
        if (linked) deleteVoucher(linked.id);
      } else {
        const type = r.settlement.type;
        const typeId = linked?.typeId ?? `vt_${type.toLowerCase()}`;
        saveVoucher({
          id: linked?.id ?? newId('v'), typeId, type, number: linked?.number ?? nextVoucherNumber(data, typeId), date: voucher.date,
          partyId: voucher.partyId, projectId: voucher.projectId, lines: r.settlement.lines,
          narration: `${type === 'RECEIPT' ? 'Received' : 'Paid'} against ${meta.label} ${voucher.number}`,
          settlesInvoiceId: voucher.id, isOptional: voucher.isOptional, isPostDated: voucher.isPostDated, isCancelled: voucher.isCancelled,
          createdAt: linked?.createdAt ?? now, updatedAt: now,
        });
      }
    }
    unsaved.current = false;
    toast(`${meta.label} ${voucher.number} saved`);
    for (const w of r.warnings ?? []) toast(w, 'warn');
    if (print) navigate(`/voucher/${voucher.id}/print`);
    else if (existing) navigate(-1);
    else onSavedNew();
  };

  const remove = async () => {
    if (!existing) return;
    const yes = await confirm({ title: `Delete ${existing.number}?`, body: `This removes the entry from your books${data.vouchers.some(v => v.settlesInvoiceId === existing.id) ? ', together with the receipt or payment recorded with it' : ''}. To keep a record of it, cancel it instead. The Edit Log will note the deletion.`, confirmLabel: 'Delete', danger: true });
    if (!yes) return;
    deleteVoucher(existing.id);
    unsaved.current = false;
    toast(`${existing.number} deleted`);
    navigate(-1);
  };
  const toggleCancel = async () => {
    if (!existing) return;
    if (!existing.isCancelled) {
      const yes = await confirm({ title: `Cancel ${existing.number}?`, body: 'The number stays in your records, but its amounts no longer count in your books.', confirmLabel: 'Cancel entry', danger: true });
      if (!yes) return;
    }
    setVoucherCancelled(existing.id, !existing.isCancelled);
    toast(existing.isCancelled ? `${existing.number} restored` : `${existing.number} cancelled`);
  };
  const duplicate = () => { if (existing) void go(`${newVoucher(base)}?copy=${existing.id}`); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-modal]')) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey && key === 'a') || (e.ctrlKey && key === 'enter')) { e.preventDefault(); save(); }
      else if (e.altKey && key === 'd' && existing) { e.preventDefault(); void remove(); }
      else if (e.altKey && key === 'x' && existing) { e.preventDefault(); void toggleCancel(); }
      else if (e.altKey && key === '2' && existing) { e.preventDefault(); duplicate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const editor = () => {
    const prefill = {
      party: params.get('party') ?? undefined, ledger: params.get('ledger') ?? undefined, project: params.get('project') ?? undefined,
      amount: params.get('amount') ? Number(params.get('amount')) : undefined, ref: params.get('ref') ?? undefined,
    };
    switch (meta.mode) {
      case 'SIMPLE':
      case 'JOURNAL':
        return <AccountingEditor base={base} date={date} voucherId={existing?.id} existing={existing ?? source} prefill={prefill} registerBuilder={registerBuilder} />;
      case 'INVOICE':
        return isInvoiceBase(base) ? <InvoiceEditor base={base} date={date} number={number} voucherId={existing?.id} existing={existing} source={source} prefill={prefill} registerBuilder={registerBuilder} /> : null;
      case 'NOTE':
        return <NoteEditor base={base} existing={existing} source={source} registerBuilder={registerBuilder} />;
      case 'STOCK_JOURNAL':
        return <StockJournalEditor existing={existing ?? source} registerBuilder={registerBuilder} />;
      case 'PHYSICAL':
        return <PhysicalEditor existing={existing ?? source} date={date} registerBuilder={registerBuilder} />;
      case 'ATTENDANCE':
        return <AttendanceEditor existing={existing ?? source} registerBuilder={registerBuilder} />;
      case 'PAYROLL':
        return <PayrollEditor existing={existing} date={date} registerBuilder={registerBuilder} />;
      default:
        return null;
    }
  };

  return (
    <Page wide>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          {existing ? `Edit ${meta.label} ${existing.number}` : `New ${meta.label}`}
          {existing?.isCancelled && <Pill tone="red">Cancelled</Pill>}
        </h1>
        {!existing && (
          <div className="flex flex-wrap gap-1 no-print" role="tablist" aria-label="Entry type">
            {TABS.map(t => (
              <button
                key={t} role="tab" aria-selected={t === base} onClick={() => void go(newVoucher(t))}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer ${t === base ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >{VOUCHER_META[t].label}</button>
            ))}
            <button onClick={() => void go('/new')} className="px-3 py-1 rounded-lg font-medium text-slate-600 hover:bg-slate-200 cursor-pointer">More</button>
          </div>
        )}
      </div>
      {existing && (
        <p className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800 no-print">
          You are editing a saved entry. Change any amount, account, date or note below, then press <b>Save changes</b>. Your reports update straight away, and the Edit Log keeps a record of the old values.
        </p>
      )}
      {existing?.settlesInvoiceId && (() => {
        const invoice = data.vouchers.find(v => v.id === existing.settlesInvoiceId);
        return invoice ? (
          <Notice className="mb-3 no-print">
            This {meta.label.toLowerCase()} was recorded on {VOUCHER_META[invoice.type].label} {invoice.number}. To change the amount or account,{' '}
            <Link className="font-semibold underline" to={`/voucher/${invoice.id}`}>edit {invoice.number}</Link> and change its Payment, so the two stay in step.
          </Notice>
        ) : null;
      })()}
      <p className="hint mb-3">{meta.plain}{meta.tallyName !== meta.label ? ` Tally calls this ${meta.tallyName}.` : ''}</p>

      <Errors errors={errors} />

      <div className="card p-4" ref={enter.ref} onKeyDown={enter.onKeyDown}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field label="Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Number"><Input value={number} onChange={e => setNumberEdit(e.target.value)} /></Field>
          {types.length > 1 && (
            <Field label="Entry type">
              <Select value={typeId} onChange={e => { setTypeId(e.target.value); setNumberEdit(null); }}>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          )}
        </div>

        {editor()}

        <div className="mt-4 grid lg:grid-cols-2 gap-3">
          <Field label="Note" hint="Why this happened, in your own words. Shows on reports and printed copies.">
            <textarea className="input" rows={2} value={narration} onChange={e => setNarration(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1">
            {base === 'REVERSING_JOURNAL' && (
              <Field label="Applies until"><Input type="date" value={applicableUpto} onChange={e => setApplicableUpto(e.target.value)} /></Field>
            )}
            {meta.accounts && base !== 'MEMORANDUM' && (
              <Toggle checked={isOptional} onChange={setOptional} label="Optional entry" hint="Saved, but stays out of your books until you untick this." />
            )}
            {meta.accounts && (isFuture || postDated) && (
              <Toggle checked={postDated} onChange={setPostDated} label="Post-dated" hint="Stays out of your books until this date arrives." />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 no-print">
        <button className="btn btn-primary" data-accept onClick={() => save()}>{existing ? 'Save changes' : 'Save'} <span className="opacity-70 font-normal text-xs">Ctrl+A</span></button>
        {meta.mode === 'INVOICE' && <button className="btn" onClick={() => save(true)}><Printer className="w-4 h-4 text-slate-500" /> Save and print</button>}
        {existing && (
          <>
            <div className="flex-1" />
            <button className="btn" onClick={() => void go(`/voucher/${existing.id}/print`)}><Printer className="w-4 h-4 text-slate-500" /> Print</button>
            <button className="btn" onClick={duplicate} title="Alt+2"><Copy className="w-4 h-4 text-slate-500" /> Duplicate</button>
            <button className="btn" onClick={() => void toggleCancel()} title="Alt+X">{existing.isCancelled ? <><Undo2 className="w-4 h-4 text-slate-500" /> Restore</> : <><XCircle className="w-4 h-4 text-slate-500" /> Cancel entry</>}</button>
            <button className="btn btn-danger" onClick={() => void remove()} title="Alt+D"><Trash2 className="w-4 h-4" /> Delete</button>
          </>
        )}
      </div>
    </Page>
  );
};

export const NewEntry: React.FC = () => {
  const { features } = useBooks();
  const item = (base: VoucherBase) => ({
    label: VOUCHER_META[base].key ? `${VOUCHER_META[base].label} (${VOUCHER_META[base].key})` : VOUCHER_META[base].label,
    to: newVoucher(base), section: '', plain: VOUCHER_META[base].plain, keywords: VOUCHER_META[base].tallyName,
  });
  const enabled = (list: VoucherBase[]) => list.filter(b => !VOUCHER_META[b].feature || features[VOUCHER_META[b].feature!]).map(item);
  void VOUCHER_ORDER;
  return (
    <Hub
      title="New entry" hint="What happened? Choose the one that fits. More types appear when you turn on features with F11."
      sections={[
        { title: 'Everyday', items: enabled(['SALES', 'RECEIPT', 'PAYMENT', 'PURCHASE', 'CONTRA', 'JOURNAL']) },
        { title: 'Corrections and notes', items: enabled(['CREDIT_NOTE', 'DEBIT_NOTE', 'MEMORANDUM', 'REVERSING_JOURNAL']) },
        { title: 'Goods', items: enabled(['SALES_ORDER', 'PURCHASE_ORDER', 'DELIVERY_NOTE', 'RECEIPT_NOTE', 'REJECTION_IN', 'REJECTION_OUT', 'STOCK_JOURNAL', 'PHYSICAL_STOCK']) },
        { title: 'Staff', items: enabled(['ATTENDANCE', 'PAYROLL']) },
      ]}
    />
  );
};
