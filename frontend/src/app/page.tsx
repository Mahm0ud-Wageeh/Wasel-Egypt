"use client";

import dynamic from "next/dynamic";
import { WaselLogoMark } from "@/components/kit";

const ClientRoot = dynamic(() => import("@/components/client-root"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 bg-white">
      <div className="gps-pulse rounded-2xl">
        <WaselLogoMark className="size-14" />
      </div>
      <span className="mono-tag">واصل مصر — جاري الاتصال بالشبكة…</span>
    </div>
  ),
});

export default function Page() {
  return <ClientRoot />;
}
