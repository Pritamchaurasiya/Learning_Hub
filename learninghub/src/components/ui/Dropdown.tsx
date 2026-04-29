import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

interface DropdownOption {
  value: string
  label: string
  icon?: ReactNode
  onClick?: () => void
}

interface DropdownProps {
  options: DropdownOption[]
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}

export function Dropdown({ options, children, className, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {children}
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 min-w-[160px] py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                option.onClick?.()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
              role="menuitem"
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}