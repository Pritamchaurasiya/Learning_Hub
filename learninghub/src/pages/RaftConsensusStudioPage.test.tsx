import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RaftConsensusStudioPage } from './RaftConsensusStudioPage'
import { raftSimulationService } from '../services/raftSimulationService'

describe('RaftConsensusStudioPage (Milestone 31)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(raftSimulationService, 'getClusterState').mockResolvedValue(
      raftSimulationService.getMockClusterState()
    )
  })

  it('renders page header, status bar metrics, and subcomponents', async () => {
    render(<RaftConsensusStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Distributed Consensus & Raft Protocol Simulation Studio/i)
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/HIGHEST TERM/i)).toBeInTheDocument()
    expect(screen.getByText(/ACTIVE LEADER/i)).toBeInTheDocument()
    expect(screen.getByText(/NETWORK STATUS/i)).toBeInTheDocument()
    expect(screen.getAllByText(/INVARIANTS/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Interactive Consensus Lab & Chaos Disruptions/i)).toBeInTheDocument()
  })

  it('triggers reset default cluster when reset button clicked', async () => {
    const resetSpy = vi.spyOn(raftSimulationService, 'resetCluster')
    render(<RaftConsensusStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Default Cluster/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Reset Default Cluster/i }))
    expect(resetSpy).toHaveBeenCalledWith(5)
  })
})
