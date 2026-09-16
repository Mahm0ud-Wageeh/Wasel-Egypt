<?php

namespace App\Services\Ai;

/**
 * Whitelist and parameter schema for assistant-proposed UI actions.
 *
 * This is the safe command layer between the AI and the application: a
 * provider (mock or remote LLM) may only request actions from this
 * registry, with typed parameters. Anything unknown or malformed is
 * silently dropped before the response leaves the server, so a rogue
 * model can never make the frontend execute arbitrary behaviour.
 */
class AiActionValidator
{
    /**
     * Allowed action types and their parameter schemas.
     *
     * Rules: 'int' | 'float' | 'string' | 'enum:a|b' — prefixing the rule
     * with '?' marks the parameter optional (still type-checked when sent).
     */
    public const REGISTRY = [
        'navigate_home' => [],
        'open_planner' => [],
        'plan_journey' => [
            'origin' => 'string',
            'destination' => 'string',
            'origin_id' => '?int',
            'destination_id' => '?int',
            'auto_search' => '?string',
        ],
        'set_origin' => [
            'stop_id' => '?int',
            'name' => '?string',
            'latitude' => '?float',
            'longitude' => '?float',
        ],
        'set_destination' => [
            'stop_id' => '?int',
            'name' => '?string',
            'latitude' => '?float',
            'longitude' => '?float',
        ],
        'set_departure_time' => ['iso' => 'string'],
        'search_routes' => ['query' => '?string'],
        'open_route' => ['route_id' => 'int'],
        'open_stop' => ['stop_id' => 'int'],
        'open_fare' => [],
        'show_nearby_transit' => [],
        'show_alerts' => [],
        'open_active_journey' => [],
        'show_saved_journeys' => [],
        'open_notifications' => [],
        'open_profile' => [],
        'switch_map_layer' => ['layer' => 'enum:satellite|streets|dark'],
        'focus_map_location' => ['latitude' => 'float', 'longitude' => 'float', 'zoom' => '?float'],
        'get_live_eta' => [],
        'get_next_stop' => [],
    ];

    public const MAX_ACTIONS = 4;

    /**
     * Keep only well-formed, whitelisted actions (first MAX_ACTIONS valid ones).
     *
     * @param  mixed  $proposed  Raw provider-proposed action list.
     * @return array<int, array{type: string, params: array<string, mixed>}>
     */
    public function validate(mixed $proposed): array
    {
        if (!is_array($proposed)) {
            return [];
        }

        $valid = [];

        foreach ($proposed as $action) {
            if (count($valid) >= self::MAX_ACTIONS) {
                break;
            }
            if (!is_array($action)) {
                continue;
            }

            $type = $action['type'] ?? $action['action'] ?? null;
            if (!is_string($type) || !array_key_exists($type, self::REGISTRY)) {
                continue;
            }

            $params = [];
            $proposedParams = is_array($action['params'] ?? null) ? $action['params'] : [];
            $ok = true;

            foreach (self::REGISTRY[$type] as $param => $rule) {
                $optional = str_starts_with($rule, '?');
                $baseRule = $optional ? substr($rule, 1) : $rule;

                if (!array_key_exists($param, $proposedParams) || $proposedParams[$param] === null) {
                    if ($optional) {
                        continue;
                    }
                    $ok = false;
                    break;
                }

                $coerced = $this->coerce($proposedParams[$param], $baseRule);
                if ($coerced === null) {
                    // Optional parameters with wrong types are dropped, not fatal.
                    if ($optional) {
                        continue;
                    }
                    $ok = false;
                    break;
                }
                $params[$param] = $coerced;
            }

            if ($ok) {
                $valid[] = ['type' => $type, 'params' => $params];
            }
        }

        return $valid;
    }

    private function coerce(mixed $value, string $rule): mixed
    {
        if ($rule === 'int') {
            return is_numeric($value) ? (int) $value : null;
        }
        if ($rule === 'float') {
            return is_numeric($value) ? (float) $value : null;
        }
        if ($rule === 'string') {
            return is_scalar($value) && trim((string) $value) !== ''
                ? mb_substr(trim((string) $value), 0, 160)
                : null;
        }
        if (str_starts_with($rule, 'enum:')) {
            $allowed = explode('|', substr($rule, 5));

            return in_array($value, $allowed, true) ? $value : null;
        }

        return null;
    }
}
