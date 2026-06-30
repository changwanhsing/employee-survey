"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

type Employee = {
  employeeId: string;
  name: string;
  department: string;
  email?: string;
};

const inputCls =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", department: "", email: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ employeeId: "", name: "", department: "", email: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string; details?: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ employeeId: string; name: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter((e) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      e.employeeId.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q)
    );
  });

  function startEdit(emp: Employee) {
    setEditingId(emp.employeeId);
    setEditForm({ name: emp.name, department: emp.department, email: emp.email ?? "" });
    setEditError(null);
  }

  async function handleSaveEdit(employeeId: string) {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/employees/${encodeURIComponent(deleteTarget.employeeId)}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  }

  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAddForm({ employeeId: "", name: "", department: "", email: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setAdding(false);
    }
  }

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["工號", "姓名", "部門", "Email"],
      ["10001", "王小明", "業務部", "ming@company.com"],
      ["10002", "陳大華", "人事部", "hua@company.com"],
    ]);
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "員工名冊");
    XLSX.writeFile(wb, "員工名冊匯入範本.xlsx");
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPendingImportFile(file);
  }

  async function confirmImport() {
    if (!pendingImportFile) return;
    const file = pendingImportFile;
    setPendingImportFile(null);
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/employees/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ ok: true, msg: `已匯入 ${data.imported} 筆員工資料。`, details: [...(data.warnings ?? []), ...(data.details ?? [])] });
        load();
      } else {
        setImportResult({ ok: false, msg: data.error ?? "匯入失敗。" });
      }
    } catch {
      setImportResult({ ok: false, msg: "上傳失敗，請稍後再試。" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      {/* 匯入確認 Dialog */}
      {pendingImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">確認匯入員工名冊？</h3>
            <p className="mb-1 text-sm text-slate-600">
              檔案：<span className="font-medium">{pendingImportFile.name}</span>
            </p>
            <p className="mb-5 text-sm text-red-600">
              ⚠️ 匯入將會覆蓋現有的全部 {employees.length} 筆員工資料，此操作無法還原。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmImport}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-base font-semibold text-white transition hover:bg-red-700"
              >
                確認覆蓋匯入
              </button>
              <button
                type="button"
                onClick={() => setPendingImportFile(null)}
                className="flex-1 rounded-2xl border border-zinc-300 bg-white py-3 text-base font-medium text-slate-700 transition hover:bg-zinc-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">確認刪除員工？</h3>
            <p className="mb-5 text-sm text-slate-600">
              即將刪除 <span className="font-semibold text-slate-900">「{deleteTarget.name}」（{deleteTarget.employeeId}）</span>，此操作無法還原。
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={confirmDelete} className="flex-1 rounded-2xl bg-red-600 py-3 text-base font-semibold text-white transition hover:bg-red-700">
                確認刪除
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-2xl border border-zinc-300 bg-white py-3 text-base font-medium text-slate-700 transition hover:bg-zinc-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← 返回管理後台
            </Link>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">調查系統</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">員工名冊</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              下載範本
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              {importing ? "匯入中..." : "匯入 Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importing} onChange={handleImport} />
            </label>
            <button
              type="button"
              onClick={() => { setShowAdd(true); setAddError(null); }}
              className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              + 新增員工
            </button>
          </div>
        </div>

        {/* 匯入結果 */}
        {importResult && (
          <div className={`mb-6 rounded-3xl border p-4 ${importResult.ok ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-red-100 bg-red-50 text-red-700"}`}>
            <p className="font-semibold">{importResult.msg}</p>
            {importResult.details && importResult.details.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {importResult.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* 新增表單 */}
        {showAdd && (
          <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">新增員工</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">工號 *</label>
                <input type="text" value={addForm.employeeId} onChange={(e) => setAddForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls} placeholder="例：10001" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">姓名 *</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="王小明" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">部門 *</label>
                <input type="text" value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))} className={inputCls} placeholder="業務部" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email *</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="example@company.com" />
              </div>
            </div>
            {addError && <p className="mt-2 text-sm text-red-500">{addError}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleAdd} disabled={adding} className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
                {adding ? "新增中..." : "確認新增"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-2xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-zinc-50">
                取消
              </button>
            </div>
          </div>
        )}

        {/* 搜尋 + 表格 */}
        <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/50">
          <div className="border-b border-zinc-200 p-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋工號、姓名、部門或 Email"
              className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-2 text-xs text-slate-400">
              {query ? `顯示 ${filtered.length} / ${employees.length} 筆` : `共 ${employees.length} 名員工`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-zinc-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">工號</th>
                  <th className="px-4 py-3 font-semibold">姓名</th>
                  <th className="px-4 py-3 font-semibold">部門</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">載入中...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      {query ? "查無符合的員工" : "尚無員工資料"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) =>
                    editingId === emp.employeeId ? (
                      <tr key={emp.employeeId} className="border-t border-zinc-100 bg-blue-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{emp.employeeId}</td>
                        <td className="px-4 py-2">
                          <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} className={inputCls} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleSaveEdit(emp.employeeId)} disabled={saving} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                                {saving ? "儲存中" : "儲存"}
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-zinc-50">
                                取消
                              </button>
                            </div>
                            {editError && <p className="text-xs text-red-500">{editError}</p>}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={emp.employeeId} className="border-t border-zinc-100 hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{emp.employeeId}</td>
                        <td className="px-4 py-3">{emp.name}</td>
                        <td className="px-4 py-3">{emp.department}</td>
                        <td className="px-4 py-3 text-slate-500">{emp.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEdit(emp)} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-50">
                              編輯
                            </button>
                            <button type="button" onClick={() => setDeleteTarget({ employeeId: emp.employeeId, name: emp.name })} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
