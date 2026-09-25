"use client";

/**
 * Profile sibling — Digital transit wallet (spec 18).
 * Premium ink card with the page's single conic-border moment,
 * top-up dialog (presets + custom), and slide-down transaction log.
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatEGP } from "@/lib/transit-data";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  Plus,
  Ticket,
  Wallet,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string | number;
  type: string;
  description_ar: string;
  amount: number;
  created_at: string;
}

const PRESETS = [50, 100, 200];

export function WalletCard() {
  const { isLoggedIn, user } = useAuth();
  const walletStorageKey = user ? `wasel.wallet.balance.${user.id}` : "wasel.wallet.balance.guest";
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  const fetchWallet = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setBalance(0);
      setTransactions([]);
      return;
    }
    try {
      setLoading(true);
      const res = await apiRequest<{ balance: number; transactions: Transaction[] }>(endpoints.wallet.show);
      if (res) {
        const bal = Number(res.balance) || 0;
        setBalance(bal);
        setTransactions(res.transactions || []);
        localStorage.setItem(`wasel.wallet.balance.${user.id}`, String(bal));
      }
    } catch {
      const saved = localStorage.getItem(`wasel.wallet.balance.${user.id}`);
      if (saved) setBalance(Number(saved));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const customAmount = Number(custom.replace(/\D/g, "")) || 0;
  const chosen = preset ?? customAmount;

  const openCharge = () => {
    setPreset(null);
    setCustom("");
    setError("");
    setChargeOpen(true);
  };

  const confirmCharge = async () => {
    if (chosen < 10) {
      setError("أقل قيمة شحن هي 10 ج.م");
      return;
    }

    try {
      if (isLoggedIn && user) {
        const res = await apiRequest<{ balance: number; transaction: Transaction }>(endpoints.wallet.topup, {
          method: "POST",
          body: { amount: chosen, payment_method: "instapay" },
        });
        if (res) {
          const bal = Number(res.balance) || 0;
          setBalance(bal);
          if (res.transaction) {
            setTransactions((prev) => [res.transaction, ...prev]);
          }
          localStorage.setItem(`wasel.wallet.balance.${user.id}`, String(bal));
        }
      } else {
        const nextBal = balance + chosen;
        setBalance(nextBal);
        localStorage.setItem(walletStorageKey, String(nextBal));
      }

      setChargeOpen(false);
      toast({
        title: "تم شحن المحفظة بنجاح",
        description: `تمت إضافة ${chosen.toFixed(2)} ج.م إلى رصيد بطاقتك الذكية.`,
      });
    } catch (err: any) {
      setError(err?.message || "تعذر إتمام عملية الشحن حالياً");
    }
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
            WASEL-CAIRO •••• •••• {user ? String(user.id).padStart(4, "0") : "GUEST"}
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
                {transactions.length === 0 ? (
                  <div className="py-4 text-center text-[12px] text-white/50">
                    لا توجد معاملات مسجلة بعد
                  </div>
                ) : (
                  transactions.slice(0, 10).map((t, i) => {
                    const isCharge = t.type === "topup" || t.amount > 0;
                    return (
                      <div
                        key={t.id || i}
                        className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/[0.04]"
                        style={{ opacity: 1 - i * 0.04 }}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            isCharge ? "bg-emerald/15 text-emerald" : "bg-white/10 text-white/70"
                          )}
                        >
                          {isCharge ? (
                            <ArrowDownLeft className="size-3.5" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] font-bold">{t.description_ar}</div>
                          <div className="mt-0.5 text-[11px] text-white/40">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar-EG") : "اليوم"}</div>
                        </div>
                        <span
                          className={cn(
                            "num shrink-0 text-[13px] font-bold",
                            isCharge ? "text-emerald" : "text-white/80"
                          )}
                        >
                          {isCharge ? "+" : ""}
                          {Number(t.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div className="px-2.5 pb-1 pt-0.5">
                  <span className="mono-tag !text-white/30">
                    {transactions.length} TRANSACTIONS RECORDED
                  </span>
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
