"use client";

/**
 * Carbon Rewards & Gamification Card.
 * Connects directly to Laravel API (/api/v1/rewards)
 * Allows passengers to view their eco-impact and convert CO2 points to Wallet Credit.
 */

import { useState, useEffect, useCallback } from "react";
import { Leaf, Award, ArrowRight, RefreshCw, Zap, Gift, CheckCircle2 } from "lucide-react";
import { PillButton } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";

interface RewardData {
  points_balance: number;
  total_points_earned: number;
  co2_saved_kg: number;
  total_distance_km: number;
  egp_value: number;
}

export function CarbonRewardsCard({ onRedeemed }: { onRedeemed?: () => void }) {
  const { isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<RewardData>({
    points_balance: 50,
    total_points_earned: 50,
    co2_saved_kg: 3.8,
    total_distance_km: 45.0,
    egp_value: 25.0,
  });
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const fetchRewards = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const res = await apiRequest<RewardData>(endpoints.rewards.show);
      if (res) {
        setData(res);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleRedeem = async () => {
    if (data.points_balance < 20) {
      toast({
        title: "رصيد النقاط غير كافٍ",
        description: "الحد الأدنى للاستبدال هو 20 نقطة (ما يعادل 10 ج.م)",
      });
      return;
    }

    try {
      setRedeeming(true);
      const res = await apiRequest<{
        redeemed_points: number;
        credited_egp: number;
        wallet_balance: number;
      }>(endpoints.rewards.redeem, {
        method: "POST",
      });

      if (res) {
        toast({
          title: "تم استبدال النقاط بنجاح! 🎉",
          description: `تم تحويل ${res.redeemed_points} نقطة إلى ${res.credited_egp} ج.م في محفظتك الرقمية.`,
        });
        setData((prev) => ({
          ...prev,
          points_balance: 0,
          egp_value: 0,
        }));
        if (onRedeemed) onRedeemed();
      }
    } catch (err: any) {
      toast({
        title: "تعذر استبدال النقاط",
        description: err?.message || "حدث خطأ أثناء معالجة الطلب.",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="card-mist rounded-3xl border border-bone bg-gradient-to-br from-emerald/5 via-white to-mint/10 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bone pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald/15 text-emerald border border-emerald/25">
            <Leaf className="size-5" />
          </span>
          <div>
            <span className="mono-tag text-[10px] text-emerald">WASEL GREEN IMPACT</span>
            <h3 className="font-head text-[16px] font-black text-ink">مكافآت الوفر البيئي والكربوني</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 border border-emerald/25 px-3 py-1 text-[12px] font-black text-emerald">
            <Award className="size-3.5" />
            <span>{data.points_balance} نقطة خضراء</span>
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 py-5 md:grid-cols-4">
        <div className="rounded-2xl border border-bone/60 bg-white/80 p-3.5">
          <p className="text-[11px] font-bold text-ash">وفر انبعاثات CO₂</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-head text-[22px] font-black text-emerald">{data.co2_saved_kg}</span>
            <span className="text-[11px] font-bold text-ash">كجم</span>
          </div>
        </div>

        <div className="rounded-2xl border border-bone/60 bg-white/80 p-3.5">
          <p className="text-[11px] font-bold text-ash">المسافة بالنقل الجماعي</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-head text-[22px] font-black text-ink">{data.total_distance_km}</span>
            <span className="text-[11px] font-bold text-ash">كم</span>
          </div>
        </div>

        <div className="rounded-2xl border border-bone/60 bg-white/80 p-3.5">
          <p className="text-[11px] font-bold text-ash">إجمالي النقاط المكتسبة</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-head text-[22px] font-black text-ink">{data.total_points_earned}</span>
            <span className="text-[11px] font-bold text-ash">نقطة</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald/20 bg-emerald/10 p-3.5">
          <p className="text-[11px] font-bold text-emerald">القيمة المالية للنقاط</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-head text-[22px] font-black text-emerald">{data.egp_value}</span>
            <span className="text-[11px] font-bold text-emerald">ج.م رصيد</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bone pt-4">
        <p className="text-[12px] text-slateink">
          كل رحلة بالمترو أو الـ BRT توفر انبعاثات وتمنحك نقاطاً قابلة للتحويل إلى رصيد نقدي في محفظتك.
        </p>

        <PillButton
          variant="brand"
          size="sm"
          disabled={data.points_balance < 20 || redeeming}
          onClick={handleRedeem}
          className="gap-1.5"
        >
          {redeeming ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Gift className="size-3.5" />
          )}
          <span>استبدال النقاط برصيد محفظة ({data.egp_value} ج.م)</span>
        </PillButton>
      </div>
    </div>
  );
}
