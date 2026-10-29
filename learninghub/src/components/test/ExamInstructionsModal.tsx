import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle, Clock, Languages } from 'lucide-react'

export interface ExamInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
  examTitle?: string
  examName?: string
  examLanguage?: 'en' | 'hi'
}

export const ExamInstructionsModal = memo(function ExamInstructionsModal({
  isOpen,
  onClose,
  examTitle = 'Competitive Examination',
  examName,
  examLanguage = 'en',
}: ExamInstructionsModalProps) {
  const displayTitle = examName || examTitle
  const [lang, setLang] = useState<'en' | 'hi'>(examLanguage || 'en')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-3xl h-[85vh] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-900 dark:text-slate-100"
          role="dialog"
          aria-labelledby="instructions-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-slate-950/90 border-b border-gray-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600/10 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="instructions-modal-title" className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Official CBT Instructions & Guidelines
                </h3>
                <span className="text-xs text-gray-500 dark:text-slate-400 block">
                  {displayTitle} • Standard Computer Based Test Protocol
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                type="button"
                onClick={() => setLang(prev => (prev === 'en' ? 'hi' : 'en'))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-700 transition"
              >
                <Languages className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'en' ? 'हिन्दी में पढ़ें' : 'Read in English'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-800 transition"
                aria-label="Close instructions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            {lang === 'en' ? (
              <>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> General Instructions:
                  </h4>
                  <p>1. The countdown timer at the top of the screen displays the remaining test time.</p>
                  <p>2. When the timer reaches zero, the examination will automatically submit your recorded answers.</p>
                  <p>3. Your answers are automatically buffered locally on every click (Offline-resilient).</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    Question Palette Symbol Legend (NTA Standard 5-States):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60">
                      <span className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <span className="font-bold block text-gray-800 dark:text-white text-xs">Not Visited</span>
                        <span className="text-[11px] text-gray-500">You have not visited this question yet.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                      <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <span className="font-bold block text-rose-800 dark:text-rose-300 text-xs">Not Answered</span>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400">You visited but skipped answering.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                      <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div>
                        <span className="font-bold block text-emerald-800 dark:text-emerald-300 text-xs">Answered</span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">You have answered this question.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                      <span className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                        4
                      </span>
                      <div>
                        <span className="font-bold block text-purple-800 dark:text-purple-300 text-xs">Marked for Review</span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400">Flagged for review without answer.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 sm:col-span-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 relative">
                        5
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white dark:border-slate-900" />
                      </div>
                      <div>
                        <span className="font-bold block text-purple-800 dark:text-purple-300 text-xs">Answered & Marked for Review</span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400">
                          The question has been answered and marked for review. <strong>It will be evaluated for scoring in NTA / JEE rules.</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">Navigation & Keyboard Shortcuts:</h4>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">1</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">2</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">3</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">4</kbd>: Select Options A, B, C, D</li>
                    <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">→</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">J</kbd>: Next Question / Save & Next</li>
                    <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">←</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">K</kbd>: Previous Question</li>
                    <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">F</kbd>: Toggle Flag / Mark for Review</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> सामान्य निर्देश:
                  </h4>
                  <p>1. स्क्रीन के शीर्ष पर उल्टी गिनती घड़ी शेष परीक्षा समय प्रदर्शित करती है।</p>
                  <p>2. समय समाप्त होने पर आपकी परीक्षा स्वतः सबमिट हो जाएगी।</p>
                  <p>3. आपके सभी उत्तर स्थानीय रूप से सुरक्षित रूप से स्वतः सहेजे जाते हैं।</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    प्रश्न पैलेट प्रतीक चिन्ह (NTA मानक 5 अवस्थाएँ):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60">
                      <span className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold flex items-center justify-center shrink-0">1</span>
                      <div>
                        <span className="font-bold block text-gray-800 dark:text-white text-xs">देखा नहीं (Not Visited)</span>
                        <span className="text-[11px] text-gray-500">आप अभी तक इस प्रश्न पर नहीं गए हैं।</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                      <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
                      <div>
                        <span className="font-bold block text-rose-800 dark:text-rose-300 text-xs">उत्तर नहीं दिया (Not Answered)</span>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400">आपने प्रश्न देखा किंतु उत्तर नहीं दिया।</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                      <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
                      <div>
                        <span className="font-bold block text-emerald-800 dark:text-emerald-300 text-xs">उत्तर दिया (Answered)</span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">आप इस प्रश्न का उत्तर दे चुके हैं।</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                      <span className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">4</span>
                      <div>
                        <span className="font-bold block text-purple-800 dark:text-purple-300 text-xs">समीक्षा के लिए चिह्नित (Review)</span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400">पुनः विचार हेतु बिना उत्तर चिह्नित किया गया।</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 sm:col-span-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 relative">
                        5
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white dark:border-slate-900" />
                      </div>
                      <div>
                        <span className="font-bold block text-purple-800 dark:text-purple-300 text-xs">उत्तर दिया और समीक्षा के लिए चिह्नित</span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400">
                          प्रश्न का उत्तर दिया गया है और समीक्षा हेतु चिह्नित किया गया है। <strong>NTA/JEE नियमों के तहत इसका मूल्यांकन किया जाएगा।</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-slate-950/90 border-t border-gray-200 dark:border-slate-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
            >
              I Understand / समझ गया
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})
