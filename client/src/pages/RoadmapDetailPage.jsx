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
} from 'lucide-react';
import { getRoadmap, deleteRoadmap, analyzeRoadmapDependencies } from '../services/roadmapService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';

export const RoadmapDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab: 'learning-order' | 'stages' | 'skills'
  const [activeTab, setActiveTab] = useState('learning-order');

  // Competency tab filter: 'all' | 'possessed' | 'gaps'
  const [skillFilter, setSkillFilter] = useState('all');

  // Learning order filter: 'all' | 'ready' | 'blocked' | 'satisfied'
  const [orderFilter, setOrderFilter] = useState('all');

  // Prerequisite analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisSuccessNotice, setAnalysisSuccessNotice] = useState(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoadmap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRoadmap(id);
      if (res?.data?.roadmap) {
        const fetched = res.data.roadmap;
        setRoadmap(fetched);
        if (fetched.dependencyAnalysisStatus === 'COMPLETED' && fetched.learningOrder?.length > 0) {
          setActiveTab('learning-order');
        } else {
          setActiveTab('stages');
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
        setActiveTab('learning-order');
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
            <Button onClick={fetchRoadmap} variant="teal" className="text-xs">
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
                {isAnalyzed ? (
                  <Badge variant="teal" className="text-[11px] font-bold">
                    <GitBranch className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                    V2.2 Prerequisite-Aware Plan
                  </Badge>
                ) : (
                  <Badge variant="teal" className="text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 mr-1 text-teal-600 dark:text-teal-400" />
                    AI Roadmap V2.1
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
            <div className="shrink-0 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center min-w-[180px]">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Estimated Duration
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {roadmap.estimatedDuration}
              </div>
            </div>
          </div>

          {/* Qualified Timeline Disclaimer */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="font-bold">Duration Estimate Disclaimer:</strong> This timeline is an advisory estimate based on standard learning curves. Actual pace adapts according to existing mastery, deliberate practice, and mentorship sessions.
            </p>
          </div>

          {/* Assumptions Box */}
          {roadmap.assumptions && roadmap.assumptions.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
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

        {/* V2.2 Upgrade Action Callout (If roadmap has not been analyzed for prerequisites yet) */}
        {!isAnalyzed && (
          <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-sky-500/10 dark:from-teal-950/40 dark:via-emerald-950/40 dark:to-sky-950/40 border border-teal-200 dark:border-teal-800/60 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="teal" className="text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 mr-1" />
                    EnhanceUs V2.2 Prerequisite Engine
                  </Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Analyze Skill Prerequisites & Learning Order
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  Transform this roadmap into an intelligent learning plan that detects which skills depend on others, highlights skills ready to begin immediately, and adapts to your verified background.
                </p>
              </div>
              <Button
                variant="teal"
                disabled={isAnalyzing}
                onClick={() => handleAnalyzeDependencies(false)}
                className="shrink-0 font-bold text-xs sm:text-sm px-5 py-3 shadow-md"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Dependencies...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Analyze Prerequisites
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* V2.2 Prerequisite & Sequence Summary Ribbon (When Analyzed) */}
        {isAnalyzed && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Prerequisite Engine Insights
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isAnalyzing}
                onClick={() => handleAnalyzeDependencies(true)}
                className="text-xs self-start sm:self-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Recalculate Learning Order
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <Unlock className="w-3.5 h-3.5" />
                  Ready to Start
                </div>
                <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 block">
                  {readySteps.length}
                </span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5 block">
                  Foundations complete
                </span>
              </Card>

              <Card className="p-4 text-center bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Lock className="w-3.5 h-3.5" />
                  Blocked Skills
                </div>
                <span className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 block">
                  {blockedSteps.length}
                </span>
                <span className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5 block">
                  Need prior skills first
                </span>
              </Card>

              <Card className="p-4 text-center bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Already Satisfied
                </div>
                <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-1 block">
                  {satisfiedSteps.length}
                </span>
                <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400 mt-0.5 block">
                  Verified in profile
                </span>
              </Card>

              <Card className="p-4 text-center bg-sky-50/50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                  <GitFork className="w-3.5 h-3.5" />
                  Dependencies
                </div>
                <span className="text-2xl font-extrabold text-sky-900 dark:text-sky-200 mt-1 block">
                  {roadmap.prerequisiteAnalysis?.totalDependencies || roadmap.dependencyEdges?.length || 0}
                </span>
                <span className="text-[11px] text-sky-700/80 dark:text-sky-400 mt-0.5 block">
                  Validated graph edges
                </span>
              </Card>
            </div>
          </div>
        )}

        {/* Tab Switcher Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
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
              <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-white/20 dark:bg-white/10 rounded-full">
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
        </div>

        {/* TAB 1: PREREQUISITE-AWARE LEARNING ORDER */}
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
                                  No additional advisory prerequisites
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Parallel Learning Opportunities */}
                          {step.canLearnInParallelWith && step.canLearnInParallelWith.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/50 flex items-center gap-2 text-xs text-teal-900 dark:text-teal-200">
                              <GitFork className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="font-semibold">
                                Parallel Track: Can be learned alongside{' '}
                                <strong className="font-extrabold">{step.canLearnInParallelWith.join(', ')}</strong>
                              </span>
                            </div>
                          )}

                          {/* Learning Objectives */}
                          {skillDef?.learningObjectives && skillDef.learningObjectives.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                                Core Practical Objectives:
                              </span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                {skillDef.learningObjectives.map((obj, oIdx) => (
                                  <li key={oIdx} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Peer Matching Action */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Target Level:{' '}
                              <strong className="text-slate-800 dark:text-slate-200 uppercase font-bold">
                                {skillDef?.targetLevel || 'intermediate'}
                              </strong>
                            </span>
                            <Link
                              to={`/search?q=${encodeURIComponent(step.skillName)}`}
                              className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors"
                            >
                              <Users className="w-3.5 h-3.5" />
                              Find Mentors for {step.skillName}
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

        {/* TAB 2: PROGRESSIVE LEARNING STAGES */}
        {activeTab === 'stages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Progressive Learning Stages
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chronological stages designed to build foundational competencies before advanced execution.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(roadmap.stages || []).map((stage, idx) => (
                <Card key={idx} className="p-6 border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    {/* Stage Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {stage.stageNumber || idx + 1}
                        </div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{stage.title}</h3>
                      </div>
                    </div>

                    {/* Stage Description */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {stage.description}
                    </p>

                    {/* Referenced Competencies */}
                    {stage.skillNames && stage.skillNames.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                          Focus Skills in this Stage:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.skillNames.map((sn, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            >
                              {sn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion Criteria */}
                    {stage.completionCriteria && stage.completionCriteria.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block">
                          Stage Completion Criteria:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {stage.completionCriteria.map((criterion, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700"
                            >
                              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                              <span className="text-slate-700 dark:text-slate-300 text-xs leading-snug">{criterion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ALL COMPETENCIES & GAPS */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Required Competencies & Gap Analysis
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Skills compared with your profile to identify what you already possess and what needs mastery.
                </p>
              </div>

              {/* Filter Toggle */}
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
                  onClick={() => setSkillFilter('possessed')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    skillFilter === 'possessed'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Possessed ({possessedSkills.length})
                </button>
                <button
                  onClick={() => setSkillFilter('gaps')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    skillFilter === 'gaps'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Gaps ({gapSkills.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedSkills.map((sk, idx) => (
                <Card
                  key={idx}
                  className="p-5 border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow"
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
