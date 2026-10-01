import React, { useState } from 'react'
import { X, Bell, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { StudentUpdate } from '../../types/updates'
import { updatesService } from '../../services/updatesService'

export interface UpdateReminderModalProps {
  isOpen: boolean
  onClose: () => void
  update: StudentUpdate | null
  onReminderScheduled?: () => void
  onConfirm?: (updateId: string, reminderType: string) => Promise<void> | void
}

export const UpdateReminderModal: React.FC<UpdateReminderModalProps> = ({
  isOpen,
  onClose,
  update,
  onReminderScheduled,
  onConfirm,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    '3_DAYS_BEFORE',
    '1_DAY_BEFORE',
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !update) return null

  const handleToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTypes.length === 0) {
      setErrorMessage('Please select at least one reminder schedule.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      if (onConfirm) {
        await onConfirm(update.id, selectedTypes[0] || '1_DAY_BEFORE')
      } else {
        for (const t of selectedTypes) {
          await updatesService.createReminder(update.id, t)
        }
      }
      setSuccessMessage('Deadline reminders scheduled successfully!')
      setTimeout(() => {
        setSuccessMessage(null)
        onReminderScheduled?.()
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule reminder. Please login.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deadlineFormatted = update.deadline
    ? new Date(update.deadline).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not specified'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Set Deadline Reminder
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receive timely alerts before submissions close
            </p>
          </div>
        </div>

        {/* Notice Info Card */}
        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mb-2">
            {update.title}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Official Deadline: {deadlineFormatted}</span>
          </div>
        </div>

        {/* Reminder Options Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Notify me via in-app & push:
          </p>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
            <input
              type="checkbox"
              checked={selectedTypes.includes('3_DAYS_BEFORE')}
              onChange={() => handleToggle('3_DAYS_BEFORE')}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              3 days before deadline (Recommended)
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
            <input
              type="checkbox"
              checked={selectedTypes.includes('1_DAY_BEFORE')}
              onChange={() => handleToggle('1_DAY_BEFORE')}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              1 day before deadline (Urgent check)
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
            <input
              type="checkbox"
              checked={selectedTypes.includes('DAY_OF')}
              onChange={() => handleToggle('DAY_OF')}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              Morning of deadline day (08:00 AM)
            </span>
          </label>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UpdateReminderModal
