import React, { useState } from 'react';
import { MessageSquare, Send, ExternalLink, Trash2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const ChallengeUpdatesSection = ({
  challengeId,
  updates = [],
  currentUserId,
  isAdmin = false,
  isJoined = false,
  onPostUpdate,
  onDeleteUpdate,
  pagination,
  onLoadMore,
}) => {
  const [content, setContent] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await onPostUpdate({
        content: content.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      setContent('');
      setEvidenceUrl('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to post update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Community Progress Feed ({pagination?.total ?? updates.length})</span>
        </h3>
      </div>

      {/* Post Update Box (for joined participants) */}
      {isJoined ? (
        <form
          onSubmit={handleSubmit}
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
        >
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your breakthrough, milestone progress, or challenge blockers..."
            rows={2}
            maxLength={1000}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Evidence link (e.g. GitHub PR, Demo URL - optional)"
                className="text-xs py-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {content.length} / 1000
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                icon={Send}
                disabled={!content.trim()}
              >
                Share Update
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
          Join this challenge to share progress updates, link repositories, and discuss deliverables with participants.
        </div>
      )}

      {/* Updates Stream */}
      {updates.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          No progress updates posted yet. Be the first participant to share a breakthrough!
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((up) => {
            const authorId = up.user?._id || up.user;
            const isAuthor = String(authorId) === String(currentUserId);
            const canDelete = isAuthor || isAdmin;

            return (
              <div
                key={up._id}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-start gap-3 group"
              >
                <img
                  src={up.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                  alt={up.user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {up.user?.name || 'Community Peer'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        • {new Date(up.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => onDeleteUpdate(up._id)}
                        className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete update"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {up.content}
                  </p>

                  {up.evidenceUrl && (
                    <a
                      href={up.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline mt-2 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Verified Artifact Evidence</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {pagination && pagination.page < pagination.totalPages && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                className="text-xs"
              >
                Load More Updates
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallengeUpdatesSection;
