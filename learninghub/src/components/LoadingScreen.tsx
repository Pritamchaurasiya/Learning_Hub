import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * LoadingScreen - Full-page loading component with smooth animation
 * Used as Suspense fallback for lazy-loaded routes
 */
export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950"
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );
}

export default LoadingScreen;
