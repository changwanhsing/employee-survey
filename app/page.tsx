"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeadlineBanner from "./components/DeadlineBanner";

type Step =
  | { type: "lookup" }
  | { type: "otp"; employeeId: string; maskedEmail: string };

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ type: "lookup" });
  const [surveyTitle, setSurveyTitle] = useState<string>("");
  const [existingSession, setExistingSession] = useState<{ name: string; employeeId: string } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/survey-config").then((res) => res.json()),
      fetch("/api/session").then((res) => res.json()),
    ]).then(([configData, sessionData]) => {
      setSurveyTitle(configData.title ?? "");
      if (sessionData.valid) {
        setExistingSession({ name: sessionData.name, employeeId: sessionData.employeeId });
      }
    }).catch(() => {}).finally(() => setSessionChecked(true));
  }, []);

  const [employeeId, setEmployeeId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError(null);
    const trimmedId = employeeId.trim().toUpperCase();
    if (!trimmedId) {
      setLookupError("請輸入員工工號");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: trimmedId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setLookupError(data.error || "查詢失敗，請稍後再試");
        return;
      }
      setStep({ type: "otp", employeeId: trimmedId, maskedEmail: data.maskedEmail });
      startResendCooldown();
    } catch {
      setLookupError("伺服器發生錯誤，請稍後再試");
    } finally {
      setLookupLoading(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (step.type !== "otp") return;
    setOtpError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: step.employeeId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(data.error || "重新發送失敗");
        return;
      }
      startResendCooldown();
    } catch {
      setOtpError("伺服器發生錯誤，請稍後再試");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.type !== "otp") return;
    setOtpError(null);
    const trimmedCode = otp.trim();
    if (!trimmedCode) {
      setOtpError("請輸入驗證碼");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: step.employeeId, code: trimmedCode }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(data.error || "驗證失敗");
        return;
      }
      router.push("/survey");
    } catch {
      setOtpError("伺服器發生錯誤，請稍後再試");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-5 sm:py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
              調查系統
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
              {surveyTitle || "員工調查"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {step.type === "lookup" ? "請輸入您的員工工號以接收驗證碼。" : "請輸入寄送至您信箱的驗證碼。"}
            </p>
            <DeadlineBanner />
          </div>

          {step.type === "lookup" ? (
            <div className="space-y-5">
              {sessionChecked && existingSession && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    上次登入：<span className="font-semibold">{existingSession.name}</span>（{existingSession.employeeId}）
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/survey")}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700"
                  >
                    直接登入
                  </button>
                  <p className="mt-2 text-center text-xs text-emerald-600">
                    不是本人？請用下方工號重新發送驗證碼
                  </p>
                </div>
              )}
              <form className="space-y-5" onSubmit={handleLookup}>
                <div>
                  <label className="block text-base font-medium text-slate-700 mb-2" htmlFor="employeeId">
                    員工工號
                  </label>
                  <input
                    id="employeeId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="例如 10001"
                    className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4 text-xl text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lookupLoading ? "發送中..." : "發送驗證碼"}
                </button>
                {lookupError && (
                  <p className="text-center text-base font-medium text-red-600">{lookupError}</p>
                )}
              </form>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleVerify}>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center text-sm text-blue-800">
                驗證碼已發送至 <span className="font-semibold">{step.maskedEmail}</span>
                <br />
                <span className="text-xs text-blue-600">驗證碼有效時間 10 分鐘</span>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-2" htmlFor="otp">
                  驗證碼
                </label>
                <input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="請輸入 6 位數驗證碼"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4 text-2xl tracking-[0.5em] text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={otpLoading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpLoading ? "驗證中..." : "驗證並進入"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-sm text-slate-500 underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `重新發送（${resendCooldown}s）` : "重新發送驗證碼"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setStep({ type: "lookup" }); setOtp(""); setOtpError(null); }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
              >
                ← 返回重新輸入工號
              </button>
              {otpError && (
                <p className="text-center text-base font-medium text-red-600">{otpError}</p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
