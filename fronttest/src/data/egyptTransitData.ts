/**
 * Comprehensive Egypt Transit System Data.
 * Real station names, lines, interchanges, coordinates, and tariff rules.
 */
import { MODE_COLORS, THEME_COLORS } from '../components/icons'

export interface Station {
  id: string | number
  name_ar: string
  name_en: string
  lat: number
  lng: number
  modes: ('metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus')[]
  lines: string[]
  zone_ar: string
  zone_en: string
  isInterchange?: boolean
}

export interface TransitLine {
  id: string
  mode: 'metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus'
  name_ar: string
  name_en: string
  code: string
  color: string
  route_ar: string
  route_en: string
  stationsCount: number
  lengthKm: number
  stations: Station[]
  status: 'normal' | 'delay' | 'maintenance'
  delayMinutes?: number
  alert_ar?: string
  alert_en?: string
}

export const EGYPT_STATIONS: Station[] = [
  // Interchanges & Hubs
  {
    id: 'st_ramses',
    name_ar: 'الشهداء (رمسيس)',
    name_en: 'Al-Shohadaa (Ramses)',
    lat: 30.0617,
    lng: 31.2497,
    modes: ['metro', 'train'],
    lines: ['metro_1', 'metro_2', 'rail_cairo'],
    zone_ar: 'وسط البلد',
    zone_en: 'Downtown',
    isInterchange: true,
  },
  {
    id: 'st_sadat',
    name_ar: 'السادات (التحرير)',
    name_en: 'Sadat (Tahrir)',
    lat: 30.0444,
    lng: 31.2357,
    modes: ['metro'],
    lines: ['metro_1', 'metro_2'],
    zone_ar: 'وسط البلد',
    zone_en: 'Downtown',
    isInterchange: true,
  },
  {
    id: 'st_attaba',
    name_ar: 'العتبة',
    name_en: 'Al-Ataba',
    lat: 30.0526,
    lng: 31.2472,
    modes: ['metro'],
    lines: ['metro_2', 'metro_3'],
    zone_ar: 'وسط البلد',
    zone_en: 'Downtown',
    isInterchange: true,
  },
  {
    id: 'st_nasser',
    name_ar: 'جمال عبد الناصر',
    name_en: 'Gamal Abdel Nasser',
    lat: 30.0531,
    lng: 31.2398,
    modes: ['metro'],
    lines: ['metro_1', 'metro_3'],
    zone_ar: 'وسط البلد',
    zone_en: 'Downtown',
    isInterchange: true,
  },
  {
    id: 'st_adly_mansour',
    name_ar: 'عدلي منصور المركزية',
    name_en: 'Adly Mansour Central',
    lat: 30.1467,
    lng: 31.4214,
    modes: ['metro', 'lrt', 'train', 'brt'],
    lines: ['metro_3', 'lrt_capital', 'brt_ring', 'rail_suez'],
    zone_ar: 'شرق القاهرة',
    zone_en: 'East Cairo',
    isInterchange: true,
  },
  {
    id: 'st_giza',
    name_ar: 'محطة الجيزة',
    name_en: 'Giza Station',
    lat: 30.0108,
    lng: 31.2069,
    modes: ['metro', 'train'],
    lines: ['metro_2', 'rail_upper_egypt'],
    zone_ar: 'الجيزة',
    zone_en: 'Giza',
    isInterchange: true,
  },
  {
    id: 'st_moneeb',
    name_ar: 'المنيب',
    name_en: 'El-Moneeb',
    lat: 29.9814,
    lng: 31.2125,
    modes: ['metro', 'bus', 'brt'],
    lines: ['metro_2', 'brt_ring'],
    zone_ar: 'جنوب الجيزة',
    zone_en: 'South Giza',
    isInterchange: true,
  },
  {
    id: 'st_faisal',
    name_ar: 'فيصل',
    name_en: 'Faisal',
    lat: 30.0169,
    lng: 31.2039,
    modes: ['metro'],
    lines: ['metro_2'],
    zone_ar: 'الجيزة',
    zone_en: 'Giza',
  },
  {
    id: 'st_dokki',
    name_ar: 'الدقي',
    name_en: 'Dokki',
    lat: 30.0384,
    lng: 31.2122,
    modes: ['metro'],
    lines: ['metro_2'],
    zone_ar: 'الجيزة',
    zone_en: 'Giza',
  },
  {
    id: 'st_cairo_univ',
    name_ar: 'جامعة القاهرة',
    name_en: 'Cairo University',
    lat: 30.0264,
    lng: 31.2017,
    modes: ['metro'],
    lines: ['metro_2', 'metro_3'],
    zone_ar: 'الجيزة',
    zone_en: 'Giza',
    isInterchange: true,
  },
  {
    id: 'st_zamalek',
    name_ar: 'صفاء حجازي (الزمالك)',
    name_en: 'Safaa Hegazy (Zamalek)',
    lat: 30.0638,
    lng: 31.2215,
    modes: ['metro'],
    lines: ['metro_3'],
    zone_ar: 'الزمالك',
    zone_en: 'Zamalek',
  },
  {
    id: 'st_kitkat',
    name_ar: 'الكيت كات',
    name_en: 'Kit Kat',
    lat: 30.0658,
    lng: 31.2131,
    modes: ['metro'],
    lines: ['metro_3'],
    zone_ar: 'شمال الجيزة',
    zone_en: 'North Giza',
    isInterchange: true,
  },
  {
    id: 'st_heliopolis',
    name_ar: 'هليوبوليس',
    name_en: 'Heliopolis',
    lat: 30.0989,
    lng: 31.3325,
    modes: ['metro'],
    lines: ['metro_3'],
    zone_ar: 'مصر الجديدة',
    zone_en: 'Heliopolis',
  },
  {
    id: 'st_stadium',
    name_ar: 'الاستاد',
    name_en: 'The Stadium',
    lat: 30.0718,
    lng: 31.3023,
    modes: ['metro', 'monorail'],
    lines: ['metro_3', 'monorail_east'],
    zone_ar: 'مدينة نصر',
    zone_en: 'Nasr City',
    isInterchange: true,
  },
  {
    id: 'st_arts_culture',
    name_ar: 'مدينة الفنون والثقافة (العاصمة)',
    name_en: 'Arts & Culture City (New Capital)',
    lat: 30.0167,
    lng: 31.7333,
    modes: ['lrt', 'monorail'],
    lines: ['lrt_capital', 'monorail_east'],
    zone_ar: 'العاصمة الإدارية',
    zone_en: 'New Admin Capital',
    isInterchange: true,
  },
  {
    id: 'st_ministries',
    name_ar: 'الحي الحكومي (العاصمة)',
    name_en: 'Ministries District (New Capital)',
    lat: 30.0142,
    lng: 31.7511,
    modes: ['monorail'],
    lines: ['monorail_east'],
    zone_ar: 'العاصمة الإدارية',
    zone_en: 'New Admin Capital',
  },
  {
    id: 'st_shorouk',
    name_ar: 'الشروق',
    name_en: 'El Shorouk',
    lat: 30.1342,
    lng: 31.6025,
    modes: ['lrt'],
    lines: ['lrt_capital'],
    zone_ar: 'الشروق',
    zone_en: 'El Shorouk',
  },
  {
    id: 'st_badr',
    name_ar: 'بدر',
    name_en: 'Badr',
    lat: 30.1415,
    lng: 31.7188,
    modes: ['lrt'],
    lines: ['lrt_capital'],
    zone_ar: 'مدينة بدر',
    zone_en: 'Badr City',
    isInterchange: true,
  },
  {
    id: 'st_marg_new',
    name_ar: 'المرج الجديدة',
    name_en: 'New El-Marg',
    lat: 30.1633,
    lng: 31.3392,
    modes: ['metro'],
    lines: ['metro_1'],
    zone_ar: 'شمال شرق القاهرة',
    zone_en: 'North East Cairo',
  },
  {
    id: 'st_helwan',
    name_ar: 'حلوان',
    name_en: 'Helwan',
    lat: 29.8492,
    lng: 31.3342,
    modes: ['metro'],
    lines: ['metro_1'],
    zone_ar: 'حلوان',
    zone_en: 'Helwan',
  },
  {
    id: 'st_shubra',
    name_ar: 'شبرا الخيمة',
    name_en: 'Shubra El-Kheima',
    lat: 30.1228,
    lng: 31.2447,
    modes: ['metro', 'train'],
    lines: ['metro_2', 'rail_delta'],
    zone_ar: 'القليوبية',
    zone_en: 'Qalyubia',
    isInterchange: true,
  },
  {
    id: 'st_sidi_gaber',
    name_ar: 'سيدي جابر (الإسكندرية)',
    name_en: 'Sidi Gaber (Alexandria)',
    lat: 31.2186,
    lng: 29.9431,
    modes: ['train'],
    lines: ['rail_alex'],
    zone_ar: 'الإسكندرية',
    zone_en: 'Alexandria',
  },
]

