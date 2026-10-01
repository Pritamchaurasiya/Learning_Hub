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
  Share2,
  BarChart2,
} from 'lucide-react';
import { updatesService } from '../services/updatesService';
import { UpdateCrossFeaturesWidget } from '../components/updates/UpdateCrossFeaturesWidget';
import { UpdateReminderModal } from '../components/updates/UpdateReminderModal';
import type { StudentUpdate, UpdateAnalyticsData } from '../types/updates';

export const UpdateDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [update, setUpdate] = useState<StudentUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [analytics, setAnalytics] = useState<UpdateAnalyticsData | null>(null);

  // Dynamic real-time timer for live countdown updating
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        if (typeof updatesService?.logEngagement === 'function') {
          updatesService.logEngagement(id, 'CLICK_DETAIL').catch(() => {});
        }
        const data = await updatesService.getUpdateById(id);
        if (data) {
          setUpdate(data);
          setIsBookmarked(!!data.is_bookmarked);
        }
        if (typeof updatesService?.getUpdateAnalytics === 'function') {
          try {
            const analyticsData = await updatesService.getUpdateAnalytics(id);
            if (analyticsData) {
              setAnalytics(analyticsData);
            }
          } catch {
            // Analytics optional
          }
        }
      } catch {
        // Handled by service fallbacks
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

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: update?.title || 'Student Update',
          text: update?.summary || '',
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScheduleReminder = async (updateId: string, reminderType: string) => {
    await updatesService.createReminder(updateId, reminderType);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-10 w-3/4 bg-muted rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted/60 rounded-2xl" />
          <div className="h-96 bg-muted/40 rounded-2xl" />
        </div>
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
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Return to Updates Hub
        </button>
      </div>
    );
  }

  // Dynamic real-time deadline calculation
  const deadlineTime = update.deadline ? new Date(update.deadline).getTime() : null;
  const diffMs = deadlineTime !== null ? deadlineTime - now : null;
  const daysLeft = diffMs !== null ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;
  const hoursLeft = diffMs !== null ? Math.floor(diffMs / (1000 * 60 * 60)) : null;
  const minutesRemainder = diffMs !== null ? Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)) : null;

  let countdownBadge = '';
  if (diffMs !== null) {
    if (diffMs <= 0) {
      countdownBadge = 'Closed';
    } else if (daysLeft === 0) {
      countdownBadge = `Due Today: ${hoursLeft}h ${minutesRemainder}m left`;
    } else if (daysLeft === 1) {
      countdownBadge = `1 day ${hoursLeft !== null ? hoursLeft % 24 : 0}h left`;
    } else {
      countdownBadge = `${daysLeft} days remaining`;
    }
  }

  // Verification and direct link flags
  const isOfficiallyVerified = update.verification_status === 'VERIFIED';
  const hasDirectPortalLink = Boolean(
    update.source_url &&
    (update.sub_category === 'EXAM_FORM' ||
      update.sub_category === 'RESULTS' ||
      (update.related_links && update.related_links.length > 0))
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Header Navigation */}
      <div className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
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
                <Bell className="w-3.5 h-3.5 text-amber-500" />
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

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={copied ? 'Link Copied!' : 'Share Notice'}
              aria-label="Share Notice"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Notice Column (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notice Title & Metadata Header */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 space-y-4">
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

                <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                  Version #{update.version || 1}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground leading-snug">
                {update.title}
              </h1>

              {/* Academic Details Meta */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{update.institution}</span>
                </div>
                {update.department && (
                  <span className="bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded font-medium text-xs text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300">
                    Dept: {update.department}
                  </span>
                )}
                {update.circular_number && (
                  <span className="bg-muted px-2 py-0.5 rounded font-mono text-xs text-foreground">
                    Ref: {update.circular_number}
                  </span>
                )}
                {update.course && (
                  <span className="bg-muted px-2 py-0.5 rounded font-mono text-xs text-foreground">
                    Course: {update.course} {update.semester || ''}
                  </span>
                )}
                {update.issuer_name && (
                  <span className="text-muted-foreground text-xs">
                    Issued by: <strong className="text-foreground">{update.issuer_name}</strong> {update.issuer_role ? `(${update.issuer_role.replace(/_/g, ' ')})` : ''}
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

            {/* Notice Engagement Telemetry Bar */}
            {analytics && (
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notice Engagement & Read Telemetry</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Views</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">{analytics.impressions}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Full Reads</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">{analytics.detail_clicks}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Calendar Syncs</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">{analytics.calendar_exports}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Read CTR</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{analytics.click_through_rate}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Executive Digest / Notice Summary */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {update.is_ai_summarized ? 'AI Executive Digest' : 'Official Notice Summary'}
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {update.is_ai_summarized
                    ? 'AI Generated • Always verify against original circular'
                    : 'Official authority publication summary'}
                </span>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                {update.ai_summary || update.summary}
              </p>

              {/* Grounded Verification State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 text-xs text-muted-foreground border-t border-primary/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isOfficiallyVerified ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  />
                  <span>
                    {isOfficiallyVerified
                      ? 'Verified against official college circulars'
                      : update.verification_status === 'PENDING_REVIEW'
                      ? 'Verification in progress by academic desk'
                      : 'Unverified community report'}
                  </span>
                </div>

                {hasDirectPortalLink && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Direct exam form & result portal linked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Circular Text */}
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
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-foreground truncate">
                            {att.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {att.mime_type || 'PDF Document'}{' '}
                            {att.file_size_bytes
                              ? `• ${(att.file_size_bytes / 1024).toFixed(0)} KB`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version History */}
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
                      className="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          Revision #{ver.version_number}
                        </span>
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

            {/* LearningHub Cross-Feature Ecosystem Widget */}
            <UpdateCrossFeaturesWidget crossLinks={update.cross_links} update={update} />
          </div>

          {/* Sticky Sidebar: Source Attribution & Dynamic Deadline (Right 1 Column) */}
          <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-20">
            {/* Source Attribution Card */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Official Verified Source
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <span>Open Original Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Dynamic Deadline Box */}
            {update.deadline && (
              <div
                className={`rounded-2xl border p-5 space-y-3 ${
                  daysLeft !== null && daysLeft <= 2
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Submission Deadline
                    </span>
                  </div>
                  {countdownBadge && (
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-background/60">
                      {countdownBadge}
                    </span>
                  )}
                </div>

                <div className="text-base sm:text-lg font-bold text-foreground">
                  {new Date(update.deadline).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setReminderModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-current/20 bg-background/80 hover:bg-background text-xs font-bold transition-all"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Configure Push Reminder</span>
                </button>
              </div>
            )}

            {/* Official Gazette Reference Card (if ref/dept exists) */}
            {(update.circular_number || update.department || update.issuer_name) && (
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 text-xs">
                <span className="font-bold text-foreground uppercase tracking-wider block text-[11px] text-muted-foreground">
                  Official Gazette Reference
                </span>
                {update.circular_number && (
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Notice Ref No:</span>
                    <span className="font-mono font-bold text-foreground">
                      {update.circular_number}
                    </span>
                  </div>
                )}
                {update.department && (
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-semibold text-foreground">{update.department}</span>
                  </div>
                )}
                {update.issuer_name && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-muted-foreground">Issued by:</span>
                    <span className="text-foreground font-medium">
                      {update.issuer_name}{' '}
                      {update.issuer_role ? `(${update.issuer_role})` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
