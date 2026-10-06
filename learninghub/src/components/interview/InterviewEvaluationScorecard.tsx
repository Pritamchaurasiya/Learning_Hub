import { Award, CheckCircle, ArrowRight, BrainCircuit, Sparkles, BookOpen, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InterviewEvaluationReport } from '../../types/interview'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface InterviewEvaluationScorecardProps {
  evaluation: InterviewEvaluationReport
  onClose?: () => void
  onRetake?: () => void
}

export function InterviewEvaluationScorecard({
  evaluation,
  onClose,
  onRetake,
}: InterviewEvaluationScorecardProps) {
  const getRecommendationBadge = (rec: InterviewEvaluationReport['hiringRecommendation']) => {
    switch (rec) {
      case 'STRONG_HIRE':
        return { text: 'Strong Hire', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
      case 'HIRE':
        return { text: 'Hire', bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30' }
      case 'LEANING_HIRE':
        return { text: 'Leaning Hire', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
      case 'LEANING_NO_HIRE':
        return { text: 'Leaning No Hire', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
      case 'NO_HIRE':
      default:
        return { text: 'No Hire', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
    }
  }

  const recBadge = getRecommendationBadge(evaluation.hiringRecommendation)

  return (
    <div className="space-y-6 text-slate-100 max-h-[85vh] overflow-y-auto pr-1">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 p-6 border border-indigo-500/30 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Post-Interview Evaluation Matrix
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${recBadge.bg}`}>
                {recBadge.text}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Technical Interview Performance Report
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {evaluation.executiveSummary}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-3xl font-black text-indigo-400">
                {evaluation.overallScore}
                <span className="text-sm text-slate-500 font-normal">/100</span>
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Composite Score
              </div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                Top {100 - evaluation.percentileRanking}%
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Peer Percentile
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Factor Rubric Breakdown */}
      <div>
        <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" />
          5-Dimensional Evaluation Rubric
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluation.factorScores.map(factor => (
            <Card key={factor.factor} className="p-4 bg-slate-900/60 border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{factor.name}</h4>
                  <span className="text-[11px] text-slate-400">
                    Weight: {Math.round(factor.weight * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-lg font-bold ${
                      factor.score >= 80
                        ? 'text-emerald-400'
                        : factor.score >= 65
                        ? 'text-indigo-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {factor.score}
                  </span>
                  <span className="text-xs text-slate-500">/100</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    factor.score >= 80
                      ? 'bg-emerald-500'
                      : factor.score >= 65
                      ? 'bg-indigo-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{factor.feedback}</p>

              {factor.positiveSignals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {factor.positiveSignals.map((signal, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      <CheckCircle className="w-2.5 h-2.5" /> {signal}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* STAR Framework Analysis */}
      {evaluation.starAnalysis && (
        <Card className="p-4 bg-slate-900/60 border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            STAR Behavioral & Technical Synthesis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Situation
              </span>
              <p className="text-slate-300">{evaluation.starAnalysis.situation}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Task
              </span>
              <p className="text-slate-300">{evaluation.starAnalysis.task}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Action
              </span>
              <p className="text-slate-300">{evaluation.starAnalysis.action}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Result
              </span>
              <p className="text-slate-300">{evaluation.starAnalysis.result}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Targeted Remediation & Next Steps */}
      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Targeted Skill Reinforcement
          </h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {evaluation.recommendedRevisionTopics.map((topic, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/revision">
            <Button variant="outline" size="sm" className="border-indigo-500/40 text-indigo-300 gap-1.5">
              <Layers className="w-4 h-4" /> Spaced Flashcards
            </Button>
          </Link>
          <Link to="/planner">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
              Study Planner <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex justify-end gap-3 pt-2">
        {onRetake && (
          <Button variant="outline" onClick={onRetake} className="border-slate-700 text-slate-300">
            Retake Interview
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            Done & Return to Workspace
          </Button>
        )}
      </div>
    </div>
  )
}
