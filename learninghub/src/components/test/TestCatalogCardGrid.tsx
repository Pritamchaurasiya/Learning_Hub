import { memo } from 'react'
import { Filter } from 'lucide-react'
import { Card } from '../ui/Card'
import { TestCard } from './TestCard'
import { TestA } from '../../services/testsAService'
import { CachedOfflineBundle } from '../../services/offline/OfflineAssessmentManager'

export interface TestCatalogCardGridProps {
  tests: TestA[]
  offlineBundles: CachedOfflineBundle[]
  downloadingTestIds: Set<string>
  onStartTest: (test: TestA) => void
  onDownloadOffline: (test: TestA) => void
}

export const TestCatalogCardGrid = memo(function TestCatalogCardGrid({
  tests,
  offlineBundles,
  downloadingTestIds,
  onStartTest,
  onDownloadOffline,
}: TestCatalogCardGridProps) {
  if (tests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tests found</h3>
        <p className="text-gray-500">Try adjusting your filters or search query</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tests.map(test => (
        <TestCard
          key={test.id}
          test={test}
          onStart={() => onStartTest(test)}
          isOfflineBundle={offlineBundles.some(b => b.testId === test.id)}
          isDownloadingOffline={downloadingTestIds.has(test.id)}
          onDownloadOffline={() => onDownloadOffline(test)}
        />
      ))}
    </div>
  )
})
