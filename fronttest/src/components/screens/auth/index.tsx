"use client";

/**
 * Screen: auth (spec 17 — Authentication & Passenger Security)
 * Immersive split layout: dark schematic visual side (lg+) + light form side.
 * Flow states: Direct login/register using real Laravel backend API (Sanctum tokens)
 * OTP flow is bypassed/disabled per user instruction since backend uses email/password auth.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import type { ScreenProps } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Loader2,
} from "lucide-react";

/* ------------------------------- brand mark ------------------------------- */

function AuthLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#ffffff" />
      <path
        d="M8 21c4 0 4-10 8-10s4 10 8 10"
        stroke="#6647f0"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8" cy="21" r="2.4" fill="#0091ff" />
      <circle cx="24" cy="21" r="2.4" fill="#202020" />
    </svg>
  );
}

/* --------------------------- schematic line art ---------------------------- */

function NetworkSchematic() {
  const station = (cx: number, cy: number, color: string) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" fill="#0b0b0b" stroke={color} strokeWidth="2" />
  );
  return (
    <svg viewBox="0 0 560 380" className="w-full" aria-hidden="true">
      {/* ENR — dashed national rail */}
      <path d="M40 345 H520" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" strokeDasharray="3 9" fill="none" />
      {/* BRT — amber ring */}
      <path d="M40 220 Q260 320 520 200" stroke="var(--color-brt)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* L1 — royal blue spine */}
      <path d="M40 110 C160 110 220 150 300 150 S480 120 520 120" stroke="var(--color-l1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* L2 — crimson diagonal */}
      <path d="M60 40 C120 140 260 180 340 250 S480 320 520 330" stroke="var(--color-l2)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* L3 — emerald cross-town */}
      <path d="M40 300 L180 230 L320 180 L520 90" stroke="var(--color-l3)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* LRT — sky spur */}
      <path d="M300 340 L420 300 L520 270" stroke="var(--color-lrt)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* MNR — violet east Nile */}
      <path d="M140 40 L260 80 L380 60" stroke="var(--color-mnr)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* live flowing segment — interactive blue accent */}
      <path d="M160 112 C220 120 260 138 300 150" stroke="var(--color-interactive)" strokeWidth="3" fill="none" strokeLinecap="round" className="dash-flow" />
      {/* stations */}
      {station(120, 110, "var(--color-l1)")}
      {station(220, 128, "var(--color-l1)")}
      {station(380, 136, "var(--color-l1)")}
      {station(480, 124, "var(--color-l1)")}
      {station(60, 40, "var(--color-l2)")}
      {station(148, 118, "var(--color-l2)")}
      {station(300, 178, "var(--color-l2)")}
      {station(452, 296, "var(--color-l2)")}
      {station(180, 230, "var(--color-l3)")}
      {station(320, 180, "var(--color-l3)")}
      {station(420, 138, "var(--color-l3)")}
      {station(360, 314, "var(--color-lrt)")}
      {station(140, 40, "var(--color-mnr)")}
      {station(260, 80, "var(--color-mnr)")}
      {station(120, 244, "var(--color-brt)")}
      {station(300, 268, "var(--color-brt)")}
      {/* interchange hubs */}
      <circle cx="300" cy="150" r="6.5" fill="#0b0b0b" stroke="#ffffff" strokeWidth="2.5" />
      <circle cx="340" cy="250" r="6.5" fill="#0b0b0b" stroke="#ffffff" strokeWidth="2.5" />
      {/* live network pulse */}
      <circle cx="300" cy="150" r="3" fill="var(--color-interactive)" className="animate-pulse" />
    </svg>
  );
}

/* --------------------------------- screen --------------------------------- */

type Mode = "login" | "register";
type Step = "form" | "success";

