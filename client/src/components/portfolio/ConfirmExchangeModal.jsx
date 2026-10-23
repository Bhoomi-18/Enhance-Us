import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, Calendar, Star, ShieldCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getSessions } from '../../services/sessionService';

export const ConfirmExchangeModal = ({ isOpen, onClose, onConfirm }) => {
  const [completedSessions, setCompletedSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchCompleted = async () => {
        setLoadingSessions(true);
        setError(null);
        try {
          const res = await getSessions();
          const all = res?.data?.sessions || [];
          const completed = all.filter((s) => s.status === 'COMPLETED');
          setCompletedSessions(completed);
          if (completed.length > 0) {
            setSelectedSessionId(completed[0]._id);
            setTitle(`Completed Exchange: ${completed[0].skillTaught}`);
            setDescription(
              `Successfully concluded a peer skill exchange session on ${completed[0].skillTaught}. Verified through completed session records and mutual review.`
            );
          }
        } catch (err) {
          setError('Failed to load completed exchange sessions.');
        } finally {
          setLoadingSessions(false);
        }
      };
      fetchCompleted();
    }
  }, [isOpen]);

  const handleSelectSession = (sId) => {
    setSelectedSessionId(sId);
    const found = completedSessions.find((s) => s._id === sId);
    if (found) {
      setTitle(`Completed Exchange: ${found.skillTaught}`);
      setDescription(
        `Successfully concluded a peer skill exchange session on ${found.skillTaught}. Verified through completed session records and mutual review.`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSessionId) {
      setError('Please select a completed session to verify.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        sessionId: selectedSessionId,
        title: title.trim(),
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to confirm exchange outcome');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Skill-Exchange Achievement"
      description="Convert a completed, reviewed exchange session into an auditable Exchange-Confirmed portfolio item."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loadingSessions ? (
          <div className="py-8 text-center text-slate-500 animate-pulse">Loading completed exchange sessions...</div>
        ) : completedSessions.length === 0 ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-amber-600 mx-auto" />
            <h4 className="font-bold">No Completed Sessions Available Yet</h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Exchange-confirmed achievements require a completed peer session. Once you finish an exchange and complete your review, you can claim your verified badge here!
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Select Completed Session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => handleSelectSession(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {completedSessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.skillTaught} • {new Date(s.date).toLocaleDateString()} at {s.time} ({s.durationMinutes}m)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Achievement Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Deliverables & Reflection</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <Input
              label="External Project / Deliverable Link (Optional)"
              placeholder="https://github.com/... or PR / project demo"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-start gap-2 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Auditable Proof:</strong> This item will be permanently tagged as <strong>Exchange-Confirmed</strong> and link to the peer review record.
              </span>
            </div>
          </>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {completedSessions.length > 0 && (
            <Button type="submit" size="sm" isLoading={submitting}>
              Verify & Add To Portfolio
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmExchangeModal;
