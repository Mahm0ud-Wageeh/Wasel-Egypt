"use client";

import dynamic from "next/dynamic";
import { WaselLogoMark } from "@/components/kit";

// Client boundary for catch-all routes: WaselApp reads window.location for
// SPA routing, so it must never SSR/prerender (otherwise /auth prerenders as
// "/" → hydration mismatch). Rendered by the Server Component at
// src/app/[...slug]/page.tsx which keeps generateStaticParams for
// `output: "export"`.
const ClientRoot = dynamic(() => import("@/components/client-root"), {
  ssr: false,
  loading: () => (
    <div
      suppressHydrationWarning
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 bg-white"
    >
      <div suppressHydrationWarning className="gps-pulse rounded-2xl">
        <WaselLogoMark className="size-14" />
      </div>
      <span suppressHydrationWarning className="mono-tag">
        واصل مصر — جاري الاتصال بالشبكة…
      </span>
    </div>
  ),
});

export default function ClientRootDynamic() {
  return <ClientRoot />;
}
