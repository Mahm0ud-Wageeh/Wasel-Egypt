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
}
