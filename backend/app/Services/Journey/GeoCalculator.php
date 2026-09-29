<?php

namespace App\Services\Journey;

/**
 * Deterministic geo helpers for journey planning.
 */
class GeoCalculator
{
    /**
     * Average walking speed in meters/second by preference value.
     */
    public const WALK_SPEEDS_MPS = [
        'slow' => 0.9,
        'average' => 1.35,
        'fast' => 1.8,
    ];

    /**
     * Average effective transit speed in meters/second by journey leg mode.
     * Conservative averages that include acceleration and dwell time.
     */
    public const TRANSIT_SPEEDS_MPS = [
        'walking' => 1.35,
        'metro' => 8.5,
        'rail' => 11.0,
        'bus' => 5.5,
        'minibus' => 5.0,
        'microbus' => 5.0,
    ];

    /**
     * Great-circle distance between two coordinates in meters (haversine).
     */
    public static function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;

        $latRad1 = deg2rad($lat1);
        $latRad2 = deg2rad($lat2);
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos($latRad1) * cos($latRad2) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Walking duration in whole seconds for a distance at the given speed preference.
     */
    public static function walkingDurationSec(float $meters, string $walkSpeed = 'average'): int
    {
        $speed = self::WALK_SPEEDS_MPS[$walkSpeed] ?? self::WALK_SPEEDS_MPS['average'];

        return (int) ceil($meters / $speed);
    }

    /**
     * Effective transit speed for a leg mode in meters/second.
     */
    public static function transitSpeedMps(string $mode): float
    {
        return self::TRANSIT_SPEEDS_MPS[$mode] ?? self::TRANSIT_SPEEDS_MPS['bus'];
    }

    /**
     * Shortest distance between a point and a segment (the leg corridor),
     * in meters. Uses a local equirectangular projection around the segment
     * midpoint so plain planar geometry stays accurate over city distances.
     */
    public static function pointToSegmentDistanceMeters(
        float $lat,
        float $lng,
        float $segLat1,
        float $segLng1,
        float $segLat2,
        float $segLng2,
    ): float {
        $midLat = ($segLat1 + $segLat2) / 2;
        $midLng = ($segLng1 + $segLng2) / 2;
        $metersPerDegLat = 111320.0;
        $metersPerDegLng = 111320.0 * cos(deg2rad($midLat));

        $toMeters = fn (float $lat, float $lng): array => [
            ($lat - $midLat) * $metersPerDegLat,
            ($lng - $midLng) * $metersPerDegLng,
        ];

        [$ax, $ay] = $toMeters($segLat1, $segLng1);
        [$bx, $by] = $toMeters($segLat2, $segLng2);
        [$px, $py] = $toMeters($lat, $lng);

        $dx = $bx - $ax;
        $dy = $by - $ay;
        $lengthSquared = $dx * $dx + $dy * $dy;

        if ($lengthSquared == 0.0) {
            return sqrt(($px - $ax) ** 2 + ($py - $ay) ** 2);
        }

        $t = max(0.0, min(1.0, (($px - $ax) * $dx + ($py - $ay) * $dy) / $lengthSquared));
        $closestX = $ax + $t * $dx;
        $closestY = $ay + $t * $dy;

        return sqrt(($px - $closestX) ** 2 + ($py - $closestY) ** 2);
    }

    /**
     * Initial compass bearing from (lat1, lng1) to (lat2, lng2) in degrees [0, 360).
     */
    public static function calculateBearing(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $latRad1 = deg2rad($lat1);
        $latRad2 = deg2rad($lat2);
        $dLng = deg2rad($lng2 - $lng1);

        $y = sin($dLng) * cos($latRad2);
        $x = cos($latRad1) * sin($latRad2) - sin($latRad1) * cos($latRad2) * cos($dLng);

        $bearing = rad2deg(atan2($y, $x));

        return fmod(($bearing + 360.0), 360.0);
    }

    /**
     * Cardinal compass direction (e.g. 'north', 'northeast', 'east', etc.).
     */
    public static function bearingToCardinal(float $bearing): string
    {
        $cardinals = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
        $idx = (int) round($bearing / 45.0) % 8;

        return $cardinals[$idx];
    }

    /**
     * Shortest angular difference between two bearings in degrees [-180, 180].
     */
    public static function shortestAngleDiff(float $bearingFrom, float $bearingTo): float
    {
        return fmod(($bearingTo - $bearingFrom + 540.0), 360.0) - 180.0;
    }

