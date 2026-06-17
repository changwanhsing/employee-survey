"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { mooncakeItems } from "@/src/data/mooncakeItems";

type Submission = {
  employeeId: string;
  name: string;
  department: string;
  items: { itemId: string; quantity: number }[];
  submittedAt: string;
};

type Employee = {
  employeeId: string;
  name: string;
  department: string;
};

function itemName(itemId: string) {
  return mooncakeItems.find((item) => item.id === itemId)?.name ?? itemId;
}

type ImportResponse = {
  ok: boolean;
  imported?: number;
  warnings?: string[];
  error?: string;
  details?: string[];
};

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const loadData = useCallback(() => {
    return Promise.all([
      fetch("/api/submit").then((response) => {
        if (!response.ok) throw new Error("讀取失敗");
        return response.json();
      }),
      fetch("/api/employees").then((response) => {
        if (!response.ok) throw new Error("讀取失敗");
        return response.json();
      }),
    ])
      .then(
        ([submitData, employeeData]: [
          { submissions: Submission[] },
          { employees: Employee[] }
        ]) => {
          setSubmissions(submitData.submissions);
          setEmployees(employeeData.employees);
        }
      )
      .catch(() => setError("讀取資料失敗，請稍後再試。"));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 允許重覆選同一檔
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });
      const data: ImportResponse = await response.json();
      setImportResult(data);
      if (data.ok) {
        await loadData();
      }
    } catch {
      setImportResult({ ok: false, error: "上傳失敗，請稍後再試。" });
    } finally {
      setImporting(false);
    }
  }

  const totals = mooncakeItems.map((item) => ({
    item,
    total:
      submissions?.reduce((sum, submission) => {
        const found = submission.items.find((entry) => entry.itemId === item.id);
        return sum + (found?.quantity ?? 0);
      }, 0) ?? 0,
  }));

  const submittedIds = new Set(submissions?.map((s) => s.employeeId) ?? []);

  const departmentStats =
    employees && submissions
      ? Array.from(new Set(employees.map((e) => e.department))).map((department) => {
          const deptEmployees = employees.filter((e) => e.department === department);
          const submittedCount = deptEmployees.filter((e) =>
            submittedIds.has(e.employeeId.toUpperCase())
          ).length;
          return {
            department,
            total: deptEmployees.length,
            submittedCount,
          };
        })
      : [];

  const unsubmitted =
    employees && submissions
      ? employees.filter((e) => !submittedIds.has(e.employeeId.toUpperCase()))
      : [];

  const departments = employees
    ? Array.from(new Set(employees.map((e) => e.department)))
    : [];

  // 品項 × 部門 交叉統計：crossTab[department][itemId] = 數量
  const crossTab: Record<string, Record<string, number>> = {};
  for (const department of departments) {
    crossTab[department] = Object.fromEntries(mooncakeItems.map((item) => [item.id, 0]));
  }
  for (const submission of submissions ?? []) {
    const deptTab = crossTab[submission.department];
    if (!deptTab) continue;
    for (const entry of submission.items) {
      if (entry.itemId in deptTab) {
        deptTab[entry.itemId] += entry.quantity;
      }
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSubmissions = (submissions ?? [])
    .filter((submission) => {
      if (!normalizedQuery) return true;
      return (
        submission.employeeId.toLowerCase().includes(normalizedQuery) ||
        submission.name.toLowerCase().includes(normalizedQuery) ||
        submission.department.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1" />
          <div className="flex-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            調查系統
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
            送出紀錄管理
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/api/submit/export"
              className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              匯出 CSV
            </a>
            <label className="inline-flex cursor-pointer rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              {importing ? "匯入中..." : "匯入員工 Excel"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importing}
                onChange={handleImport}
              />
            </label>
          </div>
          </div>
          <div className="flex flex-1 justify-end">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              員工調查表
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {importResult && (
          <div
            className={`mb-6 rounded-3xl border p-5 ${
              importResult.ok
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {importResult.ok ? (
              <p className="font-semibold">
                已匯入 {importResult.imported} 筆員工資料，員工名冊已更新。
              </p>
            ) : (
              <p className="font-semibold">{importResult.error ?? "匯入失敗。"}</p>
            )}
            {(importResult.warnings?.length || importResult.details?.length) ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {[...(importResult.warnings ?? []), ...(importResult.details ?? [])].map(
                  (msg, index) => (
                    <li key={index}>{msg}</li>
                  )
                )}
              </ul>
            ) : null}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {!error && (submissions === null || employees === null) && (
          <p className="text-center text-slate-600">載入中...</p>
        )}

        {submissions !== null && employees !== null && (
          <>
            <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                品項總計（共 {submissions.length} 人送出）
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {totals.map(({ item, total }) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center"
                  >
                    <p className="text-sm text-slate-600">{item.name}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                各部門送出進度（共 {employees.length} 人，已送出 {submittedIds.size} 人）
              </h2>
              <div className="space-y-3">
                {departmentStats.map(({ department, total, submittedCount }) => {
                  const percent = total === 0 ? 0 : Math.round((submittedCount / total) * 100);
                  return (
                    <div key={department}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{department}</span>
                        <span className="text-slate-500">
                          {submittedCount}/{total}（{percent}%）
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                未送出名單（{unsubmitted.length} 人）
              </h2>
              {unsubmitted.length === 0 ? (
                <p className="text-sm text-slate-500">所有員工皆已送出。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unsubmitted.map((employee) => (
                    <span
                      key={employee.employeeId}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800"
                    >
                      {employee.name}
                      <span className="text-amber-500">
                        （{employee.employeeId}・{employee.department}）
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8 overflow-x-auto rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                品項 × 部門 數量統計
              </h2>
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="text-slate-700">
                  <tr className="border-b border-zinc-200">
                    <th className="px-3 py-2 text-left font-semibold">部門</th>
                    {mooncakeItems.map((item) => (
                      <th key={item.id} className="px-3 py-2 font-semibold">
                        {item.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => {
                    const rowTotal = mooncakeItems.reduce(
                      (sum, item) => sum + crossTab[department][item.id],
                      0
                    );
                    return (
                      <tr key={department} className="border-b border-zinc-100">
                        <td className="px-3 py-2 text-left font-medium text-slate-900">
                          {department}
                        </td>
                        {mooncakeItems.map((item) => (
                          <td key={item.id} className="px-3 py-2 text-slate-700">
                            {crossTab[department][item.id]}
                          </td>
                        ))}
                        <td className="px-3 py-2 font-semibold text-slate-900">{rowTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300">
                    <td className="px-3 py-2 text-left font-semibold text-slate-900">總計</td>
                    {mooncakeItems.map((item) => (
                      <td key={item.id} className="px-3 py-2 font-semibold text-slate-900">
                        {departments.reduce(
                          (sum, department) => sum + crossTab[department][item.id],
                          0
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 font-bold text-slate-900">
                      {departments.reduce(
                        (sum, department) =>
                          sum +
                          mooncakeItems.reduce(
                            (s, item) => s + crossTab[department][item.id],
                            0
                          ),
                        0
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋工號、姓名或部門"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/50">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">工號</th>
                    <th className="px-4 py-3 font-semibold">姓名</th>
                    <th className="px-4 py-3 font-semibold">部門</th>
                    <th className="px-4 py-3 font-semibold">選擇品項</th>
                    <th className="px-4 py-3 font-semibold">送出時間</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        {submissions.length === 0 ? "尚無送出紀錄" : "查無符合的紀錄"}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((submission) => (
                        <tr key={submission.employeeId} className="border-t border-zinc-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {submission.employeeId}
                          </td>
                          <td className="px-4 py-3">{submission.name}</td>
                          <td className="px-4 py-3">{submission.department}</td>
                          <td className="px-4 py-3">
                            {submission.items.length === 0
                              ? "未選擇任何品項"
                              : submission.items
                                  .map((entry) => `${itemName(entry.itemId)} x${entry.quantity}`)
                                  .join("、")}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(submission.submittedAt).toLocaleString("zh-TW")}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
