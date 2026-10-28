import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Users, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getUserWorkspaces } from '../../services/workspaceService';
import { joinChallenge } from '../../services/challengeService';

export const ChallengeTeamJoinModal = ({
  isOpen,
  onClose,
  challenge,
  onJoined,
}) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      getUserWorkspaces()
        .then((res) => {
          const list = res?.data?.joinedWorkspaces || res?.data?.workspaces || [];
          setWorkspaces(list);
          if (list.length > 0) {
            setSelectedWorkspaceId(list[0]._id);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || 'Failed to load collaborative workspaces');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkspaceId) {
      setError('Please select a collaborative workspace to participate');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await joinChallenge(challenge._id, {
        teamWorkspaceId: selectedWorkspaceId,
      });
      if (res?.data) {
        onJoined(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to enroll workspace in challenge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title="Join Team Challenge"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-300">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Collaborative Team Enrollment
          </p>
          <p className="leading-relaxed">
            This challenge is designed for team collaboration. Select an active V3.7 workspace. All members of your workspace will be eligible to contribute to milestones!
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading your collaborative workspaces...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No Collaborative Workspaces Found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You must create or belong to a collaborative workspace before joining a team challenge.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Your Team Workspace
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <label
                  key={ws._id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedWorkspaceId === ws._id
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="selectedWorkspace"
                      value={ws._id}
                      checked={selectedWorkspaceId === ws._id}
                      onChange={() => setSelectedWorkspaceId(ws._id)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {ws.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ws.associatedSkill} • {ws.members?.length || 1} members
                      </p>
                    </div>
                  </div>
                  {selectedWorkspaceId === ws._id && (
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={workspaces.length === 0}
          >
            Confirm & Enroll Team
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChallengeTeamJoinModal;
