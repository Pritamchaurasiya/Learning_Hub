import React, { useState } from 'react';
import { X, Building2, ShieldCheck, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { updatesService } from '../../services/updatesService';
import type { CollegeCircularPayload, StudentUpdate } from '../../types/updates';

export interface CollegeCircularModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCircularPublished?: (circular: StudentUpdate) => void;
}

export const CollegeCircularModal: React.FC<CollegeCircularModalProps> = ({
  isOpen,
  onClose,
  onCircularPublished,
}) => {
  const [formData, setFormData] = useState<CollegeCircularPayload>({
    title: '',
    summary: '',
    department: 'Computer Science & Engineering',
    institution: '',
    issuer_name: '',
    issuer_role: 'HEAD_OF_DEPARTMENT',
    circular_number: '',
    category: 'ACADEMIC',
    sub_category: 'DEPARTMENTAL_CIRCULAR',
    importance: 'NORMAL',
    course: '',
    semester: '',
    deadline: '',
    source_url: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.summary.trim()) {
      setErrorMessage('Notice title and summary are mandatory.');
      return;
    }
    if (!formData.institution.trim() || !formData.department.trim()) {
      setErrorMessage('Institution and department must be specified.');
      return;
    }
    if (!formData.issuer_name.trim()) {
      setErrorMessage('Official authority name is required for verification audit.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updatesService.publishCollegeCircular(formData);
      if (res) {
        setSuccessMessage('Authenticated departmental circular published successfully!');
        setTimeout(() => {
          setSuccessMessage(null);
          onCircularPublished?.(res);
          onClose();
        }, 1200);
      } else {
        setErrorMessage('Failed to publish circular. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during publishing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  College Notice Desk
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Post authenticated departmental circulars, lab notifications, and schedules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Notice / Circular Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Computer Science Practical Lab Examination Schedule & Viva Dates"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Institution & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                College / Institution *
              </label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="e.g., Kashi Institute of Technology"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Academic Department *
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Department of Computer Science & Engineering"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Issuer details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Authorized Issuer *
              </label>
              <input
                type="text"
                name="issuer_name"
                value={formData.issuer_name}
                onChange={handleChange}
                placeholder="e.g., Prof. Rajesh Sharma"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Designation / Role
              </label>
              <select
                name="issuer_role"
                value={formData.issuer_role}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="HEAD_OF_DEPARTMENT">Head of Department (HOD)</option>
                <option value="PRINCIPAL">College Principal / Director</option>
                <option value="DEAN">Dean Academic Affairs</option>
                <option value="EXAMINATION_INCHARGE">Examination Superintendent</option>
                <option value="FACULTY_COORDINATOR">Faculty Coordinator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Ref / Circular No.
              </label>
              <input
                type="text"
                name="circular_number"
                value={formData.circular_number}
                onChange={handleChange}
                placeholder="e.g., KIT/CSE/2026/089"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Course, Semester, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Course Target
              </label>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g., BCA / B.Tech CSE"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Semester / Year
              </label>
              <input
                type="text"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                placeholder="e.g., 5th Semester"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Notice Importance
              </label>
              <select
                name="importance"
                value={formData.importance}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="NORMAL">Standard Circular</option>
                <option value="IMPORTANT">High Priority (Pinned)</option>
                <option value="URGENT">Urgent (Real-time Broadcast)</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Submission / Reporting Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Summary / Body */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Full Circular Text / Summary *
            </label>
            <textarea
              name="summary"
              rows={4}
              value={formData.summary}
              onChange={handleChange}
              placeholder="Paste official notification text, lab schedule dates, project submission guidelines, or room allocations..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : 'Publish Official Circular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
