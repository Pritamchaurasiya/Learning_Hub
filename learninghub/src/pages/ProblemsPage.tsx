import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import { SEO } from '../components/SEO';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  Search,
  Code2,
  Trophy,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Flame,
  LayoutDashboard,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { Problem, DSAStats } from '../types/dsa';
import { fetchApi } from '../utils/api';
import { ProblemCard } from '../components/ui/ProblemCard';

function PracticeStatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  delay = 0
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className="p-5 border-none shadow-sm bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${color}10` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums tracking-tighter">{value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            {subtext && <p className="text-[10px] text-gray-500 font-medium mt-0.5">{subtext}</p>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ProblemsPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<DSAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED'>('ALL');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [problemsRes, statsRes] = await Promise.all([
        fetchApi('/dsa/problems/'),
        fetchApi('/dsa/stats/')
      ]);
      setProblems(problemsRes.data?.results || []);
      setStats(statsRes.data);
    } catch (err) {
      setError('Neural connection failed. Could not retrieve problem set.');
      console.error('Error loading problems:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          problem.title.toLowerCase().includes(query) ||
          problem.tags.some((tag) => tag.name.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedDifficulty !== 'ALL' && problem.difficulty !== selectedDifficulty) return false;
      if (selectedStatus !== 'ALL') {
        const status = problem.user_status || 'UNATTEMPTED';
        if (status !== selectedStatus) return false;
      }
      return true;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedStatus]);

  const progress = useMemo(() => {
    if (!stats) return null;
    return {
      easy: stats.total_easy > 0 ? (stats.easy_solved / stats.total_easy) * 100 : 0,
      medium: stats.total_medium > 0 ? (stats.medium_solved / stats.total_medium) * 100 : 0,
      hard: stats.total_hard > 0 ? (stats.hard_solved / stats.total_hard) * 100 : 0,
    };
  }, [stats]);

  return (
    <AnimatedPage className="space-y-8 pb-12">
      <SEO title="DSA Practice - Engineering Mastery" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-[1.5rem] bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
              <Code2 className="w-7 h-7 text-white" />
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">DSA Practice</h1>
              <p className="text-gray-500 font-medium mt-2">Scale your algorithmic thinking with hands-on challenges</p>
           </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/analytics')} leftIcon={<LayoutDashboard className="w-4 h-4" />}>
            Analytics
          </Button>
          <Button onClick={() => navigate('/contest')} className="shadow-lg shadow-primary-500/20" leftIcon={<Trophy className="w-4 h-4" />}>
            Compete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PracticeStatCard
            icon={CheckCircle}
            label="Problems Solved"
            value={stats.solved_problems}
            subtext={`${stats.total_problems} Total Challenges`}
            color="#10b981"
            delay={0.1}
          />
          <PracticeStatCard
            icon={TrendingUp}
            label="Accuracy Rate"
            value={`${Math.round(stats.acceptance_rate)}%`}
            color="#3b82f6"
            delay={0.2}
          />
          <PracticeStatCard
            icon={Flame}
            label="Logic Streak"
            value={`${stats.current_streak} Days`}
            subtext={`Record: ${stats.longest_streak}`}
            color="#f59e0b"
            delay={0.3}
          />
          <PracticeStatCard
            icon={Trophy}
            label="Global Rank"
            value={`#${stats.rank}`}
            color="#8b5cf6"
            delay={0.4}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-6">
           {/* Filters */}
           <Card className="p-4 border-none shadow-sm bg-white dark:bg-gray-900/50 backdrop-blur-md">
             <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input
                     type="text"
                     placeholder="Filter by title or tags..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/50"
                   />
                 </div>
               </div>
               <div className="flex gap-2">
                  <select 
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="ALL">Difficulty</option>
                    <option value="EASY">Beginner</option>
                    <option value="MEDIUM">Intermediate</option>
                    <option value="HARD">Expert</option>
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="ALL">Status</option>
                    <option value="SOLVED">Solved</option>
                    <option value="ATTEMPTED">Attempted</option>
                  </select>
               </div>
             </div>
           </Card>

           {/* Results Grid */}
           {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <Card key={i} className="p-6 h-40 animate-pulse bg-gray-50 dark:bg-gray-900/50 border-none" />
                ))}
             </div>
           ) : error ? (
             <Card className="p-12 text-center border-none shadow-sm">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Sync Error</h3>
                <p className="text-gray-500 text-sm mb-6">{error}</p>
                <Button onClick={loadData} variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>Reconnect</Button>
             </Card>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredProblems.map((p, idx) => <ProblemCard key={p.id} problem={p} index={idx} />)}
             </div>
           )}
        </div>

        {/* Right Column: Mastery & Goals */}
        <div className="space-y-6">
           {progress && (
             <Card className="p-6 space-y-6 border-none shadow-xl bg-white dark:bg-gray-900">
               <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Mastery Distribution</h3>
               <div className="space-y-6">
                 {[
                   { label: 'Beginner', val: progress.easy, color: 'bg-emerald-500', solved: stats?.easy_solved, total: stats?.total_easy },
                   { label: 'Intermediate', val: progress.medium, color: 'bg-amber-500', solved: stats?.medium_solved, total: stats?.total_medium },
                   { label: 'Expert', val: progress.hard, color: 'bg-rose-500', solved: stats?.hard_solved, total: stats?.total_hard },
                 ].map(s => (
                   <div key={s.label} className="space-y-2">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-xs font-black uppercase tracking-tight">{s.label}</p>
                            <p className="text-[10px] font-bold text-gray-400">{s.solved} of {s.total} Solved</p>
                         </div>
                         <span className="text-xs font-black tabular-nums text-primary-500">{Math.round(s.val)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${s.val}%` }}
                           className={`h-full ${s.color}`}
                         />
                      </div>
                   </div>
                 ))}
               </div>
             </Card>
           )}

           <Card className="p-6 bg-gradient-to-br from-gray-900 to-black text-white border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                 <Trophy className="w-24 h-24" />
              </div>
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pro Challenge</span>
                 </div>
                 <h3 className="font-black text-xl leading-tight">Weekly System Design Arena</h3>
                 <p className="text-sm text-gray-400 leading-relaxed font-medium">
                   Compete with top engineers in a real-time system design simulation. Starts in 14 hours.
                 </p>
                 <Button className="w-full bg-white text-gray-900 border-none font-black">
                   Register Event
                 </Button>
              </div>
           </Card>
        </div>
      </div>
    </AnimatedPage>
  );
}
