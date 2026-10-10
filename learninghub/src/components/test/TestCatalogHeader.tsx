import { memo } from 'react'
import { Sparkles, Plus, UploadCloud } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestCatalogHeaderProps {
  onOpenImportModal: () => void
  onOpenManualModal: () => void
  onOpenAIModal: () => void
}

export const TestCatalogHeader = memo(function TestCatalogHeader({
  onOpenImportModal,
  onOpenManualModal,
  onOpenAIModal,
}: TestCatalogHeaderProps) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tests A+</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Practice with our comprehensive test collection and track your progress
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onOpenImportModal}
          variant="outline"
          className="flex items-center gap-2 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm"
        >
          <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Import Questions (CSV/JSON)
        </Button>
        <Button
          onClick={onOpenManualModal}
          variant="outline"
          className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          Create Custom Test
        </Button>
        <Button
          onClick={onOpenAIModal}
          variant="primary"
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25"
        >
          <Sparkles className="w-5 h-5" />
          AI Custom Mock
        </Button>
      </div>
    </div>
  )
})
