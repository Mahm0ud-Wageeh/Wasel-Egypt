import React, { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import { AiAssistantProvider, useAiAssistant } from '../ai/AiAssistantContext'
import { AiAssistantDrawer, AiAssistantLauncher } from '../ai/AiAssistantDrawer'
import { BASEMAPS, getPreferredLayer, setPreferredLayer } from '../map/basemaps'
import * as client from '../api/client'

/* ------------------------------------------------------------------ */
/* Test harness                                                        */
/* ------------------------------------------------------------------ */

vi.mock('../api/client', () => ({
  apiRequest: vi.fn(),
}))

const mockedRequest = vi.mocked(client.apiRequest)

function Harness({ children }) {
  return (
    <LanguageProvider>
      <MemoryRouter initialEntries={['/']}>
        <AiAssistantProvider>{children}</AiAssistantProvider>
      </MemoryRouter>
    </LanguageProvider>
  )
}

/** Component that gives tests access to the assistant context. */
function Probe({ onReady }) {
  const ctx = useAiAssistant()
  onReady?.(ctx)
  return null
}

let ctxRef = null

function renderAssistant() {
  ctxRef = null
  render(
    <Harness>
      <Probe onReady={(ctx) => { ctxRef = ctx }} />
      <AiAssistantLauncher />
      <AiAssistantDrawer />
    </Harness>,
  )
  return ctxRef
}

/* ------------------------------------------------------------------ */
/* Basemap configuration                                               */
/* ------------------------------------------------------------------ */

describe('Map basemap configuration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('offers satellite, streets and dark layers', () => {
    expect(Object.keys(BASEMAPS).sort()).toEqual(['dark', 'satellite', 'streets'])
    expect(BASEMAPS.satellite.url).toContain('arcgisonline')
    expect(BASEMAPS.streets.url).toContain('openstreetmap')
  })

  it('defaults to satellite and persists the user preference', () => {
    expect(getPreferredLayer()).toBe('satellite')

    setPreferredLayer('dark')
    expect(getPreferredLayer()).toBe('dark')

    // Unknown ids never poison the stored preference.
    setPreferredLayer('space-laser')
    expect(getPreferredLayer()).toBe('dark')
  })

  it('survives a corrupted stored value', () => {
    localStorage.setItem('wasel.map.layer', 'not-a-layer')
    expect(getPreferredLayer()).toBe('satellite')
  })
})

/* ------------------------------------------------------------------ */
/* AI assistant UI + action executor                                   */
/* ------------------------------------------------------------------ */

describe('AI assistant drawer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders the floating launcher and opens the drawer', async () => {
    mockedRequest.mockResolvedValueOnce({
      available: true,
      provider: { id: 'mock', label: 'Wasel Transport Engine', simulated: true },
    })

    renderAssistant()

    const launcher = screen.getByRole('button', { name: /open the wasel assistant/i })
    fireEvent.click(launcher)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /wasel assistant/i })).toBeTruthy()
    })
    // Provider badge discloses the demo engine honestly.
    expect(screen.getByText(/demo engine/i)).toBeTruthy()
  })

  it('sends a message and renders the reply', async () => {
    mockedRequest.mockResolvedValueOnce({ available: true, provider: { id: 'mock', label: 'X', simulated: true } })
    mockedRequest.mockResolvedValueOnce({
      available: true,
      reply: 'I prepared the planner for you.',
      actions: [],
      provider: { id: 'mock', label: 'X', simulated: true },
    })

    renderAssistant()
    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    const input = await screen.findByLabelText(/ask about routes/i)
    fireEvent.change(input, { target: { value: 'From Tahrir to Giza' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/prepared the planner/i)).toBeTruthy()
    })

    expect(mockedRequest).toHaveBeenCalledWith(
      expect.stringContaining('/ai/chat'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows the honest unavailable state when the backend reports off', async () => {
    mockedRequest.mockResolvedValueOnce({ available: false, provider: { id: 'disabled' } })
    mockedRequest.mockResolvedValueOnce({ available: false })

    renderAssistant()
    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    const input = await screen.findByLabelText(/ask about routes/i)
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/currently unavailable/i)).toBeTruthy()
    })
  })

  it('clears the conversation from storage and UI', async () => {
    mockedRequest.mockResolvedValueOnce({ available: true, provider: { id: 'mock', label: 'X', simulated: true } })
    mockedRequest.mockResolvedValueOnce({
      available: true, reply: 'Answer', actions: [],
      provider: { id: 'mock', label: 'X', simulated: true },
    })

    renderAssistant()
    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    const input = await screen.findByLabelText(/ask about routes/i)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.submit(input.closest('form'))
    await waitFor(() => expect(screen.getByText('Answer')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.queryByText('Answer')).toBeNull()
    expect(localStorage.getItem('wasel.ai.history')).toBeNull()
  })
})

