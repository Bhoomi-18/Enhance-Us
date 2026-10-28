import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Target, Calendar, CheckCircle2 } from 'lucide-react';
import { addMilestone, updateMilestone } from '../../services/workspaceService';

export const WorkspaceMilestoneModal = ({
  isOpen,
  onClose,
  workspaceId,
  milestoneToEdit = null,
  onMilestoneSaved,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    status: 'PENDING',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (milestoneToEdit) {
      setFormData({
        title: milestoneToEdit.title || '',
        description: milestoneToEdit.description || '',
        targetDate: milestoneToEdit.targetDate ? new Date(milestoneToEdit.targetDate).toISOString().split('T')[0] : '',
        status: milestoneToEdit.status || 'PENDING',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        targetDate: '',
        status: 'PENDING',
      });
    }
    setError(null);
  }, [milestoneToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Milestone title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        targetDate: formData.targetDate || undefined,
        status: formData.status,
      };

      let res;
      if (milestoneToEdit) {
        res = await updateMilestone(workspaceId, milestoneToEdit._id, payload);
      } else {
        res = await addMilestone(workspaceId, payload);
      }

      if (res?.data?.workspace) {
        onMilestoneSaved(res.data.workspace);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title={milestoneToEdit ? 'Edit Workspace Milestone' : 'Add Shared Milestone'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Milestone Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Set up Redis cache & Docker Compose"
            required
            maxLength={120}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Key deliverables, requirements, or test criteria..."
            rows={3}
            maxLength={500}
            disabled={loading}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Completion Date
            </label>
            <Input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={loading}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Saving...' : milestoneToEdit ? 'Update Milestone' : 'Add Milestone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkspaceMilestoneModal;
