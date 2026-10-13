import React, { useState, useEffect } from 'react'
import {
  ArchitecturePresetId,
  ArchitectureTopology,
  ChaosFaultType,
  SimulationTelemetryResult,
} from '../types/systemDesign'
import { systemDesignService } from '../services/systemDesignService'
import { TopologyCanvas } from '../components/systemDesign/TopologyCanvas'
import { ChaosControlPanel } from '../components/systemDesign/ChaosControlPanel'
import { TelemetryMetricsHUD } from '../components/systemDesign/TelemetryMetricsHUD'
import { ArchitectScorecardCard } from '../components/systemDesign/ArchitectScorecardCard'
import {
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export const SystemDesignSimulatorPage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<ArchitecturePresetId>('URL_SHORTENER_TINYURL')
  const [topology, setTopology] = useState<ArchitectureTopology | null>(null)
  const [currentQps, setCurrentQps] = useState<number>(25000)
  const [activeFault, setActiveFault] = useState<ChaosFaultType>('NONE')
  const [telemetry, setTelemetry] = useState<SimulationTelemetryResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)

  // Load preset on mount or selection change
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    systemDesignService
      .getPreset(selectedPreset)
      .then(res => {
        if (!isMounted) return
        setTopology(res.topology)
        setIsLoading(false)

        // Run initial simulation
        return systemDesignService.simulateArchitecture({
          topology: res.topology,
          targetQps: currentQps,
          activeFault,
        })
      })
      .then(simRes => {
        if (isMounted && simRes) {
          setTelemetry(simRes)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedPreset])

  // Run simulation on button or parameter change
  const handleRunSimulation = async (topoToUse?: ArchitectureTopology, faultToUse?: ChaosFaultType) => {
    const topo = topoToUse || topology
    const fault = faultToUse !== undefined ? faultToUse : activeFault
    if (!topo) return

    setIsSimulating(true)
    try {
      const res = await systemDesignService.simulateArchitecture({
        topology: topo,
        targetQps: currentQps,
        activeFault: fault,
      })
      setTelemetry(res)
    } finally {
      setIsSimulating(false)
    }
  }

  // Toggle node health
  const handleToggleNodeHealth = (nodeId: string) => {
    if (!topology) return
    const updatedNodes = topology.nodes.map(n =>
      n.id === nodeId ? { ...n, isHealthy: !n.isHealthy } : n
    )
    const updatedTopo = { ...topology, nodes: updatedNodes }
    setTopology(updatedTopo)
    handleRunSimulation(updatedTopo)
  }

  // Increment replica factor
  const handleIncrementReplication = (nodeId: string) => {
    if (!topology) return
    const updatedNodes = topology.nodes.map(n =>
      n.id === nodeId ? { ...n, replicationFactor: n.replicationFactor + 1 } : n
    )
    const updatedTopo = { ...topology, nodes: updatedNodes }
    setTopology(updatedTopo)
    handleRunSimulation(updatedTopo)
  }

  // Reset to nominal cluster health
  const handleResetNominal = () => {
    if (!topology) return
    setActiveFault('NONE')
    const restoredNodes = topology.nodes.map(n => ({ ...n, isHealthy: true }))
    const restoredTopo = { ...topology, nodes: restoredNodes }
    setTopology(restoredTopo)
    handleRunSimulation(restoredTopo, 'NONE')
  }

  const handleSelectFault = (fault: ChaosFaultType) => {
    setActiveFault(fault)
    handleRunSimulation(undefined, fault)
  }

  if (isLoading || !topology) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            Synthesizing Distributed System Architecture Canvas...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 18
            </span>
            <span className="text-xs text-slate-400 font-mono">High-Scale Architecture Lab</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Distributed System Design & Chaos Engineering Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Interactive C4 distributed topology sandbox. Simulate Little’s Law queueing dynamics,
            validate CAP theorem trade-offs, and inject Chaos Monkey hardware faults under real-time synthetic traffic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleRunSimulation()}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>Recalculate Telemetry</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel + Topology + Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chaos & Traffic Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <ChaosControlPanel
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            currentQps={currentQps}
            onChangeQps={setCurrentQps}
            activeFault={activeFault}
            onSelectFault={handleSelectFault}
            isSimulating={isSimulating}
            onRunSimulation={() => handleRunSimulation()}
            onResetNominal={handleResetNominal}
          />

          {telemetry && (
            <ArchitectScorecardCard
              scorecard={telemetry.architecturalScorecard}
              socraticCritique={telemetry.socraticCritique}
              spofNodeIds={telemetry.spofNodeIds}
            />
          )}
        </div>

        {/* Right Column: Interactive Topology Canvas & Telemetry HUD */}
        <div className="lg:col-span-7 space-y-6">
          {telemetry && <TelemetryMetricsHUD telemetry={telemetry} />}

          <TopologyCanvas
            topology={topology}
            spofNodeIds={telemetry?.spofNodeIds || []}
            failedNodeIds={telemetry?.failedNodeIds || []}
            saturatedNodeIds={telemetry?.saturatedNodeIds || []}
            onToggleNodeHealth={handleToggleNodeHealth}
            onIncrementReplication={handleIncrementReplication}
          />
        </div>
      </div>
    </div>
  )
}
