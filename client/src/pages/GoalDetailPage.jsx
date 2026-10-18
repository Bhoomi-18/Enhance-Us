import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Sparkles,
  Clock,
  Calendar,
  Layers,
  Milestone,
  HelpCircle,
  Users,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getGoal, deleteGoal } from '../services/goalService';

export const GoalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchGoalDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getGoal(id);
        if (response?.data?.goal) {
          setGoal(response.data.goal);
        } else {
          setError('Goal not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load goal blueprint');
      } finally {
        setLoading(false);
      }
    };

    fetchGoalDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this goal blueprint?')) return;
    setDeleting(true);
    try {
      await deleteGoal(id);
      navigate('/goals');
    } catch (err) {
      alert(err.message || 'Failed to delete goal');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading Goal Blueprint Matrix..." />
        </div>
      </PageContainer>
    );
  }

  if (error || !goal) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Goal Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'The requested goal does not exist or access is restricted.'}</p>
          <Link to="/goals">
            <Button leftIcon={ArrowLeft}>Back to Goals List</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { skillGaps = {}, requiredSkills = [], progress = 0, aiAnalysis } = goal;
  const known = skillGaps.knownSkills || [];
  const partial = skillGaps.partiallyKnownSkills || [];
  const missing = skillGaps.missingSkills || [];

  const roadmapSkills = aiAnalysis?.skills && aiAnalysis.skills.length > 0
    ? aiAnalysis.skills
    : requiredSkills.map((s, idx) => ({
        name: s.name,
        category: s.category || 'General',
        level: s.level || 'INTERMEDIATE',
        importance: s.importance || 'HIGH',
        explanation: 'Essential competency required to accomplish this goal.',
        learningOrder: idx + 1,
        prerequisites: [],
      }));

  const milestones = aiAnalysis?.milestones || [];
  const estimatedEffort = aiAnalysis?.estimatedEffort;
  const assumptions = aiAnalysis?.assumptions || [];
  const isGeminiDecomposed = aiAnalysis?.generatedBy === 'gemini';

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/goals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to All Goals
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/matches">
            <Button size="sm" leftIcon={Users} className="bg-teal-600 hover:bg-teal-700">
              Find Peer Matches
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={handleDelete} isLoading={deleting} leftIcon={Trash2}>
            Delete Goal
          </Button>
        </div>
      </div>

      {/* Goal Header Card */}
      <Card className="mb-8 border-teal-200/80 bg-gradient-to-r from-white via-slate-50/50 to-teal-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="teal" icon={Target}>Goal Blueprint</Badge>
              <Badge variant={goal.status === 'COMPLETED' ? 'emerald' : 'slate'}>{goal.status}</Badge>
              <Badge variant={isGeminiDecomposed ? 'indigo' : 'slate'} icon={Sparkles}>
                {isGeminiDecomposed ? 'Decomposed by Gemini AI' : 'Rule-Based Taxonomy'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{goal.title}</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">{goal.description}</p>

            {aiAnalysis?.goalInterpretation && (
              <div className="mt-4 p-3 bg-white/80 border border-teal-200/80 rounded-xl max-w-3xl">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">
                  AI Goal Interpretation
                </span>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{aiAnalysis.goalInterpretation}"
                </p>
              </div>
            )}
          </div>

          {/* Progress Circle & Bar Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-w-[200px] shadow-subtle">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SKILL COVERAGE</span>
            <span className="text-3xl font-black text-teal-600">{progress}%</span>
            <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-teal-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* 4-STAGE VISUAL PIPELINE FLOW */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Goal Transformation Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Stage 1: Goal */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-subtle">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">1. GOAL</span>
            <p className="font-bold text-slate-900 text-xs truncate">{goal.title}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Goal Defined</span>
          </div>

          {/* Stage 2: Required Skills */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-subtle">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">2. REQUIRED SKILLS</span>
            <p className="font-bold text-slate-900 text-xs">{roadmapSkills.length} Competencies</p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {isGeminiDecomposed ? 'Decomposed by Gemini AI' : 'Rule-Based Engine'}
            </span>
          </div>

          {/* Stage 3: Known Skills */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-subtle">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">3. KNOWN SKILLS</span>
            <p className="font-bold text-slate-900 text-xs">{known.length} Verified Skills</p>
            <span className="text-[11px] text-slate-400 mt-1 block">In your profile</span>
          </div>

          {/* Stage 4: Skill Gaps */}
          <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-subtle">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">4. SKILL GAPS</span>
            <p className="font-bold text-slate-900 text-xs">{missing.length + partial.length} Missing Gaps</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Targeted for peer exchange</span>
          </div>

        </div>
      </div>

      {/* AI RECOMMENDED SKILL ROADMAP SECTION */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              AI Learning Roadmap & Competency Hierarchy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequenced learning order with prerequisite relationships and beginner-friendly breakdowns.
            </p>
          </div>
          {estimatedEffort && (
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant="teal" icon={Clock}>{estimatedEffort.estimatedHours || '40-60 hrs'}</Badge>
              <Badge variant="indigo" icon={Calendar}>{estimatedEffort.timelineRecommendation || '4-8 wks'}</Badge>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {roadmapSkills.map((sk, idx) => {
            const isKnown = known.some((k) => k.name.toLowerCase() === sk.name.toLowerCase());
            return (
              <div
                key={idx}
                className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-subtle hover:border-teal-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      #{sk.learningOrder || idx + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{sk.name}</span>
                        <Badge variant={isKnown ? 'emerald' : 'rose'} className="text-[10px]">
                          {isKnown ? '✓ Known Skill' : 'Skill Gap'}
                        </Badge>
                        <Badge variant="slate" className="text-[10px]">{sk.category}</Badge>
                        <Badge variant="slate" className="text-[10px]">{sk.level}</Badge>
                      </div>

                      {sk.explanation && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{sk.explanation}</p>
                      )}

                      {sk.prerequisites && sk.prerequisites.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-700">
                          <span className="font-semibold">Prerequisites:</span>
                          <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            {sk.prerequisites.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestones & Effort Details */}
        {(milestones.length > 0 || estimatedEffort) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Milestones */}
            {milestones.length > 0 && (
              <Card className="border-indigo-200/70 bg-gradient-to-b from-white to-indigo-50/20">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Milestone className="w-4 h-4 text-indigo-600" />
                    Target Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white border border-indigo-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{m.title}</span>
                        <Badge variant="indigo" className="text-[10px]">{m.targetTimeline}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">{m.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Effort & Assumptions */}
            <Card className="border-slate-200 bg-white flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Effort & Advisory Assumptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                {estimatedEffort && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <p>
                      <strong>Estimated Investment:</strong> {estimatedEffort.estimatedHours} ({estimatedEffort.timelineRecommendation})
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      {estimatedEffort.uncertaintyDisclaimer}
                    </p>
                  </div>
                )}

                {assumptions.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1.5">Assumptions:</span>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
                      {assumptions.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* SKILL MATRIX DETAILED SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Skills You Already Have (Known) */}
        <Card className="border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Skills You Already Have</CardTitle>
                <CardDescription>Matched skills verified against your user profile.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {known.length > 0 ? (
              known.map((sk, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-200/80 flex items-center justify-between shadow-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                    <span className="font-bold text-slate-800 text-xs">{sk.name}</span>
                  </div>
                  <Badge variant="emerald">{sk.level || 'INTERMEDIATE'}</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">No matching skills found in your profile for this goal.</p>
            )}

            {/* Partially Known Skills */}
            {partial.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-3">
                  Partially Mastered (Upgrade Required)
                </span>
                {partial.map((sk, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800">{sk.name}</span>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Current: {sk.currentLevel} &rarr; Target: {sk.requiredLevel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Skill Gaps to Develop */}
        <Card className="border-rose-200/80 bg-gradient-to-b from-white to-rose-50/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Skills To Develop (Gaps)</CardTitle>
                  <CardDescription>Target competencies required to complete your goal.</CardDescription>
                </div>
              </div>
              <Badge variant="rose">{missing.length} Missing</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {missing.length > 0 ? (
              missing.map((sk, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-xl border border-rose-200/80 flex items-center justify-between shadow-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-bold text-slate-800 text-xs">{sk.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Category: {sk.category || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">Rec Level: {sk.recommendedLevel}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-xl">
                🎉 No skill gaps! You possess all required skills to accomplish this goal.
              </div>
            )}

            {/* Peer Exchange Readiness CTA */}
            <div className="mt-6 p-4 bg-slate-900 text-white rounded-2xl text-xs space-y-3">
              <p className="font-bold text-sm text-teal-400">Next Pipeline Stage: Peer Exchange Matching</p>
              <p className="text-slate-300 leading-relaxed">
                EnhanceUs identifies peers in the network who possess these gap skills ({missing.map(m => m.name).join(', ')}) and need the strengths you can share!
              </p>
              <Link to="/matches" className="inline-block pt-1">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold">
                  View Compatible Peers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageContainer>
  );
};

export default GoalDetailPage;
