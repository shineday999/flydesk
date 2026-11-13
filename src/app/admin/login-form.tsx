'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        setError(data.code === 'RATE_LIMITED' ? '嘗試過多，請稍後再試' : '密碼錯誤');
        return;
      }
      router.push('/admin/tenants');
      router.refresh();
    } catch {
      setError('登入失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14 }}>
      <div className="adm-field">
        <label className="adm-label" htmlFor="pw">
          管理密碼
        </label>
        <input
          id="pw"
          className="adm-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <p className="adm-muted" style={{ color: 'var(--adm-danger)' }}>{error}</p> : null}
      <button className="adm-btn" type="submit" disabled={busy} style={{ marginTop: 12, width: '100%' }}>
        {busy ? '登入中…' : '登入'}
      </button>
    </form>
  );
}
