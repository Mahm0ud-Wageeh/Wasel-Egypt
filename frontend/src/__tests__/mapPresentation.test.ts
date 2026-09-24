import { describe, expect, it, vi } from 'vitest'

vi.mock('maplibre-gl', () => ({
  default: {},
  Map: class {},
  Marker: class {},
  LngLatBounds: class {},
}))

import { matchesMapMode, satelliteReferenceVisibility, stationsForMapZoom } from '../components/map/InteractiveMap'

const stations = [
  { id: 'interchange', isInterchange: true, modes: ['metro'] },
  { id: 'metro-stop', isInterchange: false, modes: ['metro'] },
  { id: 'lrt-stop', isInterchange: false, modes: ['lrt'] },
]

describe('map presentation density', () => {
  it('keeps satellite imagery clean until the rider asks for reference details', () => {
    expect(satelliteReferenceVisibility('satellite', false)).toBe('none')
    expect(satelliteReferenceVisibility('satellite', true)).toBe('visible')
    expect(satelliteReferenceVisibility('streets', true)).toBe('none')
  })

  it('shows interchange stations at a wide view, then all matching stations after zooming in', () => {
    expect(stationsForMapZoom(stations, 'all', 12).map((station) => station.id)).toEqual(['interchange'])
    expect(stationsForMapZoom(stations, 'metro', 12).map((station) => station.id)).toEqual(['interchange'])
    expect(stationsForMapZoom(stations, 'metro', 14).map((station) => station.id)).toEqual(['interchange', 'metro-stop'])
  })

  it('keeps the rail network filter accurate when a feed uses the rail mode code', () => {
    expect(matchesMapMode('rail', 'train')).toBe(true)
    expect(matchesMapMode('metro', 'train')).toBe(false)
    expect(matchesMapMode('brt', 'all')).toBe(true)
  })
})
