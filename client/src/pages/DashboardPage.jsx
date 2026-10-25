import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Users,
  Zap,
  Plus,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  Star,
  Award,
  CheckCircle2,
  Pause,
  Play,
  Sparkles,
  ChevronRight,
  X,
  Compass,
  Check,
  BookOpen,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import GoalCreateModal from '../components/goals/GoalCreateModal';
import OnboardingTourModal from '../components/common/OnboardingTourModal';
import { getGoals, updateGoal } from '../services/goalService';
import { getDashboardFeed, dismissOnboarding } from '../services/userService';

export const DashboardPage = () => {
  const [goals, setGoals] = useState([]);
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [onboardingDismissedLocal, setOnboardingDismissedLocal] = useState(false);
  const [isTogglingGoalStatus, setIsTogglingGoalStatus] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, feedRes] = await Promise.all([
        getGoals(),
        getDashboardFeed().catch((err) => {
          console.warn('[Dashboard Feed Fetch Warning]', err.message);
          return null;
        }),
      ]);

      if (goalsRes?.data?.goals) {
        setGoals(goalsRes.data.goals);
      }

      if (feedRes?.data) {
        setFeed(feedRes.data);
      }
    } catch (e) {
      console.warn('[Dashboard Fetch Error]', e.message);
      setError(e?.response?.data?.message || e.message || 'Unable to load dashboard. The server may be waking up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDismissOnboardingCard = async () => {
    setOnboardingDismissedLocal(true);
    try {
      localStorage.setItem('enhanceus_tour_dismissed', 'true');
      await dismissOnboarding();
    } catch (err) {
      console.warn('[Dismiss Onboarding Error]', err.message);
    }
  };

  const handleToggleGoalPause = async (goalId, currentStatus) => {
    if (isTogglingGoalStatus) return;
    setIsTogglingGoalStatus(true);
    try {
      const newStatus = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
      await updateGoal(goalId, { status: newStatus });
      await fetchDashboardData();
    } catch (err) {
      console.warn('[Goal Status Toggle Error]', err.message);
    } finally {
      setIsTogglingGoalStatus(false);
    }
  };

  // Metrics calculation
  const totalGoals = feed?.metrics?.totalGoals ?? goals.length;
  const activeGoalsCount = feed?.metrics?.activeGoals ?? goals.filter((g) => g.status === 'ACTIVE').length;
  const avgProgress =
    feed?.metrics?.avgProgress ??
    (goals.length > 0
      ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length)
      : 0);
  const totalGaps =
    feed?.metrics?.totalGaps ??
    goals.reduce((acc, g) => acc + (g.skillGaps?.missingSkills?.length || 0), 0);
  const sessionsCount = feed?.metrics?.sessionsCompleted ?? 0;

  // Onboarding Checklist visibility
  const showOnboardingCard =
    feed?.onboarding &&
    !feed.onboarding.isCompleted &&
    !feed.onboarding.dismissedAt &&
    !onboardingDismissedLocal;

  const unfinishedLearning = feed?.unfinishedLearning;
  const nextBestActions = feed?.nextBestActions || [];
  const activityTimeline = feed?.activityTimeline || [];
  const returnSummary = feed?.returnSummary;

  return (
    <PageContainer
      title="Learning Dashboard"
      subtitle="Personalized next actions, learning continuity, and peer skill exchange progress."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Compass}
            onClick={() => setIsTourModalOpen(true)}
          >
            Guided Walkthrough
          </Button>
          <Button leftIcon={Plus} size="sm" onClick={() => setIsCreateModalOpen(true)}>
            New Goal Blueprint
          </Button>
        </div>
      }
    >
      {/* 1. RESPECTFUL RETURN / WELCOME BACK BANNER */}
      {returnSummary && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-50 to-indigo-500/10 dark:from-teal-950/40 dark:via-slate-900 dark:to-indigo-950/30 border border-teal-200/60 dark:border-teal-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {returnSummary.greeting}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {returnSummary.message}
            </p>
          </div>
          {returnSummary.hasActiveGoal && (
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <Link to={returnSummary.continueLink}>
                <Button size="sm" variant="primary" rightIcon={ArrowRight} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Resume {returnSummary.activeGoalTitle ? `"${returnSummary.activeGoalTitle.substring(0, 20)}..."` : 'Learning'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 2. ONBOARDING & GETTING STARTED CHECKLIST (FOR NEW / INCOMPLETE ONBOARDING USERS) */}
      {showOnboardingCard && (
        <Card className="mb-8 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 to-transparent dark:from-indigo-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base">Getting Started Checklist</CardTitle>
              </div>
              <CardDescription>
                Complete these 3 foundational steps to unlock reciprocal skill exchanges.
              </CardDescription>
            </div>
            <button
              onClick={handleDismissOnboardingCard}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Dismiss checklist"
            >
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {feed.onboarding.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    step.completed
                      ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.completed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {step.completed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {step.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[11px] font-medium text-slate-500">
                      {step.completed ? 'Completed' : 'Action needed'}
                    </span>
                    <Link to={step.link}>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                        {step.actionText}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. HIGH-LEVEL PLATFORM METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Goals</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{activeGoalsCount}</span>
            <Badge variant="teal">{totalGoals} Total</Badge>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Identified Skill Gaps</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalGaps}</span>
            <Badge variant="rose">Target Competencies</Badge>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Skill Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{avgProgress}%</span>
            <Badge variant="emerald">Profile Fit</Badge>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{sessionsCount}</span>
            <Badge variant="indigo">Exchanges</Badge>
          </div>
        </Card>
      </div>

      {/* 4. PERSONALIZED NEXT-BEST ACTIONS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Your Next Steps</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prioritized recommendations derived from your active goals, upcoming sessions, and peer exchanges.
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 hidden sm:inline-block">
            {nextBestActions.length} Actions Available
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" label="Analyzing next best actions..." />
          </div>
        ) : nextBestActions.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">All caught up!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              You have no pending reviews, upcoming sessions, or overdue milestone tasks. Create a new goal blueprint or explore circles to keep learning.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextBestActions.map((action) => {
              const priorityVariant =
                action.priority === 'HIGH' || action.priority === 'URGENT'
                  ? 'rose'
                  : action.priority === 'MEDIUM'
                  ? 'teal'
                  : 'slate';

              return (
                <div
                  key={action.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between gap-3 hover:border-teal-500/50 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={priorityVariant} className="text-[10px] uppercase font-bold tracking-wider">
                        {action.priority} Priority
                      </Badge>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {action.reason}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {action.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                    <Link to={action.link}>
                      <Button size="sm" variant="outline" rightIcon={ArrowRight} className="text-xs font-semibold">
                        {action.actionLabel}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. LEARNING CONTINUITY & ACTIVITY TIMELINE (SIDE BY SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Cols: Learning Continuity & Unfinished Goals */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Learning Continuity</CardTitle>
                <CardDescription>
                  Resume what you started. Progress is derived from completed milestone criteria.
                </CardDescription>
              </div>
              {unfinishedLearning && (
                <Badge variant={unfinishedLearning.status === 'PAUSED' ? 'amber' : 'teal'}>
                  {unfinishedLearning.status === 'PAUSED' ? 'Paused' : 'Active Goal'}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {unfinishedLearning ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {unfinishedLearning.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {unfinishedLearning.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400">
                          {unfinishedLearning.progress}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">Progress</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${unfinishedLearning.progress}%` }}
                      />
                    </div>

                    {/* Milestone Context */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300">
                          Next Milestone: <strong className="text-slate-900 dark:text-slate-100">{unfinishedLearning.currentMilestoneTitle}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={unfinishedLearning.status === 'PAUSED' ? Play : Pause}
                          onClick={() =>
                            handleToggleGoalPause(
                              unfinishedLearning.goalId,
                              unfinishedLearning.status
                            )
                          }
                          disabled={isTogglingGoalStatus}
                          className="text-xs"
                        >
                          {unfinishedLearning.status === 'PAUSED' ? 'Resume Goal' : 'Pause Goal'}
                        </Button>
                        <Link to={unfinishedLearning.continueLink}>
                          <Button size="sm" variant="primary" rightIcon={ArrowRight} className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
                            Continue Learning
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="No In-Progress Goals"
                  description="You do not have any active or paused goals. Create a new goal blueprint to begin tracking milestones."
                  actionLabel="Create Goal Blueprint"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              )}
            </CardContent>
          </Card>

          {/* Active Goal Blueprints Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">All Goal Blueprints</CardTitle>
                <CardDescription>
                  Full list of created goals, skill extraction matrices, and status.
                </CardDescription>
              </div>
              <Link to="/goals">
                <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No goals created yet.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g) => (
                    <div
                      key={g._id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={g.status === 'PAUSED' ? 'amber' : g.status === 'COMPLETED' ? 'emerald' : 'teal'}>
                            {g.status}
                          </Badge>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                            {g.title}
                          </h5>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{g.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                          {g.progress || 0}%
                        </span>
                        <Link to={`/goals/${g._id}`}>
                          <Button variant="outline" size="sm" rightIcon={ArrowRight} className="text-xs">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Personalized Activity Timeline */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base">Your Activity</CardTitle>
              </div>
              <CardDescription>
                Chronological timeline of milestone completions, sessions, and reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" label="Loading activity..." />
                </div>
              ) : activityTimeline.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  No events recorded yet. Complete your first session or milestone to see activity here.
                </div>
              ) : (
                <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {activityTimeline.map((item) => (
                    <div key={item.id} className="relative text-xs">
                      <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                        <Link to={item.link} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors block">
                          {item.title}
                        </Link>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                          {new Date(item.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Goal Create Modal */}
      <GoalCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={fetchDashboardData}
      />

      {/* Onboarding Tour Revisit Modal */}
      <OnboardingTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </PageContainer>
  );
};

export default DashboardPage;
