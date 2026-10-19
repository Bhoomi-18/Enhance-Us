import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Sparkles,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { analyzeGoal, createGoal } from '../../services/goalService';

export const GoalCreateModal = ({ isOpen, onClose, onGoalCreated }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState('input'); // 'input' | 'analyzing' | 'review'
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const inspirations = [
    {
      title: 'Build my first mobile app',
      desc: 'Create a cross-platform mobile app for tracking daily habits with React Native and Node.',
    },
    {
      title: 'Launch a photography portfolio',
      desc: 'Design and deploy a modern portfolio website showcasing high-res photography and client galleries.',
    },
    {
      title: 'Create an AI-powered website',
      desc: 'Develop a web app with automated content generation using Python backend and React frontend.',
    },
    {
      title: 'Become a better public speaker',
      desc: 'Master keynote presentations, storytelling, and confident pitch delivery for tech conferences.',
    },
  ];

  const handleSelectInspiration = (item) => {
    setTitle(item.title);
    setDescription(item.desc);
    setError(null);
  };

  const handleStartAnalysis = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      setError('Goal title must be at least 3 characters long');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Goal description must be at least 10 characters long to provide sufficient context for AI decomposition');
      return;
    }

    if (description.trim().length > 2000) {
      setError('Goal description cannot exceed 2000 characters');
      return;
    }

    setError(null);
    setStage('analyzing');
    setAnalysisStep(1);

    const stepTimer = setTimeout(() => {
      setAnalysisStep(2);
    }, 1200);

    try {
      const response = await analyzeGoal({
        title: title.trim(),
        description: description.trim(),
      });

      const analysis = response?.data?.analysis;
      if (!analysis) {
        throw new Error('No analysis data received from server');
      }

      clearTimeout(stepTimer);
      setPreviewData(analysis);
      setStage('review');
    } catch (err) {
      clearTimeout(stepTimer);
      setError(err.message || 'Failed to analyze goal with AI. Please check your connection and retry.');
      setStage('input');
    }
  };

  const handleSaveGoal = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await createGoal({
        title: title.trim(),
        description: description.trim(),
      });
      const createdGoal = response?.data?.goal;

      if (onGoalCreated) onGoalCreated(createdGoal);
      handleClose();

      if (createdGoal?._id) {
        navigate(`/goals/${createdGoal._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save goal blueprint. Please try again.');
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (stage === 'analyzing' || isSaving) return;
    setStage('input');
    setError(null);
    setPreviewData(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={stage === 'review' ? 'Review AI-Generated Goal Blueprint' : 'Define Your Goal Blueprint'}
      description={
        stage === 'review'
          ? 'Review the AI skill roadmap and skill gap matrix before saving.'
          : 'Tell EnhanceUs what you want to accomplish in natural language.'
      }
      className={stage === 'review' ? 'max-w-3xl' : 'max-w-2xl'}
    >
      {/* STAGE 1: ANALYZING SPINNER */}
      {stage === 'analyzing' && (
        <div className="py-12 px-4 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center relative">
            <Cpu className="w-8 h-8 animate-pulse" />
            <Sparkles className="w-5 h-5 text-indigo-500 absolute -top-1 -right-1 animate-spin" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Analyzing Your Goal with Gemini AI</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Our AI decomposition engine is extracting required technical competencies, sequencing prerequisites, and cross-referencing your profile...
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3 text-xs text-left">
            <div className={`p-2.5 rounded-xl flex items-center gap-2 transition-colors ${analysisStep >= 1 ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold' : 'text-slate-400 dark:text-slate-600'}`}>
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>1. Gemini AI Skill Decomposition & Roadmap...</span>
            </div>
            <div className={`p-2.5 rounded-xl flex items-center gap-2 transition-colors ${analysisStep >= 2 ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-400 dark:text-slate-600'}`}>
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>2. Calculating Deterministic Skill Gaps...</span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: REVIEW AI DECOMPOSITION & SKILL GAPS */}
      {stage === 'review' && previewData && (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Decomposition Header */}
          <div className="p-4 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/40 dark:to-indigo-950/40 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={previewData.aiAnalysis?.generatedBy === 'gemini' ? 'teal' : 'indigo'} icon={Sparkles}>
                  {previewData.aiAnalysis?.generatedBy === 'gemini' ? 'Gemini AI Decomposed' : 'Taxonomy Analysis'}
                </Badge>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</span>
              </div>
              <Badge variant="emerald">{previewData.progress}% Coverage</Badge>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              "{previewData.aiAnalysis?.goalInterpretation || description}"
            </p>
          </div>

          {/* Skill Gap Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Required Skills</span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">{previewData.requiredSkills?.length || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">You Already Have</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{previewData.skillGaps?.knownSkills?.length || 0}</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">Gaps to Learn</span>
              <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                {(previewData.skillGaps?.missingSkills?.length || 0) + (previewData.skillGaps?.partiallyKnownSkills?.length || 0)}
              </span>
            </div>
          </div>

          {/* AI Recommended Skills Roadmap */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Recommended Skill Learning Order
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Sequenced by prerequisites</span>
            </div>

            <div className="space-y-2.5">
              {(previewData.aiAnalysis?.skills || previewData.requiredSkills || []).map((sk, idx) => {
                const isKnown = (previewData.skillGaps?.knownSkills || []).some(
                  (k) => k.name.toLowerCase() === sk.name.toLowerCase()
                );
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-subtle"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        #{sk.learningOrder || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{sk.name}</span>
                          <Badge variant={isKnown ? 'emerald' : 'slate'} className="text-[9px] py-0 px-1.5">
                            {isKnown ? '✓ In Profile' : 'Gap to Learn'}
                          </Badge>
                        </div>
                        {sk.explanation && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{sk.explanation}</p>
                        )}
                        {sk.prerequisites && sk.prerequisites.length > 0 && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                            Prerequisites: {sk.prerequisites.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                      <Badge variant="teal" className="text-[10px]">{sk.category}</Badge>
                      <Badge variant="slate" className="text-[10px]">{sk.level}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Effort & Milestones Summary */}
          {previewData.aiAnalysis?.estimatedEffort && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Effort: <strong>{previewData.aiAnalysis.estimatedEffort.estimatedHours || '40-60 hours'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Timeline: <strong>{previewData.aiAnalysis.estimatedEffort.timelineRecommendation || '4-8 weeks'}</strong>
                </span>
              </div>
              {previewData.aiAnalysis.estimatedEffort.uncertaintyDisclaimer && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  Note: {previewData.aiAnalysis.estimatedEffort.uncertaintyDisclaimer}
                </p>
              )}
            </div>
          )}

          {/* Review Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={ArrowLeft}
              onClick={() => setStage('input')}
              disabled={isSaving}
            >
              Edit Goal Text
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={RefreshCw}
                onClick={handleStartAnalysis}
                disabled={isSaving}
              >
                Re-analyze
              </Button>
              <Button
                type="button"
                size="md"
                onClick={handleSaveGoal}
                isLoading={isSaving}
                rightIcon={ArrowRight}
                className="bg-teal-600 hover:bg-teal-700 shadow-md"
              >
                Save & View Full Blueprint
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 0: INPUT FORM */}
      {stage === 'input' && (
        <form onSubmit={handleStartAnalysis} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Analysis Error</p>
                <p className="text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            </div>
          )}

          {/* Inspiration Quick Selection */}
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Inspiration Examples (Click to populate)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {inspirations.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectInspiration(item)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-colors text-xs"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> {item.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Goal Input */}
          <div className="space-y-4">
            <Input
              label="Goal Title *"
              placeholder="e.g. Build an AI-Powered Web Application"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              required
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Describe What You Want To Accomplish *
                </label>
                <span className={`text-[11px] font-medium ${description.length > 2000 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {description.length}/2000
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Describe your desired outcome in plain language. Mention key features, tools, or deliverables (e.g. 'I want to build a full-stack SaaS app with React frontend, Node backend, and integrate Gemini AI for automated skill gap analysis within two months')..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Minimum 10 characters. EnhanceUs will use Gemini AI to decompose your goal into actionable learning skills and prerequisites.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {error && (
                <Button type="button" variant="outline" size="sm" onClick={handleStartAnalysis} leftIcon={RefreshCw}>
                  Retry Analysis
                </Button>
              )}
              <Button type="submit" size="md" rightIcon={Sparkles} className="bg-teal-600 hover:bg-teal-700 shadow-sm">
                Analyze with Gemini AI
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default GoalCreateModal;
