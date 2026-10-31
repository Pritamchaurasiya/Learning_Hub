import { memo } from 'react'
import { Sparkles, Plus, UploadCloud, Trophy, Flame, TrendingUp } from 'lucide-react'
import { Button } from '../ui/Button'
import { useStore } from '../../stores/useStore'

export interface TestHeroHeaderProps {
  onOpenImportModal: () => void
  onOpenManualModal: () => void
  onOpenAIModal: () => void
  onLaunchBlitz?: () => void
}

export const TestHeroHeader = memo(function TestHeroHeader({
  onOpenImportModal,
  onOpenManualModal,
  onOpenAIModal,
}: TestHeroHeaderProps) {
  const user = useStore(state => state.auth.user)
  const username =
    (user as { fullName?: string; username?: string } | null)?.fullName ||
    user?.username ||
    'Scholar'

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-violet-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-purple-50/70 to-indigo-50/80 dark:from-slate-900/90 dark:via-purple-950/30 dark:to-slate-900/95 p-6 md:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl transition-colors duration-300">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Column: Heading, Subtitle, Stats & Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/40">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Welcome back, {username}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              Live CBT Station
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-900 dark:from-white dark:via-violet-200 dark:to-purple-300 mb-2">
            Tests A+
          </h1>

          <p className="text-gray-600 dark:text-slate-300 text-sm sm:text-base font-medium max-w-xl mb-6 leading-relaxed">
            Practice smarter. Test yourself. Improve faster with deep adaptive diagnostics, spaced
            repetition, and real-time proctoring.
          </p>

          {/* 4 Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-slate-800 shadow-sm dark:shadow-md backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/40 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <b className="block text-sm font-bold text-gray-900 dark:text-white">10,000+</b>
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                  Practice tests
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-slate-800 shadow-sm dark:shadow-md backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/40 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <b className="block text-sm font-bold text-gray-900 dark:text-white">50+</b>
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                  Exams & topics
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-slate-800 shadow-sm dark:shadow-md backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <b className="block text-sm font-bold text-gray-900 dark:text-white">AI Powered</b>
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                  Smart practice
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-slate-800 shadow-sm dark:shadow-md backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/40 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <b className="block text-sm font-bold text-gray-900 dark:text-white">
                  Track Progress
                </b>
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                  Mastery analytics
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={onOpenAIModal}
              variant="primary"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 px-5 py-2.5 text-sm font-bold rounded-xl"
            >
              <Sparkles className="w-4 h-4" />
              AI Custom Mock
            </Button>

            <Button
              onClick={onOpenManualModal}
              variant="outline"
              className="flex items-center gap-2 border-purple-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 text-gray-800 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-700 dark:hover:text-white px-4 py-2.5 text-sm font-semibold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4 text-indigo-600 dark:text-blue-400" />
              Create Custom Test
            </Button>

            <Button
              onClick={onOpenImportModal}
              variant="outline"
              className="flex items-center gap-2 border-emerald-300/80 dark:border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-2.5 text-sm font-semibold rounded-xl shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Import Questions
            </Button>
          </div>
        </div>

        {/* Right Column: Decorative Vector Artwork from the user's HTML design */}
        <div className="hidden lg:block relative shrink-0 w-[300px] h-[210px]" aria-hidden="true">
          <svg className="w-full h-full overflow-visible drop-shadow-2xl" viewBox="0 0 330 200">
            <defs>
              <radialGradient id="heroArtRadial" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#8b5cf6" stopOpacity=".6" />
                <stop offset="1" stopColor="#6d3df0" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="heroArtBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c4b5fd" />
                <stop offset="1" stopColor="#7c4dff" />
              </linearGradient>
            </defs>
            <ellipse cx="168" cy="193" rx="150" ry="7" fill="#000" opacity=".25" />
            <circle cx="208" cy="78" r="86" fill="url(#heroArtRadial)" />

            {/* Ascending Score Bars */}
            <rect
              x="22"
              y="158"
              width="52"
              height="30"
              rx="9"
              fill="url(#heroArtBars)"
              opacity=".5"
            />
            <rect
              x="76"
              y="132"
              width="52"
              height="56"
              rx="9"
              fill="url(#heroArtBars)"
              opacity=".68"
            />
            <rect
              x="130"
              y="106"
              width="52"
              height="82"
              rx="9"
              fill="url(#heroArtBars)"
              opacity=".84"
            />
            <rect x="184" y="80" width="52" height="108" rx="9" fill="url(#heroArtBars)" />

            {/* Completed Checkmark Badges */}
            <g className="text-purple-600">
              <circle cx="48" cy="173" r="9" fill="#fff" opacity=".95" />
              <path
                d="M43.8 173l3.4 3.4 5.4-6.2"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="102" cy="147" r="9" fill="#fff" opacity=".95" />
              <path
                d="M97.8 147l3.4 3.4 5.4-6.2"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="156" cy="121" r="9" fill="#fff" opacity=".95" />
              <path
                d="M151.8 121l3.4 3.4 5.4-6.2"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>

            {/* Goal Flag Pole */}
            <path d="M210 80V30" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path d="M210 30l28 9-28 9z" fill="#fbbf24" />

            {/* Floating Test Card Preview */}
            <g transform="translate(244 24) rotate(6)">
              <rect
                width="76"
                height="88"
                rx="11"
                fill="#1e1e38"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />
              <rect x="24" y="-5" width="28" height="11" rx="4" fill="#7c4dff" />
              <rect x="11" y="22" width="12" height="12" rx="3.5" fill="#7c4dff" />
              <path
                d="M13.5 28l2.5 2.6 4.3-5"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect x="29" y="25" width="36" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
              <rect x="11" y="44" width="12" height="12" rx="3.5" fill="#7c4dff" />
              <path
                d="M13.5 50l2.5 2.6 4.3-5"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect x="29" y="47" width="28" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
            </g>

            {/* Floating Trend Line */}
            <g transform="translate(240 132)">
              <rect
                width="84"
                height="54"
                rx="11"
                fill="#1e1e38"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />
              <path
                d="M10 40L28 28l14 5 18-17 14-6"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="74" cy="10" r="4.5" fill="#7c4dff" stroke="#fff" strokeWidth="1.5" />
            </g>

            {/* Sparkles */}
            <g transform="translate(146 56)">
              <path
                d="M0 -9L2.2 -2.2L9 0L2.2 2.2L0 9L-2.2 2.2L-9 0L-2.2 -2.2Z"
                fill="#c4b5fd"
                className="animate-pulse"
              />
            </g>
            <g transform="translate(116 20) scale(.7)">
              <path d="M0 -9L2.2 -2.2L9 0L2.2 2.2L0 9L-2.2 2.2L-9 0L-2.2 -2.2Z" fill="#fbbf24" />
            </g>
          </svg>

          {/* Script Caption */}
          <div className="absolute top-2 left-2 text-violet-200/90 font-serif italic text-2xl font-bold tracking-wide pointer-events-none drop-shadow">
            Learn · Practice · Grow
          </div>
        </div>
      </div>
    </div>
  )
})
