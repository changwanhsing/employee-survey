"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Employee = {
  employeeId: string;
  name: string;
  department: string;
};

type SearchResult = {
  found: boolean;
  employee?: Employee;
  error?: string;
};

export default function Home() {
  const [employeeId, setEmployeeId] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const trimmedId = employeeId.trim().toUpperCase();
    if (!trimmedId) {
      setResult({ found: false, error: "請輸入員工工號" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: trimmedId }),
      });
      const data: SearchResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ found: false, error: "伺服器發生錯誤，請稍後再試" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
              調查系統
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
              中秋月餅調查
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              請輸入您的員工工號查詢身份。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSearch}>
            <label className="block text-base font-medium text-slate-700" htmlFor="employeeId">
              員工工號
            </label>
            <input
              id="employeeId"
              name="employeeId"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="例如 A001"
              className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4 text-xl text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "查詢中..." : "查詢"}
            </button>
          </form>

          {result && (
            <div className="mt-6 rounded-2xl border p-4 text-center" role="status">
              {result.found && result.employee ? (
                <div className="space-y-4">
                  <p className="text-lg font-semibold text-slate-900">
                    歡迎，{result.employee.name} ({result.employee.department})
                  </p>
                  <Link
                    href={`/survey?employeeId=${encodeURIComponent(
                      result.employee.employeeId
                    )}&name=${encodeURIComponent(result.employee.name)}&department=${encodeURIComponent(
                      result.employee.department
                    )}`}
                    className="mx-auto mt-2 inline-flex rounded-2xl bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
                  >
                    下一步
                  </Link>
                </div>
              ) : (
                <p className="text-base font-medium text-red-600">
                  {result.error || "找不到此工號,請確認後重新輸入"}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
