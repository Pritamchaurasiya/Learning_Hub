import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  ArrowRight,
  SkipForward,
  Sparkles,
  Zap,
  Layers,
  Code2
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from './ui/Button'

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  action?: () => void
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { progress, hasSeenOnboarding, setHasSeenOnboarding } = useStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!hasSeenOnboarding && progress.completedCourses.length === 0) {
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [hasSeenOnboarding, progress.completedCourses.length])

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Neural Core Initialized',
      subtitle: 'Welcome to the Future of Learning',
      description: 'Your personalized engineering path is ready. Master software mastery with 70+ enterprise-grade courses across 4 strategic phases.',
      icon: Sparkles,
      color: 'text-primary-500',
      bg: 'bg-primary-50 dark:bg-primary-900/20'
    },
    {
      id: 'courses',
      title: 'Curated Curriculum',
      subtitle: 'From Fundamentals to Singularity',
      description: 'Navigate through Beginner, Intermediate, and Advanced phases. Each lesson is optimized for maximum cognitive retention.',
      icon: Layers,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      action: () => navigate('/search')
    },
    {
      id: 'practice',
      title: 'DSA Intelligence',
      subtitle: 'Hands-on Algorithmic Thinking',
      description: 'Solve real-world challenges in our Practice Arena. Track your mastery distribution and climb the global engineering ranks.',
      icon: Code2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      action: () => navigate('/problems')
    },
    {
      id: 'track',
      title: 'Growth Analytics',
      subtitle: 'Data-Driven Progress Tracking',
      description: 'Monitor your logical streak, earn XP, and unlock neural achievements. Your growth is visualized with deep-dive analytics.',
      icon: Target,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20'
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setHasSeenOnboarding(true)
    setIsOpen(false)
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const Icon = step.icon

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Icon className="w-64 h-64" />
            </div>

            <div className="p-8 md:p-12 relative z-10">
              {/* Header Progress */}
              <div className="flex items-center justify-between mb-12">
                 <div className="flex gap-2">
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-primary-500' : i < currentStep ? 'w-2 bg-emerald-500' : 'w-2 bg-gray-200 dark:bg-gray-800'}`} 
                      />
                    ))}
                 </div>
                 <button 
                  onClick={handleComplete}
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-500 transition-colors flex items-center gap-1"
                 >
                   Skip Protocol <SkipForward className="w-3 h-3" />
                 </button>
              </div>

              {/* Content */}
              <div className="space-y-8">
                 <motion.div
                   key={`icon-${currentStep}`}
                   initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                   animate={{ scale: 1, rotate: 0, opacity: 1 }}
                   className={`w-20 h-20 rounded-[2rem] ${step.bg} flex items-center justify-center shadow-inner`}
                 >
                    <Icon className={`w-10 h-10 ${step.color}`} />
                 </motion.div>

                 <div className="space-y-4">
                    <motion.div
                      key={`title-${currentStep}`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                    >
                       <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${step.color}`}>{step.subtitle}</p>
                       <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white mt-2 leading-none">
                         {step.title}
                       </h2>
                    </motion.div>

                    <motion.p
                      key={`desc-${currentStep}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-gray-500 dark:text-gray-400 text-base leading-relaxed font-medium"
                    >
                       {step.description}
                    </motion.p>
                 </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-12 flex items-center justify-between gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                       <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lv. 0 Initialized</span>
                 </div>
                 
                 <Button
                   size="lg"
                   onClick={step.action ? () => { step.action!(); handleComplete(); } : handleNext}
                   className="px-10 py-7 rounded-[2rem] font-black shadow-xl shadow-primary-500/30 group"
                   rightIcon={<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
                 >
                   {currentStep === steps.length - 1 ? 'Enter Hub' : 'Advance'}
                 </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
