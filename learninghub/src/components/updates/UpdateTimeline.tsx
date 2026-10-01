import React from 'react';
import { Calendar, Clock, ArrowUpRight, Flame } from 'lucide-react';
import type { StudentUpdate } from '../../types/updates';

interface UpdateTimelineProps {
  updates: StudentUpdate[];
  onSelectUpdate: (update: StudentUpdate) => void;
}

export const UpdateTimeline: React.FC<UpdateTimelineProps> = ({ updates, onSelectUpdate }) => {
  // Filter only updates with deadlines and sort chronologically
  const sortedDeadlines = React.useMemo(() => {
    return updates
      .filter(u => !!u.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [updates]);

  if (sortedDeadlines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground bg-card/40">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
        <p className="font-medium text-sm">No upcoming deadlines detected.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Check back later as universities release new examination and form schedules.
        </p>
      </div>
    );
  }

  const formatDeadline = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getUrgencyBadge = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diffDays = Math.ceil((new Date(deadlineStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-500 border border-red-500/30">
          Due Today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
          <Flame className="w-3 h-3" />
          {diffDays}d left
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
          {diffDays} days left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
        {diffDays} days left
      </span>
    );
  };

  return (
    <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60 space-y-4">
      {sortedDeadlines.map(item => (
        <div
          key={item.id}
          onClick={() => onSelectUpdate(item)}
          className="group relative cursor-pointer rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
        >
          {/* Node Dot */}
          <div className="absolute -left-[27px] top-5 w-3 h-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20 group-hover:scale-125 transition-transform" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {formatDeadline(item.deadline)}
              </span>
              {getUrgencyBadge(item.deadline)}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {item.institution}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
            {item.title}
          </h4>

          <p className="text-xs text-muted-foreground line-clamp-1">
            {item.summary}
          </p>

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
              {item.sub_category || item.category}
            </span>
            <span className="flex items-center gap-0.5 text-primary font-medium group-hover:underline">
              View details <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
