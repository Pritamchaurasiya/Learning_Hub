import React, { useState, useEffect } from 'react'
import {
  SimulatedJobListing,
  CareerTrack,
  RecruiterPersona,
  RecruiterTurn,
  RecruiterPersonaRole,
  CompensationPackage,
} from '../types/career'
import { careerService } from '../services/careerService'
import { JobMatchingGridCard } from '../components/career/JobMatchingGridCard'
import { RecruiterSimulationPanel } from '../components/career/RecruiterSimulationPanel'
import { CompensationNegotiatorModal } from '../components/career/CompensationNegotiatorModal'
import {
  Sparkles,
  Shield,
  Search,
  Zap,
  TrendingUp,
  Award,
} from 'lucide-react'

export const CareerOrchestratorPage: React.FC = () => {
  const [jobs, setJobs] = useState<SimulatedJobListing[]>([])
  const [selectedJob, setSelectedJob] = useState<SimulatedJobListing | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<CareerTrack | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)

  // Simulation state
  const [personas, setPersonas] = useState<RecruiterPersona[]>([])
  const [activePersona, setActivePersona] = useState<RecruiterPersonaRole>('EXECUTIVE_TALENT_LEAD')
  const [dialogueHistory, setDialogueHistory] = useState<RecruiterTurn[]>([])
  const [currentOffer, setCurrentOffer] = useState<CompensationPackage>({
    baseSalary: 220000,
    equityValueUsd: 120000,
    signingBonus: 45000,
    totalTargetCompensation: 385000,
    acceptedStatus: 'PENDING',
  })
  const [leverageScore, setLeverageScore] = useState<number>(88)
  const [simulationDigest, setSimulationDigest] = useState<string>('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isNegotiatorOpen, setIsNegotiatorOpen] = useState(false)

  // Load jobs
  useEffect(() => {
    let isMounted = true
    setIsLoadingJobs(true)

    careerService
      .getMatchedJobs({
        track: selectedTrack === 'ALL' ? undefined : selectedTrack,
        remoteOnly: remoteOnly || undefined,
        searchQuery: searchQuery || undefined,
      })
      .then(fetchedJobs => {
        if (!isMounted) return
        setJobs(fetchedJobs)
        if (fetchedJobs.length > 0 && !selectedJob) {
          setSelectedJob(fetchedJobs[0])
        }
        setIsLoadingJobs(false)
      })
      .catch(() => {
        if (isMounted) setIsLoadingJobs(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedTrack, remoteOnly, searchQuery])

  // Load recruiter dialogue when selectedJob changes
  useEffect(() => {
    if (!selectedJob) return

    let isMounted = true
    careerService
      .sendDialogueTurn({
        jobId: selectedJob.id,
        candidateName: 'Alex Morgan',
        candidateElo: 2100,
        interviewPercentile: 94,
        activePersona,
      })
      .then(res => {
        if (!isMounted) return
        setPersonas(res.personas)
        setDialogueHistory(res.dialogueHistory)
        setCurrentOffer(res.compensationOffer)
        setLeverageScore(res.leverageScore)
        setSimulationDigest(res.simulationDigestSha256)
      })
      .catch(() => {
        // Fallback handled inside careerService
      })

    return () => {
      isMounted = false
    }
  }, [selectedJob?.id])

  const handleSendMessage = async (msg: string) => {
    if (!selectedJob || isSendingMessage) return
    setIsSendingMessage(true)

    try {
      const res = await careerService.sendDialogueTurn({
        jobId: selectedJob.id,
        candidateName: 'Alex Morgan',
        candidateElo: 2100,
        interviewPercentile: 94,
        activePersona,
        candidateMessage: msg,
        dialogueHistory,
      })

      setDialogueHistory(res.dialogueHistory)
      setCurrentOffer(res.compensationOffer)
      setLeverageScore(res.leverageScore)
      setSimulationDigest(res.simulationDigestSha256)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const tracks: { key: CareerTrack | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All Frontiers' },
    { key: 'DISTRIBUTED_SYSTEMS', label: 'Distributed Systems' },
    { key: 'AI_RESEARCH', label: 'AI Inference & Lab' },
    { key: 'FULL_STACK_WEB3', label: 'Web3 & Cryptography' },
    { key: 'STAFF_SRE', label: 'Staff SRE & Chaos' },
    { key: 'ALGORITHM_QUANT', label: 'Algorithmic Quant' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 26
            </span>
            <span className="text-xs text-slate-400 font-mono">Career Intelligence Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Autonomous Job Matching & Recruiter Simulation Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Simulate end-to-end frontier engineering hiring pipelines. Matches your verified Arena Elo,
            BKT concept masteries, and AI interview percentiles against market roles with live multi-agent salary negotiation.
          </p>
        </div>

        {/* Cryptographic Attestation Badge */}
        {simulationDigest && (
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500">Simulation Digest Seal</div>
              <div className="font-mono text-emerald-400 text-xs truncate max-w-[180px]">
                {simulationDigest.slice(0, 16)}...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Track Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {tracks.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedTrack(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTrack === t.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search roles or companies..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={e => setRemoteOnly(e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span>Remote Only</span>
          </label>
        </div>
      </div>

      {/* Real-time Candidate Telemetry & Readiness Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Arena Verified Elo
          </div>
          <div className="text-lg font-black text-amber-400 font-mono mt-0.5">2,100 <span className="text-[10px] font-sans text-slate-400">GM</span></div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> BKT Mastery Rate
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">94.6% <span className="text-[10px] font-sans text-slate-400">Top 2%</span></div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Award className="w-3 h-3 text-cyan-400" /> Offer Velocity
          </div>
          <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">3.8x <span className="text-[10px] font-sans text-slate-400">vs Market</span></div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Upside Potential
          </div>
          <div className="text-lg font-black text-purple-400 font-mono mt-0.5">+$45,000 <span className="text-[10px] font-sans text-slate-400">Negotiable</span></div>
        </div>
      </div>

      {/* Main Grid: Job Cards Left, Recruiter Simulation Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Matched Job Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Matched Frontier Positions ({jobs.length})</span>
            <span className="text-[11px] font-mono text-emerald-400">Ranked by Match Affinity</span>
          </div>

          {isLoadingJobs ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Matching candidate telemetry against frontier vacancies...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <JobMatchingGridCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onSelect={j => setSelectedJob(j)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Recruiter Simulation Panel */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <RecruiterSimulationPanel
              job={selectedJob}
              personas={personas}
              activePersona={activePersona}
              dialogueHistory={dialogueHistory}
              currentOffer={currentOffer}
              leverageScore={leverageScore}
              onPersonaSelect={role => setActivePersona(role)}
              onSendMessage={handleSendMessage}
              onOpenNegotiator={() => setIsNegotiatorOpen(true)}
              isLoading={isSendingMessage}
            />
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
              Select a position from the left to launch the Multi-Agent Recruiter Simulation.
            </div>
          )}
        </div>
      </div>

      {/* Negotiation Modal */}
      {selectedJob && (
        <CompensationNegotiatorModal
          isOpen={isNegotiatorOpen}
          job={selectedJob}
          currentOffer={currentOffer}
          leverageScore={leverageScore}
          onClose={() => setIsNegotiatorOpen(false)}
          onOfferUpdated={updated => setCurrentOffer(updated)}
        />
      )}
    </div>
  )
}
export default CareerOrchestratorPage
