import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Target,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Users,
  Compass,
  Award,
  ChevronRight,
  X,
  Check,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import {
  getCoachRecommendations,
  updateRecommendationStatus,
  askCoach,
} from '../services/coachService';

export const CoachPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [sourceMode, setSourceMode] = useState('DETERMINISTIC_RULES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active filter tab
  const [activeTab, setActiveTab] = useState('ALL');

  // Interactive Coach Q&A Console state
  const [coachQuery, setCoachQuery] = useState('');
  const [coachResponse, setCoachResponse] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState(null);

  // Dismissal Modal State
  const [dismissTarget, setDismissTarget] = useState(null);
  const [dismissReason, setDismissReason] = useState('ALREADY_KNOW_THIS');
  const [dismissFeedback, setDismissFeedback] = useState('');
  const [isDismissing, setIsDismissing] = useState(false);

  const fetchRecommendations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getCoachRecommendations(isRefresh);
      if (res?.data) {
        setRecommendations(res.data.recommendations || []);
        setSourceMode(res.data.source || 'DETERMINISTIC_RULES');
      }
    } catch (err) {
      setError(err.message || 'Failed to load coach recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleUpdateStatus = async (recId, newStatus, extra = {}) => {
    try {
      const res = await updateRecommendationStatus(recId, newStatus, extra);
      if (res?.data?.recommendation) {
        setRecommendations((prev) =>
          prev.map((r) => (r._id === recId ? res.data.recommendation : r))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update recommendation status');
    }
  };

  const handleOpenDismiss = (rec) => {
    setDismissTarget(rec);
    setDismissReason('ALREADY_KNOW_THIS');
    setDismissFeedback('');
  };

  const handleConfirmDismiss = async () => {
    if (!dismissTarget) return;
    setIsDismissing(true);
    try {
      await handleUpdateStatus(dismissTarget._id, 'DISMISSED', {
        dismissalReason: dismissReason,
        userFeedback: dismissFeedback,
      });
      setDismissTarget(null);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleAskCoach = async (queryText = null) => {
    const q = (queryText || coachQuery || '').trim();
    if (!q || q.length < 3) return;

    setIsAsking(true);
    setAskError(null);
    try {
      const res = await askCoach(q);
      if (res?.data) {
        setCoachResponse(res.data);
      }
    } catch (err) {
      setAskError(err.message || 'Failed to get coach response');
    } finally {
      setIsAsking(false);
    }
  };

  // Filter recommendations based on tab
  const activeRecommendations = recommendations.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
  const filteredList = activeRecommendations.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MILESTONES') return r.type === 'MILESTONE_NEXT_STEP' || r.type === 'PREREQUISITE_PRACTICE';
    if (activeTab === 'EXERCISES') return r.type === 'PRACTICAL_EXERCISE' || r.type === 'PROJECT_IDEA';
    if (activeTab === 'CIRCLES') return r.type === 'LEARNING_CIRCLE' || r.type === 'EXCHANGE_PARTNER';
    if (activeTab === 'ACCEPTED') return r.status === 'ACCEPTED';
    return true;
  });

  const completedCount = recommendations.filter((r) => r.status === 'COMPLETED').length;

  return (
    <PageContainer
      title="Adaptive AI Learning Coach"
      subtitle="Data-driven next steps, prerequisite warnings, and actionable practice suggestions tailored to your genuine progress."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing || loading}
          leftIcon={RotateCcw}
          className={refreshing ? 'animate-spin' : ''}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Next Steps'}
        </Button>
      }
    >
      {/* Engine Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/5 border border-teal-200/80 dark:border-teal-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Coaching Mode:</span>
              <Badge variant={sourceMode === 'AI_ADAPTIVE' ? 'teal' : 'slate'} size="sm">
                {sourceMode === 'AI_ADAPTIVE' ? 'Gemini AI Adaptive' : 'Deterministic Rules Engine'}
              </Badge>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Recommendations are grounded in your actual declared goals, milestones, and peer activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 self-end sm:self-center">
          <span>{activeRecommendations.length} active suggestions</span>
          <span>•</span>
          <span className="text-teal-600 dark:text-teal-400 font-semibold">{completedCount} completed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column (2 Cols): Active Recommendations Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Suggestions ({activeRecommendations.length})
            </button>
            <button
              onClick={() => setActiveTab('MILESTONES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MILESTONES'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Milestones & Prereqs
            </button>
            <button
              onClick={() => setActiveTab('EXERCISES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'EXERCISES'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Practice Exercises
            </button>
            <button
              onClick={() => setActiveTab('CIRCLES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'CIRCLES'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Circles & Peers
            </button>
            <button
              onClick={() => setActiveTab('ACCEPTED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ACCEPTED'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Committed Steps ({activeRecommendations.filter((r) => r.status === 'ACCEPTED').length})
            </button>
          </div>

          {/* Loading and Error States */}
          {loading && (
            <Card className="p-8 text-center">
              <LoadingSpinner size="md" className="mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analyzing your roadmaps, milestone dependencies, and community circles...
              </p>
            </Card>
          )}

          {error && !loading && (
            <Card className="p-6 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-xs">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" /> Unable to Load Coach Advice
              </div>
              <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button size="sm" variant="outline" onClick={() => fetchRecommendations(true)}>
                Retry
              </Button>
            </Card>
          )}

          {/* Recommendations List */}
          {!loading && !error && filteredList.length === 0 && (
            <Card className="p-8 text-center">
              <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                No active recommendations in this tab
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                You have addressed all suggestions or have not declared target learning interests yet.
              </p>
              <Button size="sm" onClick={() => fetchRecommendations(true)} leftIcon={RotateCcw}>
                Generate Fresh Next Steps
              </Button>
            </Card>
          )}

          {!loading && !error && filteredList.map((rec) => {
            const isAccepted = rec.status === 'ACCEPTED';
            const isPrereq = rec.type === 'PREREQUISITE_PRACTICE';
            const isCircle = rec.type === 'LEARNING_CIRCLE';

            return (
              <Card
                key={rec._id}
                className={`transition-all border ${
                  isAccepted
                    ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : isPrereq
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar: Badges and Tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          rec.type === 'MILESTONE_NEXT_STEP'
                            ? 'teal'
                            : rec.type === 'PREREQUISITE_PRACTICE'
                            ? 'amber'
                            : rec.type === 'LEARNING_CIRCLE'
                            ? 'indigo'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {rec.type.replace(/_/g, ' ')}
                      </Badge>
                      {rec.associatedSkill && (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {rec.associatedSkill}
                        </span>
                      )}
                      {isAccepted && (
                        <Badge variant="indigo" size="sm">
                          Committed Focus
                        </Badge>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                      {rec.isAiGenerated ? 'AI Adaptive' : 'System Rule'}
                    </span>
                  </div>

                  {/* Title & Actionable Content */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2">
                      {isPrereq && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {rec.content}
                    </p>
                  </div>

                  {/* Explicit Rationale Callout: WHY this was recommended */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Why recommended:</span>{' '}
                      {rec.rationale}
                    </div>
                  </div>

                  {/* Circle Action Link if Circle recommendation */}
                  {isCircle && rec.actionMetadata?.circleId && (
                    <div className="pt-1">
                      <Link
                        to={`/circles/${rec.actionMetadata.circleId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Users className="w-3.5 h-3.5" /> View Circle Details & Join Cohort <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      {!isAccepted ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateStatus(rec._id, 'ACCEPTED')}
                          leftIcon={Check}
                        >
                          Accept & Commit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(rec._id, 'COMPLETED')}
                          leftIcon={CheckCircle2}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Mark Completed
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDismiss(rec)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      >
                        Not Now
                      </Button>
                    </div>

                    <span className="text-[10px] text-slate-400 italic">
                      Does not auto-mark roadmap milestones
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right Column (1 Col): Interactive Coaching Consultation & Quick Tools */}
        <div className="space-y-6">
          
          {/* Interactive Consultation Card */}
          <Card className="border-teal-200/80 dark:border-teal-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Consult AI Learning Coach
              </CardTitle>
              <CardDescription className="text-xs">
                Ask for customized practice exercises, project scopes, or prerequisite guidance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QUICK QUESTIONS:</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleAskCoach('Suggest a 30-minute practice exercise for my current skill goal')}
                    disabled={isAsking}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all flex items-center justify-between"
                  >
                    <span>Suggest a 30-min hands-on exercise</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleAskCoach('What prerequisite concepts might I be missing for modern web development?')}
                    disabled={isAsking}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all flex items-center justify-between"
                  >
                    <span>Check my prerequisite blind spots</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleAskCoach('How should I break down my learning goal into verifiable milestones?')}
                    disabled={isAsking}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all flex items-center justify-between"
                  >
                    <span>Break goal into milestones</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <textarea
                  rows={3}
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                  placeholder="Ask your coach anything (e.g. 'Can you suggest a portfolio project for React and Node.js?')"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskCoach();
                    }
                  }}
                />

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAskCoach()}
                  disabled={isAsking || coachQuery.trim().length < 3}
                  className="w-full justify-center"
                  leftIcon={isAsking ? RotateCcw : Send}
                >
                  {isAsking ? 'Thinking...' : 'Get Coach Guidance'}
                </Button>
              </div>

              {/* Consultation Response Display */}
              {askError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[11px] text-red-600 dark:text-red-400">
                  {askError}
                </div>
              )}

              {coachResponse && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Coach Response
                    </span>
                    <Badge variant={coachResponse.source === 'AI_ADAPTIVE' ? 'teal' : 'slate'} size="sm">
                      {coachResponse.source === 'AI_ADAPTIVE' ? 'AI' : 'Deterministic'}
                    </Badge>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {coachResponse.response}
                  </p>

                  {coachResponse.suggestedNextSteps?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">RECOMMENDED ACTIONS:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                        {coachResponse.suggestedNextSteps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Navigation Cards */}
          <Card className="p-4 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Integrated Workflows
            </h4>
            <div className="space-y-2">
              <Link
                to="/roadmaps"
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between text-slate-700 dark:text-slate-300 transition-all block"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Learning Roadmaps</div>
                  <div className="text-[10px] text-slate-400">View progress milestones and stages</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                to="/matches"
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between text-slate-700 dark:text-slate-300 transition-all block"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Intelligent Matches</div>
                  <div className="text-[10px] text-slate-400">Connect with reciprocal skill peers</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                to="/insights"
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between text-slate-700 dark:text-slate-300 transition-all block"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Community Insights</div>
                  <div className="text-[10px] text-slate-400">Explore in-demand skills & teacher shortages</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </Card>

        </div>

      </div>

      {/* Dismissal Reason Modal */}
      <Modal
        isOpen={Boolean(dismissTarget)}
        onClose={() => setDismissTarget(null)}
        title="Help your Coach Adapt"
        description="Letting us know why this step isn't right ensures future recommendations match your needs."
        className="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for dismissing "{dismissTarget?.title}":
            </label>
            <select
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="ALREADY_KNOW_THIS">I have already completed or know this topic</option>
              <option value="TOO_ADVANCED">This topic is too advanced right now</option>
              <option value="PREFER_OTHER_TOPIC">I prefer to focus on a different skill</option>
              <option value="NOT_RELEVANT">Not relevant to my current learning goals</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Optional feedback for the coach:
            </label>
            <textarea
              rows={2}
              value={dismissFeedback}
              onChange={(e) => setDismissFeedback(e.target.value)}
              placeholder="e.g. 'I already know CSS grid, prefer to practice TypeScript generics'"
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setDismissTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDismiss}
              disabled={isDismissing}
            >
              {isDismissing ? 'Updating...' : 'Dismiss & Adapt'}
            </Button>
          </div>
        </div>
      </Modal>

    </PageContainer>
  );
};

export default CoachPage;
