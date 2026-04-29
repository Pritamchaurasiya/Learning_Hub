import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
  animated?: boolean;
}

// Counter animation hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

export const StatCard = React.memo(({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
  animated = false
}: StatCardProps) => {
  const numericValue = typeof value === 'number' ? value : parseInt(value as string) || 0;
  const animatedCount = useCountUp(animated ? numericValue : 0, 1500);
  const displayValue = animated ? animatedCount : value;
  
  return (
    <motion.div
      className="card-static p-4 sm:p-5 flex items-center gap-3 sm:gap-4 group hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, borderColor: `${color}40` }}
    >
      <motion.div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
        style={{ backgroundColor: `${color}10` }}
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <Icon className="w-5 h-5 sm:w-6 h-6" style={{ color }} />
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          <motion.p 
            className="text-xl sm:text-2xl font-bold truncate tabular-nums tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay / 1000 + 0.2 }}
          >
            {displayValue}
          </motion.p>
        </div>
        <p className="text-[11px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';
