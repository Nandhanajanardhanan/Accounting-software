// The login in front of the books when they are shared over a link. Checked by the server, not the browser.
import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { authApi } from '../store/api';
import { Field, Input, Notice } from '../ui/kit';

const LoginScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('Enter your user name and password.');
    setBusy(true);
    setError('');
    try {
      await authApi.login(username.trim(), password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={e => void submit(e)} className="card p-6 w-full max-w-sm flex flex-col gap-3">
        <div className="text-center mb-1">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white mb-2"><BookOpen className="w-5 h-5" /></div>
          <h1 className="text-xl font-bold">Sign in to your books</h1>
        </div>
        {error && <Notice tone="bad">{error}</Notice>}
        <Field label="User name"><Input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></Field>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <button type="submit" className="btn btn-primary justify-center" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
};

/** Shows the login first when the server asks for one; otherwise goes straight to the books. */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'checking' | 'login' | 'in'>('checking');
  useEffect(() => {
    authApi.me()
      .then(me => setState(me.required && !me.user ? 'login' : 'in'))
      // No server (for example opened as a plain file): carry on, the books handle that themselves.
      .catch(() => setState('in'));
  }, []);
  if (state === 'checking') return <div className="h-screen flex items-center justify-center hint">Opening your books...</div>;
  if (state === 'login') return <LoginScreen onDone={() => setState('in')} />;
  return <>{children}</>;
};
