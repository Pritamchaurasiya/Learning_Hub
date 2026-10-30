import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon-only' | 'vertical' | 'badge' | 'app-icon'
  showTagline?: boolean
  tagline?: string
  showBadge?: boolean
  badgeText?: string
  subtitle?: string
  animate?: boolean
  animated?: boolean
  cycleWords?: boolean
  className?: string
  onClick?: () => void
}

const sizeConfig = {
  xs: {
    iconSize: 28,
    textSize: 'text-sm font-extrabold',
    cursiveSize: 'text-[17px] font-extrabold tracking-tight',
    taglineSize: 'text-[7.5px]',
    subSize: 'text-[8px]',
    gap: 'gap-2',
    minWidth: 'min-w-[140px]',
    cursorHeight: 'h-3.5',
  },
  sm: {
    iconSize: 36,
    textSize: 'text-base font-black',
    cursiveSize: 'text-[20px] font-extrabold tracking-tight',
    taglineSize: 'text-[8.5px]',
    subSize: 'text-[9px]',
    gap: 'gap-2.5',
    minWidth: 'min-w-[170px]',
    cursorHeight: 'h-4',
  },
  md: {
    iconSize: 44,
    textSize: 'text-xl font-black',
    cursiveSize: 'text-[24px] font-extrabold tracking-tight',
    taglineSize: 'text-[9.5px]',
    subSize: 'text-[10px]',
    gap: 'gap-3',
    minWidth: 'min-w-[195px]',
    cursorHeight: 'h-5',
  },
  lg: {
    iconSize: 56,
    textSize: 'text-2xl font-black',
    cursiveSize: 'text-[32px] font-black tracking-tight',
    taglineSize: 'text-[11px]',
    subSize: 'text-xs',
    gap: 'gap-3.5',
    minWidth: 'min-w-[240px]',
    cursorHeight: 'h-6',
  },
  xl: {
    iconSize: 72,
    textSize: 'text-4xl font-black',
    cursiveSize: 'text-[48px] font-black tracking-tight',
    taglineSize: 'text-xs',
    subSize: 'text-sm',
    gap: 'gap-4',
    minWidth: 'min-w-[300px]',
    cursorHeight: 'h-8',
  },
}

/**
 * Dynamic brand stage items:
 * 1. Apple-Grade Cursive "LearningHub" (ChatGPT keyboard typing)
 * 2. "Learn"
 * 3. "Practice"
 * 4. "Grow"
 */
export interface DynamicWordStage {
  id: string
  word: string
  isCursive: boolean
  gradient: string
  darkGradient: string
  cursorColor: string
  sparkleColor: string
  tagline: string
  badge?: string
}

export const BRAND_STAGES: DynamicWordStage[] = [
  {
    id: 'stage-brand',
    word: 'LearningHub',
    isCursive: true,
    gradient: 'from-[#0071E3] via-[#6366F1] to-[#A855F7]',
    darkGradient: 'from-[#38BDF8] via-[#818CF8] to-[#E879F9]',
    cursorColor: '#818CF8',
    sparkleColor: '#F59E0B',
    tagline: 'LEARN • PRACTICE • GROW',
  },
  {
    id: 'stage-learn',
    word: 'Learn',
    isCursive: false,
    gradient: 'from-sky-500 via-cyan-500 to-blue-600',
    darkGradient: 'from-cyan-300 via-sky-300 to-blue-400',
    cursorColor: '#38BDF8',
    sparkleColor: '#38BDF8',
    tagline: 'MASTER CONCEPTS & THEORY',
    badge: '01',
  },
  {
    id: 'stage-practice',
    word: 'Practice',
    isCursive: false,
    gradient: 'from-violet-600 via-purple-600 to-pink-600',
    darkGradient: 'from-violet-300 via-purple-300 to-pink-400',
    cursorColor: '#EC4899',
    sparkleColor: '#A855F7',
    tagline: '100K+ PYQS & 1V1 DUELS',
    badge: '02',
  },
  {
    id: 'stage-grow',
    word: 'Grow',
    isCursive: false,
    gradient: 'from-emerald-500 via-teal-500 to-amber-500',
    darkGradient: 'from-emerald-300 via-teal-300 to-amber-300',
    cursorColor: '#10B981',
    sparkleColor: '#10B981',
    tagline: 'TOP RANKS & CAREER TRIUMPH',
    badge: '03',
  },
]

