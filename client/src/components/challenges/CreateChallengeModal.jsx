import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Trophy, Target, Calendar, Users, Plus, Trash2, Shield, Globe, Lock, AlertCircle } from 'lucide-react';
import { createChallenge } from '../../services/challengeService';

export const CreateChallengeModal = ({ isOpen, onClose, onChallengeCreated }) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    associatedSkill: '',
    associatedGoalTitle: '',
    startDate: tomorrow,
    endDate: inThirtyDays,
    participationType: 'INDIVIDUAL',
    visibility: 'PUBLIC',
    capacity: '',
    rules: '',
  });

  const [milestones, setMilestones] = useState([
    { title: 'Project Scope & Setup', description: 'Define initial architecture and repository foundations.', criteria: 'Repository link submitted with README.' },
    { title: 'Core Implementation', description: 'Complete key feature deliverables with unit tests.', criteria: 'Pull request approved with passing tests.' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      { title: '', description: '', criteria: '' },
    ]);
  };

  const handleRemoveMilestone = (index) => {
    setMilestones(milestones.filter((_, idx) => idx !== index));
  };

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const title = formData.title.trim();
    if (title.length < 3) {
      setError('Title must be at least 3 characters');
      setLoading(false);
      return;
    }

    const description = formData.description.trim();
    if (description.length < 10) {
      setError('Description must be at least 10 characters');
      setLoading(false);
      return;
    }

    if (!formData.associatedSkill.trim()) {
      setError('Associated skill domain is required');
      setLoading(false);
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be strictly after the start date');
      setLoading(false);
      return;
    }

    const cleanMilestones = milestones
      .map((m, idx) => ({
        title: (m.title || '').trim(),
        description: (m.description || '').trim(),
        criteria: (m.criteria || '').trim(),
        order: idx,
      }))
      .filter((m) => m.title.length > 0);

    if (cleanMilestones.length === 0) {
      setError('Please provide at least one milestone with a valid title');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title,
        description,
        associatedSkill: formData.associatedSkill.trim(),
        associatedGoalTitle: formData.associatedGoalTitle.trim() || undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        participationType: formData.participationType,
        visibility: formData.visibility,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        milestones: cleanMilestones,
        rules: formData.rules
          ? formData.rules.split('\n').map((r) => r.trim()).filter(Boolean)
          : [],
      };

      const res = await createChallenge(payload);
      if (res?.data?.challenge) {
        onChallengeCreated(res.data.challenge);
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          associatedSkill: '',
          associatedGoalTitle: '',
          startDate: tomorrow,
          endDate: inThirtyDays,
          participationType: 'INDIVIDUAL',
          visibility: 'PUBLIC',
          capacity: '',
          rules: '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Create Community Challenge"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Challenge Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. 30-Day Full-Stack Microservices Sprint"
            maxLength={120}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this challenge about? What will participants build or achieve?"
            rows={3}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Associated Skill *
            </label>
            <Input
              value={formData.associatedSkill}
              onChange={(e) => setFormData({ ...formData, associatedSkill: e.target.value })}
              placeholder="e.g. React, Node.js, UI/UX"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Objective or Learning Goal
            </label>
            <Input
              value={formData.associatedGoalTitle}
              onChange={(e) => setFormData({ ...formData, associatedGoalTitle: e.target.value })}
              placeholder="e.g. Master Production Microservices"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Start Date *
            </label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              End Date *
            </label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Participation Mode
            </label>
            <select
              value={formData.participationType}
              onChange={(e) => setFormData({ ...formData, participationType: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="INDIVIDUAL">Individual Learner</option>
              <option value="TEAM">Team (via V3.7 Workspace)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Capacity Limit
            </label>
            <Input
              type="number"
              min="1"
              max="1000"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="Unlimited (or max #)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="PUBLIC">Public (All Learners)</option>
              <option value="PRIVATE">Private (Invite Only)</option>
            </select>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Deliverable Milestones ({milestones.length})
            </span>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stage</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Milestone #{idx + 1}
                  </span>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-rose-500 hover:text-rose-600 p-1"
                      title="Remove milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Input
                  value={m.title}
                  onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                  placeholder="Stage Title (e.g. Architecture Blueprint)"
                  required
                />
                <Input
                  value={m.criteria}
                  onChange={(e) => handleMilestoneChange(idx, 'criteria', e.target.value)}
                  placeholder="Completion criteria (e.g. PR merged or test report attached)"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Challenge Rules (Optional - 1 per line)
          </label>
          <textarea
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            placeholder="e.g. Code must be shared in workspace repositories&#10;Submissions require test reports"
            rows={2}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Challenge
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateChallengeModal;
