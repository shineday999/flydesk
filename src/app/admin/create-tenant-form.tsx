'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateTenantForm() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, domain }),
      });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        setError(data.code ?? '建立失敗');
        return;
      }
      router.push(`/admin/tenants/${data.tenant.id}`);
      router.refresh();
    } catch {
      setError('建立失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="adm-grid">
        <div className="adm-field">
          <label className="adm-label" htmlFor="slug">
            Slug（網址用）
          </label>
          <input
            id="slug"
            className="adm-input"
            value={slug}
            placeholder="acme"
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="name">
            顯示名稱
          </label>
          <input
            id="name"
            className="adm-input"
            value={name}
            placeholder="Acme Air"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="domain">
            自訂網域（選填）
          </label>
          <input
            id="domain"
            className="adm-input"
            value={domain}
            placeholder="fly.example.com"
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p className="adm-muted" style={{ color: 'var(--adm-danger)', marginTop: 10 }}>
          {error}
        </p>
      ) : null}
      <button className="adm-btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? '建立中…' : '建立租戶'}
      </button>
    </form>
  );
}