describe('AI assistant action executor', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('runs a plan-a-trip reply through the /search prefill contract', async () => {
    mockedRequest.mockResolvedValueOnce({ available: true, provider: { id: 'mock', label: 'X', simulated: true } })
    mockedRequest.mockResolvedValueOnce({
      available: true,
      reply: 'Planned.',
      actions: [
        { type: 'set_origin', params: { stop_id: 1, name: 'Tahrir', latitude: 30.04, longitude: 31.23 } },
        { type: 'set_destination', params: { stop_id: 2, name: 'Giza', latitude: 30.01, longitude: 31.20 } },
        { type: 'open_planner', params: {} },
      ],
      provider: { id: 'mock', label: 'X', simulated: true },
    })

    renderAssistant()
    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    const input = await screen.findByLabelText(/ask about routes/i)
    fireEvent.change(input, { target: { value: 'plan it' } })
    fireEvent.submit(input.closest('form'))

    // The applied-actions chips summarize what the assistant did.
    await waitFor(() => {
      expect(screen.getByText(/origin set/i)).toBeTruthy()
      expect(screen.getByText(/destination set/i)).toBeTruthy()
    })
  })
})

describe('AI assistant active journey awareness', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('answers next stop query directly using active journey telemetry without hitting API', async () => {
    mockedRequest.mockResolvedValueOnce({ available: true, provider: { id: 'mock', label: 'X', simulated: true } })

    let ctx = null
    render(
      <Harness>
        <Probe onReady={(c) => { ctx = c }} />
        <AiAssistantLauncher />
        <AiAssistantDrawer />
      </Harness>
    )

    // Simulate journey telemetry injected by ActiveJourney component
    act(() => {
      ctx.setJourneyContext({
        journeyId: 42,
        currentLegIndex: 1,
        currentLegMode: 'metro',
        nextStop: 'Sadat',
        remainingMinutes: 8,
        progressPercent: 65,
        isOffRoute: false,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    // Check that context-aware suggestion chip is present
    expect(screen.getByRole('button', { name: 'What is my next stop?' })).toBeTruthy()

    const input = await screen.findByLabelText(/ask about routes/i)
    fireEvent.change(input, { target: { value: 'Where is my next stop?' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/Your next stop is "Sadat"/i)).toBeTruthy()
    })

    // API was only called for status on mount, not for this telemetry reply
    expect(mockedRequest).not.toHaveBeenCalledWith(
      expect.stringContaining('/ai/chat'),
      expect.anything()
    )
  })

  it('answers ETA queries and deviation queries from journey telemetry', async () => {
    mockedRequest.mockResolvedValueOnce({ available: true, provider: { id: 'mock', label: 'X', simulated: true } })

    let ctx = null
    render(
      <Harness>
        <Probe onReady={(c) => { ctx = c }} />
        <AiAssistantLauncher />
        <AiAssistantDrawer />
      </Harness>
    )

    act(() => {
      ctx.setJourneyContext({
        journeyId: 99,
        currentLegIndex: 0,
        nextStop: 'Opera',
        remainingMinutes: 14,
        progressPercent: 25,
        isOffRoute: true,
      })
    })


    fireEvent.click(screen.getByRole('button', { name: /open the wasel assistant/i }))

    const input = await screen.findByLabelText(/ask about routes/i)

    // ETA query
    fireEvent.change(input, { target: { value: 'What is my ETA?' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/about 14 minutes \(25% completed\)/i)).toBeTruthy()
    })

    // Deviation query when off-route
    fireEvent.change(input, { target: { value: 'Am I off route?' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/Alert: You are currently detected off-route/i)).toBeTruthy()
    })
  })
})

