"use client";

/**
 * Wasel Egypt — shared UI kit.
 * ClickUp-grade professional primitives: 9999px pills, hairline
 * flat cards, mono meta tags, official line badges.
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  TrainFront,
  TramFront,
  TrainTrack,
  Bus,
  BusFront,
  Footprints,
  type LucideIcon,
} from "lucide-react";
import type { TransitMode } from "@/lib/transit-data";

/* Re-export: network template imports MODE_LABEL_AR from the kit
 * (pre-existing 3-d import contract); canonical source is transit-data. */
export { MODE_LABEL_AR } from "@/lib/transit-data";

/* ---------------------------------- Logo ---------------------------------- */

export function WaselLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#202020" />
      <path
        d="M8 21c4 0 4-10 8-10s4 10 8 10"
        stroke="#6647f0"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8" cy="21" r="2.4" fill="#0091ff" />
      <circle cx="24" cy="21" r="2.4" fill="#ffffff" />
    </svg>
  );
}

export function WaselLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <WaselLogoMark />
      <span className="leading-none">
        <span className="block font-head text-[19px] font-black text-ink">
          واصل <span className="text-brand">مصر</span>
        </span>
        <span className="mono-tag mt-1 block !text-[9px]">WASEL EGYPT</span>
      </span>
    </span>
  );
}

/* -------------------------------- Buttons --------------------------------- */

type PillVariant = "dark" | "outline" | "blue" | "ghost" | "brand" | "mist";
type PillSize = "sm" | "md" | "lg";

const pillVariants: Record<PillVariant, string> = {
  dark: "bg-ink text-white hover:bg-carbon",
  outline: "bg-transparent text-ink border border-bone hover:border-cloud hover:bg-mist",
  blue: "bg-transparent text-interactive border border-interactive/60 hover:bg-interactive/10",
  ghost: "bg-transparent text-carbon hover:bg-ink/[0.05]",
  brand: "bg-brand text-white hover:bg-brand/90",
  mist: "bg-mist text-ink border border-bone hover:bg-mercury",
};

const pillSizes: Record<PillSize, string> = {
  sm: "h-8 px-3.5 text-[12px]",
  md: "h-10 px-5 text-[13px]",
  lg: "h-12 px-7 text-[14px]",
};

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  size?: PillSize;
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant = "dark", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "settle-fast inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-head font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        pillVariants[variant],
        pillSizes[size],
        className
      )}
      {...props}
    />
  )
);
PillButton.displayName = "PillButton";

/* ------------------------------- Line badge ------------------------------- */

export function LineBadge({
  code,
  color,
  size = "md",
  className,
}: {
  code: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-5 gap-1.5 px-2 text-[10px] [&_svg]:size-2.5",
    md: "h-7 gap-1.5 px-2.5 text-[12px] [&_svg]:size-3",
    lg: "h-9 gap-2 px-3.5 text-[14px] [&_svg]:size-3.5",
  } as const;
  return (
    <span
      className={cn(
        "num inline-flex shrink-0 items-center rounded-full font-mono font-bold tracking-tight",
        sizes[size],
        className
      )}
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
    >
      <svg viewBox="0 0 8 8" className="rounded-full" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill={color} />
      </svg>
      {code}
    </span>
  );
}

/* -------------------------------- Mode icon ------------------------------- */

export const MODE_ICONS: Record<TransitMode, LucideIcon> = {
  metro: TrainFront,
  lrt: TramFront,
  monorail: TrainTrack,
  brt: BusFront,
  train: TrainFront,
  bus: Bus,
  microbus: Bus,
  walk: Footprints,
};

export function ModeIcon({
  mode,
  className,
  strokeWidth = 2,
}: {
  mode: TransitMode;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = MODE_ICONS[mode] ?? TrainFront;
  return <Icon className={cn("size-4", className)} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/* ------------------------------- Status pill ------------------------------ */

export type StatusTone = "ontime" | "delay" | "info" | "closed" | "neutral";

const statusTones: Record<StatusTone, string> = {
  ontime: "bg-emerald/10 text-emerald border-emerald/25",
  delay: "bg-l2/10 text-l2 border-l2/25",
  info: "bg-interactive/10 text-interactive border-interactive/25",
  closed: "bg-mercury text-slateink border-cloud",
  neutral: "bg-mist text-carbon border-bone",
};

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none [&_svg]:size-3",
        statusTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Section header ---------------------------- */

export function SectionHead({
  tag,
  title,
  desc,
  align = "start",
  className,
}: {
  tag?: string;
  title: React.ReactNode;
  desc?: string;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {tag ? (
        <span className={cn("mono-tag mb-3 block", align === "center" && "mx-auto")}>{tag}</span>
      ) : null}
      <h2 className="font-head text-[26px] font-black leading-[1.25] text-ink md:text-[32px]">
        {title}
      </h2>
      {desc ? <p className="mt-3 text-[14px] leading-7 text-slateink">{desc}</p> : null}
    </div>
  );
}

/* ---------------------------------- Stat ---------------------------------- */

export function Stat({
  value,
  label,
  tone = "ink",
  className,
}: {
  value: string;
  label: string;
  tone?: "ink" | "brand" | "interactive";
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={cn(
          "num font-latin text-[34px] font-extrabold leading-none tracking-tight md:text-[44px]",
          tone === "ink" && "text-onyx",
          tone === "brand" && "text-brand",
          tone === "interactive" && "text-interactive"
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium text-slateink">{label}</div>
    </div>
  );
}

/* --------------------------------- Chips ---------------------------------- */

export function FilterChip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "settle-fast inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 [&_svg]:size-3.5",
        active
          ? "bg-ink text-white"
          : "border border-bone bg-white text-carbon hover:border-cloud hover:bg-mist",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------ Screen scaffold --------------------------- */

export function ScreenShell({
  children,
  className,
  bare = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** bare: full-bleed (no max-width container) for map/admin canvases */
  bare?: boolean;
}) {
  return (
    <div className={cn(bare ? "w-full" : "mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}>
      {children}
    </div>
  );
}

export function ScreenTitle({
  title,
  sub,
  tag,
  action,
}: {
  title: string;
  sub?: string;
  tag?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <SectionHead tag={tag} title={title} desc={sub} />
      {action}
    </div>
  );
}
