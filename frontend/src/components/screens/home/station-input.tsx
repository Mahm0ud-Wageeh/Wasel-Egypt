"use client";

/**
 * Home — station autocomplete input.
 * Local filtering over a real Greater Cairo station list,
 * keyboard-friendly dropdown, GPS shortcut for the origin field.
 */

import { useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATIONS, type StationLine } from "./data";

interface Option {
  id: string;
  name: string;
  info: string;
  lines: StationLine[];
  gps?: boolean;
}

const GPS_OPTION: Option = {
  id: "gps",
  name: "موقعي الحالي",
  info: "تحديد تلقائي بأقرب محطة",
  lines: [],
  gps: true,
};

/** normalize Arabic input for forgiving matching */
function normalize(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function StationInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  dotColor,
  showGpsOption = false,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  dotColor: string;
  showGpsOption?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const q = normalize(value);
    if (!q) {
      const base = STATIONS.slice(0, 8).map((s) => ({ ...s }));
      return showGpsOption ? [GPS_OPTION, ...base] : base;
    }
    return STATIONS.filter(
      (s) => normalize(s.name).includes(q) || normalize(s.info).includes(q)
    )
      .slice(0, 8)
      .map((s) => ({ ...s }));
  }, [value, showGpsOption]);

  const select = (option: Option) => {
    onChange(option.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" && options[highlight]) {
      event.preventDefault();
      select(options[highlight]);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold text-slateink">
        {label}
      </label>
      <div
        className={cn(
          "settle-fast flex h-[52px] items-center gap-3 rounded-2xl border bg-white px-4",
          open ? "border-interactive/60 ring-2 ring-interactive/15" : "border-bone hover:border-cloud"
        )}
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 0 4px ${dotColor}1a` }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-label={label}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setHighlight(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 bg-transparent text-[14px] font-bold text-ink outline-none placeholder:font-medium placeholder:text-fog"
        />
        {value ? (
          <button
            type="button"
            aria-label="مسح الحقل"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-fog outline-none hover:bg-mercury hover:text-carbon focus-visible:ring-2 focus-visible:ring-interactive/40"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label={`اقتراحات ${label}`}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-bone bg-white shadow-[0_24px_64px_-24px_rgba(9,12,29,0.28)]"
        >
          {options.length === 0 ? (
            <p className="px-4 py-5 text-center text-[12.5px] text-ash">
              لا توجد محطة بهذا الاسم — جرّب اسماً آخر من الشبكة
            </p>
          ) : (
            options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => select(option)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-start",
                  index === highlight ? "bg-mist" : "bg-white"
                )}
              >
                {option.gps ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-interactive/10 text-interactive">
                    <LocateFixed className="size-4" />
                  </span>
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-plaster text-slateink">
                    <MapPin className="size-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">
                    {option.name}
                  </span>
                  <span className="block truncate text-[11px] text-ash">{option.info}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {option.lines.map((line) => (
                    <span
                      key={line.code}
                      className="num rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: `${line.color}14`,
                        color: line.color,
                        border: `1px solid ${line.color}30`,
                      }}
                    >
                      {line.code}
                    </span>
                  ))}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
