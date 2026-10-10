import React from 'react'
import { Code, Terminal, Clock, Trash2 } from 'lucide-react'
import { CrdtCodeSnippet } from '../../types/crdtCollab'

interface P2PCollaborativeCodeBlockProps {
  snippet: CrdtCodeSnippet
  currentPeerId: string
  onUpdateCode: (snippetId: string, newCode: string) => void
  onDeleteSnippet: (snippetId: string) => void
}

export const P2PCollaborativeCodeBlock: React.FC<P2PCollaborativeCodeBlockProps> = ({
  snippet,
  currentPeerId,
  onUpdateCode,
  onDeleteSnippet,
}) => {
  const isMine = snippet.peerId === currentPeerId

  return (
    <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      {/* Code Snippet Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-wide">{snippet.title}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 uppercase">
            {snippet.language}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] font-mono text-purple-400">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>L:{snippet.lamportClock}</span>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            author: {snippet.peerId.slice(-4)} {isMine && '(You)'}
          </span>

          <button
            onClick={() => onDeleteSnippet(snippet.id)}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete Code Block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Textarea */}
      <div className="relative p-3 bg-slate-950">
        <textarea
          value={snippet.code}
          onChange={(e) => onUpdateCode(snippet.id, e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full bg-transparent font-mono text-xs text-slate-200 outline-none resize-y selection:bg-indigo-500/30 leading-relaxed"
          placeholder="// Type collaborative code snippet here..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/50 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <Code className="w-3 h-3 text-indigo-400" /> CRDT LWW Register
        </span>
        <span>Last updated: {new Date(snippet.updatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
