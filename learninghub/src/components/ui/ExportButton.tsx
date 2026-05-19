import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, X, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { useExport } from '../../hooks/useExport'

interface ExportButtonProps {
  data?: Record<string, unknown>[]
  elementId?: string
  filename?: string
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const ExportButton = memo(function ExportButton({
  data,
  elementId,
  filename = 'export',
  label = 'Export',
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isExporting, progress, error, exportToCSV, exportToPDF } = useExport()

  const handleCSVExport = () => {
    if (!data) return
    exportToCSV(data, { filename: `${filename}.csv` })
    setIsOpen(false)
  }

  const handlePDFExport = () => {
    if (!elementId) return
    void exportToPDF(elementId, { filename: `${filename}.pdf` })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        isLoading={isExporting}
      >
        <Download className="w-4 h-4 mr-2" />
        {label}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="font-semibold text-sm">Export as</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Options */}
            <div className="p-2 space-y-1">
              {data && (
                <button
                  onClick={handleCSVExport}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">CSV Spreadsheet</p>
                    <p className="text-xs text-gray-500">Best for data analysis</p>
                  </div>
                </button>
              )}

              {elementId && (
                <button
                  onClick={handlePDFExport}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">PDF Document</p>
                    <p className="text-xs text-gray-500">Best for sharing/printing</p>
                  </div>
                </button>
              )}

              {!data && !elementId && (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No export options available
                </div>
              )}
            </div>

            {/* Progress */}
            {isExporting && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting... {progress}%</span>
                </div>
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30">
                <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default ExportButton
