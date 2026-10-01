import React, { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { updatesService } from '../../services/updatesService';

export interface FollowButtonProps {
  targetType: 'INSTITUTION' | 'COURSE' | 'SEMESTER' | 'EXAM' | 'CATEGORY';
  targetValue: string;
  initialFollowed?: boolean;
  subscriptionId?: string;
  onToggle?: (isFollowed: boolean) => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetType,
  targetValue,
  initialFollowed = false,
  subscriptionId: initialSubId,
  onToggle,
  className = '',
}) => {
  const [isFollowed, setIsFollowed] = useState(initialFollowed);
  const [subId, setSubId] = useState<string | undefined>(initialSubId);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);
      if (isFollowed) {
        if (subId) {
          await updatesService.unsubscribeTarget(subId);
        }
        setIsFollowed(false);
        setSubId(undefined);
        onToggle?.(false);
      } else {
        const sub = await updatesService.subscribeTarget(targetType, targetValue);
        setIsFollowed(true);
        if (sub?.id) setSubId(sub.id);
        onToggle?.(true);
      }
    } catch {
      // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={isFollowed}
      aria-label={`${isFollowed ? 'Unfollow' : 'Follow'} ${targetValue}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 shadow-xs select-none disabled:opacity-50 ${
        isFollowed
          ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 dark:bg-primary/20 dark:border-primary/40'
          : 'bg-muted/80 text-muted-foreground border border-border/80 hover:bg-accent hover:text-foreground'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isFollowed ? (
        <Check className="w-3 h-3 text-primary stroke-[2.5]" />
      ) : (
        <Plus className="w-3 h-3 stroke-[2.5]" />
      )}
      <span>{isFollowed ? 'Following' : 'Follow'}</span>
    </button>
  );
};
