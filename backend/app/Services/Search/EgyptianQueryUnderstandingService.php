<?php

namespace App\Services\Search;

/**
 * Egyptian Arabic & Multilingual Query Understanding Service (Backend)
 *
 * Normalizes colloquial Egyptian Arabic, prepositional constructs, Arabizi,
 * English queries, and user transportation preferences.
 */
class EgyptianQueryUnderstandingService
{
    public function parse(string $rawInput): array
    {
        $query = trim($rawInput);

        $result = [
            'raw_query' => $query,
            'is_natural_query' => false,
            'intent' => 'journey',
            'origin' => '',
            'destination' => '',
            'preferences' => [
                'avoid_modes' => [],
            ],
            'confidence' => 0.0,
        ];

        if (mb_strlen($query) < 2) {
            return $result;
        }

        // 1. Detect Intent: Nearest Metro
        if (preg_match('/^(أقرب|اقرب|فين أقرب|فين اقرب|أين أقرب)\s+(مترو|محطة مترو|محطه مترو|محطة|محطه)/iu', $query) ||
            preg_match('/^(nearest|closest)\s+(metro|station)/i', $query)) {
            $result['intent'] = 'nearest_metro';
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.95;
            return $result;
        }

        $workingText = $query;

        // 2. Extract Preferences
        if (preg_match('/(من غير مترو|بدون مترو|بلاش مترو|avoid metro|without metro|no metro)/iu', $workingText)) {
            $result['preferences']['avoid_modes'][] = 'metro';
            $workingText = preg_replace('/(من غير مترو|بدون مترو|بلاش مترو|avoid metro|without metro|no metro)/iu', ' ', $workingText);
        }

        if (preg_match('/(أرخص طريق|ارخص طريق|بأقل فلوس|باقل فلوس|أرخص حاجة|ارخص حاجة|cheapest|least cost)/iu', $workingText)) {
            $result['preferences']['ranking'] = 'cheapest';
            $workingText = preg_replace('/(أرخص طريق|ارخص طريق|بأقل فلوس|باقل فلوس|أرخص حاجة|ارخص حاجة|cheapest|least cost)/iu', ' ', $workingText);
        }

        if (preg_match('/(أسرع طريق|اسرع طريق|أسرع حاجة|اسرع حاجة|أسرع طريقة|اسرع طريقة|fastest|quickest)/iu', $workingText)) {
            $result['preferences']['ranking'] = 'fastest';
            $workingText = preg_replace('/(أسرع طريق|اسرع طريق|أسرع حاجة|اسرع حاجة|أسرع طريقة|اسرع طريقة|fastest|quickest)/iu', ' ', $workingText);
        }

        if (preg_match('/(مش عايز أمشي كتير|مش عايز امشي كتير|من غير مشي|أقل مشي|اقل مشي|least walking|no walking)/iu', $workingText)) {
            $result['preferences']['least_walking'] = true;
            if (empty($result['preferences']['ranking'])) {
                $result['preferences']['ranking'] = 'least_walking';
            }
            $workingText = preg_replace('/(مش عايز أمشي كتير|مش عايز امشي كتير|من غير مشي|أقل مشي|اقل مشي|least walking|no walking)/iu', ' ', $workingText);
        }

        if (preg_match('/(معايا شنط|معاي شنط|معايا شنطة|معايا حقائب|with luggage|bags)/iu', $workingText)) {
            $result['preferences']['luggage'] = true;
            $result['preferences']['least_walking'] = true;
            $workingText = preg_replace('/(معايا شنط|معاي شنط|معايا شنطة|معايا حقائب|with luggage|bags)/iu', ' ', $workingText);
        }

        // Clean questions like "أركب إيه"
        $workingText = preg_replace('/(?:أركب إيه|اركب ايه|أركب ايه|اركب إيه|أركب|اركب)\s*/iu', ' ', $workingText);
        $workingText = preg_replace('/[؟?.,!]/u', ' ', $workingText);
        $workingText = trim(preg_replace('/\s+/u', ' ', $workingText));

        // 3. Pattern: "أنا في [Origin] وعايز/رايح [Destination]" or Arabizi "ana fe [Origin] w 3ayez aro7 [Destination]"
        if (preg_match('/^(?:أنا في|انا في|انا ف|أنا ف|ana fe|ana f)\s+(.+?)\s+(?:و?\s*(?:عايز أروح|عايز اروح|رايح|ناوي أروح|ناوي اروح|w\s*3ayez\s*aro7|w\s*raye7))\s+(.+)$/iu', $workingText, $m)) {
            $result['origin'] = $this->cleanLocation($m[1]);
            $result['destination'] = $this->cleanLocation($m[2]);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.95;
            return $result;
        }

        // 4. Pattern: "ازاي أروح [Destination] من [Origin]"
        if (preg_match('/^(?:ازاي أروح|ازاي اروح|أروح إزاي|اروح ازاي|كيف أصل إلى|كيف اصل الى|how (?:do I|to) get to)\s+(.+?)\s+(?:من|عن طريق من|from)\s+(.+)$/iu', $workingText, $m)) {
            $result['destination'] = $this->cleanLocation($m[1]);
            $result['origin'] = $this->cleanLocation($m[2]);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.92;
            return $result;
        }

        // 5. Pattern: "من [Origin] إلى / لـ [Destination]" (or English "from [Origin] to [Destination]")
        if (preg_match('/^(?:من|from)\s+(.+?)\s+(?:إلى|الى|لـ|ل|to)\s+(.+)$/iu', $workingText, $m)) {
            $rawDest = trim($m[2]);
            $restoredDest = (str_contains($m[0], ' لل') || str_starts_with($rawDest, 'ل')) && !str_starts_with($rawDest, 'ال')
                ? 'ال' . preg_replace('/^ل/u', '', $rawDest)
                : $rawDest;
            $result['origin'] = $this->cleanLocation($m[1]);
            $result['destination'] = $this->cleanLocation($restoredDest);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.94;
            return $result;
        }

        // 6. Pattern: "[Origin] to [Destination]"
        if (preg_match('/^(.+?)\s+to\s+(.+)$/i', $workingText, $m) && !preg_match('/^(go|want|how)\b/i', $m[1])) {
            $result['origin'] = $this->cleanLocation($m[1]);
            $result['destination'] = $this->cleanLocation($m[2]);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.90;
            return $result;
        }

        // 7. Pattern: "[Origin] لـ[Destination]" e.g. "فيصل للجيزة"
        if (preg_match('/^([\x{0600}-\x{06FF}\s]{2,20}?)\s+لـ?([^\s].+)$/u', $workingText, $m)) {
            $rawDest = trim($m[2]);
            $restoredDest = str_starts_with($rawDest, 'ل') ? 'ال' . mb_substr($rawDest, 1) : $rawDest;
            $result['origin'] = $this->cleanLocation($m[1]);
            $result['destination'] = $this->cleanLocation($restoredDest);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.85;
            return $result;
        }

        // 8. Pattern: Destination only: "عايز أروح [Destination]"
        if (preg_match('/^(?:عايز أروح|عايز اروح|رايح|ناوي أروح|أروح|اروح|3ayez aro7)\s+(.+)$/iu', $workingText, $m)) {
            $result['destination'] = $this->cleanLocation($m[1]);
            $result['is_natural_query'] = true;
            $result['confidence'] = 0.88;
            return $result;
        }

        return $result;
    }

    private function cleanLocation(string $str): string
    {
        $cleaned = preg_replace('/^(في|ف|fe|f|من|men|إلى|الى|لـ|ل)\s+/iu', '', trim($str));
        $cleaned = preg_replace('/\s+(أركب إيه|اركب ايه|أركب ايه|اركب إيه|إيه|ايه)$/iu', '', $cleaned);
        $cleaned = preg_replace('/^و\s+/u', '', $cleaned);
        return trim($cleaned);
    }
}
