import { motion } from 'framer-motion'
import { Award, Star, Trophy, Zap, Target, Flame } from 'lucide-react'
import type { Badge } from '../services/badgeService'

const iconMap: Record<string, React.ElementType> = {
  Award,
  Star,
  Trophy,
  Zap,
  Target,
  Flame,
}

interface BadgeDisplayProps {
  badge: Badge
  size?: 'sm' | 'md' | 'lg'
}

export const BadgeDisplay = ({ badge, size = 'md' }: BadgeDisplayProps) => {
  const Icon = iconMap[badge.icon] || Award
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      // eslint-disable-next-line security/detect-object-injection
      className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center ${
        badge.isEarned
          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg'
          : 'bg-gray-200 dark:bg-gray-700'
      }`}
      title={badge.description}
    >
      {/* eslint-disable-next-line security/detect-object-injection */}
      <Icon className={`${iconSizes[size]} ${badge.isEarned ? 'text-white' : 'text-gray-400'}`} />
      {badge.isEarned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
        />
      )}
    </motion.div>
  )
}

interface BadgeProgressProps {
  badge: Badge
}

export const BadgeProgress = ({ badge }: BadgeProgressProps) => {
  const progress = Math.min((badge.currentProgress / badge.requirement) * 100, 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <BadgeDisplay badge={badge} size="sm" />
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{badge.name}</h4>
          <p className="text-xs text-gray-500">{badge.description}</p>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {badge.currentProgress} / {badge.requirement}
      </p>
    </div>
  )
}
