/**
 * Egyptian Arabic, English & Arabizi Transit Query Parser
 *
 * Extracts origins, destinations, transit intents, and user routing preferences
 * from colloquial questions and shorthand inputs.
 */

export interface ParsedTransitQuery {
  raw_query: string;
  is_natural_query: boolean;
  intent: 'journey' | 'nearest_metro' | 'fare_inquiry';
  origin: string;
  destination: string;
  preferences: {
    avoid_modes?: string[];
    ranking?: 'fastest' | 'cheapest' | 'least_walking' | 'least_transfers';
    least_walking?: boolean;
    luggage?: boolean;
  };
  confidence: number;
}

export function parseEgyptianTransitQuery(rawInput: string): ParsedTransitQuery {
  const query = (rawInput || '').trim();

  const result: ParsedTransitQuery = {
    raw_query: query,
    is_natural_query: false,
    intent: 'journey',
    origin: '',
    destination: '',
    preferences: {
      avoid_modes: [],
    },
    confidence: 0.0,
  };

  if (!query || query.length < 2) {
    return result;
  }

  // 1. Detect Intent: Nearest Metro
  if (
    /^(أقرب|اقرب|فين أقرب|فين اقرب|أين أقرب)\s+(مترو|محطة مترو|محطه مترو|محطة|محطه)/iu.test(query) ||
    /^(nearest|closest)\s+(metro|station)/i.test(query)
  ) {
    result.intent = 'nearest_metro';
    result.is_natural_query = true;
    result.confidence = 0.95;
    return result;
  }

  let workingText = query;

  // 2. Extract Preferences
  if (/(من غير مترو|بدون مترو|بلاش مترو|avoid metro|without metro|no metro)/iu.test(workingText)) {
    result.preferences.avoid_modes = ['metro'];
    workingText = workingText.replace(/(من غير مترو|بدون مترو|بلاش مترو|avoid metro|without metro|no metro)/giu, ' ');
  }

  if (/(أرخص طريق|ارخص طريق|بأقل فلوس|باقل فلوس|أرخص حاجة|ارخص حاجة|cheapest|least cost)/iu.test(workingText)) {
    result.preferences.ranking = 'cheapest';
    workingText = workingText.replace(/(أرخص طريق|ارخص طريق|بأقل فلوس|باقل فلوس|أرخص حاجة|ارخص حاجة|cheapest|least cost)/giu, ' ');
  }

  if (/(أسرع طريق|اسرع طريق|أسرع حاجة|اسرع حاجة|أسرع طريقة|اسرع طريقة|fastest|quickest)/iu.test(workingText)) {
    result.preferences.ranking = 'fastest';
    workingText = workingText.replace(/(أسرع طريق|اسرع طريق|أسرع حاجة|اسرع حاجة|أسرع طريقة|اسرع طريقة|fastest|quickest)/giu, ' ');
  }

  if (/(مش عايز أمشي كتير|مش عايز امشي كتير|من غير مشي|أقل مشي|اقل مشي|least walking|no walking)/iu.test(workingText)) {
    result.preferences.least_walking = true;
    if (!result.preferences.ranking) {
      result.preferences.ranking = 'least_walking';
    }
    workingText = workingText.replace(/(مش عايز أمشي كتير|مش عايز امشي كتير|من غير مشي|أقل مشي|اقل مشي|least walking|no walking)/giu, ' ');
  }

  if (/(معايا شنط|معاي شنط|معايا شنطة|معايا حقائب|with luggage|bags)/iu.test(workingText)) {
    result.preferences.luggage = true;
    result.preferences.least_walking = true;
    workingText = workingText.replace(/(معايا شنط|معاي شنط|معايا شنطة|معايا حقائب|with luggage|bags)/giu, ' ');
  }

  // Clean questions like "أركب إيه" and punctuation
  workingText = workingText.replace(/(?:أركب إيه|اركب ايه|أركب ايه|اركب إيه|أركب|اركب)\s*/giu, ' ');
  workingText = workingText.replace(/[؟?.,!]/g, ' ');
  workingText = workingText.replace(/\s+/g, ' ').trim();

  // 3. Pattern: "أنا في [Origin] وعايز/رايح [Destination]" or Arabizi "ana fe [Origin] w 3ayez aro7 [Destination]"
  const naturalMatch = workingText.match(/^(?:أنا في|انا في|انا ف|أنا ف|ana fe|ana f)\s+(.+?)\s+(?:و?\s*(?:عايز أروح|عايز اروح|رايح|ناوي أروح|ناوي اروح|w\s*3ayez\s*aro7|w\s*raye7))\s+(.+)$/iu);
  if (naturalMatch) {
    result.origin = cleanLocation(naturalMatch[1]);
    result.destination = cleanLocation(naturalMatch[2]);
    result.is_natural_query = true;
    result.confidence = 0.95;
    return result;
  }

  // 4. Pattern: "ازاي أروح [Destination] من [Origin]"
  const questionMatch = workingText.match(/^(?:ازاي أروح|ازاي اروح|أروح إزاي|اروح ازاي|كيف أصل إلى|كيف اصل الى|how (?:do I|to) get to)\s+(.+?)\s+(?:من|عن طريق من|from)\s+(.+)$/iu);
  if (questionMatch) {
    result.destination = cleanLocation(questionMatch[1]);
    result.origin = cleanLocation(questionMatch[2]);
    result.is_natural_query = true;
    result.confidence = 0.92;
    return result;
  }

  // 5. Pattern: "من [Origin] إلى / لـ [Destination]" (or English "from [Origin] to [Destination]")
  const prepMatch = workingText.match(/^(?:من|from)\s+(.+?)\s+(?:إلى|الى|لـ|ل|to)\s+(.+)$/iu);
  if (prepMatch) {
    const rawDest = prepMatch[2].trim();
    const restoredDest = (prepMatch[0].includes(' لل') || rawDest.startsWith('ل')) && !rawDest.startsWith('ال')
      ? 'ال' + rawDest.replace(/^ل/u, '')
      : rawDest;
    result.origin = cleanLocation(prepMatch[1]);
    result.destination = cleanLocation(restoredDest);
    result.is_natural_query = true;
    result.confidence = 0.94;
    return result;
  }

  // 6. Pattern: "[Origin] to [Destination]"
  const englishMatch = workingText.match(/^(.+?)\s+to\s+(.+)$/i);
  if (englishMatch && !/^(go|want|how)\b/i.test(englishMatch[1])) {
    result.origin = cleanLocation(englishMatch[1]);
    result.destination = cleanLocation(englishMatch[2]);
    result.is_natural_query = true;
    result.confidence = 0.90;
    return result;
  }

  // 7. Pattern: "[Origin] لـ[Destination]" e.g. "فيصل للجيزة"
  const shortMatch = workingText.match(/^([\u0600-\u06FF\s]{2,20}?)\s+لـ?([^\s].+)$/u);
  if (shortMatch) {
    const rawDest = shortMatch[2].trim();
    const restoredDest = rawDest.startsWith('ل') ? 'ال' + rawDest.substring(1) : rawDest;
    result.origin = cleanLocation(shortMatch[1]);
    result.destination = cleanLocation(restoredDest);
    result.is_natural_query = true;
    result.confidence = 0.85;
    return result;
  }

  // 8. Pattern: Destination only: "عايز أروح [Destination]"
  const destOnlyMatch = workingText.match(/^(?:عايز أروح|عايز اروح|رايح|ناوي أروح|أروح|اروح|3ayez aro7)\s+(.+)$/iu);
  if (destOnlyMatch) {
    result.destination = cleanLocation(destOnlyMatch[1]);
    result.is_natural_query = true;
    result.confidence = 0.88;
    return result;
  }

  return result;
}

function cleanLocation(str: string): string {
  let cleaned = str.trim();
  cleaned = cleaned.replace(/^(في|ف|fe|f|من|men|إلى|الى|لـ|ل)\s+/giu, '');
  cleaned = cleaned.replace(/\s+(أركب إيه|اركب ايه|أركب ايه|اركب إيه|إيه|ايه)$/giu, '');
  cleaned = cleaned.replace(/^و\s+/u, '');
  return cleaned.trim();
}

export const parseEgyptianQuery = parseEgyptianTransitQuery;

