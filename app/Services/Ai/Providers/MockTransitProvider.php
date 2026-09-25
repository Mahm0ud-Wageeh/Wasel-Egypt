<?php

namespace App\Services\Ai\Providers;

use App\Models\Route;
use App\Models\ServiceAlert;
use App\Models\TransitStop;
use App\Services\Ai\Contracts\AiProvider;
use App\Services\Journey\GeoCalculator;
use Illuminate\Support\Facades\Cache;

/**
 * Rule-based transport assistant backed entirely by the real transit
 * database. It understands a focused set of intents in English and
 * Egyptian Arabic (plan a trip, line lookup, fares, nearby stops,
 * service alerts, saved/active journeys) and answers with real data,
 * proposing whitelisted UI actions the frontend executor understands.
 *
 * This is the demonstration/fallback provider: the product stays fully
 * functional with zero external AI dependencies, and every claim it
 * makes comes from the same database the rest of the product reads.
 */
class MockTransitProvider implements AiProvider
{
    /**
     * Arabic → Latin name hints for well-known Cairo transit stations.
     * The imported GTFS/OSM stop names are Latin-only; these hints let
     * Arabic speakers reach the same real stops through their common
     * Arabic names (e.g. "التحرير" → a stop containing "Tahrir").
     */
    private const ARABIC_NAME_HINTS = [
        'التحرير' => 'Tahrir',
        'الجيزة' => 'Giza',
        'رمسيس' => 'Ramses',
        'العتبة' => 'Attaba',
        'سعد زغلول' => 'Saad Zaghloul',
        'ميدان مصر' => 'Misr',
        'الدقي' => 'Dokki',
        'المعادي' => 'Maadi',
        'حلوان' => 'Helwan',
        'المارج' => 'El Marg',
        'شبرا' => 'Shubra',
        'عباسية' => 'Abbassiya',
        'القاهرة' => 'Cairo',
        'مريت جيرجيس' => 'Mar Girgis',
        'المقطم' => 'Mokattam',
        'حدائق القبة' => 'Hadaeq El Qobbah',
        // Fayoum expansion pack stops (Latin names in the DB). The bare
        // governorate name maps to the city terminal — the passenger's
        // actual boarding point — not to any street containing the word.
        'الفيوم' => 'Fayoum Bus Terminal',
        'محطة الفيوم' => 'Fayoum Bus Terminal',
        'موقف الفيوم' => 'Fayoum Bus Terminal',
        'تامية' => 'Tamiya',
        'سنورس' => 'Sinnuris',
        'إبشواي' => 'Ibsheway',
        'الإبشواي' => 'Ibsheway',
        'إطسا' => 'Itsa',
        'يوسف الصديق' => 'Youssef El-Seddik',
        'جامعة الفيوم' => 'Fayoum University',
        'الفيوم الجديدة' => 'New Fayoum City',
        'جامعة القاهرة' => 'Cairo University',
        'جامعه القاهره' => 'Cairo University',
        'أكتوبر' => 'October',
        'اكتوبر' => 'October',
        '6 أكتوبر' => 'October',
        '6 اكتوبر' => 'October',
        'الحصري' => 'Hosary',
        'موقف الحصري' => 'Hosary',
        'العباسية' => 'Abbassiya',
        'العباسيه' => 'Abbassiya',
        'المنيب' => 'Mounib',
        'موقف المنيب' => 'Mounib',
        'عبود' => 'Abboud',
        'موقف عبود' => 'Abboud',
        'السلام' => 'Salam',
        'موقف السلام' => 'Salam',
    ];

    public function id(): string
    {
        return 'mock';
    }

    public function label(): string
    {
        return 'Wasel Transport Engine (offline demo)';
    }

    public function isAvailable(): bool
    {
        return true;
    }

    public function isSimulated(): bool
    {
        return true;
    }

    public function chat(array $messages, array $context): array
    {
        $last = $messages[count($messages) - 1]['content'] ?? '';
        $text = trim((string) $last);

        // Reply language follows the message content first (an Arabic user
        // typing Latin script still gets English), then the UI language.
        $arabic = preg_match('/[\x{0600}-\x{06FF}]/u', $text) === 1
            || ($context['language'] ?? 'en') === 'ar';

        foreach ($this->intents($arabic, $context) as $intent) {
            $result = $intent($text);
            if ($result !== null) {
                return $result;
            }
        }

        return ['content' => $this->helpReply($arabic), 'actions' => []];
    }

