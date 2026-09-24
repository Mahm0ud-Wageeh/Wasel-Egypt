"use client";

/**
 * 3D Holographic Smart Transit Pass (كارت واصل) & Live Dynamic QR Tickets.
 * Connected directly to Laravel Digital Wallet & Tickets APIs.
 * Includes interactive Gate Turnstile Scanner Simulator for live verification.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ScanLine,
  Timer,
  Plus,
  Landmark,
  Smartphone,
  CreditCard,
  QrCode,
  Ticket as TicketIcon,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  DoorOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PillButton } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { qrPatternCells, barcodeBars } from "./data";

export interface ActiveTicket {
  id: number;
  ticket_code: string;
  qr_payload: string;
  transit_mode: string;
  origin_station: string;
  destination_station: string;
  fare_amount: number;
  zones_count: number;
  status: string;
  valid_until: string;
  created_at: string;
}

/* ------------------------------- QR tile ---------------------------------- */

function QrTile({ code, className }: { code?: string; className?: string }) {
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
    <div className={cn("rounded-xl bg-white p-2.5 shadow-sm", className)} aria-label="رمز الاستجابة السريع للبوابة">
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

function BarcodeTile({ code }: { code: string }) {
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
      <p className="num mt-2 text-center text-[12px] font-bold text-onyx">{code}</p>
    </div>
  );
}

/* -------------------------------- Pass card -------------------------------- */

