import React, { useState } from 'react'
import { Database, Plus, Trash2, Sliders, Check } from 'lucide-react'
import type { PeerId, PeerState } from '../../types/crdtSimulation'

interface LwwRegisterSetCardProps {
  peers: Record<PeerId, PeerState>
  onUpdateRegister: (peerId: PeerId, key: string, value: any) => void
  onMutateSet: (peerId: PeerId, action: 'ADD' | 'REMOVE', value: string) => void
  isOperating?: boolean
}

export const LwwRegisterSetCard: React.FC<LwwRegisterSetCardProps> = ({
  peers,
  onUpdateRegister,
  onMutateSet,
  isOperating = false,
}) => {
  const [selectedPeer, setSelectedPeer] = useState<PeerId>('alice')
  const [titleInput, setTitleInput] = useState('')
  const [setItemInput, setSetItemInput] = useState('')

  const activePeer = peers[selectedPeer]

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleInput.trim()) return
    onUpdateRegister(selectedPeer, 'document_title', titleInput.trim())
    setTitleInput('')
  }

  const handleSetAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!setItemInput.trim()) return
    onMutateSet(selectedPeer, 'ADD', setItemInput.trim())
    setSetItemInput('')
  }

  const handleSetRemove = (val: string) => {
    onMutateSet(selectedPeer, 'REMOVE', val)
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Database className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              State-Based CRDTs: LWW-Register & LWW-Element-Set
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Deterministic register writes using microsecond timestamp ordering and Two-Phase Element Sets with Add-bias tie-breaking.
            </p>
          </div>
        </div>

        {/* Replica Selector */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['alice', 'bob', 'charlie'] as PeerId[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeer(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPeer === p
                  ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}&apos;s View
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LWW-Register Section */}
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-5 border border-gray-200 dark:border-gray-750 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-500" />
              LWW-Register (Document Title)
            </span>
            <span className="text-xs font-mono text-gray-400">Key: document_title</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="text-xs text-gray-500">Current Value:</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono">
              {activePeer?.lwwRegisters?.['document_title']?.value || 'Untitled'}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>Author: {activePeer?.lwwRegisters?.['document_title']?.peerId || 'none'}</span>
              <span>Timestamp: {activePeer?.lwwRegisters?.['document_title']?.timestamp || 'N/A'}</span>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="flex gap-2">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="New title value..."
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={isOperating || !titleInput}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
            >
              Set Title
            </button>
          </form>
        </div>

        {/* LWW-Element-Set Section */}
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-5 border border-gray-200 dark:border-gray-750 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              LWW-Element-Set (Tags / Elements)
            </span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {activePeer?.resolvedSet?.length || 0} items
            </span>
          </div>

          {/* Resolved Elements Pills */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[90px] flex flex-wrap items-center gap-2">
            {(activePeer?.resolvedSet || []).length > 0 ? (
              (activePeer?.resolvedSet || []).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
                >
                  <Check className="w-3 h-3" />
                  {item}
                  <button
                    onClick={() => handleSetRemove(item)}
                    className="text-gray-400 hover:text-rose-500 ml-1"
                    title={`Remove ${item}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-xs italic">Set is empty</span>
            )}
          </div>

          <form onSubmit={handleSetAdd} className="flex gap-2">
            <input
              type="text"
              value={setItemInput}
              onChange={(e) => setSetItemInput(e.target.value)}
              placeholder="Add element tag..."
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isOperating || !setItemInput}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
