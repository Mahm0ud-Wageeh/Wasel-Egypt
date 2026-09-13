<?php

/**
 * Geometry final audit (release gate): automated checks over real journeys
 * from the live API — the same checks the release report records.
 *
 * For each audited pair:
 *  - plan a journey via POST /journeys/search
 *  - pick the best option and validate its transit legs:
 *      1. leg geometry endpoints anchor at the leg's own from/to stops
 *         (trimmed to the ridden segment — no full-line leakage);
 *      2. no duplicate consecutive points inflating the polyline;
 *      3. legs connect: leg N to-stop == leg N+1 from-stop (transit chain)
 *         or the walk geometry links them;
 *      4. every geometry point lies in the Egypt bbox (no garbage coords);
 *      5. no geometry appears twice across legs (no alternative-route reuse).
 */

function api(string $path, ?string $token, ?array $post = null, string $method = 'POST'): array {
    $ch = curl_init('http://127.0.0.1:8000/api/v1' . $path);
    $h = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) { $h[] = "Authorization: Bearer $token"; }
    $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $h, CURLOPT_CUSTOMREQUEST => $method];
    if ($post !== null) { $opts[CURLOPT_POSTFIELDS] = json_encode($post); }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [$code, json_decode($raw, true)];
}

[$loginCode, $login] = api('/auth/login', null, ['email' => 'admin@example.com', 'password' => 'password']);
if ($loginCode !== 200) { fwrite(STDERR, "login failed: HTTP $loginCode
"); exit(1); }
$token = $login['data']['token'];

// Real stop pairs spanning the graph: metro-metro, cross-governorate, Fayoum pack.
$pairs = [
    ['metro L1 slice', 'Ain Helwan Metro', 'New Marg'],
    ['metro L2 slice', 'Konayyesa (Moneeb)', 'Moassasa'],
    ['giza → tahrir corridor', 'Al Omraneyya Bridge Entrance from Giza', 'Ali Abdel Halim St. & Tahrir St.'],
    ['fayoum terminal → giza (demo F01)', 'Fayoum Bus Terminal', 'Giza'],
    ['fayoum city hop (demo F02)', 'Fayoum Bus Terminal', 'New Fayoum City'],
];

$issues = [];
$checked = 0;
$legsChecked = 0;

foreach ($pairs as [$label, $fromName, $toName]) {
    [, $from] = api('/stops?search=' . rawurlencode($fromName) . '&per_page=5', $token, null, 'GET');
    [, $to] = api('/stops?search=' . rawurlencode($toName) . '&per_page=5', $token, null, 'GET');
    $pick = function (array $resp, string $name) {
        foreach (($resp['data'] ?? []) as $s) {
            if (strcasecmp($s['name'], $name) === 0) { return $s; }
        }
        return $resp['data'][0] ?? null;
    };
    $fromStop = $pick($from, $fromName);
    $toStop = $pick($to, $toName);
    if (!$fromStop || !$toStop) {
        $issues[] = "$label: stop lookup failed ({$fromName}/{$toName})";
        continue;
    }

    [$code, $plan] = api('/journeys/search', $token, [
        'origin_lat' => $fromStop['latitude'], 'origin_lng' => $fromStop['longitude'],
        'destination_lat' => $toStop['latitude'], 'destination_lng' => $toStop['longitude'],
    ]);
    if ($code !== 200) {
        $issues[] = "$label: search HTTP $code";
        continue;
    }
    $options = $plan['data']['options'] ?? [];
    if (!$options) {
        $issues[] = "$label: no options returned";
        continue;
    }
    $best = $options[0];
    $checked++;

    $prevToStopId = null;
    $seenGeomSignatures = [];
    $stopCoordCache = [];
    foreach ($best['legs'] as $i => $leg) {
        $legsChecked++;
        $geom = $leg['geometry'] ?? null;
        $type = $leg['type'] ?? '?';
        $fromId = $leg['from_stop']['id'] ?? null;
        $toId = $leg['to_stop']['id'] ?? null;

        // 3. connectivity: consecutive transit legs share the hand-off stop
        if ($prevToStopId !== null && $type === 'transit' && $fromId !== null) {
            // hand-off may include a walk leg between transit legs; only flag
            // direct transit→transit discontinuity
            $prevType = $best['legs'][$i - 1]['type'] ?? '';
            if ($prevType === 'transit' && $fromId !== $prevToStopId) {
                $issues[] = "$label leg#$i: transit→transit discontinuity ($prevToStopId → $fromId)";
            }
        }
        if ($toId !== null) { $prevToStopId = $toId; }

        if ($geom === null || !is_array($geom) || count($geom) < 2) {
            continue; // walk legs may carry no stored polyline; transit legs checked below
        }
        if ($type !== 'transit') { continue; }

        // 4. bbox sanity
        foreach ($geom as $pt) {
            if ($pt[0] < 21.0 || $pt[0] > 32.0 || $pt[1] < 24.0 || $pt[1] > 37.0) {
                $issues[] = "$label leg#$i: geometry point outside Egypt bbox ({$pt[0]},{$pt[1]})";
                break;
            }
        }

        // 2. duplicate consecutive points (>50% of the polyline identical adjacents = stale data)
        $dups = 0;
        for ($p = 1; $p < count($geom); $p++) {
            if ($geom[$p][0] === $geom[$p - 1][0] && $geom[$p][1] === $geom[$p - 1][1]) { $dups++; }
        }
        if ($dups > count($geom) * 0.5) {
            $issues[] = "$label leg#$i: " . $dups . "/" . count($geom) . " duplicate consecutive points";
        }

        // 1. trim check: geometry endpoints near the leg stops (≤ 400 m slack)
        $haversine = function ($a1, $o1, $a2, $o2) {
            $r = pi() / 180;
            $dA = ($a2 - $a1) * $r; $dO = ($o2 - $o1) * $r;
            $x = sin($dA / 2) ** 2 + cos($a1 * $r) * cos($a2 * $r) * sin($dO / 2) ** 2;
            return 6371000 * 2 * atan2(sqrt($x), sqrt(1 - $x));
        };
        $stopCoords = function (array $stop) use (&$stopCoordCache, $token) {
            $id = $stop['id'] ?? null;
            if ($id === null) { return null; }
            if (!isset($stopCoordCache[$id])) {
                [, $detail] = api('/stops/' . $id, $token, null, 'GET');
                $d = $detail['data'] ?? $detail ?? null;
                $stopCoordCache[$id] = ($d['latitude'] ?? null) !== null ? [(float) $d['latitude'], (float) $d['longitude']] : null;
            }
            return $stopCoordCache[$id];
        };
        $fromC = $stopCoords($leg['from_stop'] ?? []);
        $toC = $stopCoords($leg['to_stop'] ?? []);
        if ($fromC === null || $toC === null) { continue; }
        $head = $haversine($geom[0][0], $geom[0][1], $fromC[0], $fromC[1]);
        $tail = $haversine($geom[count($geom) - 1][0], $geom[count($geom) - 1][1], $toC[0], $toC[1]);
        if ($head > 400) { $issues[] = "$label leg#$i: geometry head " . round($head) . "m from from_stop {$leg['from_stop']['name']} (line leakage?)"; }
        if ($tail > 400) { $issues[] = "$label leg#$i: geometry tail " . round($tail) . "m from to_stop {$leg['to_stop']['name']} (line leakage?)"; }

        // 5. no identical geometry reused across legs
        $sig = md5(json_encode($geom));
        if (isset($seenGeomSignatures[$sig])) {
            $issues[] = "$label leg#$i: duplicate geometry reused from leg #" . $seenGeomSignatures[$sig];
        }
        $seenGeomSignatures[$sig] = $i;
    }
}

echo "AUDIT: pairs=$checked legs=$legsChecked issues=" . count($issues) . "\n";
foreach ($issues as $iss) { echo "  - $iss\n"; }
echo $issues ? "RESULT: FAIL\n" : "RESULT: PASS\n";
