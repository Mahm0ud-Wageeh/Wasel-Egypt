import React from 'react'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import Register from '../legacy-pages/Register'
import Login from '../legacy-pages/Login'
import { PassengerLayout } from '../components/layout/PassengerLayout'
import { renderWithProviders } from '../test/test-utils'

/**
 * Product polish layer (2026-09):
 * - Auth screens render inside the branded split shell.
 * - Exactly one nav surface is exposed per breakpoint.
 */
describe('Product polish layer', () => {
  it('renders Register inside the branded auth split shell', () => {
    const { container } = renderWithProviders(<Register />, { route: '/register', user: null })

    expect(container.querySelector('.auth-page')).toBeInTheDocument()
    expect(container.querySelector('.auth-side')).toBeInTheDocument()
    expect(container.querySelector('.auth-main .auth-shell')).toBeInTheDocument()
    // Form contract preserved
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
    expect(container.querySelector('.auth-brand__logo svg')).toBeInTheDocument()
  })

  it('renders Login inside the branded auth split shell', () => {
    const { container } = renderWithProviders(<Login />, { route: '/login', user: null })

    expect(container.querySelector('.auth-page')).toBeInTheDocument()
    expect(container.querySelector('.auth-side')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument()
  })

  it('exposes a single nav surface on mobile (tabbar visible, topnav hidden)', () => {
    const { container } = renderWithProviders(
      <PassengerLayout />,
      { route: '/home' }
    )

    const tabbar = container.querySelector('.tabbar')
    expect(tabbar).toBeInTheDocument()
    // jsdom is mobile-first: tabbar must not carry the hidden gate
    expect(tabbar).not.toHaveAttribute('hidden')

    const topnav = container.querySelector('.topnav')
    // Topnav is desktop-only: either absent or hidden on mobile
    if (topnav) expect(topnav).toHaveAttribute('hidden')
  })
})
