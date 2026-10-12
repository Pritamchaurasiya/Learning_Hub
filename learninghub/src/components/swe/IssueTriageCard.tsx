import React, { useState } from 'react'
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { SweBenchmarkIssue, SweIssueSeverity } from '../../types/sweStudio'

interface IssueTriageCardProps {
  issue: SweBenchmarkIssue
}

export const IssueTriageCard: React.FC<IssueTriageCardProps> = ({ issue }) => {
  const [showStackTrace, setShowStackTrace] = useState(false)

  const getSeverityBadge = (sev: SweIssueSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Critical Severity
          </span>
        )
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> High Severity
          </span>
        )
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Medium Severity
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
            Low Severity
          </span>
        )
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-mono text-xs rounded border border-indigo-500/30 font-bold">
            {issue.id}
          </span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {issue.category.replace('_', ' ')}
          </span>
        </div>
        <div>{getSeverityBadge(issue.severity)}</div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Bug className="w-5 h-5 text-rose-400 flex-shrink-0" />
          {issue.title}
        </h3>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{issue.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Expected Behavior
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{issue.expectedBehavior}</p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="text-xs font-semibold text-rose-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Actual Behavior
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{issue.actualBehavior}</p>
        </div>
      </div>

      {issue.affectedFiles && issue.affectedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" /> Affected Repos:
          </span>
          {issue.affectedFiles.map(file => (
            <span
              key={file}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700/60"
            >
              {file}
            </span>
          ))}
        </div>
      )}

      {issue.stackTrace && (
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowStackTrace(!showStackTrace)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showStackTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showStackTrace ? 'Hide Diagnostics Stack Trace' : 'Show Diagnostics Stack Trace'}
          </button>
          {showStackTrace && (
            <pre className="mt-2 p-3 bg-slate-950 border border-rose-900/30 rounded-lg text-rose-300/90 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-tight">
              {issue.stackTrace}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
