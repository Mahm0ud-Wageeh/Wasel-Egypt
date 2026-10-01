import { describe, expect, it } from 'vitest'
import { ensureJourneyAction, normalizeAiAction } from '../ai/aiActions'

describe('normalizeAiAction', () => {
  it('accepts the backend type field used by Laravel', () => {
    expect(normalizeAiAction({ type: 'open_planner', params: {} })).toEqual({
      action: 'open_planner',
      params: {},
    })
  })

  it('preserves the legacy action alias during the transition', () => {
    expect(normalizeAiAction({ action: 'show_alerts', params: {} })).toEqual({
      action: 'show_alerts',
      params: {},
    })
  })

  it('rejects malformed actions without a callable action name', () => {
    expect(normalizeAiAction({ type: 'unknown_command', params: {} })).toBeNull()
  })

  it('adds a real planner action when an AI response omits route parameters', () => {
    expect(ensureJourneyAction(
      [{ type: 'open_planner', params: {} }],
      'ازاي اروح الجيزة من التحرير',
    )).toContainEqual({
      type: 'plan_journey',
      params: {
        origin: 'التحرير',
        destination: 'الجيزة',
        auto_search: 'true',
      },
    })
  })
})