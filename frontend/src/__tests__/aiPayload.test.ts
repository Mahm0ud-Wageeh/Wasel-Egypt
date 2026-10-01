import { describe, expect, it } from 'vitest'
import { buildAiChatPayload } from '../ai/aiPayload'

describe('buildAiChatPayload', () => {
  it('sends the Laravel conversation contract with the complete bounded history', () => {
    expect(buildAiChatPayload([
      { role: 'user', content: 'من التحرير للجيزة' },
      { role: 'assistant', content: 'سأبحث في الشبكة.' },
      { role: 'user', content: 'بأقل تحويلات', timestamp: 123 },
    ], 'ar', { lat: 30.0444, lng: 31.2357 })).toEqual({
      messages: [
        { role: 'user', content: 'من التحرير للجيزة' },
        { role: 'assistant', content: 'سأبحث في الشبكة.' },
        { role: 'user', content: 'بأقل تحويلات' },
      ],
      language: 'ar',
      lat: 30.0444,
      lng: 31.2357,
    })
  })
})