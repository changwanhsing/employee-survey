"use client";

import { useCallback, useEffect, useState } from "react";
import type { SurveyConfig, SurveyItem, SurveyMeta } from "@/src/lib/surveyConfig";

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
  email?: string;
};

function itemName(itemId: string, surveyItems: SurveyItem[]) {
  return surveyItems.find((item) => item.id === itemId)?.name ?? itemId;
}

// ── Employee Manager ────────────────────────────────────────────────────────

function EmployeeManager({
  employees,
  onChanged,
}: {
  employees: Employee[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", department: "", email: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ employeeId: "", name: "", department: "", email: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
      onChanged();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(employeeId: string, name: string) {
    if (!confirm(`確定要刪除員工「${name}」（${employeeId}）？`)) return;
    await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, { method: "DELETE" });
    onChanged();
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
      onChanged();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setAdding(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

  return (
    <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">員工名冊（{employees.length} 人）</h2>
        <button
          type="button"
          onClick={() => { setShowAdd((v) => !v); setAddError(null); }}
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
        >
          + 新增員工
        </button>
      </div>

      {/* 新增表單 */}
      {showAdd && (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">新增員工</p>
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
          {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleAdd} disabled={adding} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
              {adding ? "新增中..." : "確認新增"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-zinc-50">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 搜尋 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋工號、姓名、部門或 Email"
        className="mb-4 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />

      <div className="overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">工號</th>
              <th className="px-4 py-3 font-semibold">姓名</th>
              <th className="px-4 py-3 font-semibold">部門</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
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
                          <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-50">
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
                        <button type="button" onClick={() => handleDelete(emp.employeeId, emp.name)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
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
      {filtered.length > 0 && query && (
        <p className="mt-2 text-xs text-slate-400">顯示 {filtered.length} / {employees.length} 筆</p>
      )}
    </div>
  );
}

// ── Item Image Uploader ─────────────────────────────────────────────────────

function ItemImageUploader({
  onUploaded,
  hasImage,
}: {
  onUploaded: (url: string) => void;
  hasImage: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/survey-config/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "上傳失敗");
      onUploaded(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-zinc-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {uploading ? "上傳中..." : hasImage ? "更換圖片" : "上傳圖片"}
        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-slate-400">JPG / PNG，最大 2MB</p>
    </div>
  );
}

// ── Survey Config Editor ────────────────────────────────────────────────────

function SurveyConfigEditor({
  surveyId,
  initial,
  onSaved,
  onBack,
}: {
  surveyId: string;
  initial: SurveyConfig & { surveyName: string };
  onSaved: () => void;
  onBack: () => void;
}) {
  const [surveyName, setSurveyName] = useState(initial.surveyName);
  const [title, setTitle] = useState(initial.title);
  const [deadline, setDeadline] = useState(
    initial.deadline ? initial.deadline.slice(0, 16) : ""
  );
  const [items, setItems] = useState<SurveyItem[]>(initial.items);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, name: "", description: "", maxQuantity: 5 },
    ]);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof SurveyItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyName, title, items, deadline: deadline || null }),
      });
      if (!res.ok) throw new Error();
      setSaveResult({ ok: true, msg: "儲存成功。" });
      onSaved();
    } catch {
      setSaveResult({ ok: false, msg: "儲存失敗，請稍後再試。" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 transition hover:text-slate-700">
          ← 返回活動列表
        </button>
        <h2 className="text-lg font-semibold text-slate-900">編輯活動</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">活動名稱（內部辨識用）</label>
          <input
            type="text"
            value={surveyName}
            onChange={(e) => setSurveyName(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="例：2026年中秋月餅"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">調查標題（員工看到的）</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="例：月餅品項選擇"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">收件截止時間</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <p className="mt-1 text-xs text-slate-500">留空表示不設截止日</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">品項列表</label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
            >
              + 新增品項
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-500">品項 {index + 1}</span>
                  <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-500 transition hover:text-red-700">
                    刪除
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">名稱 *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      placeholder="例：蛋黃酥"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">最大數量</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.maxQuantity}
                      onChange={(e) => updateItem(index, "maxQuantity", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">說明（選填）</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      placeholder="簡短描述"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">品項圖片（選填）</label>
                    <div className="flex items-center gap-3">
                      {item.imageUrl && (
                        <div className="relative h-16 w-16 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl border border-zinc-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => updateItem(index, "imageUrl", "")}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <ItemImageUploader onUploaded={(url) => updateItem(index, "imageUrl", url)} hasImage={!!item.imageUrl} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 p-4 text-center text-sm text-slate-400">
                尚無品項，點「新增品項」開始設計
              </p>
            )}
          </div>
        </div>

        {saveResult && (
          <div className={`rounded-2xl border p-3 text-sm font-medium ${saveResult.ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>
            {saveResult.msg}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "儲存中..." : "儲存設定"}
        </button>
      </div>
    </div>
  );
}

// ── Survey List ─────────────────────────────────────────────────────────────

function SurveyList({
  surveys,
  onEdit,
  onActivate,
  onDelete,
  onCreate,
}: {
  surveys: SurveyMeta[];
  onEdit: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">活動管理</h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
        >
          + 新增活動
        </button>
      </div>

      {creating && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="活動名稱，例：2026年中秋月餅"
            className="flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            建立
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
          >
            取消
          </button>
        </div>
      )}

      {surveys.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-4">尚無活動，點「新增活動」建立第一個。</p>
      ) : (
        <div className="space-y-2">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                survey.isActive
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {survey.isActive && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      上架中
                    </span>
                  )}
                  <span className="font-medium text-slate-900 truncate">{survey.surveyName || survey.title}</span>
                </div>
                {survey.updatedAt && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    更新於 {new Date(survey.updatedAt).toLocaleString("zh-TW")}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(survey.id)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-zinc-50"
                >
                  編輯
                </button>
                {!survey.isActive && (
                  <button
                    type="button"
                    onClick={() => onActivate(survey.id)}
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    上架
                  </button>
                )}
                {!survey.isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`確定要刪除「${survey.surveyName || survey.title}」嗎？`)) {
                        onDelete(survey.id);
                      }
                    }}
                    className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  >
                    刪除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [surveys, setSurveys] = useState<SurveyMeta[]>([]);
  const [activeSurveyItems, setActiveSurveyItems] = useState<SurveyItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<(SurveyConfig & { surveyName: string }) | null>(null);

  const loadSurveys = useCallback(async () => {
    const res = await fetch("/api/admin/surveys");
    const data = await res.json();
    setSurveys(data.surveys ?? []);
  }, []);

  const loadData = useCallback(() => {
    return Promise.all([
      fetch("/api/submit").then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      }),
      fetch("/api/employees").then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      }),
      fetch("/api/survey-config").then((res) => res.json()),
      fetch("/api/admin/surveys").then((res) => res.json()),
    ])
      .then(([submitData, employeeData, configData, surveysData]) => {
        setSubmissions(submitData.submissions);
        setEmployees(employeeData.employees);
        setActiveSurveyItems(configData.items ?? []);
        setSurveys(surveysData.surveys ?? []);
      })
      .catch(() => setError("讀取資料失敗，請稍後再試。"));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleEdit(id: string) {
    const res = await fetch(`/api/admin/surveys/${id}`);
    const data = await res.json();
    setEditingConfig(data);
    setEditingSurveyId(id);
  }

  async function handleActivate(id: string) {
    await fetch(`/api/admin/surveys/${id}/activate`, { method: "POST" });
    await loadData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/surveys/${id}`, { method: "DELETE" });
    await loadSurveys();
  }

  async function handleCreate(surveyName: string) {
    const res = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyName }),
    });
    const data = await res.json();
    if (data.ok) {
      await loadSurveys();
      await handleEdit(data.id);
    }
  }

  const surveyItems = activeSurveyItems;

  const totals = surveyItems.map((item) => ({
    item,
    total: submissions?.reduce((sum, s) => {
      const found = s.items.find((e) => e.itemId === item.id);
      return sum + (found?.quantity ?? 0);
    }, 0) ?? 0,
  }));

  const submittedIds = new Set(submissions?.map((s) => s.employeeId) ?? []);

  const departmentStats = employees && submissions
    ? Array.from(new Set(employees.map((e) => e.department))).map((department) => {
        const deptEmployees = employees.filter((e) => e.department === department);
        const submittedCount = deptEmployees.filter((e) => submittedIds.has(e.employeeId.toUpperCase())).length;
        return { department, total: deptEmployees.length, submittedCount };
      })
    : [];

  const unsubmitted = employees && submissions
    ? employees.filter((e) => !submittedIds.has(e.employeeId.toUpperCase()))
    : [];

  const departments = employees ? Array.from(new Set(employees.map((e) => e.department))) : [];

  const crossTab: Record<string, Record<string, number>> = {};
  for (const department of departments) {
    crossTab[department] = Object.fromEntries(surveyItems.map((item) => [item.id, 0]));
  }
  for (const submission of submissions ?? []) {
    const deptTab = crossTab[submission.department];
    if (!deptTab) continue;
    for (const entry of submission.items) {
      if (entry.itemId in deptTab) deptTab[entry.itemId] += entry.quantity;
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSubmissions = (submissions ?? [])
    .filter((s) => {
      if (!normalizedQuery) return true;
      return (
        s.employeeId.toLowerCase().includes(normalizedQuery) ||
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.department.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-slate-900 text-center">員工調查系統後台管理</h1>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <a href="/admin/employees" className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                員工名冊
              </a>
<a href="/admin/unsubmitted" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                未送出名單
              </a>
              <a href="/api/submit/export" className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                匯出調查結果 Excel
              </a>
            </div>
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              員工調查表
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* 活動管理 */}
        {editingSurveyId && editingConfig ? (
          <SurveyConfigEditor
            surveyId={editingSurveyId}
            initial={editingConfig}
            onSaved={() => { loadData(); }}
            onBack={() => { setEditingSurveyId(null); setEditingConfig(null); }}
          />
        ) : (
          <SurveyList
            surveys={surveys}
            onEdit={handleEdit}
            onActivate={handleActivate}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        )}

        {!error && (submissions === null || employees === null) && (
          <p className="text-center text-slate-600">載入中...</p>
        )}

        {submissions !== null && employees !== null && (
          <>
            {surveyItems.length > 0 && (
              <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">品項總計（共 {submissions.length} 人送出）</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {totals.map(({ item, total }) => (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                      <p className="text-sm text-slate-600">{item.name}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                        <span className="text-slate-500">{submittedCount}/{total}（{percent}%）</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {surveyItems.length > 0 && (
              <div className="mb-8 overflow-x-auto rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/50">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">品項 × 部門 數量統計</h2>
                <table className="w-full min-w-[640px] text-right text-sm">
                  <thead className="text-slate-700">
                    <tr className="border-b border-zinc-200">
                      <th className="px-3 py-2 text-left font-semibold">部門</th>
                      {surveyItems.map((item) => <th key={item.id} className="px-3 py-2 font-semibold">{item.name}</th>)}
                      <th className="px-3 py-2 font-semibold">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((department) => {
                      const rowTotal = surveyItems.reduce((sum, item) => sum + (crossTab[department]?.[item.id] ?? 0), 0);
                      return (
                        <tr key={department} className="border-b border-zinc-100">
                          <td className="px-3 py-2 text-left font-medium text-slate-900">{department}</td>
                          {surveyItems.map((item) => <td key={item.id} className="px-3 py-2 text-slate-700">{crossTab[department]?.[item.id] ?? 0}</td>)}
                          <td className="px-3 py-2 font-semibold text-slate-900">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-300">
                      <td className="px-3 py-2 text-left font-semibold text-slate-900">總計</td>
                      {surveyItems.map((item) => (
                        <td key={item.id} className="px-3 py-2 font-semibold text-slate-900">
                          {departments.reduce((sum, d) => sum + (crossTab[d]?.[item.id] ?? 0), 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-bold text-slate-900">
                        {departments.reduce((sum, d) => sum + surveyItems.reduce((s, item) => s + (crossTab[d]?.[item.id] ?? 0), 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                        <td className="px-4 py-3 font-medium text-slate-900">{submission.employeeId}</td>
                        <td className="px-4 py-3">{submission.name}</td>
                        <td className="px-4 py-3">{submission.department}</td>
                        <td className="px-4 py-3">
                          {submission.items.length === 0
                            ? "未選擇任何品項"
                            : submission.items.map((entry) => `${itemName(entry.itemId, surveyItems)} x${entry.quantity}`).join("、")}
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
