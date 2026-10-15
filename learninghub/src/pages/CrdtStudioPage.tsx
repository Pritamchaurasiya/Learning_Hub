import { useState, useEffect, useCallback, type FC } from 'react'
import {
  Users,
  GitCommit,
  Clock,
  Database,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import type {
  CrdtTopologySnapshot,
  CrdtStudioTab,
  AlgebraicProofResult,
  PeerId,
} from '../types/crdtSimulation'
import { crdtSimulationService } from '../services/crdtSimulationService'
import { PeerEditorSplitView } from '../components/crdt/PeerEditorSplitView'
import { RgaTreeVisualizer } from '../components/crdt/RgaTreeVisualizer'
import { VectorClockMatrixCard } from '../components/crdt/VectorClockMatrixCard'
import { LwwRegisterSetCard } from '../components/crdt/LwwRegisterSetCard'
import { CrdtAlgebraicAuditScorecard } from '../components/crdt/CrdtAlgebraicAuditScorecard'

export const CrdtStudioPage: FC = () => {
  const [activeTab, setActiveTab] = useState<CrdtStudioTab>('P2P_EDITORS')
  const [topology, setTopology] = useState<CrdtTopologySnapshot | null>(null)
  const [proof, setProof] = useState<AlgebraicProofResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isOperating, setIsOperating] = useState<boolean>(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  const loadData = useCallback(async () => {
    try {
      const [topoData, proofData] = await Promise.all([
        crdtSimulationService.getTopology(),
        crdtSimulationService.verifyAlgebraicLaws(),
      ])
      setTopology(topoData)
      setProof(proofData)
    } catch (err) {
      console.error('Failed to load CRDT studio data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInsert = async (peerId: PeerId, index: number, char: string) => {
    setIsOperating(true)
    try {
      await crdtSimulationService.localInsert(peerId, index, char)
      const fresh = await crdtSimulationService.getTopology()
      setTopology(fresh)
    } catch (err: any) {
      showNotification(`Insert failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleDelete = async (peerId: PeerId, visibleIndex: number) => {
    setIsOperating(true)
    try {
      await crdtSimulationService.localDelete(peerId, visibleIndex)
      const fresh = await crdtSimulationService.getTopology()
      setTopology(fresh)
    } catch (err: any) {
      showNotification(`Delete failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleSyncPeers = async (sourceId: PeerId, targetId: PeerId) => {
    setIsOperating(true)
    try {
      const res = await crdtSimulationService.syncPeers(sourceId, targetId)
      const fresh = await crdtSimulationService.getTopology()
      setTopology(fresh)
      showNotification(`Synced ${res.syncedNodes} operations from ${sourceId} to ${targetId}!`)
    } catch (err: any) {
      showNotification(`Sync failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleSyncAll = async () => {
    setIsOperating(true)
    try {
      const fresh = await crdtSimulationService.syncAll()
      setTopology(fresh)
      showNotification('Synchronized all active connected peers successfully!')
    } catch (err: any) {
      showNotification(`Broadcast sync failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleTogglePartition = async (peerId: PeerId, active: boolean) => {
    setIsOperating(true)
    try {
      const fresh = await crdtSimulationService.setPartition(peerId, active)
      setTopology(fresh)
      showNotification(
        active
          ? `Network barrier established: ${peerId} is now offline/partitioned!`
          : `Network barrier healed: ${peerId} reconnected and synchronized!`
      )
    } catch (err: any) {
      showNotification(`Partition toggle failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleUpdateRegister = async (peerId: PeerId, key: string, value: any) => {
    setIsOperating(true)
    try {
      await crdtSimulationService.updateLwwRegister(peerId, key, value)
      const fresh = await crdtSimulationService.getTopology()
      setTopology(fresh)
      showNotification(`Updated register "${key}"!`)
    } catch (err: any) {
      showNotification(`Update register failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleMutateSet = async (peerId: PeerId, action: 'ADD' | 'REMOVE', value: string) => {
    setIsOperating(true)
    try {
      await crdtSimulationService.mutateLwwSet(peerId, action, value)
      const fresh = await crdtSimulationService.getTopology()
      setTopology(fresh)
      showNotification(`Element "${value}" ${action === 'ADD' ? 'added' : 'removed'}!`)
    } catch (err: any) {
      showNotification(`Mutate set failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleVerifyProofs = async () => {
    setIsOperating(true)
    try {
      const result = await crdtSimulationService.verifyAlgebraicLaws()
      setProof(result)
      showNotification('Formally verified all semilattice laws (Commutativity, Associativity, Idempotence)!')
    } catch (err: any) {
      showNotification(`Proof verification failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const handleReset = async () => {
    setIsOperating(true)
    try {
      const fresh = await crdtSimulationService.reset()
      setTopology(fresh)
      showNotification('CRDT Studio simulation reset to clean initial state.')
    } catch (err: any) {
      showNotification(`Reset failed: ${err.message}`)
    } finally {
      setIsOperating(false)
    }
  }

  const tabs: { id: CrdtStudioTab; label: string; icon: typeof Users }[] = [
    { id: 'P2P_EDITORS', label: 'P2P Live Editors', icon: Users },
    { id: 'RGA_DAG', label: 'RGA Linked List', icon: GitCommit },
    { id: 'VECTOR_CLOCKS', label: 'Vector Clocks', icon: Clock },
    { id: 'LWW_SETS', label: 'State-Based CRDTs', icon: Database },
    { id: 'ALGEBRAIC_PROOFS', label: 'Algebraic Proofs', icon: ShieldCheck },
  ]

  if (isLoading || !topology) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Initializing CRDT State Vectors & RGA Replicas...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {feedbackMessage}
            </span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-white/80 hover:text-white text-xs font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Studio Hero Header */}
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                CRDT & Collaborative State Synchronization Studio
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
              Master Conflict-Free Replicated Data Types: Replicated Growable Arrays (RGA), Vector Clocks, Lamport timestamps, LWW-Registers, Two-Phase Element Sets, and peer-to-peer partition reconvergence.
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={isOperating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-850 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-750'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === 'P2P_EDITORS' && (
          <PeerEditorSplitView
            peers={topology.peers}
            isPartitioned={topology.isPartitioned}
            isolatedPeers={topology.isolatedPeers}
            onInsert={handleInsert}
            onDelete={handleDelete}
            onSyncPeers={handleSyncPeers}
            onSyncAll={handleSyncAll}
            onTogglePartition={handleTogglePartition}
            isOperating={isOperating}
          />
        )}

        {activeTab === 'RGA_DAG' && <RgaTreeVisualizer peers={topology.peers} />}

        {activeTab === 'VECTOR_CLOCKS' && <VectorClockMatrixCard peers={topology.peers} />}

        {activeTab === 'LWW_SETS' && (
          <LwwRegisterSetCard
            peers={topology.peers}
            onUpdateRegister={handleUpdateRegister}
            onMutateSet={handleMutateSet}
            isOperating={isOperating}
          />
        )}

        {activeTab === 'ALGEBRAIC_PROOFS' && (
          <CrdtAlgebraicAuditScorecard
            proof={proof}
            auditDigest={topology.auditDigest}
            onVerify={handleVerifyProofs}
            isVerifying={isOperating}
          />
        )}
      </div>
    </div>
  )
}
