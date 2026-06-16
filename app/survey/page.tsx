"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { mooncakeItems } from "@/src/data/mooncakeItems";
import Link from "next/link";

export default function SurveyPage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId") ?? "";
  const employeeName = searchParams.get("name") ?? "";
  const department = searchParams.get("department") ?? "";

  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(mooncakeItems.map((item) => [item.id, 0]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () =>
      mooncakeItems
        .map((item) => ({ item, quantity: quantities[item.id] }))
        .filter(({ quantity }) => quantity > 0),
    [quantities]
  );

  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities((current) => {
      const nextValue = Math.min(5, Math.max(0, (current[itemId] ?? 0) + delta));
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
      if (!response.ok) {
        throw new Error("送出失敗");
      }
      setSubmitted(true);
    } catch {
      setSubmitError("送出失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  const hasEmployeeInfo = employeeId && employeeName && department;

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto min-h-screen max-w-md px-5 py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
              調查系統
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
              月餅品項選擇
            </h1>
          </div>

          {!hasEmployeeInfo ? (
            <div className="space-y-4 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
              <p className="font-semibold">無效的員工資料。</p>
              <p>請由首頁重新查詢後進入。</p>
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
              >
                返回首頁
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-base text-slate-700">
                  您好，<span className="font-semibold">{employeeName}</span>(
                  <span className="font-semibold">{department}</span>), 請選擇您要的月餅(可不選)
                </p>
              </div>

              <div className="space-y-4">
                {mooncakeItems.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-100">
                    <div className="mb-3">
                      <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={quantities[item.id] <= 0}
                        >
                          -
                        </button>
                        <span className="mx-4 min-w-[2rem] text-center text-lg font-semibold text-slate-900">
                          {quantities[item.id]}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={quantities[item.id] >= 5}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-slate-500">最多 5 個</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "送出中..." : "送出"}
              </button>

              {submitError && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
                  <p className="font-semibold">{submitError}</p>
                </div>
              )}

              {submitted && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-900">
                  {selectedItems.length === 0 ? (
                    <p className="text-base font-semibold">
                      {employeeName}({department})未選擇任何品項
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-base font-semibold">
                        {employeeName}({department})已選擇：
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {selectedItems
                          .map(({ item, quantity }) => `${item.name} x${quantity}`)
                          .join("、")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
