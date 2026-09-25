import { describe, it, expect } from 'vitest';
import { normalizeArabic, matchesTransitQuery } from '../utils/arabicSearch';

describe('Phase 13: Arabic Search & Normalization', () => {
  it('normalizes diacritics, Alefs, and Ta Marbouta correctly', () => {
    expect(normalizeArabic('مَحَطَّةُ رَمْسِيس')).toBe('محطه رمسيس');
    expect(normalizeArabic('الأهرام')).toBe('الاهرام');
    expect(normalizeArabic('جامعة القاهرة')).toBe('جامعه القاهره');
    expect(normalizeArabic('المعادى')).toBe('المعادي');
  });

  it('matches colloquial aliases: Ramses / Ramsis / Shohadaa', () => {
    // English typo
    expect(matchesTransitQuery('الشهداء (رمسيس)', 'Shohadaa (Ramses)', 'ramsis')).toBe(true);
    expect(matchesTransitQuery('الشهداء (رمسيس)', 'Shohadaa (Ramses)', 'ramses')).toBe(true);
    // Arabic variations with prefix
    expect(matchesTransitQuery('الشهداء (رمسيس)', 'Shohadaa (Ramses)', 'ميدان رمسيس')).toBe(true);
    expect(matchesTransitQuery('الشهداء (رمسيس)', 'Shohadaa (Ramses)', 'محطة رمسيس')).toBe(true);
    expect(matchesTransitQuery('الشهداء (رمسيس)', 'Shohadaa (Ramses)', 'الشهداء')).toBe(true);
  });

  it('matches common typos without exact spelling match', () => {
    // User types 'الاهرام' (without hamza), station is 'الأهرام'
    expect(matchesTransitQuery('الأهرام', 'El Ahram', 'الاهرام')).toBe(true);
    // User types 'جامعه القاهره' (with ha), station is 'جامعة القاهرة'
    expect(matchesTransitQuery('جامعة القاهرة', 'Cairo University', 'جامعه القاهره')).toBe(true);
  });

  it('matches stands with or without "موقف" prefix', () => {
    expect(matchesTransitQuery('موقف المنيب الإقليمي', 'Moneeb Stand', 'المنيب')).toBe(true);
    expect(matchesTransitQuery('موقف المنيب الإقليمي', 'Moneeb Stand', 'موقف المنيب')).toBe(true);
    expect(matchesTransitQuery('موقف الحصري (6 أكتوبر)', 'Hosary Stand (6th of October)', 'الحصري')).toBe(true);
    expect(matchesTransitQuery('موقف الحصري (6 أكتوبر)', 'Hosary Stand (6th of October)', 'hosary')).toBe(true);
    expect(matchesTransitQuery('موقف الفيوم', 'Fayoum Stand', 'fayoum')).toBe(true);
  });
});
