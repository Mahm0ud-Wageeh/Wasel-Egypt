"use client";

/**
 * Welcome — Interactive Cairo map teaser.
 * Pure local SVG mini-schematic of the Greater Cairo transit spine:
 * Nile curve + official line colors + flowing dashes + hover highlight.
 * No map libraries, no external tiles.
 */

import { cn } from "@/lib/utils";

export interface MapLine {
  id: string;
  label: string;
  color: string;
  path: string;
  /** small mid-line station dots */
  dots: [number, number][];
}

export const MAP_LINES: MapLine[] = [
  {
    id: "metro-l1",
    label: "L1",
    color: "#1d4ed8",
    path:
      "M 588 606 C 560 520, 522 460, 492 396 C 466 340, 458 312, 468 292 C 478 268, 490 240, 492 216 C 500 196, 540 166, 566 150 C 606 124, 642 84, 668 52",
    dots: [
      [522, 192],
      [640, 86],
    ],
  },
  {
    id: "metro-l2",
    label: "L2",
    color: "#dc2626",
    path:
      "M 582 44 C 560 96, 540 150, 508 196 C 500 206, 496 210, 492 216 C 482 244, 476 272, 468 292 C 458 318, 414 336, 380 344 C 370 347, 360 349, 352 352 C 332 357, 322 362, 312 368 C 296 374, 280 378, 268 384 C 250 398, 234 428, 222 470",
    dots: [
      [400, 346],
      [250, 432],
    ],
  },
  {
    id: "metro-l3",
    label: "L3",
    color: "#16a34a",
    path:
      "M 218 330 C 244 346, 258 366, 268 384 C 300 362, 360 332, 420 306 C 458 289, 486 272, 502 258 C 560 228, 648 196, 716 158 C 740 144, 762 132, 782 120",
    dots: [
      [360, 332],
      [648, 196],
    ],
  },
  {
    id: "metro-l4",
    label: "L4",
    color: "#ea580c",
    path:
      "M 150 520 C 220 480, 300 452, 372 428 C 430 408, 470 392, 512 388 C 590 382, 668 398, 742 412 C 772 418, 802 424, 830 430",
    dots: [
      [372, 428],
      [742, 412],
    ],
  },
  {
    id: "lrt",
    label: "LRT",
    color: "#0284c7",
    path: "M 782 120 C 806 152, 826 186, 840 214 C 846 224, 852 232, 856 238",
    dots: [[826, 186]],
  },
  {
    id: "monorail-east",
    label: "MNR",
    color: "#7c3aed",
    path: "M 640 320 C 700 300, 760 280, 812 264 C 836 256, 858 250, 876 246",
    dots: [[760, 280]],
  },
  {
    id: "brt",
    label: "BRT",
    color: "#d97706",
    path:
      "M 200 330 C 210 210, 300 100, 450 78 C 610 58, 760 120, 806 240 C 850 350, 800 470, 690 545 C 570 618, 380 610, 280 520 C 222 466, 195 400, 200 330 Z",
    dots: [
      [450, 78],
      [806, 240],
      [280, 520],
    ],
  },
];

const BRT_PATH =
  "M 200 330 C 210 210, 300 100, 450 78 C 610 58, 760 120, 806 240 C 850 350, 800 470, 690 545 C 570 618, 380 610, 280 520 C 222 466, 195 400, 200 330 Z";

const INTERCHANGES: [number, number][] = [
  [468, 292], // السادات L1/L2
  [492, 216], // الشهداء L1/L2
  [268, 384], // جامعة القاهرة L2/L3
  [782, 120], // عدلي منصور L3/LRT
  [876, 246], // العاصمة الإدارية MNR
  [856, 238], // مدينة الفنون والثقافة LRT
];

const LABELS: { x: number; y: number; text: string }[] = [
  { x: 588, y: 630, text: "حلوان" },
  { x: 686, y: 40, text: "المرج الجديدة" },
  { x: 584, y: 28, text: "شبرا الخيمة" },
  { x: 204, y: 486, text: "المونيب" },
  { x: 202, y: 326, text: "كت كات" },
  { x: 136, y: 538, text: "الحرام" },
  { x: 836, y: 454, text: "التجمع الخامس" },
  { x: 778, y: 102, text: "عدلي منصور" },
  { x: 872, y: 222, text: "العاصمة الإدارية" },
  { x: 622, y: 344, text: "محور محمد نجيب" },
  { x: 352, y: 376, text: "جيزة" },
  { x: 258, y: 408, text: "جامعة القاهرة" },
  { x: 452, y: 316, text: "السادات" },
  { x: 508, y: 252, text: "التحرير" },
];

export function MapTeaser({
  active,
  onActiveChange,
  onLineSelect,
  className,
}: {
  active: string | null;
  onActiveChange: (id: string | null) => void;
  onLineSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 900 640"
      className={cn("h-full w-full select-none", className)}
      role="img"
      aria-label="مخطط مبسط لشبكة نقل القاهرة الكبرى"
    >
      {/* Nile — geographic context */}
      <path
        d="M 386 640 C 420 560, 350 470, 372 400 C 392 336, 366 290, 396 220 C 420 160, 400 90, 436 0"
        fill="none"
        stroke="#0091ff"
        strokeOpacity="0.08"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M 386 640 C 420 560, 350 470, 372 400 C 392 336, 366 290, 396 220 C 420 160, 400 90, 436 0"
        fill="none"
        stroke="#5fb3ee"
        strokeOpacity="0.5"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <text
        x="404"
        y="150"
        fill="#4a9bd6"
        fillOpacity="0.75"
        fontSize="13"
        fontWeight="700"
        textAnchor="middle"
        transform="rotate(-76 404 150)"
        style={{ fontFamily: "var(--font-head)" }}
      >
        نهر النيل
      </text>

      {/* Transit lines */}
      {MAP_LINES.map((line) => {
        const dimmed = active !== null && active !== line.id;
        const emphasized = active === line.id;
        return (
          <g
            key={line.id}
            onMouseEnter={() => onActiveChange(line.id)}
            onMouseLeave={() => onActiveChange(null)}
            onClick={() => onLineSelect(line.id)}
            className="cursor-pointer"
            style={{
              opacity: dimmed ? 0.18 : 1,
              transition: "opacity 0.3s cubic-bezier(0.33,1,0.68,1)",
            }}
          >
            <path
              d={line.id === "brt" ? BRT_PATH : line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={emphasized ? 6 : 3.5}
              strokeLinecap="round"
              className="dash-flow"
              style={{ transition: "stroke-width 0.15s cubic-bezier(0.33,1,0.68,1)" }}
            />
            {line.dots.map(([cx, cy]) => (
              <circle
                key={`${line.id}-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={emphasized ? 5 : 4}
                fill="#ffffff"
                stroke={line.color}
                strokeWidth="2.5"
              />
            ))}
          </g>
        );
      })}

      {/* Interchange nodes */}
      <g style={{ opacity: active ? 0.85 : 1, transition: "opacity 0.3s" }}>
        {INTERCHANGES.map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="8.5" fill="#ffffff" />
            <circle cx={cx} cy={cy} r="5" fill="#202020" />
          </g>
        ))}
      </g>

      {/* Station labels */}
      <g
        fill="#5c5c5c"
        fontSize="13"
        fontWeight="600"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-head)", paintOrder: "stroke" }}
        stroke="#ffffff"
        strokeWidth="4"
      >
        {LABELS.map((l) => (
          <text key={l.text} x={l.x} y={l.y}>
            {l.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
