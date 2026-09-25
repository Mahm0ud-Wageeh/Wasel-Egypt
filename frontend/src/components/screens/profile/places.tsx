"use client";

/**
 * Profile sibling — Saved frequent places (spec 18).
 * Home / Work cards with edit dialog (label + nearest station picker)
 * and a dashed "add place" card.
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, Home, MapPin, Pencil, Plus, TrainFront, Trash2, Loader2 } from "lucide-react";

/* ------------------------------ local data ------------------------------ */

const STATIONS = [
  "السادات",
  "التحرير",
  "جيزة",
  "المعادي",
  "حلوان",
  "المرج الجديدة",
  "عدلي منصور",
  "الاستاد",
  "شبرا الخيمة",
  "المنيب",
  "محور محمد نجيب",
  "العاصمة الإدارية",
  "رمسيس",
];

interface Place {
  id: string | number;
  name?: string;
  label?: string;
  icon?: "home" | "work" | "pin";
  address?: string;
  station?: string;
  latitude?: number;
  longitude?: number;
}

const PLACE_ICONS = {
  home: Home,
  work: Briefcase,
  pin: MapPin,
} as const;

/* ------------------------------ component ------------------------------ */

export function SavedPlaces() {
  const { isLoggedIn, user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [editing, setEditing] = useState<Place | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPlaces = useCallback(async () => {
    if (!isLoggedIn) {
      setPlaces([]);
      return;
    }
    try {
      setLoading(true);
      const res = await apiRequest<{ data?: Place[] } | Place[]>(endpoints.favoriteLocations.list);
      const list = Array.isArray(res) ? res : (res as any)?.data;
      if (Array.isArray(list)) {
        setPlaces(
          list.map((item: any) => ({
            id: item.id,
            label: item.name || item.label || "مكان محفوظ",
            icon: item.place_type === "home" ? "home" : item.place_type === "work" ? "work" : "pin",
            address: item.address || `محطة ${item.name}`,
            station: item.name || "محطة المترو",
          }))
        );
      } else {
        setPlaces([]);
      }
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleDelete = async (id: string | number) => {
    if (isLoggedIn) {
      try {
        await apiRequest(endpoints.favoriteLocations.delete(id), { method: "DELETE" });
        await fetchPlaces();
        toast({ title: "تم حذف المكان بنجاح" });
      } catch {
        toast({ title: "تعذر حذف المكان", variant: "destructive" });
      }
    } else {
      setPlaces((ps) => ps.filter((p) => p.id !== id));
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((p) => {
          const Icon = PLACE_ICONS[p.icon];
          return (
            <div key={p.id} className="card-flat group p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-bone bg-mist text-ink">
                  <Icon className="size-5" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="settle-fast flex size-8 cursor-pointer items-center justify-center rounded-full text-slateink opacity-70 hover:bg-mist hover:text-ink hover:opacity-100"
                    aria-label={`تعديل ${p.label}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="settle-fast flex size-8 cursor-pointer items-center justify-center rounded-full text-slateink opacity-70 hover:bg-mist hover:text-l2 hover:opacity-100"
                    aria-label={`حذف ${p.label}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3.5 font-head text-[15px] font-black text-ink">{p.label}</div>
              <p className="mt-1 text-[12.5px] leading-6 text-slateink">{p.address}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-bone bg-mist px-2.5 py-1 text-[11px] font-bold text-carbon">
                <TrainFront className="size-3 text-interactive" />
                أقرب محطة: {p.station}
              </div>
            </div>
          );
        })}

        {/* add place — dashed */}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="settle-fast group flex min-h-[152px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-cloud bg-white text-slateink hover:border-interactive/50 hover:bg-interactive/[0.03] hover:text-interactive"
        >
          <span className="flex size-10 items-center justify-center rounded-full border border-current">
            <Plus className="size-4.5" />
          </span>
          <span className="text-[13px] font-bold">إضافة مكان</span>
        </button>
      </div>

      <PlaceDialog
        key={editing ? editing.id : adding ? "add" : "closed"}
        open={editing !== null || adding}
        place={editing}
        onClose={() => {
          setEditing(null);
          setAdding(false);
        }}
        onSave={async (label, station) => {
          const placeLabel = label || station || "مكان محفوظ";
          try {
            if (isLoggedIn) {
              await apiRequest(endpoints.favoriteLocations.create, {
                method: "POST",
                body: {
                  name: placeLabel,
                  address: `بالقرب من محطة ${station}`,
                  latitude: 30.0444,
                  longitude: 31.2357,
                  place_type: placeLabel.includes("منزل") ? "home" : placeLabel.includes("عمل") ? "work" : "other",
                },
              });
              await fetchPlaces();
            } else {
              setPlaces((ps) => [
                ...ps,
                { id: `p${ps.length + 1}`, label: placeLabel, icon: "pin", address: `بالقرب من محطة ${station}`, station },
              ]);
            }
            toast({ title: "تم حفظ المكان بنجاح", description: `${placeLabel} — أقرب محطة: ${station}` });
          } catch {
            setPlaces((ps) => [
              ...ps,
              { id: `p${ps.length + 1}`, label: placeLabel, icon: "pin", address: `بالقرب من محطة ${station}`, station },
            ]);
            toast({ title: "تم حفظ المكان محلياً", description: `${placeLabel}` });
          }
          setEditing(null);
          setAdding(false);
        }}
      />
    </>
  );
}

/* ------------------------------- dialog -------------------------------- */

function PlaceDialog({
  open,
  place,
  onClose,
  onSave,
}: {
  open: boolean;
  place: Place | null;
  onClose: () => void;
  onSave: (label: string, station: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [station, setStation] = useState("");

  const title = place ? `تعديل ${place.label}` : "إضافة مكان جديد";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogTitle className="font-head text-[17px] font-black text-ink">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-[12.5px] leading-6 text-slateink">
          سمِّ المكان واختر أقرب محطة لاستخدامه بنقرة واحدة في تخطيط الرحلات.
        </DialogDescription>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-carbon" htmlFor="place-label">
              اسم المكان
            </label>
            <input
              id="place-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={place ? place.label : "مثال: الجامعة"}
              className={cn(
                "h-12 w-full rounded-2xl border border-bone bg-white px-4 text-[14px] font-medium text-ink outline-none settle-fast placeholder:text-fog focus:border-interactive/60"
              )}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-carbon" htmlFor="place-station">
              أقرب محطة
            </label>
            <Select
              value={station}
              onValueChange={(v) => setStation(v)}
              dir="rtl"
            >
              <SelectTrigger
                id="place-station"
                className="h-12 w-full rounded-2xl border-bone bg-white px-4 text-[13.5px] font-bold text-ink"
              >
                <SelectValue placeholder="اختر المحطة" />
              </SelectTrigger>
              <SelectContent className="max-h-64 rounded-2xl">
                {STATIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-[13px] font-bold">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <PillButton
            variant="dark"
            className="flex-1"
            onClick={() => {
              if (!station) return;
              onSave(label.trim(), station);
              setLabel("");
              setStation("");
            }}
            disabled={!station}
          >
            حفظ المكان
          </PillButton>
          <PillButton
            variant="outline"
            onClick={() => {
              onClose();
              setLabel("");
              setStation("");
            }}
          >
            إلغاء
          </PillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