export default function AuthScreen({ navigate, params }: ScreenProps) {
  const { login, register, isLoggedIn } = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === "register" ? "register" : "login");
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  /* sync mode when deep-linked via params */
  useEffect(() => {
    if (params.mode === "register") setMode("register");
    else if (params.mode === "login") setMode("login");
  }, [params.mode]);

  /* if already logged in, redirect home */
  useEffect(() => {
    if (isLoggedIn && step !== "success") {
      navigate("home");
    }
  }, [isLoggedIn, navigate, step]);

  /* success → enter the network */
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => navigate("home"), 1200);
    return () => clearTimeout(t);
  }, [step, navigate]);

  const submitLogin = async () => {
    const next: Record<string, string> = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "يرجى إدخال بريد إلكتروني صحيح";
    }
    if (!password) {
      next.password = "يرجى إدخال كلمة المرور";
    }
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في واصل مصر",
      });
      setStep("success");
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "فشل تسجيل الدخول، يرجى التأكد من صحة البريد وكلمة المرور";
      setServerError(msg);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "من فضلك أدخل الاسم بالكامل (3 أحرف على الأقل)";
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "صيغة البريد الإلكتروني غير صحيحة";
    if (password.length < 8) next.password = "كلمة المرور يجب ألا تقل عن 8 أحرف وأرقام";
    if (!agreed) next.terms = "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية";

    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim() || undefined);
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "مرحباً بك، تم تفعيل حسابك وتوثيق دخولك",
      });
      setStep("success");
    } catch (err: any) {
      const errs = err?.data?.errors;
      if (errs) {
        const fieldErrors: Record<string, string> = {};
        if (errs.email) fieldErrors.email = Array.isArray(errs.email) ? errs.email[0] : errs.email;
        if (errs.password) fieldErrors.password = Array.isArray(errs.password) ? errs.password[0] : errs.password;
        if (errs.name) fieldErrors.name = Array.isArray(errs.name) ? errs.name[0] : errs.name;
        setErrors(fieldErrors);
      }
      const msg = err?.data?.message || err?.message || "فشل إنشاء الحساب، قد يكون البريد مسجلاً مسبقاً";
      setServerError(msg);
      toast({
        title: "خطأ في التسجيل",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = () => {
    toast({
      title: "استعادة كلمة المرور",
      description: "يرجى التواصل مع مسؤول النظام عبر الدعم أو استخدام بريدك المسجل",
    });
  };

  const fieldBase =
    "h-12 w-full rounded-2xl border bg-white px-4 text-[14px] font-medium text-ink outline-none settle-fast placeholder:text-fog focus:border-interactive/60";

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* ======================= visual side (lg+) ======================= */}
      <aside className="dark-panel relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52% 42% at 78% 12%, rgba(102,71,240,0.16) 0%, rgba(0,0,0,0) 60%), radial-gradient(40% 34% at 12% 88%, rgba(0,145,255,0.10) 0%, rgba(0,0,0,0) 60%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5">
            <AuthLogoMark />
            <span className="leading-none">
              <span className="block font-head text-[19px] font-black text-white">
                واصل <span className="text-brand">مصر</span>
              </span>
              <span className="mono-tag mt-1 block !text-[9px] !text-white/40">WASEL EGYPT</span>
            </span>
          </span>
          <span className="mono-tag !text-white/40">GREATER CAIRO · LIVE</span>
        </div>

        <div className="relative my-8">
          <h1 className="max-w-xl font-head text-[34px] font-black leading-[1.35] text-white xl:text-[44px]">
            القاهرة الكبرى… <span className="text-brand">بلا ازدحام فكري</span>
          </h1>
          <p className="mt-4 max-w-lg text-[14.5px] leading-8 text-white/60">
            منصة واحدة تجمع مترو الأنفاق، القطار الكهربائي الخفيف، المونوريل، الحافلات السريعة
            والسكك الحديدية — بأوقات حية، أجرة رسمية، وتنبيهات لحظية.
          </p>
          <div className="mt-8 max-w-xl opacity-90">
            <NetworkSchematic />
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "8", l: "خطوط نشطة" },
              { v: "94", l: "محطة مترابطة" },
              { v: "3.9M", l: "ركاب يوميًا" },
              { v: "94.6%", l: "انتظام الشبكة" },
            ].map((s) => (
              <div key={s.l}>
                <div className="num text-[24px] font-extrabold text-white">{s.v}</div>
                <div className="mt-1 text-[12px] font-medium text-white/45">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-bold text-white/80">
              <ShieldCheck className="size-4 text-emerald" />
              اتصال مشفر
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-bold text-white/80">
              <Lock className="size-4 text-interactive" />
              بياناتك محلية
            </span>
          </div>
        </div>
      </aside>

      {/* ========================== form side ========================== */}
      <main className="relative flex min-h-dvh flex-col px-4 py-8 sm:px-8 lg:min-h-0 lg:px-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="rise-in flex flex-col items-center text-center">
            <span className="lg:hidden">
              <AuthLogoMark className="size-10" />
            </span>
            <h2 className="mt-4 font-head text-[24px] font-black text-ink lg:mt-0">
              مرحبًا بك في واصل مصر
            </h2>
            <p className="mt-2 text-[13.5px] leading-7 text-slateink">
              بوابتك الموحّدة إلى شبكة نقل القاهرة الكبرى
            </p>
          </div>

          {serverError ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-l2/30 bg-l2/10 p-3.5 text-[13px] font-bold text-l2">
              <CircleAlert className="size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          {step === "form" ? (
            <div className="rise-in mt-8" style={{ animationDelay: "60ms" }}>
              {/* segmented mode tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-full border border-bone bg-mist p-1">
                {(
                  [
                    { id: "login", label: "تسجيل الدخول" },
                    { id: "register", label: "حساب جديد" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setMode(t.id);
                      setErrors({});
                      setServerError("");
                    }}
                    className={cn(
                      "settle-fast h-10 cursor-pointer rounded-full text-[13px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
                      mode === t.id ? "bg-ink text-white shadow-sm" : "text-slateink hover:text-ink"
                    )}
                    aria-pressed={mode === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {/* name — register only */}
                {mode === "register" ? (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-carbon" htmlFor="auth-name">
                      الاسم الكامل
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                      <input
                        id="auth-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: محمد أحمد علي"
                        className={cn(fieldBase, "ps-11", errors.name ? "border-l2" : "border-bone")}
                      />
                    </div>
                    {errors.name ? <FieldError msg={errors.name} /> : null}
                  </div>
                ) : null}

                {/* email */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-carbon" htmlFor="auth-email">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                    <input
                      id="auth-email"
                      dir="ltr"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === "login" ? "admin@example.com" : "name@example.com"}
                      className={cn(fieldBase, "num ps-11 text-start", errors.email ? "border-l2" : "border-bone")}
                    />
                  </div>
                  {errors.email ? <FieldError msg={errors.email} /> : null}
                </div>

                {/* egyptian phone — register only (optional) */}
                {mode === "register" ? (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-carbon" htmlFor="auth-phone">
                      رقم الموبايل <span className="font-medium text-ash">(اختياري)</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                      <input
                        id="auth-phone"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className={cn(fieldBase, "num ps-11 text-start", errors.phone ? "border-l2" : "border-bone")}
                      />
                    </div>
                    {errors.phone ? <FieldError msg={errors.phone} /> : null}
                  </div>
                ) : null}

                {/* password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[13px] font-bold text-carbon" htmlFor="auth-password">
                      كلمة المرور
                    </label>
                    {mode === "login" ? (
                      <button
                        type="button"
                        onClick={forgotPassword}
                        className="cursor-pointer text-[12.5px] font-bold text-interactive hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(fieldBase, "ps-11 pe-12", errors.password ? "border-l2" : "border-bone")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-3 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ash hover:bg-mist hover:text-ink"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password ? <FieldError msg={errors.password} /> : null}
                </div>

                {/* terms — register only */}
                {mode === "register" ? (
                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-6 text-carbon">
                      <Checkbox
                        checked={agreed}
                        onCheckedChange={(v) => {
                          setAgreed(v === true);
                          setErrors((e) => {
                            const { terms: _t, ...rest } = e;
                            return rest;
                          });
                        }}
                        className="mt-1 size-4.5 border-cloud"
                      />
                      <span>
                        أوافق على <span className="font-bold text-interactive">شروط الاستخدام</span> و
                        <span className="font-bold text-interactive"> سياسة الخصوصية</span> الخاصة بمنصة واصل مصر
                      </span>
                    </label>
                    {errors.terms ? <FieldError msg={errors.terms} /> : null}
                  </div>
                ) : null}

                <PillButton
                  variant="dark"
                  size="lg"
                  className="mt-2 w-full"
                  disabled={loading}
                  onClick={mode === "login" ? submitLogin : submitRegister}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      جارٍ المعالجة…
                    </span>
                  ) : (
                    <>
                      {mode === "login" ? "دخول" : "إنشاء الحساب"}
                      <ArrowLeft />
                    </>
                  )}
                </PillButton>

                <div className="flex items-center gap-3 py-1" aria-hidden="true">
                  <span className="h-px flex-1 bg-bone" />
                  <span className="text-[12px] font-medium text-ash">أو</span>
                  <span className="h-px flex-1 bg-bone" />
                </div>

                <PillButton
                  variant="ghost"
                  size="lg"
                  className="w-full border border-bone hover:bg-mist"
                  onClick={() => navigate("home")}
                >
                  الدخول كزائر — الاستمرار بدون تسجيل
                  <ArrowRight />
                </PillButton>
              </div>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="rise-in mt-16 flex flex-col items-center text-center">
              <span className="gps-pulse flex size-20 items-center justify-center rounded-full bg-emerald/10">
                <ShieldCheck className="size-10 text-emerald" />
              </span>
              <h3 className="mt-6 font-head text-[21px] font-black text-ink">تم تسجيل الدخول بنجاح</h3>
              <p className="mt-2 text-[13.5px] leading-7 text-slateink">
                مرحبًا بك على متن واصل مصر — جارٍ تحويلك إلى الرئيسية…
              </p>
            </div>
          ) : null}

          {/* security footer */}
          <div className="mt-auto pt-10">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald" />
              <span className="mono-tag">SANCTUM TOKEN AUTH · AES-256 · +20 EGYPT</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------ field error ------------------------------- */

function FieldError({ msg, center }: { msg: string; center?: boolean }) {
  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-l2",
        center && "justify-center"
      )}
      role="alert"
    >
      <CircleAlert className="size-3.5 shrink-0" />
      {msg}
    </p>
  );
}
