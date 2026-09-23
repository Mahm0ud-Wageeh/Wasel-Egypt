"use client";

/**
 * 3D Holographic Smart Transit Pass (كارت واصل).
 * Ink-black card on a conic-gradient edge — the single conic moment of the
 * fares screen. Subtle pointer tilt, deterministic QR placeholder, balance
 * top-up + barcode dialogs.
 */

import { useRef, useState } from "react";
import { Wallet, ScanLine, Timer, Plus, Landmark, Smartphone, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PillButton } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { qrPatternCells, barcodeBars } from "./data";

const HOLDER_AR = "أحمد محمود عبد العزيز";
const CARD_NUMBER = "6042 8897 3315 7302";

/* ------------------------------- QR tile ---------------------------------- */

function QrTile({ className }: { className?: string }) {
  const cells = qrPatternCells(7);
  const n = 21;
  const isFinder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    if (inBox(0, 0) || inBox(0, n - 7) || inBox(n - 7, 0)) {
      const rr = r >= n - 7 ? r - (n - 7) : r;
      const cc = c >= n - 7 ? c - (n - 7) : c;
      const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return ring || core;
    }
    return null;
  };
  return (
    <div className={cn("rounded-xl bg-white p-2.5", className)} aria-label="رمز الاستجابة السريع للبوابة">
      <svg viewBox={`0 0 ${n} ${n}`} className="block size-full" role="img">
        {Array.from({ length: n }, (_, r) =>
          Array.from({ length: n }, (_, c) => {
            const f = isFinder(r, c);
            const on = f === null ? cells[r * n + c] : f;
            if (!on) return null;
            return <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#090c1d" />;
          })
        )}
      </svg>
    </div>
  );
}

/* ----------------------------- Barcode tile -------------------------------- */

function BarcodeTile() {
  const bars = barcodeBars();
  return (
    <div className="rounded-xl bg-white p-4" aria-label="الباركود البديل للبوابة">
      <svg viewBox="0 0 120 40" className="block h-24 w-full" role="img">
        {bars.map((w, i) => {
          const x = bars.slice(0, i).reduce((a, b) => a + b + 1, 0);
          if (i % 2 !== 0) return null;
          return <rect key={i} x={x} y={0} width={w} height={40} fill="#090c1d" />;
        })}
      </svg>
      <p className="num mt-2 text-center text-[12px] font-bold text-onyx">{CARD_NUMBER}</p>
    </div>
  );
}

/* -------------------------------- Pass card -------------------------------- */

