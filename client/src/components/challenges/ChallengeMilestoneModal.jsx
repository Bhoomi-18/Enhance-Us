import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { completeMilestone } from '../../services/challengeService';

export const ChallengeMilestoneModal = ({
  isOpen,
  onClose,
  challengeId,
  milestone,
  onMilestoneCompleted,
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!milestone) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await completeMilestone(challengeId, milestone._id, note.trim());
      if (res?.data) {
        onMilestoneCompleted(res.data);
        onClose();
        setNote('');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to complete milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Complete Milestone Stage"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {milestone.title}
            </h4>
          </div>
          {milestone.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {milestone.description}
            </p>
          )}
          {milestone.criteria && (
            <div className="mt-2 text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg font-medium">
              <span className="font-bold">Completion Criteria: </span>
              {milestone.criteria}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Completion Summary / Submission Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe what was accomplished or link to artifacts / PRs..."
            rows={3}
            maxLength={300}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">
            {note.length} / 300
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={CheckCircle2}
          >
            Mark Milestone Complete
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChallengeMilestoneModal;
