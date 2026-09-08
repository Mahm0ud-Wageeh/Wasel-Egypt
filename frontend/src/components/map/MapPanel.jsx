import { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Icon } from '../ui/Icon';

/**
 * Production map panel built on MapLibre GL JS.
 *
 * - Real OSM raster tiles (provider configurable via VITE_MAP_TILES_URL)
 * - Origin / destination markers, stop markers, user location with halo
 * - Multiple route polylines with a clearly highlighted selected route
 * - Walking-leg geometries (road-following from OSRM) with dashed style
 * - Deviation marker with severity color
 * - Functional recenter + zoom controls; responsive height
 * - Graceful failure: a static placeholder with the route bounds rendered
 *   as a simple SVG outline if WebGL/MapLibre cannot initialize
 *
 * Coordinates in props are [lat, lng]; converted to [lng, lat] for MapLibre.
 */

// NOTE: MapLibre raster sources do not expand Leaflet's {r} retina token —
// it gets requested literally and 404s. Standard 256px tiles only.
const TILE_URL =
  import.meta.env.VITE_MAP_TILES_URL ||
  'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';

// Resolved hex values (MapLibre paint properties cannot read CSS variables).
const C = {
  primary: '#0E7C86',
  primaryDark: '#0A5A63',
  accent: '#D98E04',
  danger: '#C81E1E',
  walking: '#5E6E78',
  surface: '#FFFFFF',
  ink: '#12232E',
};

const MODE_COLORS = {
  metro: '#E0191D',
  bus: '#0E7C86',
  minibus: '#6B4E9B',
  microbus: '#B35C00',
  rail: '#2D572C',
  walking: C.walking,
};

const lng = (p) => [p.lng ?? p[1], p.lat ?? p[0]];

/**
 * Build the full route GeoJSON for one itinerary: transit legs from
 * `leg.geometry` (variant polyline) when present, walking legs from
 * `leg.geometry` (OSRM road polyline), both falling back to straight lines
 * between leg endpoints.
 */
function itineraryToFeatures(itinerary, kind) {
  const features = [];

  (itinerary?.legs ?? []).forEach((leg, idx) => {
    let coords = null;

    if (Array.isArray(leg.geometry) && leg.geometry.length >= 2) {
      coords = leg.geometry
        .map((p) => [Number(p[1]), Number(p[0])])
        .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1])); // [lat,lng] → [lng,lat]
    }
    if ((!coords || coords.length < 2) && Number.isFinite(Number(leg.from_lat)) && Number.isFinite(Number(leg.to_lat))) {
      coords = [
        [Number(leg.from_lng), Number(leg.from_lat)],
        [Number(leg.to_lng), Number(leg.to_lat)],
      ];
    }
    if (!coords || coords.length < 2) return;

    features.push({
      type: 'Feature',
      properties: {
        kind,
        legType: leg.type,
        mode: leg.mode,
        index: idx,
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  });

  return features;
}

