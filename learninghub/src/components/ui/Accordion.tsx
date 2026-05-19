import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  className?: string
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        if (!allowMultiple) newSet.clear()
        newSet.add(id)
      }
      return newSet
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map(item => (
        <AccordionItemComponent
          key={item.id}
          id={item.id}
          title={item.title}
          isOpen={openItems.has(item.id)}
          onToggle={() => toggle(item.id)}
        >
          {item.content}
        </AccordionItemComponent>
      ))}
    </div>
  )
}

interface AccordionItemComponentProps {
  id: string
  title: string
  children: ReactNode
  isOpen: boolean
  onToggle: () => void
}

function AccordionItemComponent({
  id,
  title,
  children,
  isOpen,
  onToggle,
}: AccordionItemComponentProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
      >
        <span className="font-medium">{title}</span>
        <ChevronDown className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <div
        id={`accordion-content-${id}`}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
        role="region"
        aria-label={title}
      >
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">{children}</div>
      </div>
    </div>
  )
}
