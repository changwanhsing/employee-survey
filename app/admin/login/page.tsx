"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "登入失敗");
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">後台管理登入</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              管理員密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="請輸入管理員密碼"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-2xl bg-slate-900 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