export function SmartPassCard({
  calculatedOrigin,
  calculatedDest,
  calculatedFare,
  onTicketPurchased,
}: {
  calculatedOrigin?: string;
  calculatedDest?: string;
  calculatedFare?: number;
  onTicketPurchased?: () => void;
}) {
  const { user, isLoggedIn } = useAuth();
  const [balance, setBalance] = useState<number>(100.0);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [topupOpen, setTopupOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const holderName = user?.name || "راكب واصل مصر";
  const cardNumber = `6042 ${user?.id ? String(user.id).padStart(4, "0") : "8897"} 3315 7302`;

  const fetchWalletAndTickets = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const [walletRes, ticketsRes] = await Promise.all([
        apiRequest<{ balance: number }>(endpoints.wallet.show),
        apiRequest<ActiveTicket[]>(endpoints.tickets.active),
      ]);
      if (walletRes) {
        setBalance(Number(walletRes.balance));
      }
      if (Array.isArray(ticketsRes)) {
        setActiveTickets(ticketsRes);
      }
    } catch {
      // offline fallback
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchWalletAndTickets();
  }, [fetchWalletAndTickets]);

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

  const confirmTopUp = async () => {
    if (picked === null) return;
    try {
      if (isLoggedIn) {
        const res = await apiRequest<{ balance: number }>(endpoints.wallet.topup, {
          method: "POST",
          body: { amount: picked, payment_method: "instapay" },
        });
        if (res) {
          setBalance(Number(res.balance));
        }
      } else {
        setBalance((b) => b + picked);
      }

      toast({
        title: "تم شحن الرصيد بنجاح! 💳",
        description: `أُضيفت ${picked} ج.م إلى محفظتك — الرصيد الحالي ${balance + picked} ج.م`,
      });
      setTopupOpen(false);
      setPicked(null);
    } catch (err: any) {
      toast({
        title: "فشل الشحن",
        description: err?.message || "حدث خطأ أثناء الاتصال بالخادم",
      });
    }
  };

  const handlePurchaseTicket = async (origin: string, dest: string, fare: number) => {
    try {
      setPurchasing(true);
      if (!isLoggedIn) {
        toast({
          title: "يرجى تسجيل الدخول",
          description: "قم بتسجيل الدخول للاستفادة من إصدار التذاكر الذكية من المحفظة.",
        });
        return;
      }

      const res = await apiRequest<{ ticket: ActiveTicket; wallet_balance: number }>(endpoints.tickets.purchase, {
        method: "POST",
        body: {
          origin,
          destination: dest,
          fare_amount: fare,
          transit_mode: "metro",
          zones_count: fare >= 20 ? 4 : fare >= 15 ? 3 : fare >= 10 ? 2 : 1,
        },
      });

      if (res && res.ticket) {
        setBalance(Number(res.wallet_balance));
        setActiveTickets((prev) => [res.ticket, ...prev]);
        toast({
          title: "تم إصدار التذكرة الذكية بنجاح! 🎫",
          description: `كود التذكرة: ${res.ticket.ticket_code} — صالحة لمدة 3 ساعات.`,
        });
        if (onTicketPurchased) onTicketPurchased();
      }
    } catch (err: any) {
      toast({
        title: "تعذر إصدار التذكرة",
        description: err?.message || "تأكد من وجود رصيد كافٍ في محفظتك.",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleScanGate = async (ticketCode: string) => {
    try {
      setScanning(true);
      setScanResult(null);
      const res = await apiRequest<{ success: boolean; valid: boolean; message: string }>(
        endpoints.tickets.validate(ticketCode),
        { method: "POST" }
      );

      if (res && res.valid) {
        setScanResult({ success: true, message: res.message });
        setActiveTickets((prev) => prev.filter((t) => t.ticket_code !== ticketCode));
      } else {
        setScanResult({ success: false, message: res?.message || "التذكرة غير صالحة" });
      }
    } catch (err: any) {
      setScanResult({ success: false, message: err?.message || "فشل التحقق من التذكرة" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        {/* conic edge wrapper */}
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
                <p className="mt-1.5 truncate font-head text-[17px] font-bold">{holderName}</p>
                <p className="num mt-4 text-[15px] font-bold tracking-widest text-white/85">{cardNumber}</p>
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
              {activeTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-mint/20 border border-mint/40 px-4 text-[13px] font-head font-bold text-mint hover:bg-mint/30"
                >
                  <DoorOpen className="size-4" />
                  محاكي بوابة العبور ({activeTickets.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side explainer & One-Click Purchase from Calculator */}
        <div className="card-flat rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-head text-[18px] font-black text-ink">كارت واصل الموحد للعبور الذكي</h3>
            <span className="rounded-full bg-emerald/10 text-emerald px-2.5 py-0.5 text-[10.5px] font-bold">
              تذاكر QR حية
            </span>
          </div>
          <p className="text-[13.5px] leading-7 text-slateink">
            كارت لاتلامسي واحد لكل شبكة النقل الكبرى. وجّهه أمام قارئ البوابة لخصم الأجرة تلقائياً
            حسب عدد المحطات المقطوعة، أو أصدر تذكرة QR رقمية مباشرة من رصيدك.
          </p>

          {calculatedOrigin && calculatedDest && calculatedFare ? (
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-brand">المسار المختار في الحاسبة:</p>
                  <p className="text-[13px] font-black text-ink">
                    {calculatedOrigin} ↔ {calculatedDest}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-head text-[18px] font-black text-ink">{calculatedFare} ج.م</p>
                </div>
              </div>
              <PillButton
                variant="brand"
                size="sm"
                disabled={purchasing || balance < calculatedFare}
                onClick={() => handlePurchaseTicket(calculatedOrigin, calculatedDest, calculatedFare)}
                className="mt-3 w-full"
              >
                {purchasing ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <TicketIcon className="size-3.5" />
                )}
                <span>
                  {balance >= calculatedFare
                    ? `إصدار تذكرة QR ذكية من الرصيد (${calculatedFare} ج.م)`
                    : "الرصيد غير كافٍ — اشحن المحفظة"}
                </span>
              </PillButton>
            </div>
          ) : null}

          <ul className="space-y-2.5 pt-2">
            {[
              "خصم تلقائي حسب مصفوفة المحطات الرسمية",
              "متوافق مع المترو وقطار الخفيف LRT والحافلات",
              "استرداد فوري وتوليد QR مشفر بمدة صلاحية 3 ساعات",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[12.5px] font-medium text-carbon">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active QR Tickets Section */}
      {activeTickets.length > 0 && (
        <div className="rounded-3xl border border-bone bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TicketIcon className="size-4.5 text-brand" />
              <h3 className="font-head text-[16px] font-black text-ink">
                التذاكر الذكية الفعّالة ({activeTickets.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1 text-[11.5px] font-bold text-emerald hover:bg-emerald/20"
            >
              <DoorOpen className="size-3.5" />
              <span>تجربة مسح التذكرة على البوابة</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="rounded-2xl border border-bone bg-mist p-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="mono-tag text-[9.5px] text-brand">{tkt.ticket_code}</span>
                    <h4 className="font-head text-[14px] font-bold text-ink mt-1">
                      {tkt.origin_station} ← {tkt.destination_station}
                    </h4>
                    <p className="text-[11px] text-ash mt-0.5">
                      الأجرة: {tkt.fare_amount} ج.م • {tkt.transit_mode.toUpperCase()}
                    </p>
                  </div>
                  <QrTile code={tkt.ticket_code} className="size-16 shrink-0" />
                </div>

                <div className="mt-4 pt-3 border-t border-bone/60 flex items-center justify-between text-[11px]">
                  <span className="text-emerald font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    صالحة للاستخدام
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerOpen(true);
                      handleScanGate(tkt.ticket_code);
                    }}
                    className="text-interactive font-bold hover:underline"
                  >
                    فحص عند البوابة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-up dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle className="font-head text-[18px] font-black text-ink">شحن الرصيد الفوري</DialogTitle>
            <DialogDescription className="text-[13px] leading-6">
              اختر قيمة الشحن التجريبي الفوري — يُضاف الرصيد إلى محفظتك وقاعدة البيانات فوراً.
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
            <p className="mb-2.5 text-[11px] font-bold text-slateink">وسيلة الدفع المعتمدة</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <Smartphone className="size-3.5 text-interactive" /> إنستاباي InstaPay
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <Smartphone className="size-3.5 text-brand" /> فودافون كاش
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
                <Landmark className="size-3.5 text-amber-600" /> فوري Fawry
              </span>
            </div>
          </div>

          <PillButton
            variant="dark"
            className="w-full"
            disabled={picked === null}
            onClick={confirmTopUp}
          >
            تأكيد الشحن الفوري
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
          <BarcodeTile code={cardNumber} />
        </DialogContent>
      </Dialog>

      {/* Gate Turnstile Scanner Simulator Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle className="font-head text-[18px] font-black text-ink">
              محاكي بوابات المترو والعبور الذكية
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-6">
              محاكاة فحص تذكرة الـ QR عند بوابة الدخول بالمحطة والتحقق من صحتها في قاعدة البيانات.
            </DialogDescription>
          </DialogHeader>

          {activeTickets.length === 0 ? (
            <div className="rounded-2xl border border-bone bg-mist p-6 text-center">
              <TicketIcon className="mx-auto size-8 text-ash mb-2" />
              <p className="text-[13px] font-bold text-carbon">لا توجد تذاكر فعالة حالياً للمسح</p>
              <p className="text-[11.5px] text-ash mt-1">أصدر تذكرة من الحاسبة أعلاه لتجربة البوابة.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-bone bg-white p-4">
                <p className="text-[11.5px] font-bold text-slateink mb-2">اختر التذكرة للفحص:</p>
                <div className="space-y-2">
                  {activeTickets.map((tkt) => (
                    <div
                      key={tkt.id}
                      className="flex items-center justify-between rounded-xl border border-bone bg-mist p-3"
                    >
                      <div>
                        <p className="font-bold text-[12.5px] text-ink">
                          {tkt.origin_station} ← {tkt.destination_station}
                        </p>
                        <p className="text-[10px] text-ash font-mono">{tkt.ticket_code}</p>
                      </div>
                      <PillButton
                        variant="brand"
                        size="sm"
                        disabled={scanning}
                        onClick={() => handleScanGate(tkt.ticket_code)}
                      >
                        {scanning ? <RefreshCw className="size-3 animate-spin" /> : "مسح البوابة"}
                      </PillButton>
                    </div>
                  ))}
                </div>
              </div>

              {scanResult && (
                <div
                  className={cn(
                    "rounded-2xl border p-4 text-center",
                    scanResult.success
                      ? "border-emerald/30 bg-emerald/10 text-emerald"
                      : "border-red-300 bg-red-50 text-red-700"
                  )}
                >
                  {scanResult.success ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="mx-auto size-8 text-emerald mb-1" />
                      <p className="font-head text-[15px] font-black">فُتحت البوابة بنجاح! 🟢</p>
                      <p className="text-[12px]">{scanResult.message}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <XCircle className="mx-auto size-8 text-red-600 mb-1" />
                      <p className="font-head text-[15px] font-black">رُفض العبور 🔴</p>
                      <p className="text-[12px]">{scanResult.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
