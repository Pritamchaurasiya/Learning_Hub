import { ReactNode } from 'react'
import { motion, Variants, Transition } from 'framer-motion'
import { cn } from '../utils/cn'

interface AnimatedPageProps {
  children: ReactNode
  className?: string
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
}

const pageTransition: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.8,
}

export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={cn('w-full min-h-full', className)}
      style={{
        willChange: 'opacity, transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      role="main"
      aria-live="polite"
    >
      {children}
    </motion.div>
  )
}
