import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  ExternalLink,
  Bookmark,
  Bell,
  CheckCircle2,
  FileText,
  AlertCircle,
  Share2,
  Building2,
  GraduationCap,
} from 'lucide-react'
import { StudentUpdate } from '../../types/updates'
import { updatesService } from '../../services/updatesService'

export interface UpdateCardProps {
  update: StudentUpdate
  onOpenReminder?: (update: StudentUpdate) => void
  onSetReminder?: (update: StudentUpdate) => void
  onBookmarkToggled?: (id: string, isBookmarked: boolean) => void
  onBookmarkToggle?: (updateId: string, willBookmark: boolean) => Promise<void> | void
  onViewDetails?: (update: StudentUpdate) => void
  onFollowUniversity?: (institution: string) => void
  onOpenResultWatcher?: (institution: string, course?: string) => void
  isFollowingUniversity?: boolean
}

export const UpdateCard: React.FC<UpdateCardProps> = ({
  update,
  onOpenReminder,
  onSetReminder,
  onBookmarkToggled,
  onBookmarkToggle,
  onViewDetails,
  onFollowUniversity,
  onOpenResultWatcher,
  isFollowingUniversity = false,
}) => {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(Boolean(update.is_bookmarked))
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    const nextState = !isBookmarked
    setIsBookmarked(nextState)

    try {
      if (nextState) {
        await updatesService.saveBookmark(update.id)
      } else {
        await updatesService.removeBookmark(update.id)
      }
      onBookmarkToggled?.(update.id, nextState)
      await onBookmarkToggle?.(update.id, nextState)
    } catch {
      // Revert state on failure
      setIsBookmarked(!nextState)
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const shareUrl = `${window.location.origin}/updates/${update.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: update.title,
          text: update.summary,
          url: shareUrl,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Format dates
  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return null
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  const publishedDate = formatDate(update.published_at)
  const deadlineDate = formatDate(update.deadline)

  // Urgency styling
  const importanceStyles = {
    URGENT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    IMPORTANT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    NORMAL: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }

  const categoryStyles: Record<string, string> = {
    EXAMINATION: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    ACADEMIC: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    ADMISSION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    SCHOLARSHIP: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    CAREER: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    COMPETITIVE_EXAMS: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    GENERAL: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  }

  return (
    <div
      onClick={() => onViewDetails?.(update)}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700"
    >
      <div>
        {/* Top Badges Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md border px-2 py-0.5 font-medium ${
                categoryStyles[update.category] || categoryStyles.GENERAL
              }`}
            >
              {update.sub_category ? update.sub_category.replace(/_/g, ' ') : update.category}
            </span>

            {update.importance === 'URGENT' && (
              <span
                className={`flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${importanceStyles.URGENT}`}
              >
                <AlertCircle className="h-3 w-3" />
                Urgent
              </span>
            )}

            {update.importance === 'IMPORTANT' && (
              <span
                className={`rounded-md border px-2 py-0.5 font-medium ${importanceStyles.IMPORTANT}`}
              >
                Important
              </span>
            )}
          </div>

          {/* Verification Badge */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Official Level {update.authority_level || 1}</span>
          </div>
        </div>

        {/* Title */}
        <Link
          to={`/updates/${update.id}`}
          onClick={e => {
            if (onViewDetails) {
              e.preventDefault()
              onViewDetails(update)
            }
          }}
          className="mb-2 block text-base font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400"
        >
          {update.title}
        </Link>

        {/* Institution & Course Context */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate max-w-[220px]">{update.institution}</span>
          </span>

          {update.course && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {update.course} {update.semester ? `(${update.semester})` : ''}
            </span>
          )}

          {onFollowUniversity && update.institution && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFollowUniversity(update.institution);
              }}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                isFollowingUniversity
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
              title={isFollowingUniversity ? `Following ${update.institution}` : `Follow ${update.institution}`}
            >
              {isFollowingUniversity ? '✓ Following' : '+ Follow'}
            </button>
          )}
        </div>

        {/* Short Summary */}
        <p className="mb-4 text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300">
          {update.summary}
        </p>
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            {publishedDate && (
              <span className="flex items-center gap-1" title="Published Date">
                <Calendar className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
            )}

            {Boolean((update.attachments && update.attachments.length > 0) || (update.attachments_count && update.attachments_count > 0)) && (
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300" title="PDF Attachment Available">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                PDF Notice
              </span>
            )}
          </div>

          {deadlineDate && (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Deadline: {deadlineDate}
            </span>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={update.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Open Official University Source"
            >
              <span>Official Notice</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            {onOpenResultWatcher && (
              <button
                type="button"
                onClick={() => onOpenResultWatcher(update.institution, update.course)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-emerald-400"
                title="Track Official Results"
              >
                <GraduationCap className="h-3 w-3 text-emerald-500" />
                <span>Result Watch</span>
              </button>
            )}

            {update.deadline && (onOpenReminder || onSetReminder) && (
              <button
                type="button"
                onClick={() => (onOpenReminder ? onOpenReminder(update) : onSetReminder?.(update))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-400"
                title="Set Deadline Reminder"
              >
                <Bell className="h-3 w-3" />
                <span>Remind</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={copied ? "Link Copied!" : "Share Notice"}
              aria-label="Share Notice"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={isSaving}
              className={`rounded-lg p-1.5 transition ${
                isBookmarked
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              title={isBookmarked ? 'Saved in Bookmarks' : 'Bookmark Update'}
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateCard
