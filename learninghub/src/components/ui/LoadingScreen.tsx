import { cn } from '../../utils/cn'
import { BrandEmblem } from '../BrandLogo'

interface LoadingScreenProps {
  fullScreen?: boolean
  className?: string
  message?: string
}

export function LoadingScreen({ fullScreen = false, className, message }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-8 bg-transparent animate-fade-in',
        fullScreen ? 'min-h-screen' : 'min-h-[50vh] py-20',
        className
      )}
    >
      {/* Branded animated logo */}
      <div className="relative w-20 h-20">
        {/* Outer orbital ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary-500/10 animate-spin-slow" />
        {/* Middle pulsing ring */}
        <div
          className="absolute inset-1 w-[72px] h-[72px] rounded-full border-2 border-dashed border-purple-500/20"
          style={{ animation: 'spin-slow 12s linear infinite reverse' }}
        />
        {/* Inner spinning gradient ring */}
        <div className="absolute inset-2 w-16 h-16 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, transparent 60%, #8b5cf6 80%, #a855f7 90%, transparent 100%)',
              animation: 'spin 1.5s linear infinite',
            }}
          />
          {/* Inner circle mask */}
          <div className="absolute inset-[3px] rounded-full bg-gray-50 dark:bg-gray-950" />
        </div>
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BrandEmblem size={44} animate />
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary-500/10 blur-xl animate-pulse" />
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="font-brand-cursive text-glow-brand bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-violet-300 to-fuchsia-400" style={{ fontFamily: "'Dancing Script', 'Caveat', cursive, sans-serif" }}>
            LearningHub
          </span>
          <span className="text-amber-400 text-xs ml-1">✦</span>
        </h2>
        <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
          LEARN • PRACTICE • GROW
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
          {message ?? (fullScreen ? 'Initializing your learning environment...' : 'Loading...')}
        </p>
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary-500/60"
              style={{
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
