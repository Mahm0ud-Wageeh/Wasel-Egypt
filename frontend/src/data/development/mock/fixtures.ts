/**
 * Isolated Development & Test Fixtures — Wasel Egypt
 * 
 * IMPORTANT: This file contains ONLY synthetic/mock data used for Vitest and local test fixtures.
 * It is strictly isolated under `data/development/mock/` and MUST NEVER be bundled into production transit lookups.
 * 
 * @version 2026.09-dev
 * @environment test, development
 */

export interface MockStationFixture {
  id: string | number;
  name: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  mode: string;
}

export interface MockIncidentFixture {
  id: string | number;
  type: 'delay' | 'crowd' | 'closure' | 'breakdown';
  line_id: string;
  station_id: string | number;
  description_ar: string;
  description_en: string;
  status: 'active' | 'investigating' | 'resolved';
  upvotes: number;
  downvotes: number;
  reported_at: string;
}

export const MOCK_STATIONS_FIXTURE: MockStationFixture[] = [
  { id: 1, name: 'Sadat', name_ar: 'أنور السادات', name_en: 'Sadat', lat: 30.0444, lng: 31.2357, mode: 'metro' },
  { id: 2, name: 'Giza', name_ar: 'الجيزة', name_en: 'Giza', lat: 30.0107, lng: 31.2064, mode: 'metro' },
  { id: 3, name: 'Shubra El-Kheima', name_ar: 'شبرا الخيمة', name_en: 'Shubra El-Kheima', lat: 30.1226, lng: 31.2447, mode: 'metro' },
  { id: 4, name: 'Cairo University', name_ar: 'جامعة القاهرة', name_en: 'Cairo University', lat: 30.0261, lng: 31.2014, mode: 'metro' },
  { id: 5, name: 'Ramses', name_ar: 'الشهداء (رمسيس)', name_en: 'Al-Shohadaa (Ramses)', lat: 30.0617, lng: 31.2497, mode: 'metro' },
];

export const MOCK_INCIDENTS_FIXTURE: MockIncidentFixture[] = [
  {
    id: 'inc-01',
    type: 'crowd',
    line_id: 'metro_1',
    station_id: 5,
    description_ar: 'زحام شديد على رصيف حلوان',
    description_en: 'Heavy crowding on Helwan platform',
    status: 'active',
    upvotes: 14,
    downvotes: 1,
    reported_at: '2026-09-25T14:30:00Z',
  },
  {
    id: 'inc-02',
    type: 'delay',
    line_id: 'metro_2',
    station_id: 1,
    description_ar: 'تأخير 5 دقائق في اتجاه المنيب',
    description_en: '5 min delay towards El-Mounib',
    status: 'active',
    upvotes: 8,
    downvotes: 0,
    reported_at: '2026-09-25T14:45:00Z',
  },
];
