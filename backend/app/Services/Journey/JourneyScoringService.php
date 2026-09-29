<?php

namespace App\Services\Journey;

/**
 * Deterministic journey scoring.
 *
 * Each plan receives a score in [0, 10) where lower is better, composed of
 * normalized components:
 *
 *   travel time   (0.40) - total duration including walking and waiting
 *   walking       (0.20) - total walking distance in meters
 *   transfers     (0.20) - number of transfers
 *   fare          (0.10) - estimated fare, only when fare data is available;
 *                          when no plan has a fare the weight is redistributed
 *                          to travel time
 *   reliability   (0.10) - 1 - average route variant reliability
 *
 * User preferences are applied on top of the base score:
 *   - plans whose transit legs all use preferred modes get a 10% reduction
 *   - plans containing an avoided mode get a 25% penalty (the planner also
 *     hard-filters avoided modes, this guards direct service use)
 */
class JourneyScoringService
{
    public const WEIGHT_TIME = 0.40;
    public const WEIGHT_WALK = 0.20;
    public const WEIGHT_TRANSFERS = 0.20;
    public const WEIGHT_FARE = 0.10;
    public const WEIGHT_RELIABILITY = 0.10;

    public const PREFERRED_MODE_BONUS = 0.9;
    public const AVOIDED_MODE_PENALTY = 1.25;

    /**
     * Score and sort plans (lower score is better).
     *
     * @param array $plans Plan structures produced by JourneyPlannerService.
     * @param object|null $prefs UserPreference model or null for defaults.
     * @return array Plans with a 'score' key, sorted ascending by score.
     */
    public function score(array $plans, ?object $prefs = null): array
    {
        if ($plans === []) {
            return $plans;
        }

        $faresAvailable = array_reduce(
            $plans,
            fn (bool $carry, array $plan) => $carry || isset($plan['fare']),
            false
        );

        $weights = [
            'time' => self::WEIGHT_TIME,
            'walk' => self::WEIGHT_WALK,
            'transfers' => self::WEIGHT_TRANSFERS,
            'fare' => $faresAvailable ? self::WEIGHT_FARE : 0.0,
            'reliability' => self::WEIGHT_RELIABILITY,
        ];

        if (!$faresAvailable) {
            $weights['time'] += self::WEIGHT_FARE;
        }

        $ranges = [
            'time' => $this->range(array_column($plans, 'total_duration_sec')),
            'walk' => $this->range(array_column($plans, 'walk_distance_meters')),
            'transfers' => $this->range(array_column($plans, 'total_transfers')),
            'fare' => $this->range(array_map(
                fn (array $plan) => $plan['fare']['amount'] ?? null,
                $plans
            )),
        ];

        $preferredModes = $prefs->preferred_modes ?? [];
        $avoidedModes = $prefs->avoided_modes ?? [];

        $scoredPlans = [];

        foreach ($plans as $plan) {
            $score = $weights['time'] * $this->normalize($plan['total_duration_sec'], $ranges['time'])
                + $weights['walk'] * $this->normalize($plan['walk_distance_meters'], $ranges['walk'])
                + $weights['transfers'] * $this->normalize($plan['total_transfers'], $ranges['transfers'])
                + $weights['reliability'] * (1.0 - (float) ($plan['reliability'] ?? 1.0));

            if ($weights['fare'] > 0.0) {
                // Plans without fare data rank as the worst fare component.
                $fareAmount = $plan['fare']['amount'] ?? null;
                $score += $weights['fare'] * ($fareAmount === null
                    ? 1.0
                    : $this->normalize($fareAmount, $ranges['fare']));
            }

            $transitModes = array_map(
                fn (array $leg) => $leg['mode'],
                array_filter($plan['legs'], fn (array $leg) => $leg['type'] === 'transit')
            );

            $allPreferred = $transitModes !== [] && $preferredModes !== [];
            foreach ($transitModes as $mode) {
                if (!in_array($mode, $preferredModes, true)) {
                    $allPreferred = false;
                    break;
                }
            }

            if ($allPreferred) {
                $score *= self::PREFERRED_MODE_BONUS;
            }

            $anyAvoided = false;
            foreach ($transitModes as $mode) {
                if (in_array($mode, $avoidedModes, true)) {
                    $anyAvoided = true;
                    break;
                }
            }

            if ($anyAvoided) {
                $score *= self::AVOIDED_MODE_PENALTY;
            }

            $plan['score'] = round(min(max($score, 0.0), 9.9999), 4);
            $scoredPlans[] = $plan;
        }

        usort($scoredPlans, fn (array $a, array $b) => [$a['score'], $a['total_duration_sec'], $a['walk_distance_meters']]
            <=> [$b['score'], $b['total_duration_sec'], $b['walk_distance_meters']]);

        return $scoredPlans;
    }

    /**
     * Min/max bounds for a numeric list, ignoring nulls.
     */
    private function range(array $values): array
    {
        $numeric = array_values(array_filter($values, fn ($v) => $v !== null));

        if ($numeric === []) {
            return ['min' => 0, 'max' => 0];
        }

        return ['min' => min($numeric), 'max' => max($numeric)];
    }

    /**
     * Normalize a value into [0, 1] against min/max bounds.
     */
    private function normalize($value, array $range): float
    {
        if ($range['max'] == $range['min']) {
            return 0.0;
        }

        return ($value - $range['min']) / ($range['max'] - $range['min']);
    }
}
