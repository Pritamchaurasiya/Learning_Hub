import React from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  Zap,
  Clock,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import type { ExamReadinessBreakdown } from '../../types/bkt'
import { Card } from '../ui/Card'

interface ExamReadinessGaugeProps {
  readiness: ExamReadinessBreakdown
  className?: string
}

export const ExamReadinessGauge: React.FC<ExamReadinessGaugeProps> = ({
  readiness,
  className = '',
}) => {
  const {
    compositeScore,
    readinessLevel,
    syllabusMastery,
    mockScore,
    speedAccuracy,
    retentionRate,
    strengths,
    weaknesses,
    recommendation,
  } = readiness

  const getLevelBadge = () => {
    switch (readinessLevel) {
      case 'ELITE':
        return {
          label: 'Elite Exam Ready',
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
          gradient: 'from-emerald-500 to-teal-500',
        }
      case 'COMPETITIVE':
        return {
          label: 'Competitive Ready',
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          gradient: 'from-blue-500 to-indigo-500',
        }
      case 'DEVELOPING':
        return {
          label: 'Developing Foundation',
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
          gradient: 'from-amber-500 to-orange-500',
        }
      default:
        return {
          label: 'Needs Reinforcement',
          color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
          gradient: 'from-rose-500 to-red-500',
        }
    }
  }

  const levelInfo = getLevelBadge()

  // Semicircle gauge calculation
  // Radius = 80, Circumference = Math.PI * 80 ~= 251.3
  const arcLength = 251.3
  const strokeDashoffset = arcLength - (arcLength * compositeScore) / 100

  return (
    <Card
      className={`p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl overflow-hidden ${className}`}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Gauge Arc and Overall Score */}
        <div className="flex flex-col items-center text-center shrink-0 w-full sm:w-auto">
          <div className="relative w-56 h-36 flex items-end justify-center">
            <svg className="w-56 h-36 overflow-visible" viewBox="0 0 200 110">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="text-gray-100 dark:text-gray-800"
              />
              {/* Value Arc */}
              <motion.path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#readiness-gradient)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                initial={{ strokeDashoffset: arcLength }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="readiness-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score Label inside Arc */}
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                {compositeScore}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Exam Readiness
              </span>
            </div>
          </div>

          <div
            className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${levelInfo.color}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{levelInfo.label}</span>
          </div>
        </div>

        {/* Middle: 4 Psychometric Sub-Metrics */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
              BKT 4-Factor Composite Breakdown
            </h4>
            <span className="text-[10px] font-bold text-gray-400">
              Calibrated via Bayesian Mastery
            </span>
          </div>

          <div className="space-y-3">
            {/* 1. Syllabus Mastery (35%) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Syllabus Knowledge (35%)
                </span>
                <span className="font-black text-gray-900 dark:text-white">
                  {syllabusMastery}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${syllabusMastery}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>

            {/* 2. Mock Test Performance (30%) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-500" />
                  Full Mock Stamina (30%)
                </span>
                <span className="font-black text-gray-900 dark:text-white">{mockScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mockScore}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                />
              </div>
            </div>

            {/* 3. Speed & Pacing Accuracy (20%) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-500" />
                  Pacing & Speed (20%)
                </span>
                <span className="font-black text-gray-900 dark:text-white">
                  {speedAccuracy}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full bg-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${speedAccuracy}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>

            {/* 4. Memory Retention Rate (15%) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Forgetting Curve Resistance (15%)
                </span>
                <span className="font-black text-gray-900 dark:text-white">
                  {retentionRate}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${retentionRate}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Recommendation & Insights Pill */}
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-2">
          <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Key Strengths:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strengths.length > 0 ? (
              strengths.map((str, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
                >
                  {str}
                </span>
              ))
            ) : (
              <span className="text-gray-400">Complete more assessments to reveal strengths.</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Target Weaknesses:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weaknesses && weaknesses.length > 0 ? (
              weaknesses.map((w, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium"
                >
                  {w}
                </span>
              ))
            ) : (
              <span className="text-gray-400">No major weaknesses identified.</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>AI Strategic Guidance:</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
            {recommendation}
          </p>
        </div>
      </div>
    </Card>
  )
}
