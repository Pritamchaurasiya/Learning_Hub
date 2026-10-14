import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import {
  Play,
  ArrowRight,
  Terminal,
  Atom,
  Code2,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  BookOpen,
} from 'lucide-react'

interface HeroSectionProps {
  onStartFree: () => void
  onViewDemo: () => void
  activeTrack?: 'competitive' | 'engineering'
  onTrackChange?: (track: 'competitive' | 'engineering') => void
}

export function HeroSection({
  onStartFree,
  onViewDemo,
  activeTrack = 'competitive',
  onTrackChange,
}: HeroSectionProps) {
  const [track, setTrack] = useState<'competitive' | 'engineering'>(activeTrack)
  const [activeTab, setActiveTab] = useState<'dsa' | 'exam'>('dsa')
  const [codeRunState, setCodeRunState] = useState<'idle' | 'running' | 'success'>('idle')
  const [selectedExamOption, setSelectedExamOption] = useState<number | null>(null)

  const handleTrackSwitch = (newTrack: 'competitive' | 'engineering') => {
    setTrack(newTrack)
    setActiveTab(newTrack === 'competitive' ? 'exam' : 'dsa')
    if (onTrackChange) onTrackChange(newTrack)
  }

  const runCodeSimulation = () => {
    setCodeRunState('running')
    setTimeout(() => {
      setCodeRunState('success')
    }, 450)
  }

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950 text-white border-b border-slate-800/80">
      {/* Precision Engineered Engineering Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.14]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80" />
      </div>

      {/* Subtle Structural Ambient Glow */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-1/4 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Dual-Track Academic Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => handleTrackSwitch('competitive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                track === 'competitive'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Atom className="w-4 h-4" />
              <span>Competitive STEM Track</span>
              <span className="hidden sm:inline text-[11px] opacity-80">(JEE, NEET, BITSAT)</span>
            </button>
            <button
              onClick={() => handleTrackSwitch('engineering')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                track === 'engineering'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Software Engineering Track</span>
              <span className="hidden sm:inline text-[11px] opacity-80">(DSA, Systems, Duels)</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Authentic Institutional Proof Tag */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>NTA 2026 Aligned</span>
                <span className="text-slate-600">•</span>
                <span>AST Browser Sandbox</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Subscription Lock-in</span>
              </div>
            </div>

            {/* Headline with Track-Specific Voice */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-white tracking-tight leading-[1.12]">
              {track === 'competitive' ? (
                <>
                  The Rigorous Practice Platform for{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                    India&apos;s Toughest
                  </span>{' '}
                  Entrance Exams.
                </>
              ) : (
                <>
                  Deep Computer Science &{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">
                    Systems Engineering
                  </span>{' '}
                  Mastery.
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              {track === 'competitive' ? (
                <>
                  100,000+ chapter-wise previous year questions from 2010–2026, re-verified against
                  official NTA answer keys with step-by-step mathematical proofs. Zero lag, no
                  coaching marketing fluff.
                </>
              ) : (
                <>
                  From LeetCode-style algorithmic duels to distributed system architectures. Real-time
                  browser AST execution, memory profiler, and verifiable cryptographic credentials.
                </>
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                onClick={onStartFree}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-7 py-3.5 text-base shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
              >
                Start Free Practice
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onViewDemo}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3.5 text-base flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                Browse Catalog & Library
              </Button>
            </div>

            {/* Authentic Proof Badges */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs text-slate-400">
              <div>
                <p className="font-bold text-white text-base sm:text-lg">100,000+</p>
                <p className="text-slate-400">Verified PYQs & Tests</p>
              </div>
              <div>
                <p className="font-bold text-white text-base sm:text-lg">&lt;15ms</p>
                <p className="text-slate-400">AST Sandbox Latency</p>
              </div>
              <div>
                <p className="font-bold text-white text-base sm:text-lg">42,000+</p>
                <p className="text-slate-400">Faculty Proof Steps</p>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Content: Living Interactive Product Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 text-xs font-mono text-slate-400">learninghub-sandbox</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE • WASM V8</span>
                </div>
              </div>

              {/* Console Tabs */}
              <div className="flex bg-slate-900/90 border-b border-slate-800 px-2">
                <button
                  onClick={() => setActiveTab('dsa')}
                  className={`px-3 py-2 text-xs font-mono font-medium flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'dsa'
                      ? 'border-blue-400 text-blue-400 bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>TwoSum.ts</span>
                </button>
                <button
                  onClick={() => setActiveTab('exam')}
                  className={`px-3 py-2 text-xs font-mono font-medium flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'exam'
                      ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Atom className="w-3.5 h-3.5" />
                  <span>JEE-Adv-2024-P1.tex</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-5 font-mono text-xs">
                {activeTab === 'dsa' ? (
                  <div className="space-y-3">
                    <div className="bg-slate-950/80 rounded-lg p-3 text-slate-300 leading-relaxed border border-slate-800">
                      <div className="text-slate-500">// Problem 001: Optimal Hash Lookup O(N)</div>
                      <div className="text-blue-400">
                        function <span className="text-yellow-300">twoSum</span>(nums: number[], target: number) &#123;
                      </div>
                      <div className="pl-4 text-slate-300">
                        const map = new Map&lt;number, number&gt;();
                      </div>
                      <div className="pl-4 text-purple-400">
                        for (let i = 0; i &lt; nums.length; i++) &#123;
                      </div>
                      <div className="pl-8 text-slate-300">
                        const diff = target - nums[i];
                      </div>
                      <div className="pl-8 text-emerald-400">
                        if (map.has(diff)) return [map.get(diff)!, i];
                      </div>
                      <div className="pl-8 text-slate-300">map.set(nums[i], i);</div>
                      <div className="pl-4 text-purple-400">&#125;</div>
                      <div className="text-blue-400">&#125;</div>
                    </div>

                    {/* Interactive Runner Control */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={runCodeSimulation}
                        disabled={codeRunState === 'running'}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-md font-sans text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
                      >
                        {codeRunState === 'running' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Running AST Engine...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Run Test Cases</span>
                          </>
                        )}
                      </button>
                      <span className="text-[11px] text-slate-400">Test Cases: 15/15</span>
                    </div>

                    {/* Output Box */}
                    {codeRunState === 'success' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            All 15 Test Cases Passed!
                          </span>
                          <span className="text-emerald-400">3.8 ms</span>
                        </div>
                        <div className="text-slate-400">
                          Runtime: 3.8ms (Beats 98.4%) • Space: 41.2MB (O(N) optimal)
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-1">
                        Click &ldquo;Run Test Cases&rdquo; to test sub-millisecond AST execution.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold text-[11px]">
                        Physics • Rotational Mechanics
                      </span>
                      <span className="text-slate-400 text-[11px]">JEE Adv 2024 Paper 1</span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-serif">
                      A uniform solid sphere of mass M and radius R rolls without slipping down an
                      incline of angle θ. The acceleration of its center of mass is:
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        { id: 0, text: 'a = (5/7) g sin θ', correct: true },
                        { id: 1, text: 'a = (3/5) g sin θ', correct: false },
                        { id: 2, text: 'a = (2/3) g sin θ', correct: false },
                        { id: 3, text: 'a = (1/2) g sin θ', correct: false },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedExamOption(opt.id)}
                          className={`p-2 rounded text-left border transition-all text-xs ${
                            selectedExamOption === opt.id
                              ? opt.correct
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                                : 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-slate-500 mr-1.5">{String.fromCharCode(65 + opt.id)}.</span>
                          {opt.text}
                        </button>
                      ))}
                    </div>

                    {selectedExamOption !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] pt-1"
                      >
                        {selectedExamOption === 0 ? (
                          <div className="p-2 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300">
                            <span className="font-bold">Correct! (+4 Marks)</span> — Solid sphere I = (2/5)MR². a = g sinθ / (1 + I/MR²) = (5/7) g sinθ.
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-rose-950/50 border border-rose-500/40 text-rose-300">
                            <span className="font-bold">Incorrect (-1 Mark)</span> — Check rotational inertia for solid sphere vs hollow cylinder. Correct option is A.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
