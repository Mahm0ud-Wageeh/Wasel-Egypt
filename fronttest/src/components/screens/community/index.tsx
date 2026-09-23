"use client";

/**
 * SCREEN: community — رادار مجتمع الركاب
 * Crowdsourced incident feed + 3-step report wizard + trust system.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Megaphone,
  Medal,
  Radio,
  RotateCcw,
  Plus,
  Users,
  Timer,
} from "lucide-react";
import { PillButton, LineBadge, SectionHead, FilterChip, ScreenShell } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { seeded } from "@/lib/transit-data";
import { fetchCommunityReports } from "@/api/reports";
import {
  REPORT_LINES,
  SEVERITY_META,
  STATUS_META,
  TOP_CONTRIBUTORS,
  MY_TRUST,
  buildIncidents,
  kindMeta,
  lineMeta,
  timeAgoAr,
  type Incident,
  type Severity,
} from "./data";
import { ReportWizard } from "./report-wizard";

type Vote = "up" | "down";

/* ------------------------------ status chip -------------------------------- */

function ReportStatusChip({ status }: { status: Incident["status"] }) {
  const tones: Record<Incident["status"], string> = {
    verified: "bg-emerald/10 text-emerald border-emerald/25",
    pending: "bg-[#d97706]/10 text-[#b45309] border-[#d97706]/25",
    dismissed: "bg-mist text-ash border-bone",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none",
        tones[status]
      )}
    >
      <ShieldCheck className="size-3" aria-hidden="true" />
      {STATUS_META[status].labelAr}
    </span>
  );
}

/* ----------------------------- incident card ------------------------------- */

