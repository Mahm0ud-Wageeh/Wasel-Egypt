/**
 * Isolated Development & Test Mock Journeys — Wasel Egypt
 * 
 * Synthetic test fixtures for unit and integration testing of journey planners and navigation engines.
 * 
 * @version 2026.09-dev
 * @environment test, development
 */

export interface MockJourneyLeg {
  id: number;
  sequence: number;
  mode: 'walking' | 'metro' | 'bus' | 'microbus' | 'lrt' | 'monorail';
  route_variant_id?: number;
  from_lat: string | number;
  from_lng: string | number;
  to_lat: string | number;
  to_lng: string | number;
  duration_sec: number;
  distance_meters: number;
  departure_time: string;
  arrival_time: string;
  geometry: [number, number][];
  geometry_source?: string;
  from_stop: { id: number; name: string; latitude: string; longitude: string };
  to_stop: { id: number; name: string; latitude: string; longitude: string };
}

export interface MockActiveJourneyFixture {
  id: number;
  user_id: number;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  current_progress_percent: number;
  current_leg_index: number;
  journey: {
    id: number;
    journey_legs: MockJourneyLeg[];
  };
}

export const MOCK_ACTIVE_JOURNEY: MockActiveJourneyFixture = {
  id: 55,
  user_id: 1,
  status: 'active',
  started_at: '2026-09-05T12:00:00Z',
  current_progress_percent: 45,
  current_leg_index: 0,
  journey: {
    id: 10,
    journey_legs: [
      {
        id: 1,
        sequence: 1,
        mode: 'metro',
        route_variant_id: 12,
        from_lat: '30.04440000',
        from_lng: '31.23570000',
        to_lat: '30.04230000',
        to_lng: '31.23150000',
        duration_sec: 1200,
        distance_meters: 3500,
        departure_time: '2026-09-05T12:04:00Z',
        arrival_time: '2026-09-05T12:24:00Z',
        geometry: [
          [30.0444, 31.2357],
          [30.0435, 31.2335],
          [30.0423, 31.2315],
        ],
        geometry_source: 'route_geometry',
        from_stop: { id: 1, name: 'Sadat Station', latitude: '30.0444', longitude: '31.2357' },
        to_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
      },
      {
        id: 2,
        sequence: 2,
        mode: 'bus',
        route_variant_id: 8,
        from_lat: '30.04230000',
        from_lng: '31.23150000',
        to_lat: '30.02610000',
        to_lng: '31.20140000',
        duration_sec: 900,
        distance_meters: 2800,
        departure_time: '2026-09-05T12:25:00Z',
        arrival_time: '2026-09-05T12:40:00Z',
        geometry: [
          [30.0423, 31.2315],
          [30.035, 31.215],
          [30.0261, 31.2014],
        ],
        geometry_source: 'route_geometry',
        from_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
        to_stop: { id: 3, name: 'Cairo University', latitude: '30.0261', longitude: '31.2014' },
      },
    ],
  },
};
