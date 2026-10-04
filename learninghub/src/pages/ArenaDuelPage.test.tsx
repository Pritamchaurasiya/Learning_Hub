import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ArenaDuelPage from './ArenaDuelPage'

// Mock duelService
vi.mock('../services/duelService', () => ({
  duelService: {
    getProfile: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        userId: 'test-user',
        username: 'ApexDuelist',
        elo: 1350,
        tier: 'SILVER',
        wins: 14,
        losses: 6,
        streak: 2,
        peakElo: 1410,
      },
    }),
    getLeaderboard: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        leaderboard: [
          { userId: '1', username: 'AlgorithmAce', elo: 2420, tier: 'GRANDMASTER', wins: 88, losses: 12, streak: 8, peakElo: 2450 },
          { userId: '2', username: 'ByteMaster_99', elo: 2210, tier: 'DIAMOND', wins: 64, losses: 19, streak: 4, peakElo: 2280 },
        ],
      },
    }),
    calculateTierProgress: vi.fn().mockReturnValue({
      currentTier: {
        tier: 'SILVER',
        label: 'Silver Centurion',
        color: '#94A3B8',
        bgBadge: 'bg-slate-100 text-slate-800',
        minElo: 1200,
        maxElo: 1499,
      },
      nextTier: {
        tier: 'GOLD',
        label: 'Gold Champion',
        color: '#EAB308',
        bgBadge: 'bg-yellow-100 text-yellow-800',
        minElo: 1500,
        maxElo: 1799,
      },
      percentage: 50,
      pointsToNext: 150,
    }),
    joinQueue: vi.fn().mockResolvedValue({
      status: 'success',
      data: { match: null, queued: true },
    }),
    leaveQueue: vi.fn().mockResolvedValue({
      status: 'success',
      data: { removed: true },
    }),
  },
}))

// Mock useWebSocket
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    isConnected: true,
    socket: null,
  }),
}))

import { HelmetProvider } from 'react-helmet-async'

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ArenaDuelPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

describe('ArenaDuelPage', () => {
  it('renders arena duel header, rating, and matchmaking controls', async () => {
    renderComponent()

    expect(screen.getByText('Arena Duel Mode')).toBeInTheDocument()
    expect(screen.getByText('Find 1v1 Opponent')).toBeInTheDocument()
    expect(screen.getByText('Instant AI Ghost Duel')).toBeInTheDocument()
  })

  it('switches to Grandmaster Ranks leaderboard tab when clicked', async () => {
    renderComponent()

    const leaderboardTabBtn = screen.getByRole('button', { name: /grandmaster ranks/i })
    fireEvent.click(leaderboardTabBtn)

    expect(screen.getByText('Global Arena Grandmasters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to lobby/i })).toBeInTheDocument()
  })

  it('enters searching state when Find Opponent is clicked', async () => {
    renderComponent()

    const findMatchBtn = screen.getByRole('button', { name: /find 1v1 opponent/i })
    fireEvent.click(findMatchBtn)

    expect(await screen.findByText('Searching for Worthy Opponent...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel matchmaking/i })).toBeInTheDocument()
  })
})
