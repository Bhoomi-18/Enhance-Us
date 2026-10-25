import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Star,
  Award,
  MessageSquare,
  AlertCircle,
  Users,
  Check,
  Info,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getSessions, createSession, completeSession, cancelSession } from '../services/sessionService';
import { getConnections } from '../services/exchangeService';
import { createReview } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';

export const SessionsPage = () => {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // New Session Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [submittingSession, setSubmittingSession] = useState(false);

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [sessionData, setSessionData] = useState({
    connectionId: '',
    recipientId: '',
    goalId: '',
    date: tomorrowStr,
    time: '14:00',
    durationMinutes: 60,
    skillTaught: '',
    sessionNotes: '',
  });

  // Review Modal State
  const [selectedSessionForReview, setSelectedSessionForReview] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewData, setReviewData] = useState({
    teachingRating: 5,
    communicationRating: 5,
    reliabilityRating: 5,
    feedbackText: '',
  });

  // Helper to reliably extract the other participant in a session or connection
  const getPeer = (item) => {
    if (!item?.participants || !Array.isArray(item.participants)) return null;
    const currentUserIdStr = (user?._id || user?.id)?.toString();
    return item.participants.find((p) => {
      const pId = (p && typeof p === 'object' && (p._id || p.id)) ? (p._id || p.id).toString() : p?.toString();
      return pId && (!currentUserIdStr || pId !== currentUserIdStr);
    });
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, connsRes] = await Promise.all([
        getSessions(),
        getConnections().catch(() => ({ data: { connections: [] } })),
      ]);

      if (sessionsRes?.data?.sessions) {
        setSessions(sessionsRes.data.sessions);
      }

      const activeConns = connsRes?.data?.connections || [];
      setConnections(activeConns);

      // Pre-populate default connection if available
      if (activeConns.length > 0) {
        const firstConn = activeConns[0];
        const peer = getPeer(firstConn);
        setSessionData((prev) => ({
          ...prev,
          connectionId: firstConn._id,
          recipientId: (peer?._id || peer || '').toString(),
          goalId: (firstConn.goal?._id || firstConn.goal || '').toString(),
          skillTaught: prev.skillTaught || firstConn.skills?.userBSkill || firstConn.skills?.userASkill || 'General Skill Exchange',
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load exchange sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user?._id]);

  const handleConnectionChange = (e) => {
    const connId = e.target.value;
    const selectedConn = connections.find((c) => c._id === connId);
    if (selectedConn) {
      const peer = getPeer(selectedConn);
      setSessionData({
        ...sessionData,
        connectionId: selectedConn._id,
        recipientId: (peer?._id || peer || '').toString(),
        goalId: (selectedConn.goal?._id || selectedConn.goal || '').toString(),
        skillTaught: selectedConn.skills?.userBSkill || selectedConn.skills?.userASkill || sessionData.skillTaught || 'Skill Exchange',
      });
    } else {
      setSessionData({
        ...sessionData,
        connectionId: '',
      });
    }
  };

  const handleOpenScheduleModal = () => {
    setScheduleError(null);
    setStatusMessage(null);

    if (connections.length > 0 && !sessionData.connectionId) {
      const firstConn = connections[0];
      const peer = getPeer(firstConn);
      setSessionData((prev) => ({
        ...prev,
        connectionId: firstConn._id,
        recipientId: (peer?._id || peer || '').toString(),
        goalId: (firstConn.goal?._id || firstConn.goal || '').toString(),
        skillTaught: firstConn.skills?.userBSkill || firstConn.skills?.userASkill || 'General Skill Exchange',
      }));
    }

    setIsScheduleModalOpen(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setScheduleError(null);

    // Validate connection/peer
    if (!sessionData.connectionId && !sessionData.recipientId) {
      setScheduleError('Please select an active peer connection to schedule this exchange session.');
      return;
    }

    if (!sessionData.skillTaught.trim()) {
      setScheduleError('Please specify the skill being taught during this session.');
      return;
    }

    setSubmittingSession(true);
    try {
      await createSession({
        ...sessionData,
        clientTimezoneOffset: new Date().getTimezoneOffset(),
      });
      setIsScheduleModalOpen(false);
      setStatusMessage('Exchange session scheduled successfully! Peer notified.');
      fetchInitialData();
    } catch (err) {
      setScheduleError(err.message || 'Failed to schedule session. Please verify date and time.');
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      const res = await completeSession(sessionId);
      const targetSession = res?.data?.session || sessions.find((s) => s._id === sessionId) || { _id: sessionId };
      setSelectedSessionForReview(targetSession);
      setStatusMessage('Session marked as completed. You can now submit your peer review.');
      fetchInitialData();
    } catch (err) {
      alert(err.message || 'Failed to mark session completed');
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled exchange session?')) return;
    try {
      await cancelSession(sessionId);
      setStatusMessage('Session was successfully cancelled.');
      fetchInitialData();
    } catch (err) {
      alert(err.message || 'Failed to cancel session');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedSessionForReview) return;
    setReviewError(null);

    setSubmittingReview(true);
    try {
      const peer = getPeer(selectedSessionForReview);
      let targetRevieweeId = null;
      if (peer) {
        targetRevieweeId = (typeof peer === 'object' && (peer._id || peer.id))
          ? (peer._id || peer.id).toString()
          : peer.toString();
      }

      // Fallback: If targetRevieweeId is still unresolved, scan participants array
      if (!targetRevieweeId && Array.isArray(selectedSessionForReview.participants)) {
        const myId = (user?._id || user?.id)?.toString();
        const other = selectedSessionForReview.participants.find((p) => {
          const id = (p && typeof p === 'object' && (p._id || p.id)) ? (p._id || p.id).toString() : p?.toString();
          return id && id !== myId;
        });
        if (other) {
          targetRevieweeId = (other && typeof other === 'object' && (other._id || other.id))
            ? (other._id || other.id).toString()
            : other.toString();
        }
      }

      const overallRating = Math.round(
        ((reviewData.teachingRating + reviewData.communicationRating + reviewData.reliabilityRating) / 3) * 10
      ) / 10;

      await createReview({
        sessionId: selectedSessionForReview._id,
        revieweeId: targetRevieweeId || undefined,
        teachingRating: reviewData.teachingRating,
        communicationRating: reviewData.communicationRating,
        reliabilityRating: reviewData.reliabilityRating,
        rating: overallRating,
        overallRating,
        feedbackText: reviewData.feedbackText,
        feedback: reviewData.feedbackText,
      });

      setSelectedSessionForReview(null);
      setReviewData({
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        feedbackText: '',
      });
      setStatusMessage('Review submitted successfully! Peer reputation updated.');
      fetchInitialData();
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <PageContainer
      title="Exchange Sessions"
      subtitle="Schedule reciprocal learning calls, track completed teaching hours, and leave peer reviews."
      action={
        <Button leftIcon={Plus} onClick={handleOpenScheduleModal}>
          Schedule Session
        </Button>
      }
    >
      {/* Global Status Banner */}
      {statusMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Loading exchange sessions..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs text-center">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No Scheduled Exchange Sessions"
            description="Once you have an active exchange connection, schedule structured learning sessions here."
            actionLabel="Schedule First Session"
            onAction={handleOpenScheduleModal}
          />
        </Card>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {sessions.map((sess) => {
            const partner = getPeer(sess) || {};
            const isHost = (sess.host?._id || sess.host)?.toString() === user?._id?.toString();

            return (
              <Card key={sess._id} hover className="p-5 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={sess.status === 'COMPLETED' ? 'emerald' : sess.status === 'CANCELLED' ? 'rose' : 'teal'}>
                        {sess.status}
                      </Badge>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isHost ? `Teaching ${sess.skillTaught}` : `Learning ${sess.skillTaught}`}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Partner:{' '}
                      <strong className="text-teal-700 dark:text-teal-400">
                        {partner.name || (typeof partner === 'string' ? partner : 'Peer Exchange Partner')}
                      </strong>
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(sess.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {sess.time} ({sess.durationMinutes} mins)
                      </span>
                    </div>

                    {sess.sessionNotes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-lg mt-2 border border-slate-100 dark:border-slate-800">
                        {sess.sessionNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sess.status === 'SCHEDULED' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleCancelSession(sess._id)} leftIcon={XCircle}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleCompleteSession(sess._id)} leftIcon={CheckCircle2}>
                          Mark Completed
                        </Button>
                      </>
                    )}
                    {sess.status === 'COMPLETED' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReviewError(null);
                            setSelectedSessionForReview(sess);
                          }}
                          leftIcon={Star}
                        >
                          Leave Review
                        </Button>
                        {sess.goal ? (
                          <Link to={`/goals/${sess.goal?._id || sess.goal}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={CheckCircle2}
                              className="border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              Update Goal Progress
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/goals">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={CheckCircle2}
                              className="border-teal-500 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            >
                              Update Goal Progress
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          if (!submittingSession) setIsScheduleModalOpen(false);
        }}
        title="Schedule Exchange Session"
        description="Set date, time, and topic for your upcoming peer session."
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs pt-1">
          {scheduleError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{scheduleError}</div>
            </div>
          )}

          {/* Connection Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="exchange-connection-select" className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Exchange Partner & Goal *
            </label>
            {connections.length > 0 ? (
              <select
                id="exchange-connection-select"
                aria-label="Select exchange partner and shared goal"
                value={sessionData.connectionId}
                onChange={handleConnectionChange}
                disabled={submittingSession}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              >
                {connections.map((conn) => {
                  const peer = getPeer(conn);
                  const goalTitle = conn.goal?.title || 'Shared Goal';
                  return (
                    <option key={conn._id} value={conn._id}>
                      {peer?.name || 'Peer'} — {goalTitle} ({conn.skills?.userBSkill || conn.skills?.userASkill || 'Exchange'})
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  No Active Peer Connections
                </p>
                <p className="text-[11px] leading-relaxed">
                  Sessions are scheduled with connected exchange partners. Accept an exchange request in Messages or connect with peers on Matches first.
                </p>
                <div className="pt-1">
                  <Link
                    to="/matches"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="inline-flex items-center text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Find Match Partners &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Input
            id="session-skill-taught"
            label="Skill Being Taught *"
            value={sessionData.skillTaught}
            onChange={(e) => setSessionData({ ...sessionData, skillTaught: e.target.value })}
            placeholder="e.g. React Architecture, UI/UX Wireframing"
            disabled={submittingSession}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="session-date-input"
              label="Session Date *"
              type="date"
              min={todayStr}
              value={sessionData.date}
              onChange={(e) => setSessionData({ ...sessionData, date: e.target.value })}
              disabled={submittingSession}
              required
            />
            <Input
              id="session-time-input"
              label="Session Time *"
              type="time"
              value={sessionData.time}
              onChange={(e) => setSessionData({ ...sessionData, time: e.target.value })}
              disabled={submittingSession}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-duration-select" className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Duration (Minutes)
            </label>
            <select
              id="session-duration-select"
              aria-label="Session duration in minutes"
              value={sessionData.durationMinutes}
              onChange={(e) => setSessionData({ ...sessionData, durationMinutes: Number(e.target.value) })}
              disabled={submittingSession}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (Standard)</option>
              <option value={90}>90 Minutes</option>
              <option value={120}>120 Minutes (Extended)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-notes-textarea" className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Session Agenda & Notes
            </label>
            <textarea
              id="session-notes-textarea"
              aria-label="Session agenda and notes"
              rows={3}
              placeholder="Topics to cover, meeting link (Google Meet / Zoom), code repo, or preparation materials..."
              value={sessionData.sessionNotes}
              onChange={(e) => setSessionData({ ...sessionData, sessionNotes: e.target.value })}
              disabled={submittingSession}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsScheduleModalOpen(false)}
              disabled={submittingSession}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={submittingSession}
              disabled={submittingSession || (connections.length === 0 && !sessionData.recipientId)}
            >
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedSessionForReview}
        onClose={() => {
          if (!submittingReview) setSelectedSessionForReview(null);
        }}
        title="Submit Peer Review"
        description="Rate your exchange partner across key dimensions to update their reputation score."
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs pt-1">
          {reviewError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{reviewError}</div>
            </div>
          )}

          {selectedSessionForReview && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                Reviewing Partner:{' '}
                <span className="text-teal-600 dark:text-teal-400">
                  {getPeer(selectedSessionForReview)?.name || 'Exchange Partner'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Session topic: {selectedSessionForReview.skillTaught || 'Peer Skill Exchange'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="review-teaching-rating" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Teaching Quality (1-5★) *</label>
              <select
                id="review-teaching-rating"
                aria-label="Teaching quality rating"
                value={reviewData.teachingRating}
                onChange={(e) => setReviewData({ ...reviewData, teachingRating: Number(e.target.value) })}
                disabled={submittingReview}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ Excellent Teaching & Guidance</option>
                <option value={4}>4★ Good Teaching & Explanation</option>
                <option value={3}>3★ Adequate Teaching</option>
                <option value={2}>2★ Needs Improvement</option>
                <option value={1}>1★ Poor</option>
              </select>
            </div>

            <div>
              <label htmlFor="review-comm-rating" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Communication Clarity (1-5★) *</label>
              <select
                id="review-comm-rating"
                aria-label="Communication clarity rating"
                value={reviewData.communicationRating}
                onChange={(e) => setReviewData({ ...reviewData, communicationRating: Number(e.target.value) })}
                disabled={submittingReview}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ Clear, Responsive & Professional</option>
                <option value={4}>4★ Good Communication</option>
                <option value={3}>3★ Adequate</option>
                <option value={2}>2★ Unclear or Confusing</option>
                <option value={1}>1★ Unresponsive / Poor</option>
              </select>
            </div>

            <div>
              <label htmlFor="review-reliability-rating" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Punctuality & Reliability (1-5★) *</label>
              <select
                id="review-reliability-rating"
                aria-label="Punctuality and reliability rating"
                value={reviewData.reliabilityRating}
                onChange={(e) => setReviewData({ ...reviewData, reliabilityRating: Number(e.target.value) })}
                disabled={submittingReview}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ On Time, Prepared & Respectful</option>
                <option value={4}>4★ Punctual</option>
                <option value={3}>3★ Slightly Late</option>
                <option value={2}>2★ Very Late</option>
                <option value={1}>1★ Missed Commitment</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="review-feedback-textarea" className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Detailed Feedback (Optional)
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              id="review-feedback-textarea"
              aria-label="Detailed review feedback"
              rows={3}
              placeholder="What went well during this exchange session? What did you learn?"
              value={reviewData.feedbackText}
              onChange={(e) => setReviewData({ ...reviewData, feedbackText: e.target.value })}
              disabled={submittingReview}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedSessionForReview(null)}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={submittingReview}
              leftIcon={Star}
              disabled={submittingReview}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>

    </PageContainer>
  );
};

export default SessionsPage;
