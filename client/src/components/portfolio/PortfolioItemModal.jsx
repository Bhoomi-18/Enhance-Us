import React, { useState, useEffect } from 'react';
import { Briefcase, Link as LinkIcon, Eye, Lock, Users, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const PortfolioItemModal = ({ isOpen, onClose, onSave, editingItem = null, userSkills = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('General');
  const [itemType, setItemType] = useState('PROJECT');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || '');
      setDescription(editingItem.description || '');
      setSkillName(editingItem.skillName || '');
      setCategory(editingItem.category || 'General');
      setItemType(editingItem.itemType || 'PROJECT');
      setEvidenceUrl(editingItem.evidenceUrl || '');
      setVisibility(editingItem.visibility || 'PUBLIC');
    } else {
      setTitle('');
      setDescription('');
      setSkillName(userSkills[0]?.name || '');
      setCategory(userSkills[0]?.category || 'General');
      setItemType('PROJECT');
      setEvidenceUrl('');
      setVisibility('PUBLIC');
    }
    setError(null);
  }, [editingItem, isOpen, userSkills]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !skillName.trim()) {
      setError('Please provide title, description, and associated skill.');
      return;
    }

    if (evidenceUrl && !/^https?:\/\/.+/i.test(evidenceUrl.trim())) {
      setError('Please enter a valid web URL starting with http:// or https://');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        skillName: skillName.trim(),
        category: category.trim(),
        itemType,
        evidenceUrl: evidenceUrl.trim(),
        visibility,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save portfolio item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Proof-of-Skill Artifact' : 'Add Proof-of-Skill Artifact'}
      description="Showcase concrete evidence of your capabilities, projects, or learning reflections."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Project or Artifact Title"
          placeholder="e.g. Full-Stack E-Commerce Platform, Redux Architecture Blueprint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Associated Domain Skill</label>
            <input
              type="text"
              list="user-skills-list"
              placeholder="e.g. React, Node.js, UI/UX Design"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <datalist id="user-skills-list">
              {userSkills.map((s, idx) => (
                <option key={idx} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Artifact Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="PROJECT">Real Project Sample</option>
              <option value="WORK_SAMPLE">Code Sample / Work Demo</option>
              <option value="LEARNING_MILESTONE">Learning Roadmap Milestone</option>
              <option value="REFLECTION">Learning Summary / Reflection</option>
              <option value="EXCHANGE_OUTCOME">Skill Exchange Deliverable</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">Description & Technical Accomplishments</label>
          <textarea
            rows={3}
            placeholder="Explain what you built, technical decisions, architecture, and challenges overcome..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Evidence Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://github.com/user/project or live demo"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Visibility Control</span>
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="PUBLIC">Public (Visible to everyone)</option>
              <option value="MEMBERS_ONLY">Members Only (Logged-in peers)</option>
              <option value="PRIVATE">Private (Only you)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={submitting}>
            {editingItem ? 'Save Changes' : 'Publish to Portfolio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PortfolioItemModal;
