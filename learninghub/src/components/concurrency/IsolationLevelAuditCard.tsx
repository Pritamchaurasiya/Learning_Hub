import type { FC } from 'react'
import {
  ShieldCheck,
  Scale,
  Check,
  X,
  Copy,
} from 'lucide-react'
import type { IsolationComparisonResponse } from '../../types/mvccDeadlock'

interface IsolationLevelAuditCardProps {
  comparison: IsolationComparisonResponse | null
  currentProof?: string
}

export const IsolationLevelAuditCard: FC<IsolationLevelAuditCardProps> = ({
  comparison,
  currentProof,
}) => {
  const copyProof = () => {
    if (currentProof && navigator.clipboard) {
      navigator.clipboard.writeText(currentProof)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cryptographic Proof Seal */}
      {currentProof && (
        <div className="p-4 bg-slate-900/90 border border-indigo-900/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-mono font-semibold text-slate-300">
                Cryptographic Concurrency Verification Seal:
              </span>
              <div className="text-[11px] font-mono text-slate-400 break-all select-all">
                {currentProof}
              </div>
            </div>
          </div>
          <button
            onClick={copyProof}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 shrink-0"
          >
            <Copy className="w-3 h-3" /> Copy Seal
          </button>
        </div>
      )}

      {/* Isolation Comparison Table */}
      {comparison && (
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Isolation Level &amp; Concurrency Anomaly Matrix (ANSI SQL vs Modern MVCC)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Formal ANSI / Berenson Framework</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="p-3">Isolation Level</th>
                  <th className="p-3 text-center">Dirty Read</th>
                  <th className="p-3 text-center">Fuzzy Read</th>
                  <th className="p-3 text-center">Phantom</th>
                  <th className="p-3 text-center">Write Skew</th>
                  <th className="p-3">Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {comparison.levels.map((lvl) => {
                  const isSSI = lvl.name.includes('Serializable')
                  const isSI = lvl.name.includes('Snapshot Isolation')

                  return (
                    <tr
                      key={lvl.name}
                      className={
                        isSSI
                          ? 'bg-emerald-950/20'
                          : isSI
                          ? 'bg-amber-950/20'
                          : 'hover:bg-slate-900/40'
                      }
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{lvl.name}</div>
                        <div className="text-[10px] text-slate-500">{lvl.standardName}</div>
                      </td>

                      {/* Dirty Read */}
                      <td className="p-3 text-center">
                        {lvl.dirtyRead ? (
                          <span className="inline-flex items-center text-rose-400 gap-0.5">
                            <X className="w-3.5 h-3.5" /> Possible
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-400 gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Safe
                          </span>
                        )}
                      </td>

                      {/* Fuzzy / Non-Repeatable Read */}
                      <td className="p-3 text-center">
                        {lvl.nonRepeatableRead ? (
                          <span className="inline-flex items-center text-rose-400 gap-0.5">
                            <X className="w-3.5 h-3.5" /> Possible
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-400 gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Safe
                          </span>
                        )}
                      </td>

                      {/* Phantom Read */}
                      <td className="p-3 text-center">
                        {lvl.phantomRead ? (
                          <span className="inline-flex items-center text-rose-400 gap-0.5">
                            <X className="w-3.5 h-3.5" /> Possible
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-400 gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Safe
                          </span>
                        )}
                      </td>

                      {/* Write Skew */}
                      <td className="p-3 text-center">
                        {lvl.writeSkew ? (
                          <span className="inline-flex items-center text-rose-400 font-bold gap-0.5">
                            <X className="w-3.5 h-3.5" /> Vulnerable
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-400 font-bold gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Eliminated
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-[11px] text-slate-400">
                        {lvl.primaryMechanism}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Banner */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
            <span className="font-bold text-cyan-400">Architectural Key Takeaway: </span>
            {comparison.summary}
          </div>
        </div>
      )}
    </div>
  )
}
