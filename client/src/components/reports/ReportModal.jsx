import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { submitReport } from '../../services/reportService';

const REPORT_CATEGORIES = [
  { value: 'MISLEADING_SKILL_CLAIMS', label: 'Misleading Skill or Credential Claims' },
  { value: 'INAPPROPRIATE_BEHAVIOR', label: 'Inappropriate or Unprofessional Behavior' },
  { value: 'HARASSMENT', label: 'Harassment or Threatening Conduct' },
  { value: 'SPAM', label: 'Spam, Solicitation, or Commercial Ads' },
  { value: 'SUSPICIOUS_EVIDENCE', label: 'Suspicious, Fake, or Broken Evidence URLs' },
  { value: 'OTHER', label: 'Other Safety or Community Concern' },
];

export const ReportModal = ({ isOpen, onClose, targetType = 'USER', targetId, reportedUserId, targetTitle }) => {
  const [category, setCategory] = useState(REPORT_CATEGORIES[0].value);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide at least 5 characters explaining your concern.');
      return;
    }
    if (reason.trim().length > 1000) {
      setError('Explanation cannot exceed 1000 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReport({
        targetType,
        targetId: (targetId || '').toString(),
        reportedUserId: (reportedUserId || targetId || '').toString(),
        category,
        reason: reason.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
      }, 1600);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || 'Failed to submit report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content or Profile"
      description={`Submitting an issue regarding: ${targetTitle || 'platform content'}`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Safety & Policy Notice */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            Reports are confidential and reviewed exclusively by authorized platform administrators. Submitting false reports is a violation of community guidelines.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-slate-800 dark:text-slate-200">
            Report Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Explanation & Specific Details
            </label>
            <span className="text-[10px] text-slate-400">{reason.length}/1000</span>
          </div>
          <textarea
            rows={4}
            maxLength={1000}
            required
            placeholder="Please describe why you are reporting this content with as much context as possible..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Thank you. Your report has been submitted for administrative review.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportModal;
