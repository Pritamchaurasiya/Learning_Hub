import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/test-utils'
import TestsAStationPage from './TestsAStationPage'

describe('TestsAStationPage Component', () => {
  it('renders iframe with correct src and title for Tests A+ Studio', () => {
    render(<TestsAStationPage />)

    const iframe = screen.getByTitle('Tests A+ Interactive Studio') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', '/tests-a-plus.html')
    expect(iframe).toHaveAttribute('allow', 'fullscreen; clipboard-write; clipboard-read')
  })

  it('renders container with full-viewport layout styling', () => {
    const { container } = render(<TestsAStationPage />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('w-full', 'overflow-hidden')
  })
})
