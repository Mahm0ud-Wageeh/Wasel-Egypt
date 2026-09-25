import { it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import Register from '../legacy-pages/Register'
import { renderWithProviders } from '../test/test-utils'

it('renders the registration form and shared brand icon without crashing', () => {
  const { container } = renderWithProviders(<Register />, { route: '/register', user: null })

  expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Full name/)).toBeInTheDocument()
  expect(screen.getByLabelText(/^Email/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  expect(container.querySelector('.auth-brand__logo svg')).toBeInTheDocument()
})