export const EGYPT_LINES: TransitLine[] = [
  {
    id: 'metro_1',
    mode: 'metro',
    code: 'M1',
    color: MODE_COLORS.metro,
    name_ar: 'الخط الأول (المرج — حلوان)',
    name_en: 'Line 1 (El-Marg — Helwan)',
    route_ar: 'المرج الجديدة — حلوان',
    route_en: 'New El-Marg — Helwan',
    stationsCount: 35,
    lengthKm: 44,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_1')),
  },
  {
    id: 'metro_2',
    mode: 'metro',
    code: 'M2',
    color: THEME_COLORS.primary,
    name_ar: 'الخط الثاني (شبرا الخيمة — المنيب)',
    name_en: 'Line 2 (Shubra — El-Moneeb)',
    route_ar: 'شبرا الخيمة — المنيب',
    route_en: 'Shubra El-Kheima — El-Moneeb',
    stationsCount: 20,
    lengthKm: 21.6,
    status: 'delay',
    delayMinutes: 8,
    alert_ar: 'تأخير ٨ دقائق بسبب أعمال الصيانة الدورية بين محطتي الدقي والبحوث',
    alert_en: '8 min delay due to maintenance between Dokki and Bohooth',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_2')),
  },
  {
    id: 'metro_3',
    mode: 'metro',
    code: 'M3',
    color: MODE_COLORS.lrt,
    name_ar: 'الخط الثالث الأخضر (عدلي منصور — روض الفرج / جامعة القاهرة)',
    name_en: 'Line 3 Green (Adly Mansour — Rod El-Farag / Cairo Univ)',
    route_ar: 'عدلي منصور — محطة الكيت كات — جامعة القاهرة',
    route_en: 'Adly Mansour — Kit Kat — Cairo University',
    stationsCount: 34,
    lengthKm: 41.2,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_3')),
  },
  {
    id: 'lrt_capital',
    mode: 'lrt',
    code: 'LRT',
    color: MODE_COLORS.lrt,
    name_ar: 'القطار الكهربائي الخفيف LRT',
    name_en: 'Capital Light Rail Transit (LRT)',
    route_ar: 'عدلي منصور — العبور — الشروق — بدر — العاصمة الإدارية',
    route_en: 'Adly Mansour — El Obour — El Shorouk — Badr — New Capital',
    stationsCount: 19,
    lengthKm: 105,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('lrt_capital')),
  },
  {
    id: 'monorail_east',
    mode: 'monorail',
    code: 'MONO',
    color: MODE_COLORS.monorail,
    name_ar: 'مونوريل شرق النيل (مدينة نصر — العاصمة الإدارية)',
    name_en: 'East Nile Monorail (Nasr City — New Capital)',
    route_ar: 'الاستاد (مدينة نصر) — المشير طنطاوي — العاصمة الإدارية — مدينة العدالة',
    route_en: 'Stadium (Nasr City) — El-Mosheer Tantawy — New Capital — Justice City',
    stationsCount: 22,
    lengthKm: 56.5,
    status: 'normal',
    alert_ar: 'خصم ٥٠٪ أيام الجمعة والسبت والعطلات الرسمية. التشغيل يومياً ٦ صباحاً – ٩ مساءً.',
    alert_en: '50% off Fri/Sat + public holidays. Daily operation 6 AM – 9 PM.',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('monorail_east')),
  },
  {
    id: 'brt_ring',
    mode: 'brt',
    code: 'BRT',
    color: MODE_COLORS.brt,
    name_ar: 'حافلات BRT الطريق الدائري (المرحلة الأولى تعمل)',
    name_en: 'Ring Road BRT Express (Phase 1 operating)',
    route_ar: 'أكاديمية الشرطة — عدلي منصور — المرج — طريق الإسكندرية الزراعي (١٤ محطة تعمل)',
    route_en: 'Police Academy — Adly Mansour — Marg — Alexandria Agricultural Rd (14 stations live)',
    stationsCount: 48,
    lengthKm: 113,
    status: 'normal',
    alert_ar: 'المرحلة الأولى (١٤ محطة) تعمل منذ يونيو ٢٠٢٥. التذكرة ٥ / ١٠ / ١٥ جنيهاً.',
    alert_en: 'Phase 1 (14 stations) live since Jun 2025. Fares 5 / 10 / 15 EGP.',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('brt_ring')),
  },
  {
    id: 'rail_cairo_alex',
    mode: 'train',
    code: 'ENR',
    color: MODE_COLORS.train,
    name_ar: 'قطار القاهرة — الإسكندرية (سكك حديد مصر)',
    name_en: 'Cairo — Alexandria Express Rail (ENR)',
    route_ar: 'محطة مصر رمسيس — بنها — طنطا — سيدي جابر — الإسكندرية',
    route_en: 'Ramses Cairo — Banha — Tanta — Sidi Gaber — Alexandria',
    stationsCount: 14,
    lengthKm: 208,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('rail_cairo') || s.lines.includes('rail_alex')),
  },
]