    /** @return array<int, callable(string): ?array{content: string, actions: array}> */
    private function intents(bool $arabic, array $context): array
    {
        return [
            fn (string $t) => $this->planIntent($t, $arabic),
            fn (string $t) => $this->lineIntent($t, $arabic),
            fn (string $t) => $this->fareIntent($t, $arabic),
            fn (string $t) => $this->preferenceIntent($t, $arabic),
            fn (string $t) => $this->nearbyIntent($t, $arabic, $context),
            fn (string $t) => $this->alertsIntent($t, $arabic),
            fn (string $t) => $this->savedIntent($t, $arabic),
            fn (string $t) => $this->liveJourneyIntent($t, $arabic, $context),
            fn (string $t) => $this->activeIntent($t, $arabic),
            fn (string $t) => $this->greetingIntent($t, $arabic),
        ];
    }

    // ── Intents ──────────────────────────────────────────────────────────

    private function planIntent(string $text, bool $arabic): ?array
    {
        $from = $to = null;

        // Clean trailing colloquial question phrases like "إزاي بأقل تحويلات؟" or "بأقل تكلفة"
        $cleaned = preg_replace('/(\s+(?:إزاي|ازاي|بأقل\s+تحويلات|باقل\s+تحويلات|بأقل\s+تكلفة|باقل\s+تكلفه|بأسرع\s+وقت|أسرع\s+طريق|اسرع\s+طريق|عشان\s+اوصل|علشان\s+اوصل)[\s؟\?]*|[\s؟\?]+)+$/u', '', $text);

        // 1. Egyptian "أروح [الوجهة] من [البداية]" (Destination first, then origin)
        if (preg_match('/(?:أروح|اروح|اوصل|أوصل)\s+(.+?)\s+من\s+(.+?)\s*$/u', $cleaned, $m)) {
            $to = trim($m[1]);
            $from = trim($m[2]);
        }
        // 2. English "from X to Y"
        elseif (preg_match('/\bfrom\s+(.+?)\s+(?:to|till|until)\s+(.+?)\s*$/i', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = trim($m[2]);
        }
        // 3. "أنا في X وعايز أروح/أوصل Y"
        elseif (preg_match('/(?:أنا في|انا في)\s+(.+?)\s+(?:وعايز|عايز|وحابب|حابب|اريد|أريد)?\s*(?:أروح|اروح|أوصل|اوصل|إلى|الى|على|لل?|لـ?)?\s*(.+)$/u', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = trim($m[2]);
        }
        // 4. "أروح من X للY" or "من X للY" (لل = لـ + ال التعريف)
        elseif (preg_match('/(?:أروح|اروح|اوصل|أوصل)?\s*من\s+(.+?)\s+لل(.+?)\s*$/u', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = 'ال' . trim($m[2]);
        }
        // 5. "أروح من X إلى/على/ل Y"
        elseif (preg_match('/(?:أروح|اروح|اوصل|أوصل)?\s*من\s+(.+?)\s+(?:إلى|الى|على|لـ?|ل)\s+(.+)$/u', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = trim($m[2]);
        }
        // 6. "أسرع/أرخص طريق من X للY"
        elseif (preg_match('/(?:عايز\s+)?(?:أسرع|اسرع|أرخص|ارخص|أفضل|افضل)\s+طريق\s+من\s+(.+?)\s+لل(.+?)\s*$/u', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = 'ال' . trim($m[2]);
        }
        // 7. "أسرع/أرخص طريق من X إلى/ل Y"
        elseif (preg_match('/(?:عايز\s+)?(?:أسرع|اسرع|أرخص|ارخص|أفضل|افضل)\s+طريق\s+من\s+(.+?)\s+(?:إلى|الى|على|ل)\s+(.+?)\s*$/u', $cleaned, $m)) {
            $from = trim($m[1]);
            $to = trim($m[2]);
        }
        // 8. Destination-only "عايز أروح X" or "أنا مش عارف اسم المحطة بس عايز أروح X"
        elseif (preg_match('/(?:عايز|أوزع|اريد|أريد|هروح|أروح|اروح)\s+(?:أروح\s+|اروح\s+)?(?:إلى|الى|على|لل?|لـ?)?\s*(.+?)\s*$/u', $cleaned, $m)) {
            $target = trim($m[1]);
            if (str_starts_with($target, 'لل') && mb_strlen($target) > 2) {
                $to = 'ال' . mb_substr($target, 2);
            } else {
                $to = $target;
            }
        }

        if ($from === null && $to === null) {
            return null;
        }

        $fromStop = $from !== null ? $this->resolveStop($from) : null;
        $toStop = $to !== null ? $this->resolveStop($to) : null;

        if ($fromStop === null && $toStop === null) {
            return ['content' => $arabic
                ? 'ملقتش محطات تطابق الأسماء اللي كتبتها. جرّب اسم محطة مترو معروفة زي "التحرير" أو "الجيزة"، أو استخدم البحث في المخطط مباشرة.'
                : "I couldn't match those names to network stops. Try a known station such as \"Tahrir\" or \"Giza\", or use the planner's live search.", 'actions' => [['type' => 'open_planner', 'params' => []]]];
        }

        $actions = [];
        $parts = [];

        if ($fromStop !== null) {
            $actions[] = ['type' => 'set_origin', 'params' => $this->stopParams($fromStop)];
            $parts[] = $arabic ? "من: {$fromStop->name}" : "From: {$fromStop->name}";
        }
        if ($toStop !== null) {
            $actions[] = ['type' => 'set_destination', 'params' => $this->stopParams($toStop)];
            $parts[] = $arabic ? "إلى: {$toStop->name}" : "To: {$toStop->name}";
        }
        if ($fromStop !== null && $toStop !== null) {
            $actions[] = [
                'type' => 'plan_journey',
                'params' => [
                    'origin' => $fromStop->name,
                    'destination' => $toStop->name,
                    'origin_id' => $fromStop->id,
                    'destination_id' => $toStop->id,
                    'auto_search' => 'true',
                ],
            ];
        }
        $actions[] = ['type' => 'open_planner', 'params' => []];

        $content = $arabic
            ? 'جهزت المخطط لك — '.implode('، ', $parts).'. افتح المخطط واضغط "ابحث" لتشوف خطوط الرحلة بالأسعار والوقت.'
            : 'I prepared the planner — '.implode(', ', $parts).'. Open the planner and hit search to see the journey options with times and fares.';

        return ['content' => $content, 'actions' => $actions];
    }

    private function preferenceIntent(string $text, bool $arabic): ?array
    {
        // 1. Walking preference: "مش عايز أمشي كتير", "أقل مشي", "مش عايز امشي"
        if (preg_match('/(مش\s*عايز\s*(أمشي|امشي)|(أقل|اقل)\s*مشي|less\s*walk|min.*walk)/iu', $text)) {
            return [
                'content' => $arabic
                    ? 'فهمت إنك بتفضل أقل مسافة مشي. في مخطط الرحلات تقدر تخصص أقصى مسافة للمشي لكل محطة وتختار المسارات الأقرب.'
                    : 'Understood: you prefer minimal walking. In the journey planner, you can tune the maximum walking distance per leg.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        // 2. Transfers preference: "عايز أقل مواصلات", "أقل تحويلات", "بدون تحويلات", "مباشر"
        if (preg_match('/((أقل|اقل)\s*(مواصلات|تحويلات|تبديل)|بدون\s*(تحويلات|تبديل)|direct|min.*transfers?)/iu', $text)) {
            return [
                'content' => $arabic
                    ? 'مخطط الرحلات بيعرض المسارات المباشرة بأقل عدد تحويلات ومواصلات ممكنة في مقدمة النتائج.'
                    : 'The journey planner prioritizes direct routes with the minimum number of transfers at the top of results.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        // 3. Cheapest route: "إيه أرخص طريق؟", "أرخص طريق", "أقل تكلفة"
        if (preg_match('/(أرخص\s*طريق|ارخص\s*طريق|(أقل|اقل)\s*تكلف[ةه]|cheapest|least\s*cost)/iu', $text)) {
            return [
                'content' => $arabic
                    ? 'المخطط بيحسب تكلفة كل وسيلة نقل (المترو حسب تعريفة وزارة النقل الرسمية 8/10/15/20 ج، والأتوبيس والميكروباص حسب الكيلومتر) ليعطيك أرخص وأنسب خيار.'
                    : 'The planner calculates fares for each mode (metro official Ministry of Transport tiers 8/10/15/20 EGP, plus bus/microbus distance tariffs) to give you the most economical route.',
                'actions' => [
                    ['type' => 'open_planner', 'params' => []],
                    ['type' => 'open_fare', 'params' => []],
                ],
            ];
        }

        return null;
    }

    private function lineIntent(string $text, bool $arabic): ?array
    {
        $number = null;
        if (preg_match('/\b(?:line|metro line|route)\s*#?\s*(\d{1,2})\b/i', $text, $m)) {
            $number = (int) $m[1];
        } elseif (preg_match('/خط\s*(?:رقم\s*)?(\d{1,2})/u', $text, $m)) {
            $number = (int) $m[1];
        } elseif (preg_match('/الخط\s*(الأول|الأولى|التانى|الثاني|التانية|الثانيه|التالت|الثالث|التالتة|الثالثه)/u', $text, $m)) {
            $number = ['الأول' => 1, 'الأولى' => 1, 'التانى' => 2, 'الثاني' => 2, 'التانية' => 2, 'الثانيه' => 2, 'التالت' => 3, 'الثالث' => 3, 'التالتة' => 3, 'الثالثه' => 3][$m[1]] ?? null;
        }

        if ($number === null) {
            return null;
        }

        $route = $this->resolveLine($number);
        if ($route === null) {
            return ['content' => $arabic
                ? "ملقيتش خط رقم {$number} في الشبكة الحالية. الخطوط المتاحة في القاعدة هي خطوط المترو؛ جرّب البحث في صفحة الخطوط."
                : "I couldn't find line {$number} in the current network data. Try searching the routes page.", 'actions' => [['type' => 'search_routes', 'params' => ['query' => (string) $number]]]];
        }

        $stopCount = $route->routeVariants()->withCount('routeStops')->get()->sum('route_stops_count');

        return [
            'content' => $arabic
                ? "خط رقم {$number}: {$route->long_name}. عدد المحطات المسجلة: {$stopCount}. هفتحلك صفحة الخط دلوقتي."
                : "Line {$number}: {$route->long_name}. Registered stops: {$stopCount}. Opening the line page for you.",
            'actions' => [['type' => 'open_route', 'params' => ['route_id' => (int) $route->id]]],
        ];
    }

    private function fareIntent(string $text, bool $arabic): ?array
    {
        if (!preg_match('/(fare|ticket|price|pricing|cost|تذكرة|تذاكر|اسعار|أسعار|سعر|تكلفة|كام|بكام)/iu', $text)) {
            return null;
        }

        $tiers = $this->metroTiers();
        $tierText = implode(' / ', $tiers['amounts']);

        $content = $arabic
            ? "أسعار مترو القاهرة الرسمية (TfC، {$tiers['as_of_label']}): {$tierText} جنيه حسب التعرفة. أسعار الباص والميكروباص معروضة كبيانات تجريبية/تقديرية قابلة للتعديل من الإدارة."
            : "Cairo Metro official fares (TfC, {$tiers['as_of_label']}): {$tierText} EGP by tier. Bus and microbus fares are shown as demo/estimated data, editable by administrators.";

        return ['content' => $content, 'actions' => [['type' => 'open_fare', 'params' => []]]];
    }

    private function nearbyIntent(string $text, bool $arabic, array $context): ?array
    {
        if (!preg_match('/(nearby|near me|around me|closest|قريب مني|القريب|أقرب|اقرب|حواليا|حوالى|جنب)/iu', $text)) {
            return null;
        }

        $lat = $context['lat'] ?? null;
        $lng = $context['lng'] ?? null;

        if (!is_numeric($lat) || !is_numeric($lng)) {
            return ['content' => $arabic
                ? 'عشان أجيب أقرب المحطات لمكانك، اسمح بالوصول للموقع من المتصفح ثم اسألني تاني، أو استخدم زر "موقعي" على الخريطة.'
                : "To find stops near you, allow browser location access and ask again, or use the \"Locate me\" button on the map.", 'actions' => []];
        }

        $stops = $this->nearbyStops((float) $lat, (float) $lng, 1200, 3);
        if ($stops === []) {
            return ['content' => $arabic
                ? 'ملقتش محطات مسجلة قريبة من الإحداثيات دي.'
                : 'No registered stops found near those coordinates.', 'actions' => []];
        }

        $lines = [];
        foreach ($stops as $stop) {
            $distance = round($stop['distance']);
            $lines[] = $arabic
                ? "• {$stop['stop']->name} ({$distance} م)"
                : "• {$stop['stop']->name} ({$distance} m)";
        }

        return [
            'content' => ($arabic ? 'أقرب المحطات المسجلة ليك:' : 'Nearest registered stops:')."\n".implode("\n", $lines),
            'actions' => [
                ['type' => 'show_nearby_transit', 'params' => []],
                ['type' => 'focus_map_location', 'params' => ['latitude' => (float) $lat, 'longitude' => (float) $lng]],
            ],
        ];
    }

    private function alertsIntent(string $text, bool $arabic): ?array
    {
        if (!preg_match('/(alert|disruption|delay|incident|problem|breaking|تحذير|تنبيه|عطل|مشكلة|تأخير|اخطارات|أخبار)/iu', $text)) {
            return null;
        }

        $alerts = $this->activeAlerts(3);

        if ($alerts->isEmpty()) {
            return ['content' => $arabic
                ? 'مفيش تحذيرات خدمة نشطة على الشبكة حالياً — كل الخطوط شغالة حسب الجدول.'
                : 'There are no active service alerts on the network right now.', 'actions' => [['type' => 'show_alerts', 'params' => []]]];
        }

        $lines = $alerts->map(fn (ServiceAlert $a) => $arabic
            ? '• ['.$a->severity.'] '.$a->header_text
            : '• ['.$a->severity.'] '.$a->header_text)->implode("\n");

        return [
            'content' => ($arabic ? 'تحذيرات الخدمة النشطة:' : 'Active service alerts:')."\n".$lines,
            'actions' => [['type' => 'show_alerts', 'params' => []]],
        ];
    }

    private function savedIntent(string $text, bool $arabic): ?array
    {
        if (!preg_match('/(saved|favorites?|محفوظ|المحفوظة|رحلاتي المحفوظة|المفضلة)/iu', $text)) {
            return null;
        }

        return [
            'content' => $arabic
                ? 'هفتحلك رحلاتك المحفوظة — تقدر تبدأ أي رحلة منها بضغطة واحدة.'
                : "Opening your saved journeys — you can start any of them with one click.",
            'actions' => [['type' => 'show_saved_journeys', 'params' => []]],
        ];
    }

    private function liveJourneyIntent(string $text, bool $arabic, array $context): ?array
    {
        $journey = $context['active_journey'] ?? null;
        if ($journey === null) {
            return null;
        }

        // 1. Next stop query: "المحطة الجاية؟", "next stop", "upcoming station", "المحطة القادمة"
        if (preg_match('/(المحطة\s*(الجاية|القادمة|التالية)|next\s*stop|upcoming\s*stop|which\s*station)/iu', $text)) {
            if ($journey && !empty($journey['nextStop'])) {
                $nextStop = $journey['nextStop'];
                $mode = $journey['mode'] ?? 'transit';
                $modeLabel = $arabic ? ($mode === 'walking' ? 'مشياً' : 'مواصلات') : $mode;
                return [
                    'content' => $arabic
                        ? "محطتك القادمة هي «{$nextStop}» (الوسيلة: {$modeLabel})."
                        : "Your next stop is \"{$nextStop}\" (mode: {$modeLabel}).",
                    'actions' => [
                        ['type' => 'get_next_stop', 'params' => []],
                        ['type' => 'open_active_journey', 'params' => []],
                    ],
                ];
            }
            return [
                'content' => $arabic
                    ? 'لا توجد رحلة نشطة حالياً لمعرفة المحطة القادمة. يمكنك التخطيط لرحلة جديدة من المخطط.'
                    : 'No active journey in progress to identify your next stop.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        // 2. ETA / Time remaining: "فاضل قد ايه؟", "كم باقي؟", "الوقت المتبقي", "eta", "time remaining", "time left"
        if (preg_match('/(فاضل\s*قد\s*(إيه|ايه)|كم\s*باقي|الوقت\s*المتبقي|متى\s*(أوصل|اوصل|أصل|اصل)|eta|remaining\s*time|time\s*left|how\s*long|how\s*much\s*time)/iu', $text)) {
            if ($journey) {
                $etaSec = $journey['remaining_eta_sec'] ?? null;
                $etaMin = $etaSec !== null ? max(1, (int) round($etaSec / 60)) : null;
                $progress = round((float) ($journey['progress'] ?? 0));
                $etaText = $etaMin !== null ? "{$etaMin} " . ($arabic ? "دقيقة" : "min") : ($arabic ? "جارٍ الحساب" : "calculating");
                return [
                    'content' => $arabic
                        ? "الوقت المتبقي المقدر للوصول: {$etaText} (نسبة الإنجاز: {$progress}%)."
                        : "Estimated time remaining: {$etaText} (progress: {$progress}%).",
                    'actions' => [
                        ['type' => 'get_live_eta', 'params' => []],
                        ['type' => 'open_active_journey', 'params' => []],
                    ],
                ];
            }
            return [
                'content' => $arabic
                    ? 'لا توجد رحلة نشطة حالياً لحساب الوقت المتبقي.'
                    : 'No active journey in progress to estimate remaining arrival time.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        // 3. Off-route / Lost: "توهت؟", "أنا تايه؟", "خرجت عن المسار؟", "am i lost?", "off route?"
        if (preg_match('/(توهت|تايه|خرجت\s*عن\s*المسار|ضللت|lost|off\s*route|deviat)/iu', $text)) {
            if ($journey) {
                $isDeviated = !empty($journey['isDeviated']);
                if ($isDeviated) {
                    $desc = $journey['deviationDescription'] ?? ($arabic ? 'تم رصد انحراف عن المسار، تفقد خيارات إعادة التوجيه.' : 'Off-route detected, check recovery options.');
                    return [
                        'content' => $arabic
                            ? "تنبيه: أنت منحرف عن المسار! {$desc}"
                            : "Alert: You are off-route! {$desc}",
                        'actions' => [['type' => 'open_active_journey', 'params' => []]],
                    ];
                }
                $progress = round((float) ($journey['progress'] ?? 0));
                return [
                    'content' => $arabic
                        ? "أنت على المسار الصحيح تماماً! نسبة إنجاز الرحلة حالياً {$progress}%."
                        : "You are on the correct route! Current journey progress is {$progress}%.",
                    'actions' => [['type' => 'open_active_journey', 'params' => []]],
                ];
            }
            return [
                'content' => $arabic
                    ? 'أنت لست في رحلة نشطة حالياً لتحديد حالة المسار.'
                    : 'You do not have an active journey running right now.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        // 4. General trip status
        if (preg_match('/(my journey|active journey|current trip|رحلتي|رحلتي الحالية|رحلتي النشطة|أنا فين|انا فين)/iu', $text)) {
            if ($journey) {
                $legNum = ($journey['legIndex'] ?? 0) + 1;
                $totalLegs = $journey['totalLegs'] ?? 1;
                $nextStop = $journey['nextStop'] ?? '—';
                $progress = round((float) ($journey['progress'] ?? 0));
                $etaSec = $journey['remaining_eta_sec'] ?? null;
                $etaMin = $etaSec !== null ? max(1, (int) round($etaSec / 60)) : null;
                $etaStr = $etaMin !== null ? " (~{$etaMin} " . ($arabic ? "دقيقة" : "min") . ")" : "";
                return [
                    'content' => $arabic
                        ? "أنت في المرحلة {$legNum} من {$totalLegs}. المحطة القادمة: {$nextStop}. التقدم: {$progress}%{$etaStr}."
                        : "You are on leg {$legNum} of {$totalLegs}. Next stop: {$nextStop}. Progress: {$progress}%{$etaStr}.",
                    'actions' => [['type' => 'open_active_journey', 'params' => []]],
                ];
            }
            return [
                'content' => $arabic
                    ? 'راجعت حالة رحلتك — لا توجد رحلة نشطة حالياً. يمكنك بدء رحلة جديدة من المخطط.'
                    : 'Checked your journey status — no active journey is currently running.',
                'actions' => [['type' => 'open_planner', 'params' => []]],
            ];
        }

        return null;
    }

    private function activeIntent(string $text, bool $arabic): ?array
    {
        if (!preg_match('/(my journey|active journey|current trip|رحلتي|رحلتي الحالية|رحلتي النشطة)/iu', $text)) {
            return null;
        }

        return [
            'content' => $arabic
                ? 'راجعت حالة رحلتك النشطة — لو حصل انحراف عن المسار هتلاقي خيارات الاستعادة جوه شاشة الرحلة.'
                : 'Checked your active journey — if a deviation is detected you will find recovery options on the journey screen.',
            'actions' => [['type' => 'open_active_journey', 'params' => []]],
        ];
    }

    private function greetingIntent(string $text, bool $arabic): ?array
    {
        if (!preg_match('/^(hi|hello|hey|good (morning|evening)|سلام|السلام|اهلا|أهلا|هاي|ازيك|إزيك|صباح الخير)\b/u', mb_strtolower($text))) {
            return null;
        }

        return ['content' => $this->helpReply($arabic), 'actions' => []];
    }

    private function helpReply(bool $arabic): string
    {
        return $arabic
            ? "أنا مساعد واصل للمواصلات. أقدر أساعدك في:\n• تخطيط رحلة — قولي مثلاً «من التحرير إلى الجيزة»\n• معلومات خط — «اعرض الخط الأول»\n• الأسعار — «مترو التذكرة بكام؟»\n• أقرب المحطات — «أقرب محطة ليا»\n• تحذيرات الشبكة — «في إيه تحذيرات؟»"
            : "I'm the Wasel transport assistant. I can help with:\n• Planning — say \"from Tahrir to Giza\"\n• Line info — \"show line 1\"\n• Fares — \"how much is a metro ticket?\"\n• Nearby stops — \"stops near me\"\n• Network alerts — \"any alerts?\"";
    }

    // ── Data access (real database only) ─────────────────────────────────

    private function resolveStop(string $name): ?TransitStop
    {
        $name = preg_replace('/[،,.!?:;]+$/u', '', trim($name));

        if ($name === '' || mb_strlen($name) < 2) {
            return null;
        }

        // If preposition "لل" is attached (e.g. للجيزة -> الجيزة, للعباسية -> العباسية)
        if (str_starts_with($name, 'لل') && mb_strlen($name) > 2) {
            $name = 'ال' . mb_substr($name, 2);
        }

        $candidates = [$name];
        // Strip common transit prefixes
        $stripped = preg_replace('/^(محطة|محطه|موقف|ميدان|جامعة|جامعه|شارع)\s+/iu', '', $name);
        if ($stripped !== $name && mb_strlen($stripped) >= 2) {
            $candidates[] = $stripped;
        }

        // Generate variants with/without 'ال' and leading 'ل'
        $variants = [];
        foreach ($candidates as $c) {
            if (str_starts_with($c, 'ال') && mb_strlen($c) > 2) {
                $variants[] = mb_substr($c, 2);
            } else {
                $variants[] = 'ال' . $c;
            }
            if (str_starts_with($c, 'ل') && !str_starts_with($c, 'ال') && mb_strlen($c) > 2) {
                $variants[] = 'ال' . mb_substr($c, 1);
            }
        }
        $candidates = array_unique(array_merge($candidates, $variants));

        return Cache::remember('ai.stop.'.md5(mb_strtolower($name)), 60, function () use ($candidates, $name) {
            // 1. Exact match in hints first
            foreach ($candidates as $cand) {
                if (isset(self::ARABIC_NAME_HINTS[$cand])) {
                    $latin = self::ARABIC_NAME_HINTS[$cand];
                    $stop = TransitStop::query()
                        ->where(function ($q) use ($latin, $cand) {
                            $q->where('name', 'like', "%{$latin}%")
                                ->orWhere('name', 'like', "%{$cand}%");
                        })
                        ->orderByRaw('LENGTH(name) asc')
                        ->first();
                    if ($stop !== null) {
                        return $stop;
                    }
                }
            }

            // 2. Sort hints by length descending so longer compound names
            // (e.g. "جامعة القاهرة" before "القاهرة", "محطة الفيوم" before "الفيوم")
            // always match before shorter substrings.
            $sortedHints = self::ARABIC_NAME_HINTS;
            uksort($sortedHints, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

            foreach ($candidates as $cand) {
                foreach ($sortedHints as $arabic => $latin) {
                    if (mb_strpos($cand, $arabic) !== false) {
                        $stop = TransitStop::query()
                            ->where(function ($q) use ($latin, $arabic) {
                                $q->where('name', 'like', "%{$latin}%")
                                    ->orWhere('name', 'like', "%{$arabic}%");
                            })
                            ->orderByRaw('LENGTH(name) asc')
                            ->first();
                        if ($stop !== null) {
                            return $stop;
                        }
                    }
                }
            }

            // 3. Fallback direct match in DB
            foreach ($candidates as $cand) {
                $stop = TransitStop::query()
                    ->where('name', 'like', "%{$cand}%")
                    ->orderByRaw('LENGTH(name) asc')
                    ->first();
                if ($stop !== null) {
                    return $stop;
                }
            }

            return null;
        });
    }

    private function resolveLine(int $number): ?Route
    {
        return Cache::remember('ai.line.'.$number, 60, function () use ($number) {
            // "Show line 1" means the metro: metro lines rank strictly ahead
            // of bus short names that merely contain the digit.
            $route = Route::query()
                ->where('active', true)
                ->where(function ($q) use ($number) {
                    $q->where('short_name', (string) $number)
                        ->orWhere('short_name', 'like', "%{$number}%")
                        ->orWhere('long_name', 'like', "%line {$number}%");
                })
                ->orderByRaw('LOWER(transit_mode_id) = 1 desc') // metro first
                ->orderByRaw('LENGTH(short_name) asc')
                ->first();

            if ($route !== null) {
                return $route;
            }

            // Fallback: ordered metro routes (data-dependent mode identity).
            $metros = Route::query()
                ->where('active', true)
                ->whereHas('transitMode', fn ($q) => $q->whereRaw('LOWER(name) = ?', ['metro']))
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            return $metros[$number - 1] ?? null;
        });
    }

    /** @return array{amounts: array<int, string>, as_of_label: string} */
    private function metroTiers(): array
    {
        $row = \App\Models\SystemConfig::query()->where('config_key', 'tfc_metro_fares')->first();
        $matrix = is_string($row?->config_value) ? (json_decode($row->config_value, true)['matrix'] ?? null) : null;

        $amounts = [];
        if (is_array($matrix)) {
            foreach ($matrix as $destinations) {
                if (!is_array($destinations)) {
                    continue;
                }
                foreach ($destinations as $amount) {
                    if (is_numeric($amount)) {
                        $amounts[(string) (float) $amount] = true;
                    }
                }
            }
        }

        $list = array_map(fn ($v) => rtrim(rtrim($v, '0'), '.'), array_keys($amounts));
        sort($list, SORT_NUMERIC);

        if ($list === []) {
            return ['amounts' => [], 'as_of_label' => ''];
        }

        $asOf = json_decode((string) ($row->config_value ?? ''), true)['as_of'] ?? null;

        return [
            'amounts' => $list,
            'as_of_label' => is_string($asOf) && preg_match('/^\d{4}-\d{2}$/', $asOf)
                ? str_replace('-', '/', $asOf)
                : '2024/10',
        ];
    }

    /** @return array<int, array{stop: TransitStop, distance: float}> */
    private function nearbyStops(float $lat, float $lng, int $radius, int $limit): array
    {
        $dLat = $radius / 111000;
        $dLng = $radius / (111000 * max(0.2, cos(deg2rad($lat))));

        $stops = TransitStop::query()
            ->whereBetween('latitude', [$lat - $dLat, $lat + $dLat])
            ->whereBetween('longitude', [$lng - $dLng, $lng + $dLng])
            ->limit(200)
            ->get();

        return $stops
            ->map(fn (TransitStop $stop) => [
                'stop' => $stop,
                'distance' => GeoCalculator::distanceMeters($lat, $lng, (float) $stop->latitude, (float) $stop->longitude),
            ])
            ->filter(fn ($row) => $row['distance'] <= $radius)
            ->sortBy('distance')
            ->take($limit)
            ->values()
            ->all();
    }

    private function activeAlerts(int $limit)
    {
        $now = now();

        return ServiceAlert::query()
            ->where('active_period_start', '<=', $now)
            ->where(function ($q) use ($now) {
                $q->whereNull('active_period_end')->orWhere('active_period_end', '>=', $now);
            })
            ->orderBy('severity')
            ->limit($limit)
            ->get(['id', 'header_text', 'severity']);
    }

    private function stopParams(TransitStop $stop): array
    {
        return [
            'stop_id' => (int) $stop->id,
            'name' => $stop->name,
            'latitude' => (float) $stop->latitude,
            'longitude' => (float) $stop->longitude,
        ];
    }
}
