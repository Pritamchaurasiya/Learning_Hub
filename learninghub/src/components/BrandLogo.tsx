import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon-only' | 'vertical'
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
    iconSize: 26,
    textSize: 'text-sm',
    hubSize: 'text-xs px-1.5 py-0.5',
    subSize: 'text-[8px]',
    gap: 'gap-1.5',
  },
  sm: {
    iconSize: 34,
    textSize: 'text-base',
    hubSize: 'text-xs px-2 py-0.5',
    subSize: 'text-[9px]',
    gap: 'gap-2',
  },
  md: {
    iconSize: 42,
    textSize: 'text-xl',
    hubSize: 'text-sm px-2.5 py-0.5',
    subSize: 'text-[10px]',
    gap: 'gap-2.5',
  },
  lg: {
    iconSize: 56,
    textSize: 'text-2xl',
    hubSize: 'text-base px-3 py-1',
    subSize: 'text-xs',
    gap: 'gap-3',
  },
  xl: {
    iconSize: 76,
    textSize: 'text-3xl md:text-4xl',
    hubSize: 'text-lg md:text-xl px-3.5 py-1',
    subSize: 'text-sm',
    gap: 'gap-4',
  },
}

export const BrandEmblem: React.FC<{ size?: number; className?: string; animate?: boolean; animated?: boolean }> = ({
  size = 42,
  className = '',
  animate: propAnimate = true,
  animated: propAnimated,
}) => {
  const animate = propAnimated ?? propAnimate
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient Pulsing Glow Backdrop */}
      {animate && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-indigo-500/40 to-pink-500/35 blur-xl -z-10"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Modern High-End SVG Emblem */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(79,70,229,0.35)] transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="emblem-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="40%" stopColor="#3B82F6" />
            <stop offset="80%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          <linearGradient id="emblem-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          <linearGradient id="emblem-specular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="core-flare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#67E8F9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Hex Shield Frame */}
        <polygon
          points="50,6 88,28 88,72 50,94 12,72 12,28"
          fill="#0F172A"
          stroke="url(#emblem-grad-1)"
          strokeWidth="2.5"
          className="dark:fill-[#0B0F19] fill-[#1E293B]"
        />

        {/* Left Dynamic Knowledge Wing (L form) */}
        <path
          d="M24 32 C24 32 36 20 50 32 C50 44 38 68 26 78 C20 83 14 78 14 70 C14 54 24 32 24 32 Z"
          fill="url(#emblem-grad-1)"
        />

        {/* Right Dynamic Knowledge Wing (H arc) */}
        <path
          d="M76 32 C76 32 64 20 50 32 C50 44 62 68 74 78 C80 83 86 78 86 70 C86 54 76 32 76 32 Z"
          fill="url(#emblem-grad-2)"
        />

        {/* Subtle Specular Highlights */}
        <path
          d="M24 32 C36 20 50 32 50 32"
          stroke="url(#emblem-specular)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M76 32 C64 20 50 32 50 32"
          stroke="url(#emblem-specular)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Lower Anchor Keystone */}
        <polygon points="50,60 58,72 50,84 42,72" fill="url(#emblem-grad-2)" />

        {/* Radiant Core Star / AI Mastery Nucleus */}
        <g>
          <circle cx="50" cy="48" r="14" fill="url(#core-flare)" />
          {/* Diamond Shimmer Star */}
          <path
            d="M50 36 Q50 48 62 48 Q50 48 50 60 Q50 48 38 48 Q50 48 50 36 Z"
            fill="#FFFFFF"
          />
          <circle cx="50" cy="48" r="3" fill="#06B6D4" />
        </g>

        {/* Floating Quantum Sparkles */}
        <circle cx="28" cy="46" r="2" fill="#38BDF8" />
        <circle cx="72" cy="46" r="2" fill="#F43F5E" />
      </svg>
    </div>
  )
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  showBadge = true,
  badgeText = 'AI OS',
  subtitle,
  animate: propAnimate,
  animated,
  className = '',
  onClick,
}) => {
  const animate = propAnimate ?? animated ?? true
  const currentSize = sizeConfig[size]

  if (variant === 'icon-only') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center cursor-pointer ${className}`}
      >
        <BrandEmblem size={currentSize.iconSize} animate={animate} />
      </div>
    )
  }

  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none cursor-pointer ${className}`}
      >
        <motion.div
          whileHover={animate ? { scale: 1.06, rotate: [0, -1, 1, 0] } : undefined}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="relative mb-3"
        >
          <BrandEmblem size={currentSize.iconSize} animate={animate} />
        </motion.div>

        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight text-gray-900 dark:text-white ${currentSize.textSize}`}
          >
            Learning
          </span>
          <span
            className={`font-black rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/30 ${currentSize.hubSize}`}
          >
            Hub
          </span>
        </div>

        {(showBadge || subtitle) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {showBadge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-primary-500 animate-pulse" />
                {badgeText}
              </span>
            )}
            {subtitle && (
              <span className={`font-semibold text-gray-500 dark:text-gray-400 ${currentSize.subSize}`}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Default 'full' horizontal layout
  return (
    <motion.div
      onClick={onClick}
      whileHover={animate ? { scale: 1.02 } : undefined}
      whileTap={animate ? { scale: 0.98 } : undefined}
      className={`inline-flex items-center ${currentSize.gap} select-none cursor-pointer group ${className}`}
    >
      <BrandEmblem size={currentSize.iconSize} animate={animate} />

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 ${currentSize.textSize}`}
          >
            Learning
          </span>
          <span
            className={`font-black rounded-md bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-sm shadow-purple-500/25 transition-all duration-300 group-hover:shadow-md group-hover:shadow-purple-500/40 ${currentSize.hubSize}`}
          >
            Hub
          </span>
        </div>

        {subtitle ? (
          <span
            className={`font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 ${currentSize.subSize}`}
          >
            {subtitle}
          </span>
        ) : showBadge ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-indigo-400 to-pink-500">
              {badgeText}
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping inline-block" />
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

export default BrandLogo
