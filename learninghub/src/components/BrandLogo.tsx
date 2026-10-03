import React from 'react'
import { motion } from 'framer-motion'

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
  className?: string
  onClick?: () => void
}

const sizeConfig = {
  xs: {
    iconSize: 28,
    textSize: 'text-sm font-extrabold',
    hubSize: 'text-sm font-extrabold',
    taglineSize: 'text-[7px]',
    subSize: 'text-[8px]',
    gap: 'gap-2',
  },
  sm: {
    iconSize: 36,
    textSize: 'text-base font-extrabold',
    hubSize: 'text-base font-extrabold',
    taglineSize: 'text-[8px]',
    subSize: 'text-[9px]',
    gap: 'gap-2.5',
  },
  md: {
    iconSize: 46,
    textSize: 'text-xl font-black',
    hubSize: 'text-xl font-black',
    taglineSize: 'text-[9px]',
    subSize: 'text-[10px]',
    gap: 'gap-3',
  },
  lg: {
    iconSize: 58,
    textSize: 'text-2xl font-black',
    hubSize: 'text-2xl font-black',
    taglineSize: 'text-[10px]',
    subSize: 'text-xs',
    gap: 'gap-3.5',
  },
  xl: {
    iconSize: 76,
    textSize: 'text-4xl font-black',
    hubSize: 'text-4xl font-black',
    taglineSize: 'text-xs',
    subSize: 'text-sm',
    gap: 'gap-4',
  },
}

/**
 * Flagship Vector Emblem of LearningHub
 * Features:
 * 1. Graduation Cap (Knowledge, Education, Success)
 * 2. 4-Point Golden Star (Achievement, Brighter Future, Excellence)
 * 3. Human Figure (Learner, Growth, Progress, Aspiration)
 * 4. Open Book (Learning, Infinite Possibilities)
 * 5. Dynamic Gradient Pages (Rising Sun & Modern Innovation)
 */
export const BrandEmblem: React.FC<{
  size?: number
  className?: string
  animate?: boolean
  animated?: boolean
}> = ({
  size = 46,
  className = '',
  animate: propAnimate = true,
  animated: propAnimated,
}) => {
  const shouldAnimate = propAnimated ?? propAnimate

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Soft Ambient Glow Backdrop */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-500/25 to-purple-500/20 blur-lg -z-10"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* SVG Emblem with Exact Geometry from Reference Kit */}
      <svg
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_10px_rgba(30,58,138,0.25)] transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Depth Filters */}
          <filter id="svg-cap-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#1E3A8A" floodOpacity="0.3" />
          </filter>
          <filter id="svg-star-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Cap Gradients */}
          <linearGradient id="svg-cap-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="45%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Star Gradient (Golden Achievement) */}
          <linearGradient id="svg-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Learner Gradients (Human Growth) */}
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

          {/* Page Gradients (Open Book & Dynamic Knowledge) */}
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

        {/* Under-Book Base Glow */}
        <ellipse cx="200" cy="305" rx="140" ry="18" fill="#6366F1" fillOpacity="0.12" />

        {/* OPEN BOOK PAGES */}
        <g id="book-pages">
          {/* 1. Rising Sun / Golden Page (Right Background) */}
          <path
            d="M200 248 C235 220 285 185 328 170 C336 167 344 172 344 180 C344 196 338 214 322 230 C280 248 238 256 200 258 Z"
            fill="url(#svg-page-sun)"
          />

          {/* 2. Lower Deep Blue Page (Left) */}
          <path
            d="M200 270 C160 270 100 258 54 236 C46 232 44 222 49 215 C58 202 72 192 90 184 C128 212 168 238 200 248 Z"
            fill="url(#svg-page-blue)"
          />

          {/* 3. Dynamic Cyan Page (Left Front) */}
          <path
            d="M200 278 C158 274 105 258 64 226 C56 220 54 209 60 201 C68 188 84 176 104 168 C144 200 178 232 200 254 Z"
            fill="url(#svg-page-cyan)"
          />

          {/* 4. Lower Indigo/Purple Wing (Right) */}
          <path
            d="M200 270 C240 270 300 258 346 236 C354 232 356 222 351 215 C342 202 328 192 310 184 C272 212 232 238 200 248 Z"
            fill="#4F46E5"
          />

          {/* 5. Main Innovation Purple Page (Right Front) */}
          <path
            d="M200 278 C242 274 295 258 336 226 C344 220 346 209 340 201 C332 188 316 176 296 168 C256 200 222 232 200 254 Z"
            fill="url(#svg-page-purple)"
          />

          {/* Book Spine Apex Center */}
          <path
            d="M196 276 Q200 273 204 276 L202 284 Q200 286 198 284 Z"
            fill="#0F172A"
            opacity="0.3"
          />
        </g>

        {/* LEARNER FIGURE */}
        <g id="learner-figure">
          {/* Torso & Reaching Arms */}
          <path
            d="M200 246 
               C188 215 168 175 138 144
               C132 138 138 128 146 130
               C164 136 178 152 188 170
               C194 156 206 156 212 170
               C222 152 236 136 254 130
               C262 128 268 138 262 144
               C232 175 212 215 200 246 Z"
            fill="url(#svg-learner-body)"
          />

          {/* Learner Head */}
          <circle
            cx="200"
            cy="138"
            r="16"
            fill="url(#svg-learner-head)"
          />
        </g>

        {/* GRADUATION CAP */}
        <g id="graduation-cap" filter="url(#svg-cap-shadow)">
          {/* Under-Cap Crown Band */}
          <path
            d="M164 96 C164 116 178 128 200 128 C222 128 236 116 236 96 C226 102 214 106 200 106 C186 106 174 102 164 96 Z"
            fill="#0F172A"
          />

          {/* Mortarboard Diamond Plane */}
          <path
            d="M200 52 L268 84 L200 106 L132 84 Z"
            fill="url(#svg-cap-top)"
          />

          {/* Specular Diamond Highlight */}
          <path
            d="M200 52 L268 84 L200 88 L132 84 Z"
            fill="#FFFFFF"
            opacity="0.22"
          />

          {/* Center Button */}
          <ellipse cx="200" cy="84" rx="5" ry="3.5" fill="#1E3A8A" />

          {/* Tassel Ribbon & Hanging Node */}
          <path
            d="M200 84 Q238 88 252 98 Q260 106 260 118"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="260" cy="120" r="3" fill="#38BDF8" />
          <path d="M258 122 L256 138 L264 138 L262 122 Z" fill="#38BDF8" />
        </g>

        {/* 4-POINT ACHIEVEMENT STAR */}
        <g id="achievement-star" filter="url(#svg-star-glow)">
          <path
            d="M300 56 Q300 78 318 78 Q300 78 300 100 Q300 78 282 78 Q300 78 300 56 Z"
            fill="url(#svg-star-grad)"
            className={shouldAnimate ? 'animate-pulse' : ''}
          />
          <circle cx="300" cy="78" r="2.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  )
}

