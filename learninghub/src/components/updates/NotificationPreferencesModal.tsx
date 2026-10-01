import React, { useState, useEffect } from 'react';
import { X, Moon, Bell, Shield, Sliders, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { updatesService } from '../../services/updatesService';
import type { UpdateNotificationPreference } from '../../types/updates';

export interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (preferences: UpdateNotificationPreference) => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Preference State
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [maxDailyPush, setMaxDailyPush] = useState(3);
  const [digestMode, setDigestMode] = useState(false);

  // Category Toggles
  const [allowResults, setAllowResults] = useState(true);
  const [allowExamForms, setAllowExamForms] = useState(true);
  const [allowTimetables, setAllowTimetables] = useState(true);
  const [allowAdmitCards, setAllowAdmitCards] = useState(true);
  const [allowScholarships, setAllowScholarships] = useState(true);
  const [allowAcademic, setAllowAcademic] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const prefs = await updatesService.getNotificationPreferences();
      if (prefs) {
        setQuietHoursEnabled(prefs.quiet_hours_enabled ?? true);
        setQuietHoursStart(prefs.quiet_hours_start ? prefs.quiet_hours_start.slice(0, 5) : '22:00');
        setQuietHoursEnd(prefs.quiet_hours_end ? prefs.quiet_hours_end.slice(0, 5) : '07:00');
        setMaxDailyPush(prefs.max_daily_push ?? 3);
        setDigestMode(prefs.digest_mode ?? false);
        setAllowResults(prefs.allow_results ?? true);
        setAllowExamForms(prefs.allow_exam_forms ?? true);
        setAllowTimetables(prefs.allow_timetables ?? true);
        setAllowAdmitCards(prefs.allow_admit_cards ?? true);
        setAllowScholarships(prefs.allow_scholarships ?? true);
        setAllowAcademic(prefs.allow_academic ?? true);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const payload: Partial<UpdateNotificationPreference> = {
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart.length === 5 ? `${quietHoursStart}:00` : quietHoursStart,
        quiet_hours_end: quietHoursEnd.length === 5 ? `${quietHoursEnd}:00` : quietHoursEnd,
        max_daily_push: maxDailyPush,
        digest_mode: digestMode,
        allow_results: allowResults,
        allow_exam_forms: allowExamForms,
        allow_timetables: allowTimetables,
        allow_admit_cards: allowAdmitCards,
        allow_scholarships: allowScholarships,
        allow_academic: allowAcademic,
      };

      const updated = await updatesService.updateNotificationPreferences(payload);
      if (updated) {
        setSuccessMsg('Notification preferences updated successfully!');
        onSaved?.(updated);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1000);
      }
    } catch {
      setErrorMsg('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-pref-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notification-pref-title" className="text-lg font-bold text-foreground flex items-center gap-2">
                Notification Delivery Settings
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary rounded-full">
                  Anti-Noise
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control quiet hours, daily push caps, and topic opt-ins.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences modal"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading delivery preferences...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 pt-5">
            {/* Section 1: Quiet Hours */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-foreground">Quiet Hours Mode</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quietHoursEnabled}
                    onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                    className="sr-only peer"
                    aria-label="Toggle quiet hours"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Non-urgent updates will be quietly queued overnight and delivered during your morning digest.
              </p>

              {quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      End Time (Morning Release)
                    </label>
                    <input
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Frequency Capping & Digest Mode */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Anti-Noise Frequency Capping</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-medium text-foreground">Max Daily Push Notifications</span>
                  <p className="text-[11px] text-muted-foreground">Caps non-urgent alerts per 24 hours.</p>
                </div>
                <select
                  value={maxDailyPush}
                  onChange={(e) => setMaxDailyPush(Number(e.target.value))}
                  aria-label="Max daily push notifications"
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground font-semibold"
                >
                  <option value={1}>1 notice / day</option>
                  <option value={2}>2 notices / day</option>
                  <option value={3}>3 notices / day (Recommended)</option>
                  <option value={5}>5 notices / day</option>
                  <option value={10}>10 notices / day</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <div>
                  <span className="text-xs font-medium text-foreground">Morning Digest Mode</span>
                  <p className="text-[11px] text-muted-foreground">Bundle non-critical alerts into a single 07:30 AM summary.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestMode}
                    onChange={(e) => setDigestMode(e.target.checked)}
                    className="sr-only peer"
                    aria-label="Toggle morning digest mode"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Section 3: Topic Subscriptions */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notice Topic Filters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { label: 'Results & Scorecards', checked: allowResults, set: setAllowResults },
                  { label: 'Examination Forms', checked: allowExamForms, set: setAllowExamForms },
                  { label: 'Timetables & Date Sheets', checked: allowTimetables, set: setAllowTimetables },
                  { label: 'Admit Cards & Hall Tickets', checked: allowAdmitCards, set: setAllowAdmitCards },
                  { label: 'Scholarships & Aid', checked: allowScholarships, set: setAllowScholarships },
                  { label: 'General Academic Circulars', checked: allowAcademic, set: setAllowAcademic },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/60 hover:bg-accent/40 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.set(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback Banners */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <Shield className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