export const TRANSIT_LINES: TransitLine[] = EGYPT_LINES

/**
 * Official Tariff Calculator for Cairo Metro.
 * Ministry of Transport decree effective 27 March 2026
 * (Ahram Online / Egypt Independent, 27 Mar 2026; Cairo Portal, updated 2026):
 * 1 to 9 stations: 10 EGP (raised from 8)
 * 10 to 16 stations: 12 EGP (raised from 10)
 * 17 to 23 stations: 15 EGP (unchanged)
 * 24 to 39 stations: 20 EGP (unchanged)
 * Reduced column: over-60s / army / police pay half (5/6/8/10);
 * special-needs passengers pay a flat 5 EGP any distance.
 */
export function calculateMetroTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 9) return { fare: 10, label_ar: 'منطقة واحدة (١–٩ محطات)', label_en: 'Zone 1 (1–9 stations)', status: 'official' }
  if (stationCount <= 16) return { fare: 12, label_ar: 'منطقتان (١٠–١٦ محطة)', label_en: 'Zone 2 (10–16 stations)', status: 'official' }
  if (stationCount <= 23) return { fare: 15, label_ar: '٣ مناطق (١٧–٢٣ محطة)', label_en: 'Zone 3 (17–23 stations)', status: 'official' }
  return { fare: 20, label_ar: 'أكثر من ٢٣ محطة', label_en: '4+ Zones (24+ stations)', status: 'official' }
}

