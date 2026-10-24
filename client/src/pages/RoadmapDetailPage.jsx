import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Layers,
  Sparkles,
  Target,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Users,
  Search,
  BookOpen,
  Trash2,
  Calendar,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  GitBranch,
  GitFork,
  Lock,
  Unlock,
  PlayCircle,
  RefreshCw,
  Info,
  Check,
  Award,
  CheckSquare,
  Square,
  Play,
  RotateCcw,
  AlertOctagon,
  FileEdit,
  Plus,
  Activity,
  ArrowRight,
  CornerDownRight,
} from 'lucide-react';
import {
  getRoadmap,
  deleteRoadmap,
  analyzeRoadmapDependencies,
  updateMilestone,
  proposeMilestoneBreakdown,
  applyMilestoneBreakdown,
  initializeMilestones,
} from '../services/roadmapService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import LearningAssistantPanel from '../components/assistant/LearningAssistantPanel';
import CuratedResourcesList from '../components/resources/CuratedResourcesList';
import { createFromMilestone } from '../services/portfolioService';

export const RoadmapDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab: 'milestones' | 'learning-order' | 'stages' | 'skills' | 'assistant' | 'resources'
  const [activeTab, setActiveTab] = useState('milestones');
  const [selectedCoachMilestone, setSelectedCoachMilestone] = useState(null);
  const [selectedResourceMilestone, setSelectedResourceMilestone] = useState(null);

  // Competency tab filter: 'all' | 'possessed' | 'gaps'
  const [skillFilter, setSkillFilter] = useState('all');

  // Learning order filter: 'all' | 'ready' | 'blocked' | 'satisfied'
  const [orderFilter, setOrderFilter] = useState('all');

  // Milestone filter: 'all' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  const [milestoneFilter, setMilestoneFilter] = useState('all');

  // Prerequisite analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisSuccessNotice, setAnalysisSuccessNotice] = useState(null);

  // Milestone action states
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Notes Modal state
  const [noteModalMilestone, setNoteModalMilestone] = useState(null);
  const [learnerNoteInput, setLearnerNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Blocker Modal state
  const [blockerModalMilestone, setBlockerModalMilestone] = useState(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');
  const [isSavingBlocker, setIsSavingBlocker] = useState(false);

  // Adaptive Breakdown Modal state
  const [breakdownModalMilestone, setBreakdownModalMilestone] = useState(null);
  const [breakdownUserNote, setBreakdownUserNote] = useState('');
  const [isProposingBreakdown, setIsProposingBreakdown] = useState(false);
  const [proposedBreakdownData, setProposedBreakdownData] = useState(null);
  const [isApplyingBreakdown, setIsApplyingBreakdown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Portfolio Claim Modal state
  const [portfolioModalMilestone, setPortfolioModalMilestone] = useState(null);
  const [portfolioEvidenceUrl, setPortfolioEvidenceUrl] = useState('');
  const [portfolioVisibility, setPortfolioVisibility] = useState('PUBLIC');
  const [isClaimingPortfolio, setIsClaimingPortfolio] = useState(false);
  const [portfolioSuccessMsg, setPortfolioSuccessMsg] = useState(null);

  const fetchRoadmap = async (keepTab = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRoadmap(id);
      if (res?.data?.roadmap) {
        const fetched = res.data.roadmap;
        setRoadmap(fetched);
        if (!keepTab) {
          if (fetched.milestones && fetched.milestones.length > 0) {
            setActiveTab('milestones');
          } else if (fetched.dependencyAnalysisStatus === 'COMPLETED' && fetched.learningOrder?.length > 0) {
            setActiveTab('learning-order');
          } else {
            setActiveTab('stages');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve roadmap details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, [id]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteRoadmap(id);
      navigate('/roadmaps');
    } catch (err) {
      alert(err.message || 'Failed to delete roadmap.');
      setIsDeleting(false);
    }
  };

  const handleAnalyzeDependencies = async (forceRecalculate = false) => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setAnalysisSuccessNotice(null);
      const res = await analyzeRoadmapDependencies(id, { forceRecalculate });
      if (res?.data?.roadmap) {
        setRoadmap(res.data.roadmap);
        setAnalysisSuccessNotice(
          forceRecalculate
            ? 'Prerequisite learning order successfully recalculated with latest profile data.'
            : 'Intelligent prerequisite dependencies and learning order successfully analyzed!'
        );
        setTimeout(() => setAnalysisSuccessNotice(null), 6000);
      }
    } catch (err) {
      setAnalysisError(err.message || 'Failed to analyze skill dependencies.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInitializeMilestones = async () => {
    try {
      setIsLoading(true);
      const res = await initializeMilestones(id);
      if (res?.data?.roadmap) {
        setRoadmap(res.data.roadmap);
        setActiveTab('milestones');
        setActionFeedback({ type: 'success', message: 'V2.3 Adaptive Milestones initialized successfully!' });
        setTimeout(() => setActionFeedback(null), 5000);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to initialize milestones.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Milestone Action Handlers
  const handleMilestoneAction = async (milestoneId, action, extraPayload = {}) => {
    try {
      setUpdatingMilestoneId(milestoneId);
      setActionFeedback(null);
      const res = await updateMilestone(id, milestoneId, { action, ...extraPayload });
      if (res?.data?.roadmap) {
        setRoadmap(res.data.roadmap);
        const actionLabel =
          action === 'START'
            ? 'Milestone marked as in progress!'
            : action === 'COMPLETE'
            ? 'Milestone marked as completed! Next recommendation updated.'
            : action === 'REOPEN'
            ? 'Milestone reopened and progress recalculated.'
            : 'Milestone updated successfully.';
        setActionFeedback({ type: 'success', message: actionLabel });
        setTimeout(() => setActionFeedback(null), 5000);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Action failed.' });
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  // Save Learner Note
  const handleSaveNote = async () => {
    if (!noteModalMilestone) return;
    try {
      setIsSavingNote(true);
      await handleMilestoneAction(noteModalMilestone.milestoneId, 'UPDATE_NOTES', {
        learnerNotes: learnerNoteInput,
      });
      setNoteModalMilestone(null);
      setLearnerNoteInput('');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Save Blocker
  const handleSaveBlocker = async () => {
    if (!blockerModalMilestone) return;
    try {
      setIsSavingBlocker(true);
      await handleMilestoneAction(blockerModalMilestone.milestoneId, 'REPORT_BLOCKER', {
        blockedReason: blockerReasonInput,
      });
      setBlockerModalMilestone(null);
      setBlockerReasonInput('');
    } finally {
      setIsSavingBlocker(false);
    }
  };

  // Adaptive Breakdown Flow
  const handleOpenBreakdownModal = (milestone) => {
    setBreakdownModalMilestone(milestone);
    setBreakdownUserNote(milestone.blockedReason || '');
    setProposedBreakdownData(null);
    setBreakdownError(null);
  };

  const handleProposeBreakdown = async () => {
    if (!breakdownModalMilestone) return;
    try {
      setIsProposingBreakdown(true);
      setBreakdownError(null);
      const res = await proposeMilestoneBreakdown(id, breakdownModalMilestone.milestoneId, {
        userNote: breakdownUserNote,
      });
      if (res?.data) {
        setProposedBreakdownData(res.data);
      }
    } catch (err) {
      setBreakdownError(err.response?.data?.message || err.message || 'Failed to propose adaptive breakdown.');
    } finally {
      setIsProposingBreakdown(false);
    }
  };

  const handleApplyBreakdown = async () => {
    if (!breakdownModalMilestone || !proposedBreakdownData?.subMilestones) return;
    try {
      setIsApplyingBreakdown(true);
      setBreakdownError(null);
      const res = await applyMilestoneBreakdown(id, breakdownModalMilestone.milestoneId, {
        subMilestones: proposedBreakdownData.subMilestones,
        reason: breakdownUserNote || 'Learner requested adaptive breakdown of challenging milestone',
      });
      if (res?.data?.roadmap) {
        setRoadmap(res.data.roadmap);
        setBreakdownModalMilestone(null);
        setProposedBreakdownData(null);
        setActionFeedback({
          type: 'success',
          message: 'Milestone successfully adapted into smaller steps! Learning history was 100% preserved.',
        });
        setTimeout(() => setActionFeedback(null), 6000);
      }
    } catch (err) {
      setBreakdownError(err.response?.data?.message || err.message || 'Failed to apply adaptive breakdown.');
    } finally {
      setIsApplyingBreakdown(false);
    }
  };

  // Claim Completed Milestone into Portfolio
  const handleClaimPortfolio = async (e) => {
    e.preventDefault();
    if (!portfolioModalMilestone) return;
    try {
      setIsClaimingPortfolio(true);
      await createFromMilestone({
        roadmapId: id,
        milestoneId: portfolioModalMilestone.milestoneId,
        evidenceUrl: portfolioEvidenceUrl.trim(),
        visibility: portfolioVisibility,
      });
      setPortfolioSuccessMsg('Milestone successfully verified and added to your Proof-of-Skill Portfolio!');
      setTimeout(() => {
        setPortfolioSuccessMsg(null);
        setPortfolioModalMilestone(null);
        setPortfolioEvidenceUrl('');
      }, 1800);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to claim milestone into portfolio');
    } finally {
      setIsClaimingPortfolio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Roadmap Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || 'The requested learning roadmap does not exist or you do not have permission to view it.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <Button onClick={() => navigate('/roadmaps')} variant="outline" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Roadmaps
            </Button>
            <Button onClick={() => fetchRoadmap()} variant="teal" className="text-xs">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allSkills = roadmap.skills || [];
  const possessedSkills = allSkills.filter((s) => s.isPossessed);
  const gapSkills = allSkills.filter((s) => !s.isPossessed);

  const displayedSkills =
    skillFilter === 'possessed'
      ? possessedSkills
      : skillFilter === 'gaps'
      ? gapSkills
      : allSkills;

  const isAnalyzed = roadmap.dependencyAnalysisStatus === 'COMPLETED' && Array.isArray(roadmap.learningOrder);
  const learningSteps = roadmap.learningOrder || [];

  const readySteps = learningSteps.filter((s) => s.status === 'READY');
  const blockedSteps = learningSteps.filter((s) => s.status === 'BLOCKED');
  const satisfiedSteps = learningSteps.filter((s) => s.status === 'SATISFIED');

  const displayedSteps =
    orderFilter === 'ready'
      ? readySteps
      : orderFilter === 'blocked'
      ? blockedSteps
      : orderFilter === 'satisfied'
      ? satisfiedSteps
      : learningSteps;

  // V2.3 Milestones & Progress
  const milestones = roadmap.milestones || [];
  const progress = roadmap.progress || {
    totalMilestones: milestones.length,
    completedCount: milestones.filter((m) => m.status === 'COMPLETED').length,
    inProgressCount: milestones.filter((m) => m.status === 'IN_PROGRESS').length,
    blockedCount: milestones.filter((m) => m.status === 'BLOCKED').length,
    remainingCount: milestones.filter((m) => m.status !== 'COMPLETED').length,
    completionPercentage: 0,
  };

  const displayedMilestones =
    milestoneFilter === 'all'
      ? milestones
      : milestones.filter((m) => m.status === milestoneFilter);

  const nextRec = progress.nextRecommendedMilestone;

  const getPriorityBadgeVariant = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'rose';
      case 'medium':
        return 'amber';
      case 'low':
      default:
        return 'slate';
    }
  };

  const getMilestoneStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-100/90 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60 shadow-xs">
            <PlayCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            In Progress
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Blocked
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Circle className="w-3.5 h-3.5 text-slate-400" />
            Not Started
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
            <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Ready to Learn Now
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Blocked by Prerequisites
          </span>
        );
      case 'SATISFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100/90 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Already Satisfied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Circle className="w-3 h-3 text-slate-400" />
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Actions Top Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/roadmaps"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Roadmaps
          </Link>

          <div className="flex items-center gap-2">
            {roadmap.goal?._id && (
              <Link
                to={`/goals/${roadmap.goal._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 transition-colors"
              >
                <Target className="w-3.5 h-3.5" />
                View Associated Goal
              </Link>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete roadmap"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Action Feedback Notice */}
        {actionFeedback && (
          <div
            className={`p-4 border rounded-2xl flex items-center justify-between gap-3 text-xs animate-fadeIn ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs font-bold underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Notice Banner */}
        {analysisSuccessNotice && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{analysisSuccessNotice}</span>
            </div>
            <button
              onClick={() => setAnalysisSuccessNotice(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Notice Banner */}
        {analysisError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{analysisError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnalyzeDependencies(false)}
              className="text-xs bg-white dark:bg-slate-800 text-rose-700 border-rose-300"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Hero Roadmap Overview Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="teal" className="text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                  V2.3 Adaptive Progress & Milestones
                </Badge>

                {isAnalyzed && (
                  <Badge variant="outline" className="text-[11px] font-bold border-teal-300 text-teal-800 dark:text-teal-300">
                    <GitBranch className="w-3 h-3 mr-1" />
                    Prerequisites Validated
                  </Badge>
                )}

                {roadmap.goal?.title && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Goal: <span className="font-semibold text-slate-700 dark:text-slate-200">{roadmap.goal.title}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {roadmap.title}
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {roadmap.goalSummary}
              </p>
            </div>

            {/* Estimated Duration Pill */}
            <div className="shrink-0 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center w-full md:w-auto md:min-w-[180px]">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Estimated Duration
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {roadmap.estimatedDuration}
              </div>
            </div>
          </div>

          {/* V2.3 PROGRESS BAR & METRICS OVERVIEW */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Overall Roadmap Progress
                </span>
                <span className="text-teal-700 dark:text-teal-300 font-extrabold text-sm">
                  {progress.completionPercentage}% Complete
                </span>
              </div>

              {/* Accessible HTML5 Progress Bar */}
              <div
                role="progressbar"
                aria-valuenow={progress.completionPercentage}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Roadmap milestone progress"
                className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700"
              >
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs"
                  style={{ width: `${Math.min(100, Math.max(0, progress.completionPercentage))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {progress.completedCount} of {progress.totalMilestones} milestones completed
                </span>
                {progress.lastActivityAt && (
                  <span>
                    Last activity: {new Date(progress.lastActivityAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* 4 Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                  Completed
                </span>
                <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
                  {progress.completedCount}
                </span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block">Milestones</span>
              </div>

              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                  In Progress
                </span>
                <span className="text-xl font-extrabold text-teal-900 dark:text-teal-100">
                  {progress.inProgressCount}
                </span>
                <span className="text-[10px] text-teal-700/80 dark:text-teal-400 block">Active focus</span>
              </div>

              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  Blocked
                </span>
                <span className="text-xl font-extrabold text-amber-900 dark:text-amber-100">
                  {progress.blockedCount}
                </span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block">Prerequisites / Obstacles</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Remaining
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {progress.remainingCount}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ahead</span>
              </div>
            </div>
          </div>

          {/* V2.3 ADAPTIVE NEXT ACTION HERO CARD */}
          {nextRec ? (
            <div className="p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-sky-500/10 dark:from-teal-950/50 dark:via-emerald-950/50 dark:to-sky-950/50 border border-teal-200 dark:border-teal-800/70 rounded-3xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-600 text-white shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      Recommended Next Step
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Stage {nextRec.stageNumber} • {nextRec.skillName}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {nextRec.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    <strong className="text-teal-800 dark:text-teal-300">Why this is next:</strong> {nextRec.reason}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {/* Action CTA depending on next milestone's actual status */}
                  {(() => {
                    const nextMs = milestones.find((m) => m.milestoneId === nextRec.milestoneId);
                    if (!nextMs || nextMs.status === 'NOT_STARTED') {
                      return (
                        <Button
                          variant="teal"
                          size="sm"
                          disabled={updatingMilestoneId === nextRec.milestoneId}
                          onClick={() => handleMilestoneAction(nextRec.milestoneId, 'START')}
                          className="font-bold text-xs px-4 py-2 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          Start Milestone
                        </Button>
                      );
                    }
                    if (nextMs.status === 'IN_PROGRESS') {
                      return (
                        <Button
                          variant="teal"
                          size="sm"
                          disabled={updatingMilestoneId === nextRec.milestoneId}
                          onClick={() => handleMilestoneAction(nextRec.milestoneId, 'COMPLETE')}
                          className="font-bold text-xs px-4 py-2 shadow-sm bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Mark Completed
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextMs = milestones.find((m) => m.milestoneId === nextRec.milestoneId);
                      setSelectedCoachMilestone(nextMs || null);
                      setActiveTab('assistant');
                    }}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                    Ask Coach
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('milestones');
                      const el = document.getElementById(`milestone-${nextRec.milestoneId}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="text-xs bg-white dark:bg-slate-800"
                  >
                    View Details
                  </Button>
                </div>
              </div>

              {/* Parallel Available Milestones Notice */}
              {progress.parallelEligibleMilestones && progress.parallelEligibleMilestones.length > 0 && (
                <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/40 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <GitFork className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>
                    <strong>Can be studied in parallel:</strong>{' '}
                    {progress.parallelEligibleMilestones.map((p) => p.title).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          ) : progress.remainingCount === 0 && progress.totalMilestones > 0 ? (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl flex items-center gap-3">
              <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                  All Milestones Completed!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Congratulations! You have fulfilled all required milestones for this learning roadmap. You can review your notes or exchange skills with peers anytime.
                </p>
              </div>
            </div>
          ) : null}

          {/* Qualified Timeline Disclaimer */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="font-bold">Adaptive Progress Tracking:</strong> EnhanceUs dynamically adapts your roadmap as you complete milestones. Completing foundational milestones unblocks downstream skills automatically.
            </p>
          </div>

          {/* Assumptions Box */}
          {roadmap.assumptions && roadmap.assumptions.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Key Baseline Assumptions
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                {roadmap.assumptions.map((assumption, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'milestones'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Milestones & Progress
            <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-white/20 dark:bg-white/10 rounded-full">
              {milestones.length}
            </span>
          </button>

          {isAnalyzed && (
            <button
              onClick={() => setActiveTab('learning-order')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'learning-order'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Prerequisite Learning Order
              <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full">
                {learningSteps.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('stages')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'stages'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Learning Stages
            <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full">
              {(roadmap.stages || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'skills'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Competencies & Gaps
            <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full">
              {allSkills.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'assistant'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 dark:text-teal-300" />
            AI Learning Coach
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-amber-400/20 text-amber-600 dark:text-amber-200 rounded-full font-extrabold uppercase tracking-wider">
              V2.4
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'resources'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Curated Resources
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full font-bold">
              Verified
            </span>
          </button>
        </div>

        {/* TAB 1: V2.3 MILESTONES & PROGRESS TIMELINE */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Roadmap Milestones & Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Concrete, identifiable learning outcomes. Track your progress, record learner notes, and break down challenging steps.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setMilestoneFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  All ({milestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('NOT_STARTED')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === 'NOT_STARTED'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Not Started ({milestones.filter((m) => m.status === 'NOT_STARTED').length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('IN_PROGRESS')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === 'IN_PROGRESS'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  In Progress ({progress.inProgressCount})
                </button>
                <button
                  onClick={() => setMilestoneFilter('COMPLETED')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === 'COMPLETED'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Completed ({progress.completedCount})
                </button>
                <button
                  onClick={() => setMilestoneFilter('BLOCKED')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === 'BLOCKED'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Blocked ({progress.blockedCount})
                </button>
              </div>
            </div>

            {/* Empty Milestones State */}
            {milestones.length === 0 ? (
              <Card className="p-8 text-center space-y-4">
                <Target className="w-10 h-10 text-teal-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    No Milestones Initialized Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Generate persistent V2.3 learning milestones from your roadmap stages and skills to start tracking progress.
                  </p>
                </div>
                <Button
                  variant="teal"
                  onClick={handleInitializeMilestones}
                  className="text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Initialize V2.3 Milestones
                </Button>
              </Card>
            ) : displayedMilestones.length === 0 ? (
              <Card className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No milestones match the selected filter.
                </p>
                <p className="text-xs text-slate-500">
                  Switch back to "All" to view your complete milestone list.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {displayedMilestones.map((milestone, idx) => {
                  const isUpdating = updatingMilestoneId === milestone.milestoneId;
                  const isBlocked = milestone.status === 'BLOCKED';
                  const isCompleted = milestone.status === 'COMPLETED';
                  const isInProgress = milestone.status === 'IN_PROGRESS';
                  const isNotStarted = milestone.status === 'NOT_STARTED';

                  return (
                    <Card
                      key={milestone.milestoneId || idx}
                      id={`milestone-${milestone.milestoneId}`}
                      className={`p-6 border transition-all ${
                        isCompleted
                          ? 'border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isInProgress
                          ? 'border-teal-300 dark:border-teal-700/60 ring-2 ring-teal-500/20 dark:ring-teal-500/10'
                          : isBlocked
                          ? 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/10'
                          : 'border-slate-200/90 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            {/* Step Badge */}
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : isInProgress
                                  ? 'bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-950/60'
                                  : isBlocked
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {milestone.orderIndex < 10 ? `0${milestone.orderIndex}` : milestone.orderIndex}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                  {milestone.title}
                                </h3>
                                {milestone.isAdaptiveAddition && (
                                  <Badge variant="teal" className="text-[10px] uppercase font-bold">
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                    Adaptive Sub-Step
                                  </Badge>
                                )}
                                {milestone.priority && (
                                  <Badge
                                    variant={getPriorityBadgeVariant(milestone.priority)}
                                    className="text-[10px] uppercase font-bold"
                                  >
                                    {milestone.priority}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Stage {milestone.stageNumber}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-teal-700 dark:text-teal-300">
                                  {milestone.skillName}
                                </span>
                                {milestone.completedAt && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                      Completed on {new Date(milestone.completedAt).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 self-start sm:self-auto">
                            {getMilestoneStatusBadge(milestone.status)}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {milestone.description}
                        </p>

                        {/* Completion Criteria Checklist Box */}
                        {milestone.completionCriteria && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1">
                            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              Completion Criteria:
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 pl-5 leading-relaxed">
                              {milestone.completionCriteria}
                            </p>
                          </div>
                        )}

                        {/* Blocked Reason Callout */}
                        {isBlocked && milestone.blockedReason && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                            <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold block">Why this milestone is blocked:</span>
                              <p className="leading-relaxed">{milestone.blockedReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Required Prerequisites Status */}
                        {milestone.requiredPrerequisites && milestone.requiredPrerequisites.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Prerequisites:
                            </span>
                            {milestone.requiredPrerequisites.map((req, rIdx) => {
                              // Check if prerequisite milestone or skill is completed/satisfied
                              const reqMs = milestones.find((m) => m.skillName.toLowerCase() === req.toLowerCase());
                              const isPrereqSatisfied = reqMs?.status === 'COMPLETED';
                              return (
                                <span
                                  key={rIdx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                    isPrereqSatisfied
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {isPrereqSatisfied ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-amber-600" />
                                  )}
                                  {req}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Learner Notes Preview */}
                        {milestone.learnerNotes && (
                          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                                <FileEdit className="w-3.5 h-3.5" />
                                Learner Notes:
                              </span>
                              <button
                                onClick={() => {
                                  setNoteModalMilestone(milestone);
                                  setLearnerNoteInput(milestone.learnerNotes || '');
                                }}
                                className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline"
                              >
                                Edit Note
                              </button>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {milestone.learnerNotes}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* NOT_STARTED Actions */}
                            {isNotStarted && (
                              <Button
                                variant="teal"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => handleMilestoneAction(milestone.milestoneId, 'START')}
                                className="text-xs font-bold"
                              >
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Start Milestone
                              </Button>
                            )}

                            {/* IN_PROGRESS Actions */}
                            {isInProgress && (
                              <>
                                <Button
                                  variant="teal"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleMilestoneAction(milestone.milestoneId, 'COMPLETE')}
                                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Mark as Completed
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    setBlockerModalMilestone(milestone);
                                    setBlockerReasonInput(milestone.blockedReason || '');
                                  }}
                                  className="text-xs text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50"
                                >
                                  <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                                  Report Blocker
                                </Button>
                              </>
                            )}

                            {/* BLOCKED Actions */}
                            {isBlocked && (
                              <Button
                                variant="teal"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => handleMilestoneAction(milestone.milestoneId, 'START')}
                                className="text-xs font-bold"
                              >
                                <Unlock className="w-3.5 h-3.5 mr-1" />
                                Unblock & Start
                              </Button>
                            )}

                            {/* COMPLETED Actions */}
                            {isCompleted && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleMilestoneAction(milestone.milestoneId, 'REOPEN')}
                                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                  Reopen Milestone
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPortfolioModalMilestone(milestone);
                                    setPortfolioEvidenceUrl('');
                                    setPortfolioVisibility('PUBLIC');
                                  }}
                                  className="text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700/80 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                                >
                                  <Award className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                                  Claim as Portfolio Evidence
                                </Button>
                              </>
                            )}

                            {/* Add/Edit Note Button */}
                            {!milestone.learnerNotes && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => {
                                  setNoteModalMilestone(milestone);
                                  setLearnerNoteInput('');
                                }}
                                className="text-xs text-slate-600 dark:text-slate-400"
                              >
                                <FileEdit className="w-3.5 h-3.5 mr-1" />
                                Add Notes
                              </Button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Ask AI Coach Shortcut */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCoachMilestone(milestone);
                                setActiveTab('assistant');
                              }}
                              className="text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                              Ask AI Coach
                            </Button>

                            {/* Curated Resources Shortcut */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedResourceMilestone(milestone);
                                setActiveTab('resources');
                              }}
                              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600"
                            >
                              <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                              Resources
                            </Button>

                            {/* Adaptive Breakdown Action (Available for In-Progress or Blocked or difficult milestones) */}
                            {!isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenBreakdownModal(milestone)}
                                className="text-xs font-bold text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600 dark:text-sky-400" />
                                Break Down Step
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREREQUISITE-AWARE LEARNING ORDER (V2.2) */}
        {activeTab === 'learning-order' && isAnalyzed && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Recommended Learning Sequence
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Sequenced using deterministic topological sorting. Skills marked <strong className="text-emerald-700 dark:text-emerald-400">Ready</strong> have all required foundations satisfied.
                </p>
              </div>

              {/* Order Status Filters */}
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    orderFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  All ({learningSteps.length})
                </button>
                <button
                  onClick={() => setOrderFilter('ready')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    orderFilter === 'ready'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Ready ({readySteps.length})
                </button>
                <button
                  onClick={() => setOrderFilter('blocked')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    orderFilter === 'blocked'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Blocked ({blockedSteps.length})
                </button>
                <button
                  onClick={() => setOrderFilter('satisfied')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    orderFilter === 'satisfied'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Satisfied ({satisfiedSteps.length})
                </button>
              </div>
            </div>

            {/* Empty filter message */}
            {displayedSteps.length === 0 ? (
              <Card className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No skills match the selected filter.
                </p>
                <p className="text-xs text-slate-500">
                  Switch back to "All" to view the full learning path.
                </p>
              </Card>
            ) : (
              <div className="relative space-y-6">
                {displayedSteps.map((step, idx) => {
                  const skillDef = allSkills.find(
                    (s) => s.name.toLowerCase() === step.skillName.toLowerCase()
                  );

                  return (
                    <div key={idx} className="relative group">
                      {/* Vertical Timeline Connector Line */}
                      {idx < displayedSteps.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                      )}

                      <Card className="relative z-10 p-6 border-slate-200/90 dark:border-slate-800 hover:shadow-md transition-shadow">
                        <div className="space-y-4">
                          
                          {/* Step Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              {/* Step Number Circle */}
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                                  step.status === 'READY'
                                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                                    : step.status === 'BLOCKED'
                                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950/60'
                                    : 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                                }`}
                              >
                                {step.orderIndex < 10 ? `0${step.orderIndex}` : step.orderIndex}
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                    {step.skillName}
                                  </h3>
                                  {skillDef?.priority && (
                                    <Badge
                                      variant={getPriorityBadgeVariant(skillDef.priority)}
                                      className="text-[10px] uppercase font-bold"
                                    >
                                      {skillDef.priority} Priority
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {skillDef?.description || 'Core competency for goal achievement.'}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0 self-start sm:self-auto">
                              {getStatusBadge(step.status)}
                            </div>
                          </div>

                          {/* Pedagogical Dependency Rationale Box */}
                          {step.explanation && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs flex items-start gap-2.5">
                              <GitBranch className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                  Learning Order Rationale:
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {step.explanation}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Prerequisites breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Required Prerequisites */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                                Required Foundations:
                              </span>
                              {step.requiredPrerequisites && step.requiredPrerequisites.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {step.requiredPrerequisites.map((prereq, pIdx) => {
                                    const isSat = (step.satisfiedPrerequisites || []).includes(prereq);
                                    return (
                                      <span
                                        key={pIdx}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                          isSat
                                            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60'
                                            : 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60'
                                        }`}
                                      >
                                        {isSat ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Lock className="w-3 h-3 text-amber-600" />
                                        )}
                                        {prereq}
                                        <span className="text-[10px] font-bold opacity-80">
                                          {isSat ? '(Satisfied)' : '(Required First)'}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                                  None — foundational starting skill
                                </span>
                              )}
                            </div>

                            {/* Recommended Prerequisites */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                                Recommended Preparation:
                              </span>
                              {step.recommendedPrerequisites && step.recommendedPrerequisites.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {step.recommendedPrerequisites.map((rec, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100/80 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-700/60"
                                    >
                                      <Info className="w-3 h-3 text-sky-500" />
                                      {rec}
                                      <span className="text-[10px] font-bold opacity-80">(Recommended)</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                                  None
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Peer Exchange Callout */}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Ready to practice this skill?
                            </span>
                            <Link
                              to={`/search?q=${encodeURIComponent(step.skillName)}`}
                              className="font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                            >
                              <Users className="w-3.5 h-3.5" />
                              Find Mentors on EnhanceUs
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEARNING STAGES */}
        {activeTab === 'stages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Structured Progression Stages
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Organized by stages with core concepts, practical exercises, and completion milestones.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {(roadmap.stages || []).map((stage, idx) => (
                <Card key={idx} className="p-6 border-slate-200/90 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-black text-sm flex items-center justify-center border border-teal-200/60 dark:border-teal-800">
                        {stage.stageNumber}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          {stage.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                    {stage.duration && (
                      <Badge variant="slate" className="text-xs font-semibold self-start sm:self-auto">
                        <Clock className="w-3 h-3 mr-1 text-slate-500" />
                        {stage.duration}
                      </Badge>
                    )}
                  </div>

                  {/* Core Concepts */}
                  {stage.topics && stage.topics.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                        Core Concepts & Topics:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.topics.map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hands-on Exercises */}
                  {stage.exercises && stage.exercises.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                        Hands-on Exercises:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {stage.exercises.map((ex, eIdx) => (
                          <li key={eIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Capstone Milestone */}
                  {stage.milestone && (
                    <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 text-xs flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-teal-900 dark:text-teal-200 block">
                          Stage Capstone Milestone:
                        </span>
                        <p className="text-teal-800 dark:text-teal-300 mt-0.5 leading-relaxed">
                          {stage.milestone}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COMPETENCIES & GAPS */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Target Competencies & Skill Gaps
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Skills required to achieve your learning goal, annotated with your current profile proficiency.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setSkillFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    skillFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  All ({allSkills.length})
                </button>
                <button
                  onClick={() => setSkillFilter('gaps')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    skillFilter === 'gaps'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Skill Gaps ({gapSkills.length})
                </button>
                <button
                  onClick={() => setSkillFilter('possessed')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    skillFilter === 'possessed'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Possessed ({possessedSkills.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedSkills.map((sk, idx) => (
                <Card
                  key={idx}
                  className="p-5 border-slate-200/90 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                          {sk.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {sk.description}
                        </p>
                      </div>

                      <Badge
                        variant={getPriorityBadgeVariant(sk.priority)}
                        className="text-[10px] uppercase font-bold shrink-0"
                      >
                        {sk.priority} Priority
                      </Badge>
                    </div>

                    {/* Level Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Current:</span>
                      <Badge variant={sk.isPossessed ? 'emerald' : 'slate'} className="text-[11px] font-semibold">
                        {sk.currentLevel}
                      </Badge>

                      <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />

                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Target:</span>
                      <Badge variant="teal" className="text-[11px] font-semibold">
                        {sk.targetLevel}
                      </Badge>

                      {sk.isPossessed ? (
                        <span className="ml-auto text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          Possessed
                        </span>
                      ) : (
                        <span className="ml-auto text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                          Skill Gap
                        </span>
                      )}
                    </div>

                    {/* Gap Explanation */}
                    {sk.gapExplanation && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Development Gap:</span>
                        {sk.gapExplanation}
                      </div>
                    )}

                    {/* Learning Objectives */}
                    {sk.learningObjectives && sk.learningObjectives.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                          Learning Objectives:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {sk.learningObjectives.map((obj, oIdx) => (
                            <li key={oIdx} className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Direct Skill Exchange Matching Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">EnhanceUs Exchange:</span>
                    <Link
                      to={`/search?q=${encodeURIComponent(sk.name)}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Find Mentors for this Skill
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: V2.4 CONTEXTUAL AI LEARNING COACH */}
        {activeTab === 'assistant' && (
          <div className="space-y-6">
            <LearningAssistantPanel
              roadmap={roadmap}
              focusMilestone={selectedCoachMilestone}
              onSelectMilestone={(ms) => setSelectedCoachMilestone(ms)}
            />
          </div>
        )}

        {/* TAB 6: V2.4 CURATED LEARNING RESOURCES */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <CuratedResourcesList
              roadmap={roadmap}
              initialSkillName={selectedResourceMilestone?.skillName || ''}
              initialMilestoneId={selectedResourceMilestone?.milestoneId || null}
              onOpenCoach={(ctx) => {
                const matchedMs = milestones.find((m) => m.skillName === ctx.skillName) || null;
                setSelectedCoachMilestone(matchedMs);
                setActiveTab('assistant');
              }}
            />
          </div>
        )}

        {/* MODAL: LEARNER NOTES */}
        <Modal
          isOpen={!!noteModalMilestone}
          onClose={() => !isSavingNote && setNoteModalMilestone(null)}
          title="Milestone Learner Notes"
          description={`Record notes, proof of practice, or self-reported outcomes for "${noteModalMilestone?.title || ''}"`}
          className="max-w-lg"
        >
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Your Reflection & Notes:
              </label>
              <textarea
                rows={5}
                value={learnerNoteInput}
                onChange={(e) => setLearnerNoteInput(e.target.value)}
                placeholder="What did you build or learn? Summarize key takeaways, concepts practiced, or project links..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                disabled={isSavingNote}
                onClick={() => setNoteModalMilestone(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="teal"
                disabled={isSavingNote}
                onClick={handleSaveNote}
                className="text-xs font-bold"
              >
                {isSavingNote ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: REPORT BLOCKER */}
        <Modal
          isOpen={!!blockerModalMilestone}
          onClose={() => !isSavingBlocker && setBlockerModalMilestone(null)}
          title="Report Learning Blocker"
          description={`Explain the obstacle preventing completion of "${blockerModalMilestone?.title || ''}"`}
          className="max-w-lg"
        >
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Blocker Explanation:
              </label>
              <textarea
                rows={4}
                value={blockerReasonInput}
                onChange={(e) => setBlockerReasonInput(e.target.value)}
                placeholder="Describe what is causing difficulty (e.g. missing background knowledge, complex exercise, unclear tooling)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                disabled={isSavingBlocker}
                onClick={() => setBlockerModalMilestone(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={isSavingBlocker || !blockerReasonInput.trim()}
                onClick={handleSaveBlocker}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50"
              >
                {isSavingBlocker ? 'Recording...' : 'Mark as Blocked'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: ADAPTIVE MILESTONE BREAKDOWN */}
        <Modal
          isOpen={!!breakdownModalMilestone}
          onClose={() => !isApplyingBreakdown && setBreakdownModalMilestone(null)}
          title="Adaptive Milestone Breakdown"
          description="Decompose a challenging milestone into smaller, achievable steps. Your completed history and prerequisite relationships are 100% preserved."
          className="max-w-xl"
        >
          <div className="space-y-4 mt-2">
            {breakdownModalMilestone && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Target Milestone: {breakdownModalMilestone.title}
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Skill: {breakdownModalMilestone.skillName} • Stage {breakdownModalMilestone.stageNumber}
                </p>
                {breakdownModalMilestone.completionCriteria && (
                  <p className="text-slate-600 dark:text-slate-300">
                    Criteria: {breakdownModalMilestone.completionCriteria}
                  </p>
                )}
              </div>
            )}

            {breakdownError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{breakdownError}</span>
              </div>
            )}

            {!proposedBreakdownData ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    What makes this milestone difficult or blocked? (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={breakdownUserNote}
                    onChange={(e) => setBreakdownUserNote(e.target.value)}
                    placeholder="E.g., I need to break down the theoretical concepts before the implementation task..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    disabled={isProposingBreakdown}
                    onClick={() => setBreakdownModalMilestone(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="teal"
                    disabled={isProposingBreakdown}
                    onClick={handleProposeBreakdown}
                    className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {isProposingBreakdown ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating Sub-Steps...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Generate Proposed Sub-Steps
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Proposed Adaptive Sub-Steps ({proposedBreakdownData.subMilestones?.length || 0}):
                  </span>
                  <p className="leading-relaxed">
                    Review the proposed steps below. Applying this adaptation will replace the single target milestone with these structured sub-steps. All previous progress remains untouched.
                  </p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(proposedBreakdownData.subMilestones || []).map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold flex items-center justify-center text-[10px]">
                            {sIdx + 1}
                          </span>
                          {sub.title}
                        </span>
                        <Badge variant="teal" className="text-[10px]">
                          Sub-step
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                        {sub.description}
                      </p>
                      {sub.completionCriteria && (
                        <p className="text-slate-500 dark:text-slate-400 pl-6 text-[11px] italic">
                          Criteria: {sub.completionCriteria}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    disabled={isApplyingBreakdown}
                    onClick={() => setProposedBreakdownData(null)}
                    className="text-xs"
                  >
                    Back to Edit
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={isApplyingBreakdown}
                      onClick={() => setBreakdownModalMilestone(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="teal"
                      disabled={isApplyingBreakdown}
                      onClick={handleApplyBreakdown}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isApplyingBreakdown ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Applying Adaptation...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Confirm & Apply to Roadmap
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Claim Milestone to Portfolio Modal */}
        <Modal
          isOpen={!!portfolioModalMilestone}
          onClose={() => !isClaimingPortfolio && setPortfolioModalMilestone(null)}
          title="Claim Milestone as Proof-of-Skill"
          description="Publish this completed roadmap milestone to your public or members-only portfolio blueprint."
          className="max-w-md"
        >
          {portfolioSuccessMsg ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{portfolioSuccessMsg}</h4>
            </div>
          ) : (
            <form onSubmit={handleClaimPortfolio} className="space-y-4 mt-2 text-xs">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block mb-1">
                  Mastered Skill & Milestone
                </span>
                <strong className="text-slate-900 dark:text-slate-100 block">
                  {portfolioModalMilestone?.title}
                </strong>
                <span className="text-[11px] text-teal-600 dark:text-teal-400">
                  Domain: {portfolioModalMilestone?.skillName || 'General'}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  External Artifact / Evidence URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username/project or live demo"
                  value={portfolioEvidenceUrl}
                  onChange={(e) => setPortfolioEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Providing a link advances this artifact to <strong>Evidence-Backed</strong> status.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Portfolio Visibility
                </label>
                <select
                  value={portfolioVisibility}
                  onChange={(e) => setPortfolioVisibility(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="PUBLIC">Public — Visible to anyone viewing your profile</option>
                  <option value="MEMBERS_ONLY">Members Only — Visible to authenticated peers</option>
                  <option value="PRIVATE">Private — Only visible to you</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isClaimingPortfolio}
                  onClick={() => setPortfolioModalMilestone(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isClaimingPortfolio}
                  className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isClaimingPortfolio ? 'Adding...' : 'Add to Portfolio'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => !isDeleting && setShowDeleteModal(false)}
          title="Delete Roadmap"
          description="Are you sure you want to delete this learning roadmap?"
          className="max-w-md"
        >
          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will permanently delete the roadmap titled <strong className="text-slate-900 dark:text-slate-100">{roadmap.title}</strong>. Your underlying goal will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isDeleting}
                onClick={handleDelete}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Roadmap'}
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
};

export default RoadmapDetailPage;
