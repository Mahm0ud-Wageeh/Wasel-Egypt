"use client";

/**
 * Profile sibling — Digital transit wallet (spec 18).
 * Premium ink card with the page's single conic-border moment,
 * top-up dialog (presets + custom), and slide-down transaction log.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatEGP, seeded } from "@/lib/transit-data";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  Plus,
  Ticket,
  Wallet,
} from "lucide-react";

/* ------------------------------ mock data ------------------------------ */

const TRANSACTIONS = [
  { id: "t1", kind: "charge" as const, title: "شحن المحفظة — فيزا", amount: 100, date: "12 أكتوبر · 09:24" },
  { id: "t2", kind: "trip" as const, title: "رحلة مترو — الخط الثالث", amount: -15, date: "11 أكتوبر · 18:02" },
  { id: "t3", kind: "trip" as const, title: "رحلة BRT — الدائري", amount: -10, date: "10 أكتوبر · 08:15" },
  { id: "t4", kind: "charge" as const, title: "شحن المحفظة — محفظة إلكترونية", amount: 100, date: "5 أكتوبر · 21:40" },
  { id: "t5", kind: "trip" as const, title: "رحلة مونوريل — النيل الشرقي", amount: -12, date: "3 أكتوبر · 16:33" },
];

const PRESETS = [50, 100, 200];

/* ------------------------------ component ------------------------------ */

export function WalletCard() {
  const [balance, setBalance] = useState(175);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  const customAmount = Number(custom.replace(/\D/g, "")) || 0;
  const chosen = preset ?? customAmount;

  const openCharge = () => {
    setPreset(null);
    setCustom("");
    setError("");
    setChargeOpen(true);
  };

  const confirmCharge = () => {
    if (chosen < 10) {
      setError("أقل قيمة شحن هي 10 ج.م");
      return;
    }
    setBalance((b) => b + chosen);
    setChargeOpen(false);
    toast({
      title: "تم شحن المحفظة بنجاح",
      description: `تمت إضافة ${chosen.toFixed(2)} ج.م إلى رصيد بطاقتك الذكية.`,
    });
  };

  return (
    <div className="conic-border h-full rounded-3xl">
      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-ink p-5 text-white md:p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 70% at 85% 0%, rgba(102,71,240,0.28) 0%, rgba(0,0,0,0) 55%), radial-gradient(40% 50% at 0% 100%, rgba(0,145,255,0.14) 0%, rgba(0,0,0,0) 55%)",
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                <Wallet className="size-4.5" />
              </span>
              <div>
                <div className="font-head text-[14px] font-black">محفظة واصل</div>
                <div className="mono-tag !text-white/40 mt-0.5">TRANSIT WALLET</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/15 px-2.5 py-1 text-[11px] font-bold text-emerald">
              <Ticket className="size-3" />
              بطاقة ذكية فعّالة
            </span>
          </div>

          <div className="mt-6 flex items-end gap-2">
            <span className="num text-[38px] font-extrabold leading-none tracking-tight md:text-[42px]">
              {balance.toFixed(2)}
            </span>
            <span className="pb-1 text-[14px] font-bold text-white/60">ج.م</span>
          </div>
          <div className="num mt-3 text-[12.5px] font-bold text-white/45" dir="ltr">
            WASEL-CAIRO •••• •••• 9021
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <PillButton
              size="sm"
              onClick={openCharge}
              className="bg-white text-ink hover:bg-mist"
            >
              <Plus />
              شحن المحفظة
            </PillButton>
            <PillButton
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen((v) => !v)}
              className="text-white/80 hover:bg-white/10 hover:text-white"
              aria-expanded={historyOpen}
            >
              <History />
              سجل المعاملات
            </PillButton>
            <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-white/40">
              <CreditCard className="size-3.5" />
              <span className="mono-tag !text-white/40">LINKED · SANCTUM</span>
            </span>
          </div>

          {/* slide-down transaction log */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              historyOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/30 p-2.5">
                {TRANSACTIONS.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/[0.04]"
                    style={{ opacity: 1 - i * 0.04 }}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        t.kind === "charge" ? "bg-emerald/15 text-emerald" : "bg-white/10 text-white/70"
                      )}
                    >
                      {t.kind === "charge" ? (
                        <ArrowDownLeft className="size-3.5" />
                      ) : (
                        <ArrowUpRight className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-bold">{t.title}</div>
                      <div className="mt-0.5 text-[11px] text-white/40">{t.date}</div>
                    </div>
                    <span
                      className={cn(
                        "num shrink-0 text-[13px] font-bold",
                        t.kind === "charge" ? "text-emerald" : "text-white/80"
                      )}
                    >
                      {t.amount > 0 ? "+" : "−"}
                      {Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="px-2.5 pb-1 pt-0.5">
                  <span className="mono-tag !text-white/30">LAST 5 OF {40 + Math.floor(seeded(7) * 9)} TRANSACTIONS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* top-up dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogTitle className="font-head text-[17px] font-black text-ink">شحن المحفظة</DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-6 text-slateink">
            اختر قيمة الشحن أو أدخل مبلغًا مخصصًا — يُضاف الرصيد فورًا إلى بطاقتك الذكية.
          </DialogDescription>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setCustom("");
                  setError("");
                }}
                className={cn(
                  "settle-fast h-11 cursor-pointer rounded-2xl border text-[13.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
                  preset === p
                    ? "border-ink bg-ink text-white"
                    : "border-bone bg-white text-carbon hover:border-cloud hover:bg-mist"
                )}
              >
                <span className="num">{p}</span> ج.م
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-[12.5px] font-bold text-carbon" htmlFor="charge-custom">
              مبلغ مخصص
            </label>
            <div
              dir="ltr"
              className="flex h-12 items-center overflow-hidden rounded-2xl border border-bone bg-white focus-within:border-interactive/60"
            >
              <input
                id="charge-custom"
                inputMode="numeric"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value.replace(/[^\d.]/g, ""));
                  setPreset(null);
                  setError("");
                }}
                placeholder="0.00"
                className="num h-full flex-1 bg-transparent px-3.5 text-[15px] font-bold text-ink outline-none placeholder:text-fog"
              />
              <span className="px-3.5 text-[12.5px] font-bold text-ash">ج.م</span>
            </div>
            {error ? <p className="mt-1.5 text-[12px] font-medium text-l2">{error}</p> : null}
          </div>

          <PillButton variant="dark" className="mt-5 w-full" onClick={confirmCharge}>
            تأكيد شحن {chosen > 0 ? formatEGP(chosen) : "المحفظة"}
          </PillButton>
        </DialogContent>
      </Dialog>
    </div>
  );
}
