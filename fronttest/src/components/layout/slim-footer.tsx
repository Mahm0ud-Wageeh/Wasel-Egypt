"use client";

import { WaselLogoMark, MonoTagLike } from "@/components/layout/footer-bits";
import type { NavigateFn } from "@/lib/navigation";

export function SlimFooter({ navigate }: { navigate: NavigateFn }) {
  return (
    <footer className="mt-auto border-t border-bone bg-mist">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-6">
        <div className="flex items-center gap-3">
          <WaselLogoMark className="size-7" />
          <div className="leading-tight">
            <div className="font-head text-[13px] font-black text-ink">واصل مصر</div>
            <div className="text-[11px] text-ash">منصة النقل الذكي المتعدد — القاهرة الكبرى</div>
          </div>
        </div>
        <MonoTagLike />
        <div className="flex items-center gap-4 text-[12px] font-semibold text-slateink">
          <button onClick={() => navigate("fares")} className="cursor-pointer hover:text-ink">
            الأجور الرسمية
          </button>
          <span className="text-cloud">|</span>
          <button onClick={() => navigate("community")} className="cursor-pointer hover:text-ink">
            تقارير المجتمع
          </button>
          <span className="text-cloud">|</span>
          <button onClick={() => navigate("admin")} className="cursor-pointer hover:text-ink">
            غرفة العمليات
          </button>
        </div>
      </div>
      <div className="border-t border-bone/70 py-3 text-center">
        <span className="mono-tag">© 2025 WASEL EGYPT — NATIONAL MULTIMODAL TRANSIT PLATFORM</span>
      </div>
    </footer>
  );
}