/**
 * Flagship Vector & 3D Glass Emblem of LearningHub
 * Displays the official 3D glassy squircle logo with glowing ambient aura
 * and fallback to high-fidelity SVG geometry.
 */
export const BrandEmblem: React.FC<{
  size?: number
  className?: string
  animate?: boolean
  animated?: boolean
  useSvgFallback?: boolean
}> = ({
  size = 46,
  className = '',
  animate: propAnimate = true,
  animated: propAnimated,
  useSvgFallback = false,
}) => {
  const shouldAnimate = propAnimated ?? propAnimate
  const [imgError, setImgError] = useState(useSvgFallback)

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Soft Ambient Glow Backdrop */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-sky-400/30 via-indigo-500/35 to-purple-500/30 blur-md -z-10"
          animate={{
            scale: [1, 1.14, 1],
            opacity: [0.55, 0.9, 0.55],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {!imgError ? (
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          whileHover={shouldAnimate ? { scale: 1.06, rotate: [0, -1.5, 1.5, 0] } : undefined}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Official 3D Glass Squircle Logo */}
          <img
            src="/logo.png"
            alt="LearningHub Logo"
            width={size}
            height={size}
            loading="eager"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded-[22%] drop-shadow-[0_4px_14px_rgba(30,64,175,0.38)] ring-1 ring-white/20 dark:ring-white/10 transition-transform duration-300 group-hover:scale-105"
          />

          {/* Micro corner achievement star shimmer */}
          {shouldAnimate && (
            <motion.div
              className="absolute -top-1 -right-1 text-amber-400 pointer-events-none drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
              animate={{
                scale: [0.8, 1.25, 0.8],
                opacity: [0.6, 1, 0.6],
                rotate: [0, 45, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <svg width={Math.max(10, size * 0.26)} height={Math.max(10, size * 0.26)} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
              </svg>
            </motion.div>
          )}
        </motion.div>
      ) : (
        /* Fallback SVG Emblem */
        <svg
          viewBox="0 0 400 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_10px_rgba(30,58,138,0.25)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <filter id="svg-cap-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#1E3A8A" floodOpacity="0.3" />
            </filter>
            <filter id="svg-star-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="svg-cap-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="45%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="svg-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="svg-learner-head" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="70%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id="svg-learner-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="svg-page-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="40%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="svg-page-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="60%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="svg-page-sun" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>
            <linearGradient id="svg-page-purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="40%" stopColor="#8B5CF6" />
              <stop offset="80%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#C026D3" />
            </linearGradient>
          </defs>
          <ellipse cx="200" cy="305" rx="140" ry="18" fill="#6366F1" fillOpacity="0.12" />
          <g id="book-pages">
            <path
              d="M200 248 C235 220 285 185 328 170 C336 167 344 172 344 180 C344 196 338 214 322 230 C280 248 238 256 200 258 Z"
              fill="url(#svg-page-sun)"
            />
            <path
              d="M200 270 C160 270 100 258 54 236 C46 232 44 222 49 215 C58 202 72 192 90 184 C128 212 168 238 200 248 Z"
              fill="url(#svg-page-blue)"
            />
            <path
              d="M200 278 C158 274 105 258 64 226 C56 220 54 209 60 201 C68 188 84 176 104 168 C144 200 178 232 200 254 Z"
              fill="url(#svg-page-cyan)"
            />
            <path
              d="M200 270 C240 270 300 258 346 236 C354 232 356 222 351 215 C342 202 328 192 310 184 C272 212 232 238 200 248 Z"
              fill="#4F46E5"
            />
            <path
              d="M200 278 C242 274 295 258 336 226 C344 220 346 209 340 201 C332 188 316 176 296 168 C256 200 222 232 200 254 Z"
              fill="url(#svg-page-purple)"
            />
            <path d="M196 276 Q200 273 204 276 L202 284 Q200 286 198 284 Z" fill="#0F172A" opacity="0.3" />
          </g>
          <g id="learner-figure">
            <path
              d="M200 246 C188 215 168 175 138 144 C132 138 138 128 146 130 C164 136 178 152 188 170 C194 156 206 156 212 170 C222 152 236 136 254 130 C262 128 268 138 262 144 C232 175 212 215 200 246 Z"
              fill="url(#svg-learner-body)"
            />
            <circle cx="200" cy="138" r="16" fill="url(#svg-learner-head)" />
          </g>
          <g id="graduation-cap" filter="url(#svg-cap-shadow)">
            <path
              d="M164 96 C164 116 178 128 200 128 C222 128 236 116 236 96 C226 102 214 106 200 106 C186 106 174 102 164 96 Z"
              fill="#0F172A"
            />
            <path d="M200 52 L268 84 L200 106 L132 84 Z" fill="url(#svg-cap-top)" />
            <path d="M200 52 L268 84 L200 88 L132 84 Z" fill="#FFFFFF" opacity="0.22" />
            <ellipse cx="200" cy="84" rx="5" ry="3.5" fill="#1E3A8A" />
            <path d="M200 84 Q238 88 252 98 Q260 106 260 118" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="260" cy="120" r="3" fill="#38BDF8" />
            <path d="M258 122 L256 138 L264 138 L262 122 Z" fill="#38BDF8" />
          </g>
          <g id="achievement-star" filter="url(#svg-star-glow)">
            <path
              d="M300 56 Q300 78 318 78 Q300 78 300 100 Q300 78 282 78 Q300 78 300 56 Z"
              fill="url(#svg-star-grad)"
              className={shouldAnimate ? 'animate-pulse' : ''}
            />
            <circle cx="300" cy="78" r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      )}
    </div>
  )
}

/**
 * ChatGPT Keyboard / Typewriter Hook
 * Simulates real human & AI keyboard typing:
 * Types out character-by-character -> pauses -> backspaces -> types next word!
 */
interface UseTypewriterOptions {
  words: DynamicWordStage[]
  enabled?: boolean
  isPaused?: boolean
  typingSpeed?: number
  deletingSpeed?: number
  pauseDelay?: number
}

export function useTypewriter({
  words,
  enabled = true,
  isPaused = false,
  typingSpeed = 85,
  deletingSpeed = 45,
  pauseDelay = 2200,
}: UseTypewriterOptions) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState(words[0]?.word || '')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!enabled || isPaused || words.length === 0) return

    const currentWord = words[index].word
    let timeoutId: NodeJS.Timeout

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        // Typing forward character by character
        timeoutId = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1))
        }, typingSpeed)
      } else {
        // Finished typing word, hold before backspace
        timeoutId = setTimeout(() => {
          setIsDeleting(true)
        }, pauseDelay)
      }
    } else {
      if (displayText.length > 0) {
        // Backspacing character by character
        timeoutId = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length - 1))
        }, deletingSpeed)
      } else {
        // Word cleared, transition to next word
        timeoutId = setTimeout(() => {
          setIndex(prev => (prev + 1) % words.length)
          setIsDeleting(false)
        }, 300)
      }
    }

    return () => clearTimeout(timeoutId)
  }, [displayText, isDeleting, index, enabled, isPaused, words, typingSpeed, deletingSpeed, pauseDelay])

  return {
    currentStage: words[index] || words[0],
    displayText,
    isDeleting,
    isComplete: displayText === (words[index]?.word || ''),
  }
}

