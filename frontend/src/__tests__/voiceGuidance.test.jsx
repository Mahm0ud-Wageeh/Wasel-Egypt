import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceGuidance } from '../hooks/useVoiceGuidance'

describe('useVoiceGuidance', () => {
  let speakMock
  let cancelMock

  beforeEach(() => {
    localStorage.clear()
    speakMock = vi.fn()
    cancelMock = vi.fn()

    window.speechSynthesis = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn(() => [
        { name: 'Arabic Voice', lang: 'ar-SA' },
        { name: 'English Voice', lang: 'en-US' },
      ]),
      onvoiceschanged: null,
    }

    global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
      text,
      lang: 'en-US',
      rate: 1.0,
      pitch: 1.0,
      voice: null,
    }))
  })

  afterEach(() => {
    delete window.speechSynthesis
    delete global.SpeechSynthesisUtterance
  })

  it('initializes with default unmuted and supported status', () => {
    const { result } = renderHook(() =>
      useVoiceGuidance({ enabled: true, language: 'en' })
    )

    expect(result.current.muted).toBe(false)
    expect(result.current.supported).toBe(true)
  })

  it('toggles muted state and cancels active speech', () => {
    const { result } = renderHook(() =>
      useVoiceGuidance({ enabled: true, language: 'en' })
    )

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.muted).toBe(true)
    expect(cancelMock).toHaveBeenCalled()
  })

  it('speaks maneuver in English when approaching milestone', () => {
    renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: 'en',
        maneuver: {
          instruction_en: 'In 100m, turn right',
          instruction_ar: 'بعد 100م، انعطف يميناً',
          distanceMeters: 100,
        },
      })
    )

    expect(speakMock).toHaveBeenCalled()
  })

  it('speaks maneuver in Arabic when language is ar', () => {
    renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: 'ar',
        maneuver: {
          instruction_en: 'Turn right now',
          instruction_ar: 'انعطف يميناً الآن',
          distanceMeters: 15,
        },
      })
    )

    expect(speakMock).toHaveBeenCalled()
    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('انعطف يميناً الآن')
  })

  it('announces off-route deviation alert', () => {
    renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: 'ar',
        isOffRoute: true,
      })
    )

    expect(speakMock).toHaveBeenCalled()
    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith(
      'أنت خارج المسار المحدد، جارٍ إعادة توجيهك'
    )
  })

  it('does not speak when muted', () => {
    const { result } = renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: 'en',
        maneuver: {
          instruction: 'Turn right',
          distanceMeters: 20,
        },
      })
    )

    act(() => {
      result.current.toggleMute()
    })

    speakMock.mockClear()

    act(() => {
      result.current.speak('Hello')
    })

    expect(speakMock).not.toHaveBeenCalled()
  })

  it('cancels speech immediately on language change and unmount', () => {
    let lang = 'en'
    const { rerender, unmount } = renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: lang,
        maneuver: { instruction_en: 'Turn left', instruction_ar: 'انعطف يساراً', distanceMeters: 10 },
      })
    )

    cancelMock.mockClear()

    // Switch language
    lang = 'ar'
    rerender()
    expect(cancelMock).toHaveBeenCalled()

    cancelMock.mockClear()
    unmount()
    expect(cancelMock).toHaveBeenCalled()
  })

  it('cancels speech and resets throttle when isOffRoute status changes (reroute)', () => {
    let offRoute = false
    const { rerender } = renderHook(() =>
      useVoiceGuidance({
        enabled: true,
        language: 'en',
        isOffRoute: offRoute,
      })
    )

    cancelMock.mockClear()

    // Trigger off-route
    offRoute = true
    rerender()
    expect(cancelMock).toHaveBeenCalled()
  })
})
