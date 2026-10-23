import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Users, Target, Shield, BookOpen, Layers } from 'lucide-react';
import { createCircle } from '../../services/circleService';

export const CreateCircleModal = ({ isOpen, onClose, onCircleCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    primarySkill: '',
    secondarySkillsInput: '',
    learningObjectivesInput: '',
    skillLevel: 'ALL_LEVELS',
    memberLimit: 20,
    membershipPolicy: 'OPEN',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const secondarySkills = formData.secondarySkillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const learningObjectives = formData.learningObjectivesInput
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        primarySkill: formData.primarySkill.trim(),
        secondarySkills,
        learningObjectives,
        skillLevel: formData.skillLevel,
        memberLimit: parseInt(formData.memberLimit, 10) || 20,
        membershipPolicy: formData.membershipPolicy,
      };

      const res = await createCircle(payload);
      if (res?.data?.circle) {
        onCircleCreated(res.data.circle);
        onClose();
        setFormData({
          title: '',
          description: '',
          primarySkill: '',
          secondarySkillsInput: '',
          learningObjectivesInput: '',
          skillLevel: 'ALL_LEVELS',
          memberLimit: 20,
          membershipPolicy: 'OPEN',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create learning circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Create a Collaborative Learning Circle"
      description="Gather peers around a shared topic to co-learn, track milestones, and host group study sessions."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-2">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <Input
          label="Circle Title"
          placeholder="e.g. Full Stack React & Node Architecture Circle"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Description & Collaborative Scope
          </label>
          <textarea
            rows={3}
            placeholder="Explain the circle's mission, regular meeting rhythm, and what members will collaborate on..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Primary Skill / Topic"
            placeholder="e.g. React, Docker, Python"
            value={formData.primarySkill}
            onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Target Skill Level</label>
            <select
              value={formData.skillLevel}
              onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL_LEVELS">All Levels Welcome</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Membership Policy</label>
            <select
              value={formData.membershipPolicy}
              onChange={(e) => setFormData({ ...formData, membershipPolicy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="OPEN">Open Enrollment — Instant join</option>
              <option value="APPLY_TO_JOIN">Apply to Join — Moderator approval</option>
              <option value="INVITE_ONLY">Invite Only — Private circle</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Capacity Limit</label>
            <input
              type="number"
              min={2}
              max={50}
              value={formData.memberLimit}
              onChange={(e) => setFormData({ ...formData, memberLimit: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <span className="text-[10px] text-slate-400">Recommended 5 to 25 members</span>
          </div>
        </div>

        <Input
          label="Secondary Skills (Optional, comma-separated)"
          placeholder="e.g. TypeScript, GraphQL, Tailwind CSS"
          value={formData.secondarySkillsInput}
          onChange={(e) => setFormData({ ...formData, secondarySkillsInput: e.target.value })}
        />

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Key Learning Objectives (One per line)
          </label>
          <textarea
            rows={2}
            placeholder="Build real projects together&#10;Conduct bi-weekly code reviews"
            value={formData.learningObjectivesInput}
            onChange={(e) => setFormData({ ...formData, learningObjectivesInput: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} className="font-bold">
            Create Learning Circle
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCircleModal;
