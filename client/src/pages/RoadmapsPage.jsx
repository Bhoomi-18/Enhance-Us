import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Target,
  BookOpen,
  Info,
} from 'lucide-react';
import { getRoadmaps, generateRoadmap, deleteRoadmap } from '../services/roadmapService';
import { getGoals } from '../services/goalService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export const RoadmapsPage = () => {
  const navigate = useNavigate();

  // State
  const [roadmaps, setRoadmaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [targetOutcome, setTargetOutcome] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('8');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Delete State
  const [roadmapToDelete, setRoadmapToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rotating loading messages for transparent AI generation
  const loadingSteps = [
    'Consulting Google Gemini AI with goal description...',
    'Analyzing required competencies and skill prerequisites...',
    'Comparing against your declared profile skills & identifying gaps...',
    'Structuring progressive learning stages and completion criteria...',
  ];

  useEffect(() => {
    let interval;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load user roadmaps
  const fetchRoadmaps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRoadmaps();
      if (res?.data?.roadmaps) {
        setRoadmaps(res.data.roadmaps);
      }
    } catch (err) {
      setError(err.message || 'Failed to load learning roadmaps.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  // Open Generation Modal & Fetch available goals
  const handleOpenGenerateModal = async () => {
    setIsModalOpen(true);
    setGenerationError(null);
    setIsGoalsLoading(true);
    try {
      const res = await getGoals();
      const userGoals = res?.data?.goals || [];
      setGoals(userGoals);
      if (userGoals.length > 0 && !selectedGoalId) {
        setSelectedGoalId(userGoals[0]._id);
      }
    } catch (err) {
      setGenerationError('Failed to fetch your goals. Please try again.');
    } finally {
      setIsGoalsLoading(false);
    }
  };

  // Submit Generation Request
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoalId) {
      setGenerationError('Please select a goal to generate a roadmap for.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await generateRoadmap(selectedGoalId, {
        targetOutcome: targetOutcome.trim(),
        timeCommitmentHoursPerWeek: Number(timeCommitment) || 8,
      });

      const newRoadmap = res?.data?.roadmap;
      if (newRoadmap && newRoadmap._id) {
        setIsModalOpen(false);
        // Navigate directly to the newly generated roadmap
        navigate(`/roadmaps/${newRoadmap._id}`);
      } else {
        await fetchRoadmaps();
        setIsModalOpen(false);
      }
    } catch (err) {
      setGenerationError(
        err.message ||
          'Failed to generate roadmap. Please check your Gemini AI configuration or try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Confirm and delete roadmap
  const handleDeleteRoadmap = async () => {
    if (!roadmapToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRoadmap(roadmapToDelete._id);
      setRoadmaps((prev) => prev.filter((r) => r._id !== roadmapToDelete._id));
      setRoadmapToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete roadmap.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge variant="teal" className="bg-teal-500/20 text-teal-200 border-teal-400/30">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-300" />
                  Version 2.1
                </Badge>
                <span className="text-xs text-teal-200/80 font-medium">
                  AI-Powered Learning Roadmaps
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Intelligent Competency Roadmaps
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Transform your aspirations into actionable, staged learning roadmaps powered by Google Gemini AI.
                Compare your current skills with goal requirements and identify exactly where to focus.
              </p>
            </div>

            <Button
              onClick={handleOpenGenerateModal}
              variant="teal"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-950/20 py-2.5 px-5 self-start md:self-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Generate Roadmap
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load roadmaps</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
            <button
              onClick={fetchRoadmaps}
              className="text-xs font-bold text-rose-700 hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading your saved roadmaps...
            </p>
          </div>
        ) : roadmaps.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-16 px-6">
            <EmptyState
              icon={Compass}
              title="No Learning Roadmaps Yet"
              description="Select one of your goals to generate a personalized, staged roadmap decomposed into competencies, milestones, and required skill progression."
              action={
                <Button onClick={handleOpenGenerateModal} variant="teal" className="mt-4">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Generate Your First Roadmap
                </Button>
              }
            />
          </Card>
        ) : (
          /* Roadmaps Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((rm) => {
              const totalSkills = rm.skills?.length || 0;
              const possessedSkills = rm.skills?.filter((s) => s.isPossessed)?.length || 0;
              const gapSkills = totalSkills - possessedSkills;
              const stagesCount = rm.stages?.length || 0;

              return (
                <Card
                  key={rm._id}
                  className="flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-slate-200/80 group"
                >
                  <div className="p-5 space-y-4">
                    {/* Associated Goal Label */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 max-w-[80%] truncate">
                        <Target className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{rm.goal?.title || 'Goal Roadmap'}</span>
                      </div>
                      <span className="text-[11px] text-slate-600">
                        {new Date(rm.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Roadmap Title */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-teal-700 transition-colors line-clamp-2">
                        {rm.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {rm.goalSummary}
                      </p>
                    </div>

                    {/* Metrics Bar */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate text-[11px]" title={rm.estimatedDuration}>
                          {rm.estimatedDuration}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                        <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="text-[11px] font-medium">{stagesCount} Stages</span>
                      </div>
                    </div>

                    {/* Skill Gap Breakdown Pills */}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                        {possessedSkills} Possessed
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                        {gapSkills} Gaps to Bridge
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-3">
                    <button
                      onClick={() => setRoadmapToDelete(rm)}
                      className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                      title="Delete roadmap"
                      aria-label="Delete roadmap"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      to={`/roadmaps/${rm._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      View Roadmap
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Generate Roadmap Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isGenerating && setIsModalOpen(false)}
          title="Generate Learning Roadmap"
          description="Synthesize an AI-decomposed competency blueprint from your goal and profile skills."
          className="max-w-lg"
        >
          {isGoalsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs text-slate-500">Retrieving your goals...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <Target className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">You don't have any goals yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Learning roadmaps are personalized to your goals. Create a goal first to generate a structured roadmap.
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  navigate('/goals');
                }}
                variant="teal"
                className="text-xs"
              >
                Go to Goals Page
              </Button>
            </div>
          ) : (
            <form onSubmit={handleGenerateSubmit} className="space-y-4 mt-2">
              {/* Generation Error Banner */}
              {generationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Generation Failed</p>
                    <p className="mt-0.5">{generationError}</p>
                  </div>
                </div>
              )}

              {/* Goal Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Goal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {goals.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.title} ({g.status})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600 mt-1">
                  Gemini AI will analyze this goal's description against your current profile skills.
                </p>
              </div>

              {/* Context Disclosure Box */}
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>How Personalization Works</span>
                </div>
                <p className="text-[11px] text-teal-700 leading-relaxed">
                  EnhanceUs compares the selected goal against your saved profile skills to identify your known strengths, highlight skill gaps, and calibrate prerequisite stages.
                </p>
              </div>

              {/* Optional Target Outcome */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Outcome / Milestones (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build a portfolio SaaS, pass AWS certification..."
                  value={targetOutcome}
                  onChange={(e) => setTargetOutcome(e.target.value)}
                  disabled={isGenerating}
                  maxLength={300}
                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Weekly Time Commitment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Weekly Commitment (Hours / Week)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 8, 12, 20].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setTimeCommitment(hours.toString())}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        timeCommitment === hours.toString()
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {hours}h / wk
                    </button>
                  ))}
                </div>
              </div>

              {/* Generating Loading State Treatment */}
              {isGenerating ? (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" className="text-teal-400" />
                    <span className="text-xs font-bold text-teal-300">
                      Generating with Gemini AI...
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 transition-all duration-300">
                    {loadingSteps[loadingStep]}
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-teal-400 h-1.5 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="teal"
                    className="text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Roadmap
                  </Button>
                </div>
              )}
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(roadmapToDelete)}
          onClose={() => !isDeleting && setRoadmapToDelete(null)}
          title="Delete Learning Roadmap"
          description="Are you sure you want to remove this learning roadmap? This action cannot be undone."
          className="max-w-md"
        >
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
              <span className="font-bold text-slate-900 block">{roadmapToDelete?.title}</span>
              <span className="text-slate-500">Goal: {roadmapToDelete?.goal?.title}</span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                disabled={isDeleting}
                onClick={() => setRoadmapToDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isDeleting}
                onClick={handleDeleteRoadmap}
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

export default RoadmapsPage;
