// First run: a short setup with no dummy entries. Also the shared form for adding another business, and the lock screen.
import React, { useRef, useState } from 'react';
import { Building2, Lock, Upload } from 'lucide-react';
import { DEFAULT_FEATURES, EMIRATES } from '../core/defaults';
import { todayIso } from '../core/format';
import { useGate } from '../store/BooksContext';
import { Field, Input, Notice, NumberInput, Select, Toggle, useEnterToNext } from '../ui/kit';
import type { NewCompanyInput } from '../core/defaults';

// UAE businesses usually keep calendar-year books.
const currentFyStart = (today: string) => `${today.slice(0, 4)}-01-01`;

export const NewBusinessForm: React.FC<{ onCreate: (input: NewCompanyInput) => Promise<void> | void; submitLabel?: string; onCancel?: () => void }> = ({ onCreate, submitLabel = 'Create my books', onCancel }) => {
  const today = todayIso();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [profession, setProfession] = useState('');
  const [state, setState] = useState('');
  const [fyStart, setFyStart] = useState(currentFyStart(today));
  const [bankName, setBankName] = useState('');
  const [bankOpening, setBankOpening] = useState(0);
  const [cashOpening, setCashOpening] = useState(0);
  const [vat, setVat] = useState(true);
  const [trn, setTrn] = useState('');
  const [foreign, setForeign] = useState(false);
  const [error, setError] = useState('');
  const enter = useEnterToNext<HTMLDivElement>();

  const submit = () => {
    if (!name.trim() && !ownerName.trim()) return setError('Enter your business name, or just your own name.');
    if (trn && !/^\d{15}$/.test(trn.trim().replace(/[\s-]/g, ''))) return setError('A TRN has 15 digits, as shown on your FTA VAT registration certificate.');
    void onCreate({
      name: name.trim() || ownerName.trim(), ownerName: ownerName.trim() || undefined, profession: profession.trim() || undefined, state: state || undefined,
      trn: vat ? trn.replace(/[\s-]/g, '') || undefined : undefined,
      fyStart, today, bankName: bankName.trim() || undefined, bankOpening, cashOpening,
      features: { ...DEFAULT_FEATURES, vat, multiCurrency: foreign },
    });
  };

  return (
    <div ref={enter.ref} onKeyDown={enter.onKeyDown} className="flex flex-col gap-3">
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Your name"><Input autoFocus value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Priya Sharma" /></Field>
        <Field label="Business name" hint="Use your own name if you trade under it."><Input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma Design" /></Field>
        <Field label="What you do"><Input value={profession} onChange={e => setProfession(e.target.value)} placeholder="UI design, writing, consulting..." /></Field>
        <Field label="Your emirate" hint="Where your business is registered. Used on your VAT return.">
          <Select value={state} onChange={e => setState(e.target.value)}>
            <option value="">Choose</option>
            {EMIRATES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Your books start on" hint="Usually 1 January, the start of your financial year."><Input type="date" value={fyStart} onChange={e => setFyStart(e.target.value)} /></Field>
      </div>

      <div className="border-t border-slate-100 pt-3 grid sm:grid-cols-3 gap-3">
        <Field label="Your main bank account" hint="You can add more later."><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Emirates NBD Current A/c" /></Field>
        <Field label="Money in that account now"><NumberInput value={bankOpening} onValue={setBankOpening} placeholder="0.00" /></Field>
        <Field label="Cash in hand now"><NumberInput value={cashOpening} onValue={setCashOpening} placeholder="0.00" /></Field>
      </div>

      <div className="border-t border-slate-100 pt-2">
        <Toggle checked={vat} onChange={setVat} label="I am registered for UAE VAT" hint="Lets you add VAT (5%, 0% or exempt) to invoices and bills, and gives you your VAT 201 return figures." />
        {vat && <div className="max-w-sm mb-1 ml-6"><Field label="TRN (Tax Registration Number)"><Input value={trn} onChange={e => setTrn(e.target.value)} placeholder="15 digits" /></Field></div>}
        <Toggle checked={foreign} onChange={setForeign} label="I have clients outside the UAE" hint="Lets you invoice in other currencies." />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" data-accept onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
};

export const Welcome: React.FC = () => {
  const { createCompany, openSample, importBackup, bootError } = useGate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importBackup(await file.text());
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 md:pt-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white mb-2"><Building2 className="w-5 h-5" /></div>
          <h1 className="text-2xl font-bold">Set up your freelance books</h1>
          <p className="hint mt-1">It takes a minute, and you can change any of it later. Your accounts are saved automatically.</p>
        </div>
        {(bootError || error) && <Notice tone="bad" className="mb-3">{bootError || error}</Notice>}
        <div className="card p-5">
          <NewBusinessForm onCreate={createCompany} />
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button className="btn" onClick={() => void openSample()}>Explore with sample data first</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 text-slate-500" /> Restore from a backup</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => void onFile(e)} aria-label="Backup file" />
        </div>
      </div>
    </div>
  );
};

export const LockScreen: React.FC = () => {
  const { unlock, companies, switchCompany } = useGate();
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);
  const attempt = async () => {
    const ok = await unlock(password);
    setWrong(!ok);
    if (!ok) setPassword('');
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-3"><Lock className="w-5 h-5 text-brand-700" /><h1 className="text-lg font-bold">These books are locked</h1></div>
        <Field label="Password">
          <Input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void attempt(); }} />
        </Field>
        {wrong && <p className="text-rose-700 mt-2">That password is not right.</p>}
        <button className="btn btn-primary w-full mt-3" onClick={() => void attempt()}>Open</button>
        {companies.length > 1 && (
          <div className="mt-3">
            <Field label="Or open another business">
              <Select value="" onChange={e => { if (e.target.value) void switchCompany(e.target.value); }}>
                <option value="">Choose</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </div>
  );
};