/**
 * ChatGPT Keyboard-Style Dynamic Brand Word with Blinking Caret Cursor
 */
interface DynamicBrandWordProps {
  currentStage: DynamicWordStage
  displayText: string
  isComplete: boolean
  size: keyof typeof sizeConfig
  isVertical?: boolean
}

const DynamicBrandWord: React.FC<DynamicBrandWordProps> = ({
  currentStage,
  displayText,
  isComplete,
  size,
  isVertical = false,
}) => {
  const currentSize = sizeConfig[size]

  return (
    <div
      className={`inline-flex items-baseline ${isVertical ? 'justify-center' : 'justify-start'} select-none`}
      aria-hidden="true"
    >
      {currentStage.isCursive ? (
        /* 1. APPLE-GRADE BOLD CURSIVE "LearningHub" (ChatGPT Keyboard Typing) */
        <span
          className={`font-brand-cursive tracking-tight font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${currentStage.gradient} dark:${currentStage.darkGradient} ${currentSize.cursiveSize} drop-shadow-[0_2px_10px_rgba(99,102,241,0.35)] whitespace-nowrap`}
          style={{
            fontFamily: "'Satisfy', 'Dancing Script', 'Caveat', 'Pacifico', cursive, -apple-system, sans-serif",
            lineHeight: 1.2,
            paddingRight: '4px',
            WebkitTextStroke: '0.4px currentColor',
            letterSpacing: '-0.015em',
            display: 'inline-block',
          }}
        >
          {displayText.startsWith('Learning') && displayText.length >= 8 ? (
            <>
              <span>Learning</span>
              <span>{displayText.slice(8)}</span>
            </>
          ) : (
            displayText
          )}
        </span>
      ) : (
        /* 2, 3, 4. "Learn", "Practice", "Grow" (ChatGPT Keyboard Typing) */
        <span
          className={`font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${currentStage.gradient} dark:${currentStage.darkGradient} ${currentSize.textSize}`}
        >
          {displayText}
        </span>
      )}

      {/* ChatGPT-Style Glowing Keyboard Cursor (Blinks smoothly) */}
      <span
        className="inline-block w-[2px] h-[0.85em] ml-0.5 rounded-full animate-pulse transition-colors"
        style={{
          backgroundColor: currentStage.cursorColor,
          boxShadow: `0 0 8px ${currentStage.cursorColor}`,
          verticalAlign: 'baseline',
        }}
      />

      {/* Subtle gold sparkle star when Cursive LearningHub finishes typing */}
      {currentStage.isCursive && isComplete && (
        <span
          className="text-[11px] font-bold text-amber-400 dark:text-amber-300 ml-1 select-none animate-bounce-soft"
        >
          ✦
        </span>
      )}

      {/* Micro badge for Learn, Practice, Grow */}
      {!currentStage.isCursive && isComplete && currentStage.badge && (
        <span
          className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/40"
        >
          {currentStage.badge}
        </span>
      )}
    </div>
  )
}

