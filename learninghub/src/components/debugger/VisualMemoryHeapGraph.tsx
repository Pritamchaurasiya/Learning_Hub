import React from 'react'
import { Layers, Database, ArrowRight } from 'lucide-react'
import { HeapObjectSnapshot } from '../../types/debugger'

interface VisualMemoryHeapGraphProps {
  heapObjects: Record<string, HeapObjectSnapshot>
  activeVariables: Record<string, any>
}

export const VisualMemoryHeapGraph: React.FC<VisualMemoryHeapGraphProps> = ({
  heapObjects,
  activeVariables,
}) => {
  const heapKeys = Object.keys(heapObjects)

  if (heapKeys.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
        <Database className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Memory Heap & Pointers
        </h4>
        <p className="text-xs text-slate-500">
          No dynamic heap objects allocated in this execution frame. Primitives reside in stack memory.
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Visual Memory Heap & Active Pointers
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(activeVariables || {}).length > 0 && (
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-800/50">
              {Object.keys(activeVariables).length} Stack Var{Object.keys(activeVariables).length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
            {heapKeys.length} Dynamic Object{heapKeys.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {heapKeys.map(key => {
          const obj = heapObjects[key]

          if (obj.type === 'array' && Array.isArray(obj.value)) {
            const arr = obj.value
            const pointers = obj.pointers || {}

            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Array Object:</span>
                    <span className="text-emerald-400">{key}</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Length: {arr.length}</span>
                </div>

                {/* Array Grid with Indices & Values */}
                <div className="overflow-x-auto pb-2">
                  <div className="flex items-center gap-2 min-w-max">
                    {arr.map((val, idx) => {
                      // Check which pointers point to this index
                      const pointingLabels = Object.entries(pointers)
                        .filter(([, pIdx]) => Number(pIdx) === idx)
                        .map(([label]) => label)

                      const isHighlighted = pointingLabels.length > 0

                      return (
                        <div key={idx} className="flex flex-col items-center">
                          {/* Pointer Badges Above */}
                          <div className="h-5 flex items-center gap-1 mb-1">
                            {pointingLabels.map(label => (
                              <span
                                key={label}
                                className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950 shadow-xs animate-pulse"
                              >
                                {label}
                              </span>
                            ))}
                          </div>

                          {/* Array Cell */}
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono text-sm font-bold border transition-all ${
                              isHighlighted
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                                : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}
                          >
                            {String(val)}
                          </div>

                          {/* Index Label Below */}
                          <span className="text-[10px] font-mono text-slate-500 mt-1">
                            [{idx}]
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          if (obj.type === 'linked_list_node') {
            return (
              <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                  Node [{obj.id}]
                </div>
                <div className="text-xs text-slate-300">
                  Value: <span className="font-bold text-white">{JSON.stringify(obj.value)}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <div className="text-xs text-slate-400">
                  Next: <span className="font-mono text-amber-400">{obj.pointers?.next || 'null'}</span>
                </div>
              </div>
            )
          }

          return (
            <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 font-bold">{key}:</span> {JSON.stringify(obj.value)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
