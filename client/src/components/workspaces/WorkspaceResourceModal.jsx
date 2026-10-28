import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Link2, Globe } from 'lucide-react';
import { addResource } from '../../services/workspaceService';

export const WorkspaceResourceModal = ({ isOpen, onClose, workspaceId, onResourceAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Resource title is required');
      return;
    }

    const urlTrimmed = formData.url.trim();
    if (!urlTrimmed) {
      setError('Resource URL is required');
      return;
    }

    if (!/^https?:\/\//i.test(urlTrimmed)) {
      setError('Resource URL must begin with http:// or https://');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        url: urlTrimmed,
        description: formData.description.trim(),
      };

      const res = await addResource(workspaceId, payload);
      if (res?.data?.workspace) {
        onResourceAdded(res.data.workspace);
        onClose();
        setFormData({
          title: '',
          url: '',
          description: '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Share Learning Resource"
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
            Resource Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Official Next.js App Router Documentation"
            required
            maxLength={100}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Resource Link (HTTP / HTTPS) *
          </label>
          <Input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://nextjs.org/docs"
            required
            disabled={loading}
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Must be a valid web URL starting with https:// or http://.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description / Context (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Explain how this resource helps with workspace milestones..."
            rows={3}
            maxLength={300}
            disabled={loading}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Adding...' : 'Add Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkspaceResourceModal;
