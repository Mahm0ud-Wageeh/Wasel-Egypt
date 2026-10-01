import { parseEgyptianTransitQuery } from '../utils/egyptianQueryParser'

export type RawAiAction = {
  type?: unknown
  action?: unknown
  params?: Record<string, any>
  label_ar?: string
  label_en?: string
  screen?: string
  icon?: string
}

export type NormalizedAiAction = {
  action: string
  params: Record<string, any>
  label_ar?: string
  label_en?: string
  screen?: string
  icon?: string
}

const SUPPORTED_ACTIONS = new Set([
  'navigate_home',
  'open_planner',
  'plan_journey',
  'set_origin',
  'set_destination',
  'set_departure_time',
  'search_routes',
  'open_route',
  'open_stop',
  'open_fare',
  'show_nearby_transit',
  'show_alerts',
  'open_notifications',
  'open_active_journey',
  'show_saved_journeys',
  'switch_map_layer',
  'focus_map_location',
  'get_live_eta',
  'get_next_stop',
  'toggle_3d',
  'show_nearby_stops',
  'locate_me',
  'show_route_on_map',
  'open_metro',
  'open_fares',
  'open_network',
  'open_profile',
])

export function normalizeAiAction(raw: RawAiAction): NormalizedAiAction | null {
  const action = typeof raw.type === 'string' ? raw.type : raw.action
  if (typeof action !== 'string' || !SUPPORTED_ACTIONS.has(action)) return null

  return {
    action,
    params: raw.params && typeof raw.params === 'object' ? raw.params : {},
    label_ar: raw.label_ar,
    label_en: raw.label_en,
    screen: raw.screen,
    icon: raw.icon,
  }
}

export function ensureJourneyAction(actions: RawAiAction[], text: string): RawAiAction[] {
  if (actions.some((action) => normalizeAiAction(action)?.action === 'plan_journey')) {
    return actions
  }

  const parsed = parseEgyptianTransitQuery(text)
  if (!parsed.is_natural_query || parsed.confidence < 0.8 || !parsed.origin || !parsed.destination) {
    return actions
  }

  return [
    ...actions,
    {
      type: 'plan_journey',
      params: {
        origin: parsed.origin,
        destination: parsed.destination,
        auto_search: 'true',
      },
    },
  ]
}