function IncidentCard({
  inc,
  vote,
  onVote,
}: {
  inc: Incident;
  vote: Vote | null;
  onVote: (id: string, v: Vote) => void;
}) {
  const kind = kindMeta(inc.kind);
  const line = lineMeta(inc.lineId);
  const sev = SEVERITY_META[inc.severity];
  const Icon = kind.icon;
  const initials = inc.reporterNameAr
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join(" ");

  return (
    <article
      className={cn(
        "settle-fast card-flat border-s-4 rounded-2xl p-5 hover:border-cloud",
        inc.mine && "bg-brand/[0.03]"
      )}
      style={{ borderInlineStartColor: sev.color }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${sev.color}12`, color: sev.color }}
          aria-hidden="true"
        >
          <Icon className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="text-[14.5px] font-bold text-ink">{inc.titleAr}</h3>
            <span className="num text-[11px] font-medium text-ash">{timeAgoAr(inc.minutesAgo)}</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-7 text-slateink">{inc.bodyAr}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-bone bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon">
              {inc.stationAr}
            </span>
            <LineBadge code={line.code} color={line.color} size="sm" />
            <ReportStatusChip status={inc.status} />
            {inc.mine ? (
              <span className="rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-bold text-white">
                بلاغك قيد التحقق
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bone pt-3.5">
            {/* reporter */}
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-bone bg-mist text-[10.5px] font-bold text-carbon">
                {initials}
              </span>
              <span className="text-[12px] font-bold text-carbon">{inc.reporterNameAr}</span>
              <span className="num inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald">
                <ShieldCheck className="size-3" aria-hidden="true" />
                {inc.reporterTrust}
              </span>
            </span>

            {/* votes */}
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={vote !== null}
                onClick={() => onVote(inc.id, "up")}
                aria-label="أتفق مع البلاغ"
                className={cn(
                  "settle-fast inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 disabled:cursor-default",
                  vote === "up"
                    ? "border-emerald/40 bg-emerald/10 text-emerald"
                    : "border-bone bg-white text-carbon hover:border-emerald/40 hover:text-emerald"
                )}
              >
                <ThumbsUp className="size-3.5" aria-hidden="true" />
                <span className="num">{inc.confirms + (vote === "up" ? 1 : 0)}</span>
              </button>
              <button
                type="button"
                disabled={vote !== null}
                onClick={() => onVote(inc.id, "down")}
                aria-label="تم حل المشكلة"
                className={cn(
                  "settle-fast inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 disabled:cursor-default",
                  vote === "down"
                    ? "border-l2/40 bg-l2/10 text-l2"
                    : "border-bone bg-white text-carbon hover:border-l2/40 hover:text-l2"
                )}
              >
                <ThumbsDown className="size-3.5" aria-hidden="true" />
                <span className="num">{inc.denies + (vote === "down" ? 1 : 0)}</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* --------------------------------- screen ---------------------------------- */

export default function CommunityScreen() {
  const [incidents, setIncidents] = useState<Incident[]>(() => buildIncidents());
  const [votes, setVotes] = useState<Record<string, Vote | null>>({});
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    fetchCommunityReports()
      .then((reports) => {
        if (!active || !Array.isArray(reports) || reports.length === 0) return;
        const mapped: Incident[] = reports.map((r: any) => ({
          id: `backend-${r.id}`,
          kind: r.issue_type === "overcrowding" ? "crowd" : r.issue_type === "delay" ? "delay" : "elevator",
          severity: r.status === "verified" ? "med" : "low",
          titleAr: r.title_ar || `بلاغ مجتمعي #${r.id}`,
          bodyAr: r.description || "بلاغ وارد من أحد الركاب على الشبكة.",
          stationAr: r.location_name || "محطة بالشبكة",
          lineId: "l1",
          minutesAgo: 4,
          reporterNameAr: "راكب موثق",
          reporterTrust: 96,
          confirms: 5,
          denies: 0,
          status: r.status === "resolved" ? "dismissed" : r.status === "verified" ? "verified" : "pending",
          mine: false,
        }));
        setIncidents((prev) => [...mapped, ...prev]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // deterministic live trust-strip numbers
  const stats = useMemo(
    () => ({
      verifiedToday: 60 + Math.floor(seeded(5) * 200),
      avgVerifyMin: 6 + Math.floor(seeded(9) * 8),
      onlineRiders: 1840 + Math.floor(seeded(13) * 900),
    }),
    []
  );

  const filtered = incidents.filter(
    (i) =>
      (sevFilter === "all" || i.severity === sevFilter) &&
      (lineFilter === "all" || i.lineId === lineFilter)
  );

  const onVote = (id: string, v: Vote) => {
    if (votes[id]) return;
    setVotes((m) => ({ ...m, [id]: v }));
    toast({
      title: v === "up" ? "تم تأكيد البلاغ" : "تم تسجيل حل المشكلة",
      description: "شكراً لك — صوتك يرفع دقة رادار الركاب.",
    });
  };

  const onWizardSubmit = (inc: Incident) => {
    setIncidents((list) => [inc, ...list]);
    setSevFilter("all");
    setLineFilter("all");
  };

  const resetFilters = () => {
    setSevFilter("all");
    setLineFilter("all");
  };

  return (
    <ScreenShell className="pb-24 md:pb-8">
      {/* ------------------------------- hero -------------------------------- */}
      <section className="pt-8 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHead
            tag="COMMUTER RADAR — LIVE"
            title="رادار مجتمع الركاب"
            desc="بلاغات فورية من آلاف الركاب عن الازدحام والأعطال والتأخير — موثقة بنقاط الثقة قبل النشر."
          />
          <span className="mb-1 inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/10 px-3.5 py-1.5 text-[11.5px] font-bold text-emerald">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {MY_TRUST.levelAr} — ثقة
            <span className="num">{MY_TRUST.score}</span>/100
          </span>
        </div>

        {/* live trust strip */}
        <div className="card-mist mt-7 grid gap-5 rounded-3xl p-5 sm:grid-cols-3 sm:gap-0 md:p-6">
          <div className="sm:pe-6">
            <p className="num text-[30px] font-extrabold leading-none tracking-tight text-onyx">
              {stats.verifiedToday}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-slateink">بلاغات موثقة اليوم</p>
          </div>
          <div className="border-t border-bone pt-5 sm:border-s sm:border-t-0 sm:ps-6 sm:pt-0">
            <p className="num text-[30px] font-extrabold leading-none tracking-tight text-onyx">
              {stats.avgVerifyMin} <span className="text-[14px] font-bold text-ash">د</span>
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-slateink">متوسط زمن التحقق</p>
          </div>
          <div className="border-t border-bone pt-5 sm:border-s sm:border-t-0 sm:ps-6 sm:pt-0">
            <p className="num text-[30px] font-extrabold leading-none tracking-tight text-interactive">
              {stats.onlineRiders.toLocaleString("en-US")}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-slateink">
              <span className="gps-pulse size-2 rounded-full bg-interactive" aria-hidden="true" />
              راكب نشط الآن على الرادار
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------- report CTA ------------------------------ */}
      <section className="mt-8">
        <div className="card-flat flex flex-col items-start justify-between gap-5 rounded-3xl p-6 md:flex-row md:items-center md:p-7">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
              <Megaphone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-head text-[16.5px] font-black text-ink md:text-[18px]">
                شايف حاجة في المحطة؟ بلّغها فوراً
              </h3>
              <p className="mt-1 text-[12.5px] leading-6 text-slateink">
                ثلاث خطوات سريعة توفّر على آلاف الركاب قراراً أفضل في مسارهم.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1.5 text-[11px] font-bold text-brand">
              <Plus className="size-3" aria-hidden="true" />
              5 نقاط ثقة لكل بلاغ
            </span>
            <PillButton variant="dark" onClick={() => setWizardOpen(true)}>
              بلاغ سريع في 3 خطوات
            </PillButton>
          </div>
        </div>
      </section>

      {/* ------------------------------ filters ------------------------------- */}
      <section className="mt-10 md:mt-12">
        <div className="flex flex-col gap-3">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5" role="group" aria-label="تصفية حسب الخطورة">
            <FilterChip active={sevFilter === "all"} onClick={() => setSevFilter("all")}>
              كل الدرجات
            </FilterChip>
            {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
              <FilterChip
                key={s}
                active={sevFilter === s}
                onClick={() => setSevFilter(s)}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_META[s].color }}
                  aria-hidden="true"
                />
                {SEVERITY_META[s].labelAr}
              </FilterChip>
            ))}
            <span className="mx-1 h-6 w-px shrink-0 bg-bone" aria-hidden="true" />
            <FilterChip active={lineFilter === "all"} onClick={() => setLineFilter("all")}>
              كل الخطوط
            </FilterChip>
            {REPORT_LINES.map((l) => (
              <FilterChip key={l.id} active={lineFilter === l.id} onClick={() => setLineFilter(l.id)}>
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: l.color }}
                  aria-hidden="true"
                />
                {l.code}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- feed --------------------------------- */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-head text-[16px] font-black text-ink">
              <Radio className="size-4 text-interactive" aria-hidden="true" />
              البلاغات الحية
            </h3>
            <span className="num text-[11.5px] font-medium text-ash">
              {filtered.length} / {incidents.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="card-flat flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-mist border border-bone">
                <Megaphone className="size-5 text-ash" aria-hidden="true" />
              </span>
              <p className="text-[14px] font-bold text-ink">لا توجد بلاغات مطابقة للفلاتر الحالية</p>
              <p className="max-w-xs text-[12.5px] leading-6 text-slateink">
                جرّب توسيع التصفية أو كن أول من يبلّغ عن حالة في هذه المنطقة.
              </p>
              <PillButton variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw aria-hidden="true" />
                مسح الفلاتر
              </PillButton>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((inc) => (
                <IncidentCard key={inc.id} inc={inc} vote={votes[inc.id] ?? null} onVote={onVote} />
              ))}
            </div>
          )}
        </div>

        {/* --------------------------- contributors --------------------------- */}
        <aside className="card-mist rounded-3xl p-5 lg:sticky lg:top-24">
          <h3 className="flex items-center gap-2 font-head text-[14.5px] font-black text-ink">
            <Medal className="size-4 text-brand" aria-hidden="true" />
            أعلى المساهمين هذا الأسبوع
          </h3>
          <div className="mt-4 space-y-3">
            {TOP_CONTRIBUTORS.map((c, i) => (
              <div
                key={c.id}
                className="settle-fast flex items-center gap-3 rounded-2xl border border-bone bg-white p-3 hover:border-cloud"
              >
                <span className="num w-4 text-center text-[13px] font-extrabold text-fog">{i + 1}</span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-bone bg-mist text-[10.5px] font-bold text-carbon">
                  {c.initialsAr}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold text-ink">{c.nameAr}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-bold text-brand">
                    <Medal className="size-3" aria-hidden="true" />
                    {c.badgeAr}
                  </span>
                </span>
                <span className="num text-[13px] font-extrabold text-onyx">
                  {c.points.toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-ash">
            <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            النقاط تُمنح لتأكيد البلاغات الصحيحة وتُخصم عند البلاغات الكاذبة.
          </p>
          <p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-ash">
            <Timer className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            متوسط التحقق المجتمعي أقل من {stats.avgVerifyMin} دقائق.
          </p>
        </aside>
      </section>

      {/* ------------------------------- wizard -------------------------------- */}
      <ReportWizard open={wizardOpen} onOpenChange={setWizardOpen} onSubmit={onWizardSubmit} />
    </ScreenShell>
  );
}
