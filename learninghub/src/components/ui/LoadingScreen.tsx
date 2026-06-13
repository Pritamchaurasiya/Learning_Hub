import { cn } from '../../utils/cn'

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-500/30">
            L
          </div>
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary-500/5 blur-xl animate-pulse" />
      </div>

      <div className="space-y-3 text-center">
        <h2 className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-pink-500">
          LearningHub
        </h2>
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