/**
 * LearningHub Primary Brand Logo Component
 * - Displays the official squircle 3D logo
 * - Animates the text like ChatGPT typing on keyboard:
 *   Cursive LearningHub -> Learn -> Practice -> Grow with pulsing cursor!
 * - Fully accessible, zero layout shift, customizable
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  showTagline = false,
  tagline,
  showBadge = false,
  badgeText = 'PRO',
  subtitle,
  animate: propAnimate = true,
  animated: propAnimated,
  cycleWords: propCycleWords = true,
  className = '',
  onClick,
}) => {
  const shouldAnimate = propAnimated ?? propAnimate
  const shouldCycle = shouldAnimate && propCycleWords
  const currentSize = sizeConfig[size]

  const [isHovered, setIsHovered] = useState(false)

  // ChatGPT-style Typewriter engine
  const { currentStage, displayText, isComplete } = useTypewriter({
    words: BRAND_STAGES,
    enabled: shouldCycle,
    isPaused: isHovered,
    typingSpeed: 80,
    deletingSpeed: 40,
    pauseDelay: 2200,
  })

  const effectiveTagline = subtitle || tagline || currentStage.tagline

  // 1. Icon-Only Variant
  if (variant === 'icon-only') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center justify-center cursor-pointer ${className}`}
        aria-label="LearningHub"
      >
        <BrandEmblem size={currentSize.iconSize} animate={shouldAnimate} />
      </div>
    )
  }

  // 2. App-Icon / Squircle Card Variant
  if (variant === 'app-icon') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden select-none cursor-pointer group ${className}`}
        aria-label="LearningHub"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-purple-500/15 to-transparent pointer-events-none" />
        <BrandEmblem size={currentSize.iconSize * 1.35} animate={shouldAnimate} />
        
        <div className="mt-3 flex items-center justify-center min-h-[32px]">
          <DynamicBrandWord
            currentStage={currentStage}
            displayText={shouldCycle ? displayText : 'LearningHub'}
            isComplete={isComplete}
            size={size}
            isVertical
          />
        </div>

        <span className="text-[8px] font-semibold text-slate-400 tracking-widest mt-0.5 uppercase">
          {effectiveTagline}
        </span>
      </div>
    )
  }

  // 3. Vertical Variant (Centered for Login / Splash Cards / Modal Headers)
  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex flex-col items-center text-center select-none cursor-pointer group ${className}`}
        aria-label="LearningHub"
      >
        <motion.div
          whileHover={shouldAnimate ? { scale: 1.06 } : undefined}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="relative mb-2.5"
        >
          <BrandEmblem size={currentSize.iconSize * 1.25} animate={shouldAnimate} />
        </motion.div>

        {/* Dynamic Brand Word Container with fixed min-height */}
        <div className="flex items-center justify-center min-h-[36px]">
          <DynamicBrandWord
            currentStage={currentStage}
            displayText={shouldCycle ? displayText : 'LearningHub'}
            isComplete={isComplete}
            size={size}
            isVertical
          />
        </div>

        {/* Tagline / Subtitle */}
        <p className={`font-bold tracking-widest text-slate-400 dark:text-slate-400 uppercase mt-1 ${currentSize.taglineSize}`}>
          {effectiveTagline}
        </p>

        {subtitle && subtitle !== effectiveTagline && (
          <p className={`font-medium text-slate-500 dark:text-slate-400 mt-1 ${currentSize.subSize}`}>
            {subtitle}
          </p>
        )}
      </div>
    )
  }

  // 4. Default Horizontal / Full Variant (Used in Navbar, Public Header, Sidebar, Footer)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex items-center ${currentSize.gap} select-none cursor-pointer group ${className}`}
      aria-label="LearningHub"
    >
      <motion.div
        whileHover={shouldAnimate ? { scale: 1.05 } : undefined}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="shrink-0"
      >
        <BrandEmblem size={currentSize.iconSize} animate={shouldAnimate} />
      </motion.div>

      <div className={`flex flex-col justify-center leading-none ${currentSize.minWidth}`}>
        <div className="flex items-baseline min-h-[26px]">
          <DynamicBrandWord
            currentStage={currentStage}
            displayText={shouldCycle ? displayText : 'LearningHub'}
            isComplete={isComplete}
            size={size}
          />

          {showBadge && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shrink-0">
              {badgeText}
            </span>
          )}
        </div>

        {(showTagline || subtitle) && (
          <AnimatePresence mode="wait">
            <motion.p
              key={effectiveTagline}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.25 }}
              className={`font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-0.5 truncate ${currentSize.taglineSize}`}
            >
              {effectiveTagline}
            </motion.p>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default BrandLogo