export function MapPanel({
  origin = null,
  destination = null,
  itinerary = null, // selected itinerary: { legs: [...] }
  alternatives = [], // unselected itineraries for context
  stops = [], // [{lat,lng,name,id}]
  userLocation = null, // {lat,lng,accuracy?}
  deviation = null, // {lat,lng,severity}
  height = 260,
  fitTo = 'route', // 'route' | 'origin' | 'user'
  showControls = true,
  children,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const maplibreRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(null);

  // ---------- init ----------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let disposed = false;
    let resizeObserver = null;

    import('maplibre-gl')
      .then((maplibre) => {
        if (disposed) return;
        maplibreRef.current = maplibre;

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: [TILE_URL],
                tileSize: 256,
                attribution: TILE_ATTRIBUTION,
              },
            },
            layers: [
              { id: 'background', type: 'background', paint: { 'background-color': '#E8ECEF' } },
              { id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 },
            ],
          },
          center: [31.2357, 30.0444], // Cairo
          zoom: 11,
          attributionControl: { compact: true },
        });

        map.on('error', (e) => {
          // Tile errors are routine (offline); engine errors disable the map.
          if (e?.error?.message && !/Failed to fetch|NetworkError/i.test(e.error.message)) {
            console.error('MapLibre error:', e.error.message);
          }
        });

        map.on('load', () => {
          if (disposed) return;
          setReady(true);
          map.resize();
        });
        map.on('zoom', () => setZoom(Math.round(map.getZoom())));

        mapRef.current = map;
        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(mapContainerRef.current);
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ---------- render layers ----------
  const clearDynamic = useCallback((map) => {
    const style = map.getStyle();
    (style?.layers ?? [])
      .filter((l) => !['background', 'osm-tiles'].includes(l.id))
      .forEach((l) => map.getLayer(l.id) && map.removeLayer(l.id));
    Object.keys(style?.sources ?? {})
      .filter((id) => id !== 'osm')
      .forEach((id) => map.getSource(id) && map.removeSource(id));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !ready) return;

    clearDynamic(map);

    // -- alternative routes (context) --
    alternatives.forEach((alt, i) => {
      const id = `alt-route-${i}`;
      map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: itineraryToFeatures(alt, 'alternative') } });
      map.addLayer({
        id: `alt-line-${i}`,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#9AA7AE',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 5],
        },
        filter: ['==', ['get', 'kind'], 'alternative'],
      });
    });

    // -- selected itinerary --
    if (itinerary) {
      const features = itineraryToFeatures(itinerary, 'selected');
      map.addSource('selected-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      // Walking segments: dashed, muted.
      map.addLayer({
        id: 'selected-walk',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': C.walking,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 4],
          'line-dasharray': [1.5, 1.5],
        },
        filter: ['==', ['get', 'legType'], 'walking'],
      });

      // Transit segments: solid, mode-colored.
      map.addLayer({
        id: 'selected-transit',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'mode'],
            'metro', MODE_COLORS.metro,
            'minibus', MODE_COLORS.minibus,
            'microbus', MODE_COLORS.microbus,
            'rail', MODE_COLORS.rail,
            MODE_COLORS.bus,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 7],
        },
        filter: ['==', ['get', 'legType'], 'transit'],
      });

      // Directional casing for the selected route.
      map.addLayer({
        id: 'selected-casing',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': C.surface,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6.5, 16, 10],
          'line-opacity': 0.7,
        },
        filter: ['==', ['get', 'legType'], 'transit'],
      });
      map.moveLayer('selected-casing', 'selected-transit');
    }

    // -- stops --
    if (stops.length > 0) {
      map.addSource('stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stops
            .filter((s) => s.lat != null && s.lng != null)
            .map((s) => ({
              type: 'Feature',
              properties: { name: s.name ?? '' },
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            })),
        },
      });
      map.addLayer({
        id: 'stops-halo',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 6],
          'circle-color': C.surface,
          'circle-stroke-width': 2,
          'circle-stroke-color': C.primaryDark,
        },
      });
    }

    // -- origin / destination --
    const validPin = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
    const pinSource = (id, color, coords) => {
      map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords } } });
      map.addLayer({
        id: `${id}-layer`,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 7,
          'circle-color': C.surface,
          'circle-stroke-width': 3.5,
          'circle-stroke-color': color,
        },
      });
    };
    if (validPin(origin)) pinSource('origin-pin', C.primary, lng(origin));
    if (validPin(destination)) pinSource('destination-pin', C.accent, lng(destination));

    // -- user location --
    const validUser =
      userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng));
    if (validUser) {
      map.addSource('user', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: lng(userLocation) } },
      });
      map.addLayer({
        id: 'user-halo',
        type: 'circle',
        source: 'user',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 16, 20],
          'circle-color': 'rgba(14,124,134,0.22)',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(14,124,134,0.5)',
        },
      });
      map.addLayer({
        id: 'user-dot',
        type: 'circle',
        source: 'user',
        paint: {
          'circle-radius': 7,
          'circle-color': C.primary,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': C.surface,
        },
      });
    }

    // -- deviation marker --
    const validDeviation =
      deviation && Number.isFinite(Number(deviation.lat)) && Number.isFinite(Number(deviation.lng));
    if (validDeviation) {
      map.addSource('deviation', {
        type: 'geojson',
        data: { type: 'Feature', properties: { severity: deviation.severity ?? 'medium' }, geometry: { type: 'Point', coordinates: lng(deviation) } },
      });
      map.addLayer({
        id: 'deviation-pin',
        type: 'circle',
        source: 'deviation',
        paint: {
          'circle-radius': 11,
          'circle-color': deviation.severity === 'high' ? C.danger : C.accent,
          'circle-stroke-width': 3,
          'circle-stroke-color': C.surface,
        },
      });
    }

    // -- fit bounds (only finite coordinates are usable) --
    const finite = (lngLat) =>
      Array.isArray(lngLat) &&
      Number.isFinite(lngLat[0]) &&
      Number.isFinite(lngLat[1]);

    const points = [];
    if (fitTo === 'user' && validUser) points.push(lng(userLocation));
    if (fitTo === 'origin' && validPin(origin)) points.push(lng(origin));
    if (itinerary?.legs) {
      itinerary.legs.forEach((leg) => {
        if (Number.isFinite(leg.from_lat) && Number.isFinite(leg.from_lng)) points.push([leg.from_lng, leg.from_lat]);
        if (Number.isFinite(leg.to_lat) && Number.isFinite(leg.to_lng)) points.push([leg.to_lng, leg.to_lat]);
        (leg.geometry ?? []).forEach((p) => {
          const c = [Number(p[1]), Number(p[0])];
          if (Number.isFinite(c[0]) && Number.isFinite(c[1])) points.push(c);
        });
      });
    } else {
      if (validPin(origin)) points.push(lng(origin));
      if (validPin(destination)) points.push(lng(destination));
      stops.forEach((s) => points.push([Number(s.lng), Number(s.lat)]));
      if (validUser) points.push(lng(userLocation));
      if (validDeviation) points.push(lng(deviation));
    }

    const usable = points.filter(finite);
    if (usable.length > 0) {
      const bounds = new maplibre.LngLatBounds();
      usable.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: 48, maxZoom: 16.5, duration: 600 });
    }
  }, [ready, itinerary, alternatives, origin, destination, stops, userLocation, deviation, fitTo, clearDynamic]);

  // ---------- controls ----------
  const recenter = useCallback(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre) return;

    const valid = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
    const target =
      (valid(userLocation) && lng(userLocation)) ||
      (valid(origin) && lng(origin)) ||
      null;
    if (target) map.flyTo({ center: target, zoom: Math.max(map.getZoom(), 15), duration: 500 });
  }, [fitTo, userLocation, origin]);

  const zoomBy = useCallback((delta) => {
    mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() ?? 11) + delta, duration: 250 });
  }, []);

  if (failed) {
    return (
      <div
        className="map-panel"
        role="img"
        aria-label="Map unavailable (route shown as outline)"
        style={{ height, borderRadius: 'var(--r-lg)', background: '#E8ECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}
      >
        <span className="t-caption" style={{ padding: 16, textAlign: 'center' }}>
          Interactive map could not load on this device. Journey routing still works — see the itinerary below.
        </span>
      </div>
    );
  }

  return (
    <div
      className="map-panel"
      style={{ height, borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden' }}
      aria-label="Map"
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {!ready && (
        <div
          aria-label="Map (loading)"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8ECEF' }}
        >
          <div className="spinner" />
        </div>
      )}

      {showControls && ready && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 5,
          }}
        >
          <button type="button" className="map-ctl" onClick={recenter} aria-label="Recenter map" title="Recenter">
            <Icon name="track" size={17} aria-hidden="true" />
          </button>
          <button type="button" className="map-ctl" onClick={() => zoomBy(1)} aria-label="Zoom in" title="Zoom in">
            +
          </button>
          <button type="button" className="map-ctl" onClick={() => zoomBy(-1)} aria-label="Zoom out" title="Zoom out">
            −
          </button>
          {zoom != null && (
            <span className="map-zoom-badge" aria-hidden>
              {zoom}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
