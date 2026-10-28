import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Search,
  Filter,
  AlertCircle,
  FileText,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getAdminEvidenceQueue, moderateSkillEvidence } from '../../services/skillEvidenceService';

export const AdminVerificationTab = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Decision Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState('VERIFY');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      const res = await getAdminEvidenceQueue(filters);
      setQueue(res?.data?.queue || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleOpenDecision = (item, defaultAction = 'VERIFY') => {
    setSelectedItem(item);
    setDecisionAction(defaultAction);
    setNotes(item.evidence?.reviewerNotes || '');
    setRejectionReason(item.evidence?.rejectionReason || '');
    setModalError(null);
    setIsDecisionModalOpen(true);
  };

  const handleSaveDecision = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (decisionAction === 'REJECT' && !rejectionReason.trim()) {
      setModalError('Please provide a rejection reason so the user knows what to improve.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await moderateSkillEvidence(selectedItem.userId, selectedItem.skillName, {
        action: decisionAction,
        reviewerNotes: notes.trim(),
        rejectionReason: rejectionReason.trim(),
      });
      setIsDecisionModalOpen(false);
      await fetchQueue();
    } catch (err) {
      setModalError(err?.response?.data?.message || err.message || 'Failed to save decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.userName?.toLowerCase().includes(term) ||
      item.userEmail?.toLowerCase().includes(term) ||
      item.skillName?.toLowerCase().includes(term) ||
      item.skillCategory?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <CardTitle>Skill Evidence Verification Queue</CardTitle>
            </div>
            <CardDescription>
              Review user-submitted portfolio projects, credentials, and code samples before granting a platform verified badge.
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl text-xs font-semibold">
            {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by candidate name, email, or skill name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-400">
              <LoadingSpinner size="sm" />
              <span>Loading evidence submissions...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No skill evidence found matching the selected filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item, idx) => {
                const ev = item.evidence || {};
                return (
                  <div
                    key={`${item.userId}-${item.skillName}-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            item.verificationStatus === 'VERIFIED'
                              ? 'teal'
                              : item.verificationStatus === 'SUBMITTED'
                              ? 'amber'
                              : item.verificationStatus === 'UNDER_REVIEW'
                              ? 'indigo'
                              : 'rose'
                          }
                        >
                          {item.verificationStatus}
                        </Badge>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {item.skillName}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          ({item.skillCategory} • {item.skillLevel})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Candidate:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {item.userName}
                        </strong>{' '}
                        ({item.userEmail}) • Submitted:{' '}
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}
                      </div>

                      {/* Submitted URLs */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ev.portfolioUrl && (
                          <a
                            href={ev.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-[11px] transition-colors"
                          >
                            <span>Portfolio Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {ev.certificateUrl && (
                          <a
                            href={ev.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-[11px] transition-colors"
                          >
                            <span>Certificate URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {ev.workSampleUrl && (
                          <a
                            href={ev.workSampleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-[11px] transition-colors"
                          >
                            <span>Live Work Sample</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {ev.description && (
                        <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                          {ev.description}
                        </p>
                      )}

                      {ev.reviewerNotes && (
                        <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 text-teal-800 dark:text-teal-300 text-[11px]">
                          <strong>Moderator Note:</strong> {ev.reviewerNotes}
                        </div>
                      )}

                      {ev.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 text-[11px]">
                          <strong>Rejection Reason:</strong> {ev.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center gap-2 shrink-0 self-start">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDecision(item, 'VERIFY')}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                      >
                        Approve & Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDecision(item, 'REJECT')}
                        className="text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900 text-xs"
                      >
                        Reject Evidence
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Modal */}
      {selectedItem && (
        <Modal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          title={`Moderate Evidence: ${selectedItem.skillName}`}
          description={`Applicant: ${selectedItem.userName} (${selectedItem.userEmail})`}
          className="max-w-md"
        >
          <form onSubmit={handleSaveDecision} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Moderation Decision
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionAction('VERIFY')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    decisionAction === 'VERIFY'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionAction('UNDER_REVIEW')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    decisionAction === 'UNDER_REVIEW'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Under Review
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionAction('REJECT')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    decisionAction === 'REJECT'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>

            {decisionAction === 'REJECT' && (
              <div className="flex flex-col gap-1">
                <label className="font-bold text-rose-700 dark:text-rose-400">
                  Rejection Reason (Visible to user)
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  required
                  placeholder="Explain why the evidence does not meet criteria (e.g. broken link, unrelated project, lack of credential hash)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Reviewer Notes & Verification Rationale
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Document your verification check notes (e.g. inspected GitHub commits, verified issuer signature)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsDecisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className={
                  decisionAction === 'VERIFY'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white font-bold'
                    : decisionAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'
                }
              >
                {submitting ? 'Saving...' : 'Confirm Decision'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminVerificationTab;
