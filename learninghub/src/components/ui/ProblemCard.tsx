import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, CheckCircle, Flame, Trophy, Zap } from 'lucide-react';
import { Card } from './Card';
import type { Problem } from '../../types/dsa';
import { cn } from '../../utils/cn';

const DIFFICULTY_COLORS = {
  EASY: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  MEDIUM: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  HARD: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
};

const DIFFICULTY_LABELS = {
  EASY: 'Beginner',
  MEDIUM: 'Intermediate',
  HARD: 'Expert',
};

interface ProblemCardProps {
  problem: Problem;
  index: number;
}

export const ProblemCard = React.memo(({ problem, index }: ProblemCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white dark:bg-gray-900/50"
        onClick={() => navigate(`/problem/${problem.slug}`)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                problem.user_status === 'SOLVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              )}>
                {problem.user_status === 'SOLVED' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : problem.user_status === 'ATTEMPTED' ? (
                  <Flame className="w-5 h-5 text-amber-500" />
                ) : (
                  <Code2 className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 tracking-tight group-hover:text-primary-600 transition-colors">
                  {problem.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                   <span className={cn(
                     "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                     DIFFICULTY_COLORS[problem.difficulty]
                   )}>
                      {DIFFICULTY_LABELS[problem.difficulty]}
                   </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed">
            {problem.description}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800/50">
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-tighter rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {problem.points}
              </span>
              {problem.acceptance_rate && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-primary-500" />
                  {Math.round(problem.acceptance_rate)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

ProblemCard.displayName = 'ProblemCard';
