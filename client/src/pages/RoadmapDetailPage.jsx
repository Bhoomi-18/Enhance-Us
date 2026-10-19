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
  HelpCircle,
  Users,
  Search,
  BookOpen,
  Trash2,
  Calendar,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { getRoadmap, deleteRoadmap } from '../services/roadmapService';
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

  // Skill filter: 'all' | 'possessed' | 'gaps'
  const [skillFilter, setSkillFilter] = useState('all');

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoadmap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRoadmap(id);
      if (res?.data?.roadmap) {
        setRoadmap(res.data.roadmap);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Roadmap Not Found</h2>
          <p className="text-xs text-slate-500">
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

        {/* Hero Roadmap Overview Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="teal" className="text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 mr-1 text-teal-600 dark:text-teal-400" />
                  AI Roadmap V2.1
                </Badge>
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
              <strong className="font-bold">Duration Estimate Disclaimer:</strong> This timeline is an advisory estimate generated based on standard skill acquisition curves. Actual pace and milestone completion will vary based on your existing foundations, practice frequency, and dedicated study time.
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

        {/* Roadmap Stats Ribbon */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Competencies</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
              {allSkills.length}
            </span>
          </Card>
          <Card className="p-4 text-center bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">Skills Possessed</span>
            <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1 block">
              {possessedSkills.length}
            </span>
          </Card>
          <Card className="p-4 text-center bg-amber-50/40 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">Skill Gaps to Bridge</span>
            <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-200 mt-1 block">
              {gapSkills.length}
            </span>
          </Card>
        </div>

        {/* Section 1: Progressive Learning Stages */}
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

        {/* Section 2: Detailed Competency Breakdown */}
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
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Possessed ({possessedSkills.length})
              </button>
              <button
                onClick={() => setSkillFilter('gaps')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  skillFilter === 'gaps'
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Skill Gaps ({gapSkills.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedSkills.map((sk, idx) => (
              <Card
                key={idx}
                className={`p-5 flex flex-col justify-between border ${
                  sk.isPossessed
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-100/80 dark:border-emerald-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  {/* Skill Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{sk.name}</h4>
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

                  {/* Concrete Learning Objectives */}
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

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => !isDeleting && setShowDeleteModal(false)}
          title="Delete Roadmap"
          description="Are you sure you want to delete this learning roadmap?"
          className="max-w-md"
        >
          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-600">
              This will permanently delete the roadmap titled <strong className="text-slate-900">{roadmap.title}</strong>. Your underlying goal will remain intact.
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
