"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SurveyConfig } from "@/src/lib/surveyConfig";

type LockedItem = { itemId: string; quantity: number };

export default function SurveyPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hasPreviousSubmission, setHasPreviousSubmission] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [deadlineExpired, setDeadlineExpired] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setEmployeeId(data.employeeId);
          setEmployeeName(data.name);
          setDepartment(data.department);
          setSessionReady(true);
        } else {
          window.location.href = "/";
        }
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  // Load survey config
  useEffect(() => {
    fetch("/api/survey-config")
      .then((res) => res.json())
      .then((data: SurveyConfig) => {
        setConfig(data);
        setQuantities(Object.fromEntries(data.items.map((item) => [item.id, 0])));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionReady || !employeeId) return;
    Promise.all([
      fetch(`/api/submit/check?employeeId=${encodeURIComponent(employeeId)}`).then((res) =>
        res.json()
      ),
      fetch("/api/deadline").then((res) => res.json()),
    ])
      .then(
        ([checkData, deadlineData]: [
          { submitted: boolean; items?: LockedItem[] },
          { deadline: string | null; expired: boolean }
        ]) => {
          if (checkData.submitted) {
            setHasPreviousSubmission(true);
            setQuantities((current) => {
              const next = { ...current };
              for (const entry of checkData.items ?? []) {
                next[entry.itemId] = entry.quantity;
              }
              return next;
            });
          }
          setDeadlineExpired(deadlineData.expired);
          setDeadline(deadlineData.deadline);
        }
      )
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [employeeId, sessionReady]);

  const items = config?.items ?? [];

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
        .filter(({ quantity }) => quantity > 0),
    [quantities, items]
  );

  const handleQuantityChange = (itemId: string, delta: number) => {
    const maxQty = items.find((i) => i.id === itemId)?.maxQuantity ?? 5;
    setQuantities((current) => {
      const nextValue = Math.min(maxQty, Math.max(0, (current[itemId] ?? 0) + delta));
      return { ...current, [itemId]: nextValue };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          name: employeeName,
          department,
          quantities,
        }),
      });
      if (response.status === 403) {
        setDeadlineExpired(true);
        return;
      }
      if (!response.ok) {
        throw new Error("送出失敗");
      }
      setHasPreviousSubmission(true);
      setJustSubmitted(true);
    } catch {
      setSubmitError("送出失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  const showLockedSummary = deadlineExpired && hasPreviousSubmission;
  const showDeadlineBlocked = deadlineExpired && !hasPreviousSubmission;
  const showConfirmation = justSubmitted && !deadlineExpired;
  const loading = !sessionReady || config === null || checkingStatus;

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto min-h-screen max-w-md px-4 py-8 sm:px-5 sm:py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
              調查系統
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
              {config?.title ?? "載入中..."}
            </h1>
          </div>

          {!sessionReady ? (
            <p className="text-center text-slate-600">載入中...</p>
          ) : showDeadlineBlocked ? (
            <div className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-800">
              <p className="font-semibold">已超過收件期限，無法送出。</p>
              {deadline && (
                <p className="text-sm">
                  收件截止時間：{new Date(deadline).toLocaleString("zh-TW")}
                </p>
              )}
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
              >
                返回首頁
              </Link>
            </div>
          ) : showLockedSummary ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900">已超過收件期限</h2>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left text-slate-900">
                {selectedItems.length === 0 ? (
                  <p className="text-base font-semibold">
                    {employeeName}（{department}）未選擇任何品項
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base font-semibold">
                      {employeeName}（{department}）已選擇：
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {selectedItems.map(({ item, quantity }) => `${item.name} x${quantity}`).join("、")}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500">已過收件期限，無法再修改。</p>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700"
              >
                返回首頁
              </Link>
            </div>
          ) : showConfirmation ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900">送出成功！</h2>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left text-slate-900">
                {selectedItems.length === 0 ? (
                  <p className="text-base font-semibold">
                    {employeeName}（{department}）未選擇任何品項
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base font-semibold">
                      {employeeName}（{department}）已選擇：
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {selectedItems.map(({ item, quantity }) => `${item.name} x${quantity}`).join("、")}
                    </p>
                  </div>
                )}
              </div>
              {deadline && (
                <p className="text-sm text-slate-500">
                  截止前（{new Date(deadline).toLocaleString("zh-TW")}）仍可修改您的選擇。
                </p>
              )}
              <button
                type="button"
                onClick={() => setJustSubmitted(false)}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-lg font-semibold text-slate-900 ring-1 ring-inset ring-zinc-300 transition hover:bg-zinc-50"
              >
                修改我的選擇
              </button>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700"
              >
                返回首頁
              </Link>
            </div>
          ) : loading ? (
            <p className="text-center text-slate-600">載入中...</p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-base text-slate-700">
                  您好，<span className="font-semibold">{employeeName}</span>（
                  <span className="font-semibold">{department}</span>），請選擇您要的品項（可不選）
                </p>
                {hasPreviousSubmission && (
                  <p className="mt-2 text-sm text-slate-500">
                    您已送出過，以下是您先前的選擇，可修改後重新送出。
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-100">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="mb-4 h-40 w-full rounded-2xl object-cover"
                      />
                    )}
                    <div className="mb-3">
                      <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
                      {item.description && (
                        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={(quantities[item.id] ?? 0) <= 0}
                        >
                          -
                        </button>
                        <span className="mx-4 min-w-[2rem] text-center text-lg font-semibold text-slate-900">
                          {quantities[item.id] ?? 0}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={(quantities[item.id] ?? 0) >= item.maxQuantity}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-slate-500">最多 {item.maxQuantity} 個</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "送出中..." : hasPreviousSubmission ? "重新送出" : "送出"}
              </button>

              {submitError && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
                  <p className="font-semibold">{submitError}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
