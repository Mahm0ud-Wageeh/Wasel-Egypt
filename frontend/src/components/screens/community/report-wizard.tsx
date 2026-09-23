"use client";

/**
 * 3-step rapid report wizard (بلاغ سريع في 3 خطوات).
 * Step 1: pick event type → Step 2: station/line + severity →
 * Step 3: review & send (success state + toast, prepends to feed).
 */

import { useState } from "react";
import {
  CircleCheck,
  ChevronLeft,
  Megaphone,
  Send,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillButton, LineBadge } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  REPORT_KINDS,
  REPORT_LINES,
  REPORT_STATIONS,
  SEVERITY_META,
  kindMeta,
  type Incident,
  type ReportKind,
  type Severity,
} from "./data";
import { submitReport } from "@/api/reports";

const STEPS = ["نوع الحدث", "المحطة والخط", "تأكيد وملخص"];

export interface WizardDraft {
  kind: ReportKind;
  stationAr: string;
  lineId: string;
  severity: Severity;
}

interface ReportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (incident: Incident) => void;
}

export function ReportWizard({ open, onOpenChange, onSubmit }: ReportWizardProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl" dir="rtl">
        {/* flow lives in its own subtree: Radix unmounts it on close,
            so all wizard state resets naturally on every reopen */}
        <WizardFlow onClose={() => onOpenChange(false)} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function WizardFlow({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (incident: Incident) => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [stationAr, setStationAr] = useState<string>("");
  const [lineId, setLineId] = useState<string>("");
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const canNext = step === 0 ? kind !== null : step === 1 ? stationAr !== "" && lineId !== "" && severity !== null : true;

  const submit = () => {
    if (kind === null || severity === null || !stationAr || !lineId) return;
    const meta = kindMeta(kind);
    const draft: Incident = {
      id: `mine-${Date.now()}`,
      kind,
      severity,
      titleAr: `بلاغ ${meta.labelAr} — ${stationAr}`,
      bodyAr: `بلاغك عن ${meta.labelAr} في محطة ${stationAr} أُرسل إلى مجتمع الركاب وقيد التحقق الآن.`,
      stationAr,
      lineId,
      minutesAgo: 0,
      confirms: 0,
      denies: 0,
      status: "pending",
      reporterNameAr: "أنت",
      reporterTrust: 98,
      mine: true,
    };
    onSubmit(draft);
    setSent(true);

    submitReport({
      issue_type: kind,
      description: `بلاغ عن ${meta.labelAr} في محطة ${stationAr}`,
      latitude: 30.0444,
      longitude: 31.2357,
      station_name: stationAr,
    }).catch(() => {});

    toast({
      title: "تم إرسال بلاغك بنجاح",
      description: "سيظهر في الصف قيد التحقق حتى يؤكده ركاب آخرون. شكراً لمساهمتك.",
    });
  };

  return (
    <>
      {sent ? (
          /* ------------------------------ success ----------------------------- */
          <div className="flex flex-col items-center py-6 text-center">
            <span className="gps-pulse flex size-16 items-center justify-center rounded-full bg-emerald/10">
              <CircleCheck className="size-8 text-emerald" aria-hidden="true" />
            </span>
            <DialogHeader className="mt-5 items-center space-y-0 text-center">
              <DialogTitle className="font-head text-[19px] font-black text-ink">
                تم إرسال بلاغك
              </DialogTitle>
              <DialogDescription className="mt-2 text-[13px] leading-7 text-slateink">
                بلاغك قيد التحقق من مجتمع الركاب، وسيُنشر في الرادار بعد التأكيد.
                أضفنا نقطة ثقة لحسابك.
              </DialogDescription>
            </DialogHeader>
            <PillButton variant="dark" className="mt-6" onClick={onClose}>
              رجوع إلى الرادار
            </PillButton>
          </div>
        ) : (
          <>
            <DialogHeader className="text-start">
              <DialogTitle className="flex items-center gap-2 font-head text-[17px] font-black text-ink">
                <Megaphone className="size-4.5 text-brand" aria-hidden="true" />
                بلاغ سريع في 3 خطوات
              </DialogTitle>
              <DialogDescription className="text-[12.5px] leading-6">
                بلاغ واحد موثق يوفّر على آلاف الركاب — تستغرق العملية أقل من 20 ثانية.
              </DialogDescription>
            </DialogHeader>

            {/* stepper */}
            <div className="flex items-center gap-2" aria-label={`الخطوة ${step + 1} من 3`}>
              {STEPS.map((label, i) => (
                <div key={label} className="flex flex-1 flex-col gap-1.5">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      i <= step ? "bg-ink" : "bg-mercury"
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-[10.5px] font-bold",
                      i === step ? "text-ink" : "text-fog"
                    )}
                  >
                    {i + 1}. {label}
                  </span>
                </div>
              ))}
            </div>

            {/* ------------------------------ step 1 ----------------------------- */}
            {step === 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {REPORT_KINDS.map(({ kind: k, labelAr, icon: Icon }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    aria-pressed={kind === k}
                    className={cn(
                      "settle-fast flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-2 py-4 outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
                      kind === k
                        ? "border-ink bg-ink text-white"
                        : "border-bone bg-white text-carbon hover:border-cloud hover:bg-mist"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="text-[12px] font-bold">{labelAr}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* ------------------------------ step 2 ----------------------------- */}
            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[11.5px] font-bold text-slateink">المحطة</label>
                    <Select dir="rtl" value={stationAr} onValueChange={setStationAr}>
                      <SelectTrigger className="h-11 w-full rounded-2xl border-bone bg-white px-3.5 text-[13.5px] font-bold text-ink shadow-none hover:border-cloud">
                        <SelectValue placeholder="اختر المحطة" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 rounded-2xl">
                        {REPORT_STATIONS.map((s) => (
                          <SelectItem key={s} value={s} className="rounded-xl py-2 text-[13.5px]">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11.5px] font-bold text-slateink">الخط</label>
                    <Select dir="rtl" value={lineId} onValueChange={setLineId}>
                      <SelectTrigger className="h-11 w-full rounded-2xl border-bone bg-white px-3.5 text-[13.5px] font-bold text-ink shadow-none hover:border-cloud">
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {REPORT_LINES.map((l) => (
                          <SelectItem key={l.id} value={l.id} className="rounded-xl py-2 text-[13.5px]">
                            <span className="flex items-center gap-2">
                              <LineBadge code={l.code} color={l.color} size="sm" />
                              {l.nameAr}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11.5px] font-bold text-slateink">مدى الخطورة</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SEVERITY_META) as Severity[]).map((s) => {
                      const meta = SEVERITY_META[s];
                      const active = severity === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeverity(s)}
                          aria-pressed={active}
                          className="settle-fast inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-[12.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
                          style={
                            active
                              ? { backgroundColor: `${meta.color}14`, color: meta.color, borderColor: `${meta.color}45` }
                              : { borderColor: "#e8e8e8", color: "#646464" }
                          }
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                            aria-hidden="true"
                          />
                          {meta.labelAr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ------------------------------ step 3 ----------------------------- */}
            {step === 2 ? (
              <div className="space-y-3.5">
                <div className="card-mist rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      {(() => {
                        const meta = kindMeta(kind!);
                        const Icon = meta.icon;
                        return (
                          <span className="flex size-9 items-center justify-center rounded-xl border border-bone bg-white text-ink">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                        );
                      })()}
                      <span className="text-[13.5px] font-bold text-ink">
                        {kind ? kindMeta(kind).labelAr : ""}
                      </span>
                    </span>
                    {severity ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                        style={{
                          backgroundColor: `${SEVERITY_META[severity].color}14`,
                          color: SEVERITY_META[severity].color,
                        }}
                      >
                        خطورة {SEVERITY_META[severity].labelAr}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-bone pt-3 text-[12.5px] font-medium text-carbon">
                    <MapPin className="size-3.5 text-interactive" aria-hidden="true" />
                    {stationAr}
                    {lineId
                      ? (() => {
                          const l = REPORT_LINES.find((x) => x.id === lineId)!;
                          return <LineBadge code={l.code} color={l.color} size="sm" />;
                        })()
                      : null}
                  </div>
                </div>
                <p className="rounded-2xl bg-brand/[0.06] px-4 py-3 text-[11.5px] leading-6 text-brand">
                  بلاغك سيُحسب لصالح موثوقية المجتمع. البلاغات الكاذبة تخفض نقاط الثقة.
                </p>
              </div>
            ) : null}

            {/* ---------------------------- nav buttons ---------------------------- */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {step === 0 ? (
                <PillButton variant="ghost" size="sm" onClick={onClose}>
                  إلغاء
                </PillButton>
              ) : (
                <PillButton variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="rotate-180" aria-hidden="true" />
                  السابق
                </PillButton>
              )}
              {step < 2 ? (
                <PillButton variant="dark" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                  التالي
                  <ChevronLeft aria-hidden="true" />
                </PillButton>
              ) : (
                <PillButton variant="dark" onClick={submit}>
                  <Send aria-hidden="true" />
                  إرسال البلاغ
                </PillButton>
              )}
            </div>
          </>
        )}
    </>
  );
}
