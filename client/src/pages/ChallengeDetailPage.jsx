import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Calendar,
  Users,
  Target,
  CheckCircle2,
  Circle,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ChallengeMilestoneModal } from '../components/challenges/ChallengeMilestoneModal';
import { ChallengeTeamJoinModal } from '../components/challenges/ChallengeTeamJoinModal';
import { ChallengeUpdatesSection } from '../components/challenges/ChallengeUpdatesSection';
import {
  getChallengeById,
  joinChallenge,
  leaveChallenge,
  cancelChallenge,
  undoMilestone,
  getChallengeUpdates,
  createChallengeUpdate,
  deleteChallengeUpdate,
} from '../services/challengeService';

export const ChallengeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeMilestoneForModal, setActiveMilestoneForModal] = useState(null);
  const [isTeamJoinModalOpen, setIsTeamJoinModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  usePageMeta({
    title: challenge ? `${challenge.title} | EnhanceUs Challenge` : 'Challenge Details | EnhanceUs',
    description: challenge ? challenge.description : 'Participate in community skill sprints and milestones.',
  });

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getChallengeById(id);
      setChallenge(res?.data?.challenge || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load challenge details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async (page = 1) => {
    try {
      const res = await getChallengeUpdates(id, { page, limit: 20 });
      if (res?.data) {
        if (page === 1) {
          setUpdates(res.data.updates || []);
        } else {
          setUpdates((prev) => [...prev, ...(res.data.updates || [])]);
        }
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.warn('Failed to fetch updates:', err.message);
    }
  };

  useEffect(() => {
    fetchChallenge();
    fetchUpdates(1);
  }, [id]);

  const isCreator = challenge && user && (challenge.creator?._id === user._id || challenge.creator === user._id);
  const isAdmin = user?.role === 'admin';
  const isJoined = Boolean(challenge?.userParticipation);
  const userParticipation = challenge?.userParticipation;
  const progress = userParticipation ? userParticipation.progress || 0 : 0;
  const completedMilestoneIds = new Set(
    (userParticipation?.completedMilestones || []).map((m) => m.milestoneId?.toString() || m.milestoneId)
  );

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/challenges/${id}`);
      return;
    }

    if (challenge.participationType === 'TEAM') {
      setIsTeamJoinModalOpen(true);
    } else {
      try {
        setActionLoading(true);
        await joinChallenge(id);
        fetchChallenge();
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to join challenge');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this challenge? Your current milestone progress will be paused.')) {
      return;
    }
    try {
      setActionLoading(true);
      await leaveChallenge(id);
      fetchChallenge();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to leave challenge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelChallenge = async () => {
    const reason = window.prompt('Please provide a reason for cancelling this challenge (optional):');
    if (reason === null) return;

    try {
      setActionLoading(true);
      await cancelChallenge(id, reason);
      fetchChallenge();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel challenge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndoMilestone = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to revert this milestone progress?')) return;
    try {
      setActionLoading(true);
      await undoMilestone(id, milestoneId);
      fetchChallenge();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to undo milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMilestoneCompleted = () => {
    fetchChallenge();
  };

  const handlePostUpdate = async (updateData) => {
    await createChallengeUpdate(id, updateData);
    fetchUpdates(1);
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!window.confirm('Are you sure you want to remove this update?')) return;
    try {
      await deleteChallengeUpdate(id, updateId);
      setUpdates((prev) => prev.filter((u) => u._id !== updateId));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete update');
    }
  };

  const handleLoadMoreUpdates = () => {
    if (pagination.page < pagination.totalPages) {
      fetchUpdates(pagination.page + 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Loading challenge details...
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {error || 'Challenge Not Found'}
        </h2>
        <Button variant="outline" onClick={() => navigate('/challenges')}>
          Back to Challenges
        </Button>
      </div>
    );
  }

  const isTeam = challenge.participationType === 'TEAM';
  const isCancelled = challenge.status === 'CANCELLED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/challenges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Challenges</span>
        </Link>
      </div>

      {/* Challenge Header Card */}
      <Card className="p-6 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="teal" icon={Target} className="text-xs font-semibold">
                {challenge.associatedSkill}
              </Badge>
              <Badge variant={isTeam ? 'indigo' : 'cyan'} className="text-xs">
                {isTeam ? 'Team Sprint' : 'Individual Challenge'}
              </Badge>
              <Badge
                variant={
                  challenge.status === 'ACTIVE'
                    ? 'emerald'
                    : challenge.status === 'UPCOMING'
                    ? 'indigo'
                    : challenge.status === 'COMPLETED'
                    ? 'purple'
                    : 'rose'
                }
                className="text-xs font-bold"
              >
                {challenge.status}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {challenge.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed whitespace-pre-line">
              {challenge.description}
            </p>
          </div>

          {/* Action Button Area */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {!isJoined && !isCancelled && challenge.status !== 'COMPLETED' && (
              <Button
                variant="primary"
                onClick={handleJoin}
                loading={actionLoading}
                className="shadow-sm"
              >
                {isTeam ? 'Join with Team Workspace' : 'Join Challenge'}
              </Button>
            )}

            {isJoined && !isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                loading={actionLoading}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
              >
                Leave Challenge
              </Button>
            )}

            {(isCreator || isAdmin) && !isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelChallenge}
                loading={actionLoading}
                className="text-slate-600 hover:text-rose-600"
              >
                Cancel Challenge
              </Button>
            )}
          </div>
        </div>

        {/* Challenge Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Schedule
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(challenge.startDate).toLocaleDateString()} – {new Date(challenge.endDate).toLocaleDateString()}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Participants
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {challenge.participantCount || 0} {challenge.capacity ? `/ ${challenge.capacity}` : ''} enrolled
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Organized By
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {challenge.creator?.name || 'Community Member'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Target Goal
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {challenge.associatedGoalTitle || 'General Mastery'}
            </span>
          </div>
        </div>

        {/* Progress Tracker Banner (if enrolled) */}
        {isJoined && (
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-500/20 dark:border-teal-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>
                  {userParticipation.status === 'COMPLETED'
                    ? '🎉 You have completed all deliverables for this challenge!'
                    : 'Your Milestone Completion Progress'}
                </span>
              </span>
              <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {userParticipation.teamWorkspace && (
              <p className="text-[11px] text-teal-700 dark:text-teal-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Enrolled as team: <strong>{userParticipation.teamWorkspace?.title || 'Collaborative Workspace'}</strong></span>
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Deliverable Milestones Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Deliverable Milestones ({challenge.milestones?.length || 0})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {completedMilestoneIds.size} of {challenge.milestones?.length || 0} completed
          </span>
        </div>

        <div className="space-y-3">
          {(challenge.milestones || []).map((milestone, idx) => {
            const isCompleted = completedMilestoneIds.has(milestone._id?.toString() || milestone._id);
            const completionRecord = (userParticipation?.completedMilestones || []).find(
              (m) => (m.milestoneId?.toString() || m.milestoneId) === (milestone._id?.toString() || milestone._id)
            );

            return (
              <Card
                key={milestone._id || idx}
                className={`p-4 transition-all border ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Stage {idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {milestone.title}
                        </h3>
                      </div>

                      {milestone.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.criteria && (
                        <div className="mt-2 text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg inline-block font-medium">
                          <span className="font-bold">Acceptance Criteria: </span>
                          {milestone.criteria}
                        </div>
                      )}

                      {isCompleted && completionRecord && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 text-[11px] text-emerald-700 dark:text-emerald-300 flex flex-wrap items-center gap-2">
                          <span>
                            Completed on {new Date(completionRecord.completedAt).toLocaleDateString()}
                          </span>
                          {completionRecord.note && (
                            <span className="italic">
                              • Note: "{completionRecord.note}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete / Undo Buttons */}
                  {isJoined && !isCancelled && (
                    <div className="shrink-0 self-end sm:self-center">
                      {isCompleted ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUndoMilestone(milestone._id)}
                          icon={RotateCcw}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Undo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setActiveMilestoneForModal(milestone)}
                          className="text-xs"
                        >
                          Complete Stage
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Rules Section (if any) */}
      {challenge.rules?.length > 0 && (
        <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Sprint Rules & Participation Guidelines</span>
          </h3>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {challenge.rules.map((rule, idx) => (
              <li key={idx} className="leading-relaxed">
                {rule}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Community Updates & Discussion Feed */}
      <ChallengeUpdatesSection
        challengeId={id}
        updates={updates}
        currentUserId={user?._id}
        isAdmin={isAdmin}
        isJoined={isJoined}
        onPostUpdate={handlePostUpdate}
        onDeleteUpdate={handleDeleteUpdate}
        pagination={pagination}
        onLoadMore={handleLoadMoreUpdates}
      />

      {/* Modals */}
      {activeMilestoneForModal && (
        <ChallengeMilestoneModal
          isOpen={Boolean(activeMilestoneForModal)}
          onClose={() => setActiveMilestoneForModal(null)}
          challengeId={id}
          milestone={activeMilestoneForModal}
          onMilestoneCompleted={handleMilestoneCompleted}
        />
      )}

      {isTeamJoinModalOpen && (
        <ChallengeTeamJoinModal
          isOpen={isTeamJoinModalOpen}
          onClose={() => setIsTeamJoinModalOpen(false)}
          challenge={challenge}
          onJoined={fetchChallenge}
        />
      )}
    </div>
  );
};

export default ChallengeDetailPage;
