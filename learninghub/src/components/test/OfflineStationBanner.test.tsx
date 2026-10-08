import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OfflineStationBanner } from './OfflineStationBanner'

describe('OfflineStationBanner Component', () => {
  it('does not render when online with zero bundles and zero pending syncs', () => {
    const { container } = render(
      <OfflineStationBanner
        isOnline={true}
        offlineBundlesCount={0}
        localPendingSyncCount={0}
        isSyncingQueue={false}
        onSync={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders station banner when offline even with 0 bundles', () => {
    render(
      <OfflineStationBanner
        isOnline={false}
        offlineBundlesCount={0}
        localPendingSyncCount={0}
        isSyncingQueue={false}
        onSync={vi.fn()}
      />
    )
    expect(screen.getByText('Offline Assessment Station')).toBeInTheDocument()
  })

  it('renders cached bundles badge and triggers sync on button click', () => {
    const onSync = vi.fn()
    render(
      <OfflineStationBanner
        isOnline={true}
        offlineBundlesCount={4}
        localPendingSyncCount={2}
        isSyncingQueue={false}
        onSync={onSync}
      />
    )

    expect(screen.getByText('4 Bundles Cached')).toBeInTheDocument()
    const syncButton = screen.getByText('Sync Now (2)')
    expect(syncButton).toBeInTheDocument()

    fireEvent.click(syncButton)
    expect(onSync).toHaveBeenCalledTimes(1)
  })

  it('disables sync button when syncing queue is active', () => {
    render(
      <OfflineStationBanner
        isOnline={true}
        offlineBundlesCount={1}
        localPendingSyncCount={1}
        isSyncingQueue={true}
        onSync={vi.fn()}
      />
    )

    const syncButton = screen.getByRole('button', { name: /Sync Now/i })
    expect(syncButton).toBeDisabled()
  })
})