/**
 * LearningHub Primary Brand Logo Component
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  showTagline = false,
  tagline = 'LEARN • PRACTICE • GROW • ACHIEVE',
  showBadge = false,
  badgeText = 'AI OS',
  subtitle,
  animate: propAnimate = true,
  animated: propAnimated,
  className = '',
  onClick,
}) => {
  const shouldAnimate = propAnimated ?? propAnimate
  const currentSize = sizeConfig[size]

  const screenReaderText = null

  // 1. Icon-Only Variant
  if (variant === 'icon-only') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center cursor-pointer ${className}`}
        aria-label="LearningHub"
      >
        <BrandEmblem size={currentSize.iconSize} animate={shouldAnimate} />
        {screenReaderText}
      </div>
    )
  }

  // 2. App-Icon / Squircle Variant (from reference image)
  if (variant === 'app-icon') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden select-none cursor-pointer group ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-purple-500/10 to-transparent pointer-events-none" />
        <BrandEmblem size={currentSize.iconSize * 1.4} animate={shouldAnimate} />
        <div className="mt-2.5 flex items-center justify-center">
          <span className="font-extrabold text-white text-lg tracking-tight">Learning</span>
          <span className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 text-lg tracking-tight">Hub</span>
        </div>
        <span className="text-[8px] font-semibold text-slate-400 tracking-widest mt-0.5 uppercase">
          {tagline}
        </span>
        {screenReaderText}
      </div>
    )
  }

  // 3. Vertical Variant (Centered for Login / Splash Cards)
  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none cursor-pointer ${className}`}
      >
        <motion.div
          whileHover={shouldAnimate ? { scale: 1.06 } : undefined}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="relative mb-2.5"
        >
          <BrandEmblem size={currentSize.iconSize * 1.25} animate={shouldAnimate} />
        </motion.div>

        <div className="flex items-center justify-center">
          <span className={`font-black tracking-tight text-slate-900 dark:text-white ${currentSize.textSize}`}>
            Learning
          </span>
          <span className={`font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 ${currentSize.hubSize}`}>
            Hub
          </span>
          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 ml-0.5 -mt-3">
            ™
          </span>
        </div>

        <p className={`font-bold tracking-widest text-slate-400 dark:text-slate-400 uppercase mt-1 ${currentSize.taglineSize}`}>
          {tagline}
        </p>

        {subtitle && (
          <p className={`font-medium text-slate-500 dark:text-slate-400 mt-1 ${currentSize.subSize}`}>
            {subtitle}
          </p>
        )}

        {screenReaderText}
      </div>
    )
  }

  // 4. Default Horizontal / Full Variant
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${currentSize.gap} select-none cursor-pointer ${className}`}
    >
      <motion.div
        whileHover={shouldAnimate ? { scale: 1.05 } : undefined}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="shrink-0"
      >
        <BrandEmblem size={currentSize.iconSize} animate={shouldAnimate} />
      </motion.div>

      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline">
          <span
            className={`tracking-tight text-slate-900 dark:text-white ${currentSize.textSize}`}
          >
            Learning
          </span>
          <span
            className={`tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 ${currentSize.hubSize}`}
          >
            Hub
          </span>
          <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 ml-0.5 -mt-2">
            ™
          </span>

          {showBadge && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
              {badgeText}
            </span>
          )}
        </div>

        {(showTagline || subtitle) && (
          <p className={`font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-0.5 ${currentSize.taglineSize}`}>
            {subtitle || tagline}
          </p>
        )}
      </div>

      {screenReaderText}
    </div>
  )
}

export default BrandLogo
