import { cn } from './cn'
import { formatDate } from './date'

function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + suffix
}

function calculatePercentage(value: number, total: number, decimals = 0): number {
  if (total <= 0) return 0
  const percentage = (value / total) * 100
  const clamped = Math.min(Math.max(percentage, 0), 100)
  return Number(clamped.toFixed(decimals))
}

export { cn, formatDate, truncateText, calculatePercentage }
