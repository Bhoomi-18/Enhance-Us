import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, CheckCircle2, XCircle, Star, Award, MessageSquare } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getSessions, createSession, completeSession, cancelSession } from '../services/sessionService';
import { createReview } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';

export const SessionsPage = () => {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Session Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:00',
    durationMinutes: 60,
    skillTaught: 'React',
    sessionNotes: '',
    recipientId: 'candidate_user_b',
  });
  const [submittingSession, setSubmittingSession] = useState(false);

  // Review Modal State
  const [selectedSessionForReview, setSelectedSessionForReview] = useState(null);
  const [reviewData, setReviewData] = useState({
    teachingRating: 5,
    communicationRating: 5,
    reliabilityRating: 5,
    feedbackText: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchSessionsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSessions();
      if (res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      setError(err.message || 'Failed to load exchange sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsList();
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSubmittingSession(true);
    try {
      await createSession(sessionData);
      setIsScheduleModalOpen(false);
      fetchSessionsList();
    } catch (err) {
      alert(err.message || 'Failed to schedule session');
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      const res = await completeSession(sessionId);
      const targetSession = sessions.find((s) => s._id === sessionId);
      setSelectedSessionForReview(targetSession || { _id: sessionId });
      fetchSessionsList();
    } catch (err) {
      alert(err.message || 'Failed to mark session completed');
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Cancel this scheduled exchange session?')) return;
    try {
      await cancelSession(sessionId);
      fetchSessionsList();
    } catch (err) {
      alert(err.message || 'Failed to cancel session');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedSessionForReview) return;

    setSubmittingReview(true);
    try {
      const otherParticipant = selectedSessionForReview.participants?.find((p) => p._id !== user?._id) || { _id: 'candidate_user_b' };
      await createReview({
        sessionId: selectedSessionForReview._id,
        revieweeId: otherParticipant._id,
        teachingRating: reviewData.teachingRating,
        communicationRating: reviewData.communicationRating,
        reliabilityRating: reviewData.reliabilityRating,
        feedbackText: reviewData.feedbackText,
      });

      setSelectedSessionForReview(null);
      alert('Review submitted! Peer reputation updated.');
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <PageContainer
      title="Exchange Sessions"
      subtitle="Schedule reciprocal learning calls, track completed teaching hours, and leave peer reviews."
      action={
        <Button leftIcon={Plus} onClick={() => setIsScheduleModalOpen(true)}>
          Schedule Session
        </Button>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Loading exchange sessions..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">{error}</div>
      ) : sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No Scheduled Exchange Sessions"
            description="Once you have an active exchange connection, schedule structured learning sessions here."
            actionLabel="Schedule First Session"
            onAction={() => setIsScheduleModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {sessions.map((sess) => {
            const partner = sess.participants?.find((p) => p._id !== user?._id) || sess.participants?.[1] || {};
            const isHost = sess.host === user?._id || sess.host?._id === user?._id;

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
                      Partner: <strong className="text-teal-700 dark:text-teal-400">{partner.name || 'Peer Exchange Partner'}</strong>
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
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-lg mt-2 border border-slate-100 dark:border-slate-800">{sess.sessionNotes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
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
                      <Button variant="outline" size="sm" onClick={() => setSelectedSessionForReview(sess)} leftIcon={Star}>
                        Leave Review
                      </Button>
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
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule Exchange Session"
        description="Set date, time, and topic for your upcoming peer session."
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          <Input
            label="Skill Being Taught"
            value={sessionData.skillTaught}
            onChange={(e) => setSessionData({ ...sessionData, skillTaught: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={sessionData.date}
              onChange={(e) => setSessionData({ ...sessionData, date: e.target.value })}
              required
            />
            <Input
              label="Time"
              type="time"
              value={sessionData.time}
              onChange={(e) => setSessionData({ ...sessionData, time: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
            <select
              value={sessionData.durationMinutes}
              onChange={(e) => setSessionData({ ...sessionData, durationMinutes: Number(e.target.value) })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes</option>
              <option value={90}>90 Minutes</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Session Agenda & Notes</label>
            <textarea
              rows={3}
              placeholder="Key topics, code repository link, or meeting link..."
              value={sessionData.sessionNotes}
              onChange={(e) => setSessionData({ ...sessionData, sessionNotes: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submittingSession}>Schedule Session</Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedSessionForReview}
        onClose={() => setSelectedSessionForReview(null)}
        title="Submit Peer Review"
        description="Rate your exchange partner across key dimensions to update their reputation score."
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Teaching Quality (1-5★)</label>
              <select
                value={reviewData.teachingRating}
                onChange={(e) => setReviewData({ ...reviewData, teachingRating: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ Excellent Teaching</option>
                <option value={4}>4★ Good Teaching</option>
                <option value={3}>3★ Average Teaching</option>
                <option value={2}>2★ Needs Improvement</option>
                <option value={1}>1★ Poor</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Communication Clarity (1-5★)</label>
              <select
                value={reviewData.communicationRating}
                onChange={(e) => setReviewData({ ...reviewData, communicationRating: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ Clear & Professional</option>
                <option value={4}>4★ Good Communication</option>
                <option value={3}>3★ Adequate</option>
                <option value={2}>2★ Confusing</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Punctuality & Reliability (1-5★)</label>
              <select
                value={reviewData.reliabilityRating}
                onChange={(e) => setReviewData({ ...reviewData, reliabilityRating: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5★ On Time & Prepared</option>
                <option value={4}>4★ Punctual</option>
                <option value={3}>3★ Slightly Late</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Detailed Feedback Comments</label>
            <textarea
              rows={3}
              placeholder="What went well during the session?"
              value={reviewData.feedbackText}
              onChange={(e) => setReviewData({ ...reviewData, feedbackText: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSelectedSessionForReview(null)}>Cancel</Button>
            <Button type="submit" isLoading={submittingReview} leftIcon={Star}>Submit Review</Button>
          </div>
        </form>
      </Modal>

    </PageContainer>
  );
};

export default SessionsPage;
