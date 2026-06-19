"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Employee = {
  employeeId: string;
  name: string;
  department: string;
  email?: string;
};

type Submission = {
  employeeId: string;
};

export default function UnsubmittedPage() {
  const [unsubmitted, setUnsubmitted] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/submit").then((r) => r.json()),
    ]).then(([empData, subData]) => {
      const employees: Employee[] = empData.employees ?? [];
      const submittedIds = new Set<string>(
        (subData.submissions ?? []).map((s: Submission) => s.employeeId.toUpperCase())
      );
      setUnsubmitted(employees.filter((e) => !submittedIds.has(e.employeeId.toUpperCase())));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = unsubmitted.filter((e) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      e.employeeId.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  const departments = Array.from(new Set(filtered.map((e) => e.department))).sort();

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← 返回管理後台
          </Link>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">調查系統</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">未送出名單</h1>
          </div>
          <div className="w-32" />
        </div>

        {loading ? (
          <p className="text-center text-slate-500">載入中...</p>
        ) : (
          <>
            <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/50">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋工號、姓名或部門"
                className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <p className="mt-2 text-xs text-slate-400">
                {query
                  ? `顯示 ${filtered.length} / ${unsubmitted.length} 筆未送出`
                  : `共 ${unsubmitted.length} 人尚未送出`}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center text-emerald-700">
                <p className="text-lg font-semibold">{query ? "查無符合的紀錄" : "所有員工皆已送出！"}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {departments.map((dept) => {
                  const members = filtered.filter((e) => e.department === dept);
                  return (
                    <div key={dept} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/50">
                      <h2 className="mb-3 text-base font-semibold text-slate-900">
                        {dept}
                        <span className="ml-2 text-sm font-normal text-slate-400">（{members.length} 人）</span>
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {members.map((e) => (
                          <span
                            key={e.employeeId}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800"
                          >
                            {e.name}
                            <span className="text-amber-500">（{e.employeeId}）</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
