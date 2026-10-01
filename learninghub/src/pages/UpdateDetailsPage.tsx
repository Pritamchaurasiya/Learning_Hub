import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Bell,
  FileText,
  Download,
  Sparkles,
  History,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { updatesService } from '../services/updatesService';
import { UpdateCrossFeaturesWidget } from '../components/updates/UpdateCrossFeaturesWidget';
import { UpdateReminderModal } from '../components/updates/UpdateReminderModal';
import type { StudentUpdate } from '../types/updates';

export const UpdateDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [update, setUpdate] = useState<StudentUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await updatesService.getUpdateById(id);
        if (data) {
          setUpdate(data);
          setIsBookmarked(!!data.is_bookmarked);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleBookmarkToggle = async () => {
    if (!update) return;
    if (isBookmarked) {
      await updatesService.removeBookmark(update.id);
      setIsBookmarked(false);
    } else {
      await updatesService.saveBookmark(update.id);
      setIsBookmarked(true);
    }
  };

  const handleScheduleReminder = async (updateId: string, reminderType: string) => {
    await updatesService.createReminder(updateId, reminderType);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-10 w-3/4 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!update) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Notice Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested notice may have been archived or removed from official records.
        </p>
        <button
          type="button"
          onClick={() => navigate('/updates')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
        >
          Return to Updates Hub
        </button>
      </div>
    );
  }

  const daysLeft = update.deadline
    ? Math.ceil((new Date(update.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Header Navigation */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/updates')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Updates</span>
          </button>

          <div className="flex items-center gap-2">
            {update.deadline && (
              <button
                type="button"
                onClick={() => setReminderModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-accent text-foreground transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notify Me</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                isBookmarked
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Source Attribution Card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Official Verified Source
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  Level {update.authority_level || 1}
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground mt-0.5">
                {update.source_name || update.institution}
              </h4>
              <p className="text-xs font-mono text-muted-foreground">{update.source_domain}</p>
            </div>
          </div>

          <a
            href={update.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
          >
            <span>Open Original Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Notice Main Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {update.sub_category || update.category}
            </span>

            {update.importance === 'URGENT' && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                URGENT CIRCULAR
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground leading-snug">
            {update.title}
          </h1>

          {/* Academic Details Meta */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{update.institution}</span>
            </div>
            {update.course && (
              <span className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                Course: {update.course} {update.semester || ''}
              </span>
            )}
            {update.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Published:{' '}
                  {new Date(update.published_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Deadline Highlight Box */}
        {update.deadline && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-4 ${
              daysLeft !== null && daysLeft <= 2
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-background/50">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Submission Deadline
                </span>
                <span className="text-base sm:text-lg font-bold">
                  {new Date(update.deadline).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {daysLeft !== null && (
              <span className="text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-xl bg-background/60">
                {daysLeft < 0 ? 'Closed' : daysLeft === 0 ? 'Due Today' : `${daysLeft} days remaining`}
              </span>
            )}
          </div>
        )}

        {/* AI Key Insights Summary Box */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">AI Executive Digest</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Always verify against original circular
            </span>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed">
            {update.ai_summary || update.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground border-t border-primary/10">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Verified against official college circulars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Direct exam form & result portal linked</span>
            </div>
          </div>
        </div>

        {/* Full Notice Content */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Extracted Circular Details</span>
          </h3>

          <div className="text-sm text-muted-foreground leading-relaxed space-y-3 whitespace-pre-line">
            {update.summary}
          </div>
        </div>

        {/* Attachments Section */}
        {update.attachments && update.attachments.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span>Official Circular Attachments ({update.attachments.length})</span>
            </h3>

            <div className="space-y-2">
              {update.attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {att.title}
                    </span>
                  </div>

                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <span>Download PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version History Drawer */}
        {update.versions && update.versions.length > 1 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Revision History</h3>
            </div>

            <div className="space-y-2 text-xs">
              {update.versions.map(ver => (
                <div
                  key={ver.id}
                  className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Revision #{ver.version_number}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(ver.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{ver.diff_summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LearningHub Cross-Feature Widget */}
        <UpdateCrossFeaturesWidget crossLinks={update.cross_links} update={update} />
      </div>

      {/* Reminder Modal */}
      <UpdateReminderModal
        isOpen={reminderModalOpen}
        update={update}
        onClose={() => setReminderModalOpen(false)}
        onConfirm={handleScheduleReminder}
      />
    </div>
  );
};
