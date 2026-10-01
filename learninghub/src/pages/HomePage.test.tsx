import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../test/test-utils'
import HomePage from './HomePage'

describe('HomePage Component', () => {
  it('renders landing page sections properly', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})
