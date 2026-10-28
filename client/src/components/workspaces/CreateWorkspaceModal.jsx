import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Layers, Target, Shield, Globe, Lock, BookOpen } from 'lucide-react';
import { createWorkspace } from '../../services/workspaceService';

export const CreateWorkspaceModal = ({ isOpen, onClose, onWorkspaceCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    associatedSkill: '',
    associatedGoalTitle: '',
    visibility: 'PRIVATE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.title.trim()) {
      setError('Workspace title is required');
      setLoading(false);
      return;
    }

    if (!formData.associatedSkill.trim()) {
      setError('Associated skill is required');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        associatedSkill: formData.associatedSkill.trim(),
        associatedGoalTitle: formData.associatedGoalTitle.trim() || undefined,
        visibility: formData.visibility,
      };

      const res = await createWorkspace(payload);
      if (res?.data?.workspace) {
        onWorkspaceCreated(res.data.workspace);
        onClose();
        setFormData({
          title: '',
          description: '',
          associatedSkill: '',
          associatedGoalTitle: '',
          visibility: 'PRIVATE',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Create Collaborative Workspace"
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
            Workspace Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Full-Stack Cloud SaaS Workspace"
            required
            maxLength={100}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Associated Skill *
          </label>
          <Input
            value={formData.associatedSkill}
            onChange={(e) => setFormData({ ...formData, associatedSkill: e.target.value })}
            placeholder="e.g., React, Docker, Python, System Design"
            required
            maxLength={50}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Shared Learning Goal / Objective (Optional)
          </label>
          <Input
            value={formData.associatedGoalTitle}
            onChange={(e) => setFormData({ ...formData, associatedGoalTitle: e.target.value })}
            placeholder="e.g., Build and deploy production SaaS architecture"
            maxLength={150}
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
            placeholder="Describe what members will collaborate on, scope, and objectives..."
            rows={3}
            maxLength={1000}
            disabled={loading}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Workspace Visibility
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'PRIVATE' })}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                formData.visibility === 'PRIVATE'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
              }`}
            >
              <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Private Space</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Only invited members can view and collaborate.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'PUBLIC' })}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                formData.visibility === 'PUBLIC'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
              }`}
            >
              <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Public Space</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Discoverable by other platform learners.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateWorkspaceModal;