    /**
     * Classify angular difference into maneuver type (mirrors navigationMath.js).
     *
     * @return 'straight'|'slight_right'|'turn_right'|'sharp_right'|'u_turn'|'slight_left'|'turn_left'|'sharp_left'
     */
    public static function classifyTurnAngle(float $angleDiff): string
    {
        $abs = abs($angleDiff);
        if ($abs < 20) {
            return 'straight';
        }
        if ($angleDiff > 0) {
            if ($angleDiff <= 45) return 'slight_right';
            if ($angleDiff <= 135) return 'turn_right';
            if ($angleDiff <= 170) return 'sharp_right';
            return 'u_turn';
        } else {
            if ($angleDiff >= -45) return 'slight_left';
            if ($angleDiff >= -135) return 'turn_left';
            if ($angleDiff >= -170) return 'sharp_left';
            return 'u_turn';
        }
    }

    /**
     * Human-friendly instruction from maneuver type.
     */
    public static function formatManeuverInstruction(string $turnType, ?string $streetName = null): string
    {
        $label = match ($turnType) {
            'slight_right' => 'Turn slight right',
            'turn_right' => 'Turn right',
            'sharp_right' => 'Turn sharp right',
            'slight_left' => 'Turn slight left',
            'turn_left' => 'Turn left',
            'sharp_left' => 'Turn sharp left',
            'u_turn' => 'Make a U-turn',
            default => 'Continue straight',
        };

        if (!empty($streetName)) {
            return "{$label} onto {$streetName}";
        }

        return $label;
    }

    /**
     * Synthesize fallback walking steps when OSRM steps are null.
     *
     * @return array<array{instruction: string, distance: int, bearing: int}>
     */
    public static function synthesizeWalkingSteps(
        float $fromLat,
        float $fromLng,
        float $toLat,
        float $toLng,
        ?array $geometry = null,
        ?int $totalDistance = null
    ): array {
        $dist = $totalDistance ?? (int) round(self::distanceMeters($fromLat, $fromLng, $toLat, $toLng));

        if (is_array($geometry) && count($geometry) >= 3) {
            $steps = [];
            $initialBearing = (int) round(self::calculateBearing($geometry[0][0], $geometry[0][1], $geometry[1][0], $geometry[1][1]));
            $steps[] = [
                'instruction' => 'Head ' . self::bearingToCardinal($initialBearing) . ' towards destination',
                'distance' => (int) round(self::distanceMeters($geometry[0][0], $geometry[0][1], $geometry[1][0], $geometry[1][1])),
                'bearing' => $initialBearing,
            ];

            for ($i = 1; $i < count($geometry) - 1; $i++) {
                $bBefore = self::calculateBearing($geometry[$i - 1][0], $geometry[$i - 1][1], $geometry[$i][0], $geometry[$i][1]);
                $bAfter = self::calculateBearing($geometry[$i][0], $geometry[$i][1], $geometry[$i + 1][0], $geometry[$i + 1][1]);
                $angleDiff = self::shortestAngleDiff($bBefore, $bAfter);
                $turn = self::classifyTurnAngle($angleDiff);
                if ($turn !== 'straight') {
                    $segDist = (int) round(self::distanceMeters($geometry[$i][0], $geometry[$i][1], $geometry[$i + 1][0], $geometry[$i + 1][1]));
                    $steps[] = [
                        'instruction' => self::formatManeuverInstruction($turn),
                        'distance' => $segDist,
                        'bearing' => (int) round($bAfter),
                    ];
                }
            }

            $finalBearing = (int) round(self::calculateBearing(
                $geometry[count($geometry) - 2][0],
                $geometry[count($geometry) - 2][1],
                $geometry[count($geometry) - 1][0],
                $geometry[count($geometry) - 1][1]
            ));
            $steps[] = [
                'instruction' => 'Arrive at destination',
                'distance' => 0,
                'bearing' => $finalBearing,
            ];

            return $steps;
        }

        // Straight-line fallback
        $bearing = (int) round(self::calculateBearing($fromLat, $fromLng, $toLat, $toLng));

        return [
            [
                'instruction' => 'Walk ' . self::bearingToCardinal($bearing) . ' towards destination',
                'distance' => $dist,
                'bearing' => $bearing,
            ],
            [
                'instruction' => 'Arrive at destination',
                'distance' => 0,
                'bearing' => $bearing,
            ],
        ];
    }
}

