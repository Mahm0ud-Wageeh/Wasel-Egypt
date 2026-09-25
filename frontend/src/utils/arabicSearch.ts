/**
 * Arabic & Multilingual Transit Search Normalizer (Phase 13).
 *
 * Handles:
 *  - Alef normalization (أ, إ, آ, ٱ -> ا)
 *  - Ta Marbouta / Ha normalization (ة -> ه)
 *  - Ya / Alef Maqsura normalization (ى -> ي)
 *  - Diacritics / Harakat removal (فتحة, ضمة, كسرة, تنوين, شدة, سكون)
 *  - Tatweel (ـ) removal
 *  - Prefix stripping ("محطة", "موقف", "ميدان", "شارع", "جامعة", "مستشفى", "مول")
 *  - Popular Egyptian colloquial synonyms and typos (Ramsis -> Ramses, Tahrir -> Sadat, etc.)
 */

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    // Remove diacritics
    .replace(/[\u064B-\u0652\u0670]/g, '')
    // Remove tatweel
    .replace(/\u0640/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Ta Marbouta to Ha
    .replace(/ة/g, 'ه')
    // Normalize Alef Maqsura to Ya
    .replace(/ى/g, 'ي')
    // Normalize Hamza variations
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');
}

/** Common prefix patterns to strip when looking for the core landmark/station */
const PREFIX_REGEX = /^(محطة|محطه|موقف|ميدان|شارع|جامعة|جامعه|مستشفى|مستشفي|نادي|نادى|مول)\s+/i;

/** Colloquial alias mappings for Egyptian transit search */
const POPULAR_ALIASES: Record<string, string[]> = {
  ramses: ['shohadaa', 'الشهداء', 'رمسيس'],
  ramsis: ['shohadaa', 'الشهداء', 'رمسيس'],
  shohadaa: ['ramses', 'رمسيس', 'الشهداء'],
  'الشهداء': ['رمسيس', 'ميدان رمسيس'],
  'رمسيس': ['الشهداء', 'ميدان رمسيس', 'ramses', 'ramsis'],
  tahrir: ['sadat', 'السادات', 'التحرير'],
  'التحرير': ['السادات', 'ميدان التحرير', 'tahrir'],
  'السادات': ['التحرير', 'ميدان التحرير', 'sadat'],
  'الحصري': ['st_stand_hosary', 'موقف الحصري', 'hosary', 'october', 'أكتوبر'],
  hosary: ['st_stand_hosary', 'موقف الحصري', 'الحصري', 'october'],
  'المنيب': ['st_stand_moneeb', 'موقف المنيب', 'moneeb', 'mounib'],
  moneeb: ['st_stand_moneeb', 'موقف المنيب', 'المنيب'],
  mounib: ['st_stand_moneeb', 'موقف المنيب', 'المنيب'],
  'عبود': ['st_stand_abboud', 'موقف عبود', 'abboud'],
  abboud: ['st_stand_abboud', 'موقف عبود', 'عبود'],
  'السلام': ['st_stand_salam', 'موقف السلام', 'salam'],
  salam: ['st_stand_salam', 'موقف السلام', 'السلام'],
  'الفيوم': ['st_stand_fayoum', 'موقف الفيوم', 'fayoum', 'faiyum'],
  fayoum: ['st_stand_fayoum', 'موقف الفيوم', 'الفيوم'],
  'العتبة': ['attaba', 'ataba'],
  attaba: ['العتبة', 'العتبه'],
  ataba: ['العتبة', 'العتبه'],
  'الدقي': ['dokki', 'doky'],
  dokki: ['الدقي', 'الدقى'],
  doky: ['الدقي', 'الدقى'],
  'شبرا': ['shoubra', 'shubra'],
  shubra: ['شبرا'],
  shoubra: ['شبرا'],
  'اكتوبر': ['october', '6 october', 'الحصري'],
  'أكتوبر': ['october', '6 october', 'الحصري'],
  october: ['اكتوبر', 'أكتوبر', 'الحصري'],
  'زايد': ['zayed', 'sheikh zayed'],
  zayed: ['زايد', 'الشيخ زايد'],
  'التجمع': ['tagamoa', 'new cairo', 'القاهرة الجديدة'],
  tagamoa: ['التجمع', 'القاهرة الجديدة'],
};

/**
 * Intelligent matcher for Egyptian transit search (Phase 13).
 * Checks if target name matches search query using direct, normalized, and alias rules.
 */
export function matchesTransitQuery(targetNameAr: string, targetNameEn: string, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return false;
  const qClean = rawQuery.trim().toLowerCase();
  const qNorm = normalizeArabic(qClean);
  const qStripped = normalizeArabic(qClean.replace(PREFIX_REGEX, ''));

  const arNorm = normalizeArabic(targetNameAr);
  const enNorm = (targetNameEn || '').toLowerCase();

  // 1. Direct contains
  if (targetNameAr.toLowerCase().includes(qClean) || enNorm.includes(qClean)) {
    return true;
  }

  // 2. Normalized Arabic match
  if (arNorm.includes(qNorm)) {
    return true;
  }

  // 3. Prefix-stripped query match (e.g., user types "محطة رمسيس" or "موقف المنيب")
  if (qStripped.length >= 2 && arNorm.includes(qStripped)) {
    return true;
  }

  // 4. Prefix-stripped target match (e.g., target is "موقف المنيب" and query is "المنيب")
  const arStripped = normalizeArabic(targetNameAr.replace(PREFIX_REGEX, ''));
  if (arStripped.includes(qNorm) || (qStripped.length >= 2 && arStripped.includes(qStripped))) {
    return true;
  }

  // 5. Popular aliases & typos
  const aliasesForQ = POPULAR_ALIASES[qClean] || POPULAR_ALIASES[qNorm] || POPULAR_ALIASES[qStripped] || [];
  for (const alias of aliasesForQ) {
    const aliasNorm = normalizeArabic(alias);
    if (arNorm.includes(aliasNorm) || enNorm.includes(alias.toLowerCase())) {
      return true;
    }
  }

  return false;
}
