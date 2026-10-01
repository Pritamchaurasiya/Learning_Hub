import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  CheckSquare,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Video,
} from 'lucide-react';
import type { UpdateCrossLink, StudentUpdate } from '../../types/updates';
import { updatesService } from '../../services/updatesService';
import { downloadICSFile, generateGoogleCalendarUrl } from '../../utils/calendarExport';

export interface UpdateCrossFeaturesWidgetProps {
  crossLinks?: UpdateCrossLink[];
  update?: StudentUpdate;
}

export const UpdateCrossFeaturesWidget: React.FC<UpdateCrossFeaturesWidgetProps> = ({
  crossLinks,
  update,
}) => {
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerSynced, setPlannerSynced] = useState(false);

  // If crossLinks not explicitly provided, dynamically synthesize links from update
  const rawLinks =
    crossLinks && crossLinks.length > 0
      ? crossLinks
      : update && typeof updatesService?.generateSynergyCrossLinks === 'function'
      ? updatesService.generateSynergyCrossLinks(update)
      : [];
  const resolvedLinks: UpdateCrossLink[] = Array.isArray(rawLinks) ? rawLinks : [];

  if (resolvedLinks.length === 0 && !update?.deadline) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TEST':
        return <CheckSquare className="w-4 h-4 text-purple-500" />;
      case 'EBOOK':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'COURSE':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'STUDY_PLAN':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const handleSyncPlanner = async () => {
    if (!update || plannerLoading || plannerSynced) return;
    try {
      setPlannerLoading(true);
      await updatesService.syncToStudyPlanner(update);
      setPlannerSynced(true);
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleDownloadICS = () => {
    if (!update || !update.deadline) return;
    downloadICSFile(
      `${(update.course || update.institution || 'notice').toLowerCase().replace(/\s+/g, '-')}-deadline.ics`,
      {
        title: `[Deadline] ${update.title}`,
        description: `${update.summary}\n\nOfficial Source: ${update.source_url}`,
        startDate: update.deadline,
        url: update.source_url,
        location: update.institution,
      }
    );
  };

  const googleCalUrl = update?.deadline
    ? generateGoogleCalendarUrl({
        title: `[Deadline] ${update.title}`,
        description: `${update.summary}\n\nOfficial Source: ${update.source_url}`,
        startDate: update.deadline,
        url: update.source_url,
        location: update.institution,
      })
    : '';

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-foreground">Prepare for this Notice</h4>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Ecosystem
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Exam Preparation & Calendar Synergy
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Jump directly from tracking deadlines into active exam preparation. Practice verified MCQs, review high-yield flashcards, or sync key dates into your study schedule.
      </p>

      {/* Cross-Link Cards */}
      {resolvedLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {resolvedLinks.map(link => {
            const isInternal = link.action_url.startsWith('/');
            const content = (
              <>
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-lg bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                    {getIcon(link.content_type)}
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {link.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {link.content_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                  <span className="inline">{link.action_cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </>
            );

            return isInternal ? (
              <Link
                key={link.id}
                to={link.action_url}
                className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-accent/40 transition-all group"
              >
                {content}
              </Link>
            ) : (
              <a
                key={link.id}
                href={link.action_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-accent/40 transition-all group"
              >
                {content}
              </a>
            );
          })}
        </div>
      )}

      {/* Calendar Synchronization Bar */}
      {update?.deadline && (
        <div className="pt-3 border-t border-primary/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Deadline Date: <strong className="text-foreground">{new Date(update.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSyncPlanner}
              disabled={plannerLoading || plannerSynced}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                plannerSynced
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-background hover:bg-accent text-foreground border-border'
              }`}
            >
              {plannerLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : plannerSynced ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-primary" />
              )}
              <span>{plannerSynced ? 'Synced to Planner' : 'Add to Study Planner'}</span>
            </button>

            {googleCalUrl && (
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-background hover:bg-accent text-foreground border border-border transition-colors"
                title="Add to Google Calendar"
              >
                <span>Google Cal</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            )}

            <button
              type="button"
              onClick={handleDownloadICS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-background hover:bg-accent text-foreground border border-border transition-colors"
              title="Download iCal (.ics) for Apple/Outlook/Desktop"
            >
              <Download className="w-3 h-3 text-muted-foreground" />
              <span>Export .ics</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
