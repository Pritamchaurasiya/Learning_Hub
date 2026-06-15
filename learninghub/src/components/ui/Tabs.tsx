import { createContext, useContext, useState, useId, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  defaultTab: string
  children: ReactNode
  className?: string
  onChange?: (tab: string) => void
}

export function Tabs({ defaultTab, children, className, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const baseId = useId()

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab)
    onChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab, baseId }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={cn('flex gap-1 border-b border-gray-200 dark:border-gray-700', className)}
      role="tablist"
    >
      {children}
    </div>
  )
}

interface TabProps {
  value: string
  children: ReactNode
  className?: string
}

export function Tab({ value, children, className }: TabProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')

  const { activeTab, setActiveTab, baseId } = context
  const isActive = activeTab === value
  const tabId = `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel-${value}`

  return (
    <button
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setActiveTab(value)
        }
      }}
      className={cn(
        'px-4 py-2 font-medium transition-colors relative',
        isActive
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
        className
      )}
    >
      {children}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  )
}

interface TabPanelProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabPanel must be used within Tabs')

  const { activeTab, baseId } = context

  if (activeTab !== value) return null

  const panelId = `${baseId}-panel-${value}`
  const tabId = `${baseId}-tab-${value}`

  return (
    <div role="tabpanel" id={panelId} aria-labelledby={tabId} className={className}>
      {children}
    </div>
  )
}
