import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <nav
      className={cn('flex items-center gap-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {pages.map((page, index) => {
        if (page === '...') {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <span key={`ellipsis-${index}`} className="px-2">
              ...
            </span>
          )
        }

        const pageNum = page as number
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={cn(
              'min-w-[40px] h-10 rounded-lg font-medium transition-colors',
              pageNum === currentPage
                ? 'bg-primary-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            aria-label={`Page ${pageNum}`}
            aria-current={pageNum === currentPage ? 'page' : undefined}
          >
            {pageNum}
          </button>
        )
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  )
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  const delta = 2
  const range: (number | string)[] = []

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i)
    } else if (range[range.length - 1] !== '...') {
      range.push('...')
    }
  }

  return range
}