export function SmartPassCard() {
  const [balance, setBalance] = useState(85);
  const [topupOpen, setTopupOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg)`;
  };
  const onLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  };

  const confirmTopUp = () => {
    if (picked === null) return;
    setBalance((b) => b + picked);
    setTopupOpen(false);
    toast({
      title: "تم شحن الرصيد بنجاح",
      description: `أُضيفت ${picked} ج.م إلى كارت واصل — الرصيد الجديد ${balance + picked} ج.م`,
    });
    setPicked(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
      {/* conic edge wrapper — the one allowed conic element on this screen */}
      <div className="conic-border rounded-3xl p-px settle">
        <div
          ref={cardRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="settle-fast relative overflow-hidden rounded-3xl bg-gradient-to-b from-carbon via-ink to-onyx p-6 text-white md:p-8"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_0%,rgba(255,255,255,0.14),transparent_55%)]"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-head text-[20px] font-black leading-none">
                واصل <span className="text-mint">مصر</span>
              </p>
              <p className="mono-tag mt-2 !text-white/50">WASEL SMART PASS</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold leading-none text-white/90">
              العبور الموحّد — عام
            </span>
          </div>

          <div className="relative mt-7 flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white/50">حامل الكارت</p>
              <p className="mt-1.5 truncate font-head text-[17px] font-bold">{HOLDER_AR}</p>
              <p className="num mt-4 text-[15px] font-bold tracking-widest text-white/85">{CARD_NUMBER}</p>
            </div>
            <QrTile className="size-24 shrink-0 md:size-28" />
          </div>

          <div className="relative mt-7 flex flex-wrap items-center justify-between gap-3">
            <span className="num inline-flex items-center gap-2 rounded-full bg-emerald/15 px-4 py-2 text-[13px] font-bold text-mint">
              <Wallet className="size-4" aria-hidden="true" />
              {balance.toFixed(2)} EGP
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/50">
              <Timer className="size-3.5" aria-hidden="true" />
              رمز البوابة يُحدَّث كل 30 ثانية
            </span>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setTopupOpen(true)}
              className="settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-[13px] font-head font-bold text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-mint/60 outline-none"
            >
              <Plus className="size-4" aria-hidden="true" />
              شحن الرصيد
            </button>
            <button
              type="button"
              onClick={() => setBarcodeOpen(true)}
              className="settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/25 px-5 text-[13px] font-head font-bold text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
            >
              <ScanLine className="size-4" aria-hidden="true" />
              عرض الباركود
            </button>
          </div>
        </div>
      </div>

      {/* Side explainer */}
      <div className="card-flat rounded-3xl p-6">
        <h3 className="font-head text-[18px] font-black text-ink">كارت واصل الموحد للعبور الذكي</h3>
        <p className="mt-2 text-[13.5px] leading-7 text-slateink">
          كارت لاتلامسي واحد لكل شبكة النقل الكبرى. وجّهه أمام قارئ البوابة لخصم الأجرة تلقائياً
          حسب عدد المحطات المقطوعة، واشحنه فوراً من المحفظة الإلكترونية أو كشك الخدمة.
        </p>
        <ul className="mt-5 space-y-3">
          {[
            "خصم تلقائي حسب مصفوفة المحطات الرسمية",
            "متوافق مع المترو وقطار الخفيف LRT والحافلات",
            "استرداد فوري عند فقدان الكارت المسجل",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[13px] font-medium text-carbon">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Top-up dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle className="font-head text-[18px] font-black text-ink">شحن الرصيد الفوري</DialogTitle>
            <DialogDescription className="text-[13px] leading-6">
              اختر قيمة الشحن ووسيلة الدفع — يُضاف الرصيد إلى كارت واصل فوراً.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2.5">
            {[50, 100, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPicked(v)}
                className={cn(
                  "settle-fast num flex h-16 cursor-pointer flex-col items-center justify-center rounded-2xl border text-[16px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
                  picked === v
                    ? "border-ink bg-ink text-white"
                    : "border-bone bg-white text-onyx hover:border-cloud hover:bg-mist"
                )}
              >
                {v}
                <span className={cn("text-[10px] font-medium", picked === v ? "text-white/70" : "text-ash")}>ج.م</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-bone p-3">
            <p className="mb-2.5 text-[11px] font-bold text-slateink">وسيلة الدفع</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <Smartphone className="size-3.5" aria-hidden="true" /> فودافون كاش
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <Landmark className="size-3.5" aria-hidden="true" /> فوري
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <CreditCard className="size-3.5" aria-hidden="true" /> بطاقة بنكية
              </span>
            </div>
          </div>

          <PillButton
            variant="dark"
            className="w-full"
            disabled={picked === null}
            onClick={confirmTopUp}
          >
            تأكيد الشحن
          </PillButton>
        </DialogContent>
      </Dialog>

      {/* Barcode dialog */}
      <Dialog open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <DialogContent className="max-w-sm rounded-3xl" dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle className="font-head text-[18px] font-black text-ink">الباركود البديل</DialogTitle>
            <DialogDescription className="text-[13px] leading-6">
              وجّه الباركود نحو قارئ البوابة عند تعذر قراءة الرمز السريع.
            </DialogDescription>
          </DialogHeader>
          <BarcodeTile />
        </DialogContent>
      </Dialog>
    </div>
  );
}
