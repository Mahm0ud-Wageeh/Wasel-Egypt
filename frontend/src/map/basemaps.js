/**
 * Map basemap configuration system.
 *
 * The map style is environment-configurable, never hardcoded to one
 * provider: every layer's tile URL, attribution and default selection can
 * be overridden via VITE_* variables, and a runtime switcher lets users
 * change layers. When satellite tiles fail (offline / provider limit) the
 * map falls back to streets automatically.
 *
 * Keyless defaults chosen for honest attribution:
 * - satellite: Esri World Imagery (free tier, attribution required)
 * - streets:   OpenStreetMap standard tiles (ODbL)
 * - dark:      CARTO dark basemap (free with attribution)
 */

const SATELLITE_URL = import.meta.env.VITE_MAP_SATELLITE_TILES_URL ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const STREETS_URL = import.meta.env.VITE_MAP_TILES_URL ||
  import.meta.env.VITE_MAP_STREETS_TILES_URL ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_URL = import.meta.env.VITE_MAP_DARK_TILES_URL ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

export const BASEMAPS = {
  satellite: {
    id: 'satellite',
    url: SATELLITE_URL,
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    // Satellite imagery needs high-contrast overlays to stay readable.
    dark: true,
  },
  streets: {
    id: 'streets',
    url: STREETS_URL,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    dark: false,
  },
  dark: {
    id: 'dark',
    url: DARK_URL,
    attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ',
    dark: true,
  },
}

/**
 * Keyless-free basemaps only: CARTO's dark_all started watermarking
 * "API KEY REQUIRED" over keyless requests, so the dark layer uses Esri's
 * World Dark Gray Canvas (same keyless vendor as the satellite imagery).
 */

const DEFAULT_LAYER = BASEMAPS[import.meta.env.VITE_MAP_DEFAULT_LAYER] ? import.meta.env.VITE_MAP_DEFAULT_LAYER : 'satellite'
const STORAGE_KEY = 'wasel.map.layer'

export function getPreferredLayer() {
  if (typeof localStorage === 'undefined') return DEFAULT_LAYER
  const saved = localStorage.getItem(STORAGE_KEY)
  return BASEMAPS[saved] ? saved : DEFAULT_LAYER
}

export function setPreferredLayer(id) {
  if (!BASEMAPS[id]) return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* private mode — preference simply not persisted */
  }
}

/**
 * Minimal cross-component command bus for map interactions driven from
 * outside the map (AI assistant actions: switch_map_layer /
 * focus_map_location). Panels subscribe on mount; the most recently
 * mounted ready panel executes commands.
 */
const listeners = new Set()

export function onMapCommand(handler) {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

export function emitMapCommand(command) {
  listeners.forEach((handler) => {
    try {
      handler(command)
    } catch {
      /* a broken listener must not break the others */
    }
  })
}
