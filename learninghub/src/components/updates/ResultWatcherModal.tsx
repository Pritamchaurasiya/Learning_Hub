import React, { useState } from 'react';
import { X, GraduationCap, BellRing, Sparkles, CheckCircle2 } from 'lucide-react';
import { updatesService } from '../../services/updatesService';
import type { ResultWatcher } from '../../types/updates';

export interface ResultWatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (watcher: ResultWatcher) => void;
  defaultInstitution?: string;
  defaultCourse?: string;
}

const POPULAR_INSTITUTIONS = [
  'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
  'Dr. APJ Abdul Kalam Technical University (AKTU)',
  'University of Lucknow',
  'Banaras Hindu University (BHU)',
  'University of Allahabad',
  'Deen Dayal Upadhyaya Gorakhpur University (DDU)',
  'Chhatrapati Shahu Ji Maharaj University (CSJMU)',
];

export const ResultWatcherModal: React.FC<ResultWatcherModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultInstitution = '',
  defaultCourse = '',
}) => {
  const [institution, setInstitution] = useState(defaultInstitution || POPULAR_INSTITUTIONS[0]);
  const [course, setCourse] = useState(defaultCourse || '');
  const [semester, setSemester] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !course.trim()) {
      setErrorMsg('Please specify both university/institution and course name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const watcher = await updatesService.createResultWatcher({
        institution: institution.trim(),
        course: course.trim(),
        semester: semester.trim(),
        roll_number: rollNumber.trim(),
      });

      if (watcher) {
        setSuccessMsg(`Tracking active! We will alert you immediately when ${course} results are declared.`);
        onCreated?.(watcher);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to activate result watcher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-watcher-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="result-watcher-title" className="text-lg font-bold text-foreground flex items-center gap-2">
                Automated Result Watcher
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                  Live Radar
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get an instant notification with official scorecard links when results drop.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="watcher-institution" className="block text-xs font-semibold text-foreground mb-1">
              Select University / Exam Body
            </label>
            <div className="relative">
              <select
                id="watcher-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {POPULAR_INSTITUTIONS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="watcher-course" className="block text-xs font-semibold text-foreground mb-1">
                Course / Program <span className="text-rose-500">*</span>
              </label>
              <input
                id="watcher-course"
                type="text"
                required
                placeholder="e.g. BCA, B.Tech, MCA"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label htmlFor="watcher-semester" className="block text-xs font-semibold text-foreground mb-1">
                Semester / Year (Optional)
              </label>
              <input
                id="watcher-semester"
                type="text"
                placeholder="e.g. 4th Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="watcher-roll" className="block text-xs font-semibold text-foreground">
                Roll Number / Enrollment No (Optional)
              </label>
              <span className="text-[11px] text-muted-foreground">Stored securely for direct score match</span>
            </div>
            <input
              id="watcher-roll"
              type="text"
              placeholder="e.g. 2300582910"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>

          <div className="pt-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Zero-Noise Background Polling
              </p>
              <p>
                Our official university crawler checks result gazettes every 15 minutes. The moment the verified PDF or web list is published, an emergency WebSocket push notification will appear on your screen.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Activating...' : 'Activate Result Watcher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
