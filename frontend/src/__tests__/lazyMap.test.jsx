import { it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { MapPanel } from '../components/map/LazyMapPanel'
import { renderWithProviders } from '../test/test-utils'

vi.mock('../components/map/MapPanel', () => ({
  MapPanel: ({ height, children }) => <div data-testid="loaded-map" style={{ height }}>{children}</div>,
}))

it('shows a localized Suspense spinner, reserves height, then forwards props and children', async () => {
  localStorage.setItem('wasel.lang', 'ar')
  renderWithProviders(<MapPanel height={180}><span>Map overlay</span></MapPanel>)
  expect(screen.getByRole('status', { name: 'جارٍ تحميل الخريطة' })).toHaveClass('spinner')
  expect(screen.getByLabelText('الخريطة')).toHaveStyle({ height: '180px' })
  expect(await screen.findByTestId('loaded-map')).toHaveStyle({ height: '180px' })
  expect(screen.getByText('Map overlay')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
