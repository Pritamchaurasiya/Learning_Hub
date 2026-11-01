import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X, HelpCircle } from 'lucide-react'
import { Button } from '../ui/Button'

export interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  category: 'Options' | 'Navigation' | 'Actions'
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['1', '2', '3', '4'], description: 'Select option A, B, C, or D', category: 'Options' },
  {
    keys: ['A', 'B', 'C', 'D'],
    description: 'Direct alphabetical option selection',
    category: 'Options',
  },
  { keys: ['→', 'N'], description: 'Save & Next question', category: 'Navigation' },
  { keys: ['←', 'P'], description: 'Navigate to previous question', category: 'Navigation' },
  { keys: ['M', 'F'], description: 'Mark question for review and proceed', category: 'Actions' },
  {
    keys: ['Alt', 'C'],
    description: 'Clear selected response (avoid negative marking)',
    category: 'Actions',
  },
  { keys: ['?'], description: 'Toggle this keyboard shortcuts dialog', category: 'Actions' },
  { keys: ['Esc'], description: 'Close any active modal dialog', category: 'Actions' },
]

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = memo(
  ({ isOpen, onClose }) => {
    return (
      <AnimatePresence>
        {isOpen && (
          <div
            data-testid="keyboard-shortcuts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      id="shortcuts-modal-title"
                      className="text-base font-bold text-gray-900 dark:text-white"
                    >
                      Examination Keyboard Shortcuts
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Fast zero-mouse navigation for national CBT testing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close shortcuts dialog"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 gap-2.5">
                  {SHORTCUTS.map(item => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/80 hover:border-gray-200 dark:hover:border-gray-600 transition"
                    >
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {item.keys.map(k => (
                          <kbd
                            key={`${item.description}-${k}`}
                            className="px-2 py-1 text-xs font-mono font-semibold rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Shortcuts are active whenever you are viewing the test station and not typing in
                    a text or code editor.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end bg-gray-50/50 dark:bg-gray-800/50">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onClose}
                  className="font-semibold text-xs"
                >
                  Got It, Resume Test
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    )
  }
)

KeyboardShortcutsModal.displayName = 'KeyboardShortcutsModal'
