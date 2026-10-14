import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcutGroups = [
  {
    title: 'Navigation Shortcuts',
    items: [
      { keys: ['G', 'D'], description: 'Jump to Dashboard' },
      { keys: ['G', 'P'], description: 'Browse DSA Problems' },
      { keys: ['G', 'L'], description: 'Open Course & Ebook Library' },
      { keys: ['G', 'T'], description: 'Take Adaptive Test (Tests A+)' },
      { keys: ['G', 'A'], description: 'Enter 1v1 Arena Coding Duel' },
      { keys: ['G', 'V'], description: 'Open Algorithm Visualizer' },
    ],
  },
  {
    title: 'Study & Execution',
    items: [
      { keys: ['⌘', 'K'], description: 'Quick Command Palette' },
      { keys: ['⌘', '↵'], description: 'Run Code in AST Sandbox' },
      { keys: ['J'], description: 'Next Question in Session' },
      { keys: ['K'], description: 'Previous Question in Session' },
      { keys: ['B'], description: 'Bookmark Current Question' },
      { keys: ['?'], description: 'Toggle this Shortcuts Guide' },
      { keys: ['Esc'], description: 'Close Dialogs & Modals' },
    ],
  },
]

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      if (e.key === '?' && !isOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl z-10 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
                <p className="text-xs text-slate-400">Power-user keybindings for zero-mouse study</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close shortcuts"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {shortcutGroups.map(group => (
              <div key={group.title}>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                  {group.title}
                </h4>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <span className="text-slate-300">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map(k => (
                          <kbd
                            key={k}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-amber-400 shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-400">Esc</kbd> to dismiss</span>
            <span>LearningHub Studio Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default KeyboardShortcutsModal