/**
 * Capital LRT Tariff (Ministry of Transport; confirmed Sep 2026 via
 * Al-Masry Al-Youm; Cairo Portal, updated 2026):
 * 1 to 3 stations: 10 EGP (monthly 300)
 * 4 to 7 stations: 15 EGP (monthly 500)
 * 8+ stations: 20 EGP (monthly 600)
 * Hours: 06:00–23:00, peak headway ~10 min.
 */
export function calculateLRTTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 3) return { fare: 10, label_ar: '١ إلى ٣ محطات', label_en: '1 to 3 stations', status: 'official' }
  if (stationCount <= 7) return { fare: 15, label_ar: '٤ إلى ٧ محطات', label_en: '4 to 7 stations', status: 'official' }
  return { fare: 20, label_ar: 'أكثر من ٧ محطات', label_en: '8+ stations', status: 'official' }
}

/**
 * East Nile Monorail Tariff (Ministry of Transport, effective 9 May 2026;
 * full 22-station line Stadium → Justice City operating since 27 Jun 2026;
 * Ahram Online / Egyptian Streets, May–Jun 2026):
 * up to 5 stations: 20 EGP · up to 10: 40 · up to 15: 55 · full line: 80.
 * Half fare (60+ / disabilities): 10 / 20 / 30 / 40.
 * Subscriptions save ~50% (weekly 14 trips / monthly 60 / quarterly 180).
 * Hours: 06:00–21:00. 50% off Fri/Sat + public holidays.
 */
export function calculateMonorailTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 5) return { fare: 20, label_ar: 'منطقة واحدة (حتى ٥ محطات)', label_en: 'Zone 1 (up to 5 stations)', status: 'official' }
  if (stationCount <= 10) return { fare: 40, label_ar: 'منطقتان (حتى ١٠ محطات)', label_en: 'Zone 2 (up to 10 stations)', status: 'official' }
  if (stationCount <= 15) return { fare: 55, label_ar: '٣ مناطق (حتى ١٥ محطة)', label_en: 'Zone 3 (up to 15 stations)', status: 'official' }
  return { fare: 80, label_ar: 'الخط الكامل (٢٢ محطة)', label_en: 'Full line (22 stations)', status: 'official' }
}

/**
 * Ring Road BRT Tariff (Ministry of Transport; Phase 1 operating since
 * 1 Jun 2025: 14 stations, 35 km, Police Academy ↔ Alexandria Agricultural Rd;
 * Ahram Online / Egypt Independent, May–Jun 2025; Cairo Portal, updated 2026):
 * up to 4 stations: 5 EGP · up to 9: 10 EGP · full phase-1 route: 15 EGP.
 * Full plan: 48 stations / ~113 km in 3 phases.
 */
export function calculateBRTTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 4) return { fare: 5, label_ar: 'حتى ٤ محطات', label_en: 'Up to 4 stations', status: 'official' }
  if (stationCount <= 9) return { fare: 10, label_ar: 'حتى ٩ محطات', label_en: 'Up to 9 stations', status: 'official' }
  return { fare: 15, label_ar: 'المسار الكامل للمرحلة الأولى', label_en: 'Full Phase-1 route', status: 'official' }
}
