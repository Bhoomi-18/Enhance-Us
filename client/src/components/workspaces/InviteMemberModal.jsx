import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { UserPlus, Shield, User } from 'lucide-react';
import { inviteMember } from '../../services/workspaceService';

export const InviteMemberModal = ({ isOpen, onClose, workspaceId, onMemberInvited }) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setError('Please provide a valid User ID or Email to invite.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await inviteMember(workspaceId, {
        targetUserId: targetUserId.trim(),
        role,
      });

      if (res?.data?.workspace) {
        onMemberInvited(res.data.workspace);
        onClose();
        setTargetUserId('');
        setRole('MEMBER');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Invite Peer to Workspace"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Learner User ID / Email *
          </label>
          <Input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="User ID (e.g. 64c...) or email"
            required
            disabled={loading}
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Provide the ID or email of a registered platform user.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Workspace Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('MEMBER')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                role === 'MEMBER'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Member</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('ADMIN')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                role === 'ADMIN'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Admin</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Inviting...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;
