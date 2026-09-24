import { describe, it, expect } from 'vitest'
import { EGYPT_STATIONS, TRANSIT_LINES, calculateMetroTariff, calculateMonorailTariff } from '../data/egyptTransitData'

describe('National Transit Dataset Validation', () => {
  it('contains complete stations for Metro L1, L2, and L3', () => {
    const l1 = EGYPT_STATIONS.filter(s => s.lines.includes('metro_1'))
    const l2 = EGYPT_STATIONS.filter(s => s.lines.includes('metro_2'))
    const l3 = EGYPT_STATIONS.filter(s => s.lines.includes('metro_3'))

    expect(l1.length).toBeGreaterThanOrEqual(30)
    expect(l2.length).toBeGreaterThanOrEqual(20)
    expect(l3.length).toBeGreaterThanOrEqual(30)
  })

  it('contains valid coordinates for all stations within Egyptian bounds', () => {
    for (const s of EGYPT_STATIONS) {
      expect(s.lat).toBeGreaterThanOrEqual(22.0)
      expect(s.lat).toBeLessThanOrEqual(32.0)
      expect(s.lng).toBeGreaterThanOrEqual(25.0)
      expect(s.lng).toBeLessThanOrEqual(36.0)
    }
  })

  it('calculates official 2026 Ministry of Transport tariffs accurately', () => {
    expect(calculateMetroTariff(5).fare).toBe(10)
    expect(calculateMetroTariff(9).fare).toBe(10)
    expect(calculateMetroTariff(10).fare).toBe(12)
    expect(calculateMetroTariff(16).fare).toBe(12)
    expect(calculateMetroTariff(17).fare).toBe(15)
    expect(calculateMetroTariff(23).fare).toBe(15)
    expect(calculateMetroTariff(24).fare).toBe(20)
    expect(calculateMetroTariff(35).fare).toBe(20)

    expect(calculateMonorailTariff(5).fare).toBe(20)
    expect(calculateMonorailTariff(10).fare).toBe(40)
    expect(calculateMonorailTariff(15).fare).toBe(55)
    expect(calculateMonorailTariff(22).fare).toBe(80)
  })
})
