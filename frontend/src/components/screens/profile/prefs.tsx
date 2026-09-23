"use client";

/**
 * Profile sibling — App preferences & system settings (spec 18).
 * Switch rows + display-only language select, professional Arabic copy.
 */

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Languages,
  Moon,
  Volume2,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------- row model ------------------------------ */

interface PrefRow {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  defaultOn: boolean;
}

const PREFS: PrefRow[] = [
  {
    id: "notify",
    icon: Bell,
    title: "الإشعارات اللحظية",
    desc: "تنبيهات فورية لحالة الخطوط وتغيّر رحلاتك المحفوظة",
    defaultOn: true,
  },
  {
    id: "offline",
    icon: WifiOff,
    title: "وضع عدم الاتصال (تخزين محلي)",
    desc: "تخزين بيانات الشبكة محليًا للاستخدام داخل الأنفاق — 22 م.ب",
    defaultOn: false,
  },
  {
    id: "darkmap",
    icon: Moon,
    title: "خريطة داكنة",
    desc: "عرض الخريطة بسمة داكنة مريحة في الإضاءة المنخفضة",
    defaultOn: false,
  },
  {
    id: "chimes",
    icon: Volume2,
    title: "التنبيهات الصوتية",
    desc: "نغمة تنبيه قبل وصول الموقف بدقيقتين",
    defaultOn: true,
  },
];

/* ------------------------------ component ------------------------------- */

export function Preferences() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PREFS.map((p) => [p.id, p.defaultOn]))
  );
  const [lang, setLang] = useState("ar");

  return (
    <div className="card-flat divide-y divide-bone overflow-hidden">
      {PREFS.map((p) => {
        const Icon = p.icon;
        const on = toggles[p.id];
        return (
          <div key={p.id} className="flex items-center gap-4 p-4 md:px-5">
            <span
              className={
                "settle-fast flex size-10 shrink-0 items-center justify-center rounded-xl border " +
                (on ? "border-interactive/25 bg-interactive/10 text-interactive" : "border-bone bg-mist text-slateink")
              }
            >
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-black text-ink">{p.title}</div>
              <div className="mt-0.5 truncate text-[12px] text-slateink">{p.desc}</div>
            </div>
            <Switch
              checked={on}
              onCheckedChange={(v) => setToggles((t) => ({ ...t, [p.id]: v }))}
              aria-label={p.title}
              className="data-[state=checked]:bg-ink"
            />
          </div>
        );
      })}

      {/* language — display-only select */}
      <div className="flex items-center gap-4 p-4 md:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-bone bg-mist text-slateink">
          <Languages className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-black text-ink">اللغة العربية</div>
          <div className="mt-0.5 text-[12px] text-slateink">لغة واجهة التطبيق الحالية</div>
        </div>
        <Select value={lang} onValueChange={setLang} dir="rtl">
          <SelectTrigger
            aria-label="لغة الواجهة"
            className="h-9 w-32 rounded-full border-bone bg-mist px-3.5 text-[12.5px] font-bold text-ink"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="ar" className="text-[13px] font-bold">
              العربية
            </SelectItem>
            <SelectItem value="en" className="text-[13px] font-bold">
              English
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
