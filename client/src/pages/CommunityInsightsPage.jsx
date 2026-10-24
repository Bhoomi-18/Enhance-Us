import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  BarChart2,
  Compass,
  ArrowRight,
  BookOpen,
  Award,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getCommunityInsights } from '../services/insightsService';

export const CommunityInsightsPage = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('DEMAND');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getCommunityInsights()
      .then((res) => {
        if (isMounted && res?.data) {
          setInsights(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load community insights');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <PageContainer
        title="Community Skill-Gap Insights"
        subtitle="Aggregated, privacy-conscious trends on platform skill demand, mentor availability, and circle opportunities."
      >
        <Card className="p-12 text-center">
          <LoadingSpinner size="md" className="mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aggregating platform learning goals, skill taxonomy, and mentor supply...
          </p>
        </Card>
      </PageContainer>
    );
  }

  if (error || !insights) {
    return (
      <PageContainer
        title="Community Skill-Gap Insights"
        subtitle="Aggregated, privacy-conscious trends on platform skill demand and mentor availability."
      >
        <Card className="p-6 border-red-200 dark:border-red-900/50 bg-red-50/40 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-1">
            <AlertCircle className="w-4 h-4" /> Unable to Load Insights
          </div>
          <p className="text-red-600 dark:text-red-400">{error || 'Network error'}</p>
        </Card>
      </PageContainer>
    );
  }

  const {
    insufficientData,
    metadata,
    topRequestedSkills = [],
    teacherDeficitRanking = [],
    circleOpportunities = [],
    categoryDistribution = {},
  } = insights;

  return (
    <PageContainer
      title="Community Skill-Gap Insights"
      subtitle="Aggregated, privacy-conscious analytics highlighting in-demand skills, mentor deficits, and high-impact circle opportunities."
    >
      {/* Privacy Guarantee Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-100 to-indigo-500/10 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/20 border border-teal-200/80 dark:border-teal-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Privacy-Protected Aggregation</span>
              <Badge variant="teal" size="sm">k-Anonymity (≥3)</Badge>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Individual identities, personal goals, and private messages are strictly excluded. Demo accounts are filtered out.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 self-end sm:self-center">
          Period: <strong className="text-slate-700 dark:text-slate-300">{metadata?.period || 'Live Platform Baseline'}</strong>
        </div>
      </div>

      {/* Insufficient Data State */}
      {insufficientData && (
        <Card className="p-10 text-center mb-8">
          <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">
            Community Insights are Calibrating
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            {insights.message ||
              'Community skill-gap insights require at least 3 active non-demo learners per skill cluster to preserve anonymity. Trends will populate automatically as learners declare goals.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/goals">
              <Button size="sm" variant="primary">Declare a Learning Goal</Button>
            </Link>
            <Link to="/profile">
              <Button size="sm" variant="outline">List Skills You Can Teach</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* If Data Available: Analytics Dashboard */}
      {!insufficientData && (
        <>
          {/* Top 3 Summary Stat Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">IN-DEMAND SKILLS</span>
                <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {topRequestedSkills.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Skills with high learner interest</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">TEACHER SHORTAGES</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {teacherDeficitRanking.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Skills with teacher-to-learner deficits</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">CIRCLE OPPORTUNITIES</span>
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {circleOpportunities.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">High-demand skills with 0 active circles</div>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('DEMAND')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'DEMAND'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Top Requested Skills
            </button>
            <button
              onClick={() => setActiveTab('DEFICIT')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'DEFICIT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Mentor Shortages ({teacherDeficitRanking.length})
            </button>
            <button
              onClick={() => setActiveTab('CIRCLES')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'CIRCLES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              High-Impact Circle Opportunities
            </button>
          </div>

          {/* Tab 1: Top Requested Skills */}
          {activeTab === 'DEMAND' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Skill Demand vs. Mentor Availability</CardTitle>
                  <CardDescription className="text-xs">
                    Comparison of registered learners seeking to acquire each skill against active members offering to teach.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topRequestedSkills.map((item, idx) => {
                    const maxLearners = Math.max(...topRequestedSkills.map((s) => s.learnerCount), 1);
                    const demandPct = Math.min(100, Math.round((item.learnerCount / maxLearners) * 100));

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {item.skillName}
                            </span>
                            <Badge
                              variant={
                                item.status === 'HIGH_DEMAND'
                                  ? 'amber'
                                  : item.status === 'SURPLUS'
                                  ? 'teal'
                                  : 'slate'
                              }
                              size="sm"
                            >
                              {item.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="text-slate-600 dark:text-slate-300 font-semibold">
                            {item.learnerCount} Learners • {item.teacherCount} Mentors
                          </div>
                        </div>

                        {/* Bar comparison visual */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-teal-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${demandPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {item.deficitGap > 0
                              ? `Deficit: ${item.deficitGap} more teachers needed`
                              : 'Balanced teacher-to-learner ratio'}
                          </span>
                          <span>{item.activeCircleCount} active circles</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 2: Mentor Shortages */}
          {activeTab === 'DEFICIT' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Critical Teacher Shortage Rankings</CardTitle>
                  <CardDescription className="text-xs">
                    Skills with substantial learner demand where exchange requests experience longer wait times due to mentor scarcity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teacherDeficitRanking.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center italic">
                      No acute mentor deficits detected at this time.
                    </p>
                  ) : (
                    teacherDeficitRanking.map((deficit, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {deficit.skillName}
                            </span>
                            <Badge variant={deficit.urgency === 'CRITICAL_SHORTAGE' ? 'red' : 'amber'} size="sm">
                              {deficit.urgency === 'CRITICAL_SHORTAGE' ? 'Critical Shortage' : 'Moderate Gap'}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>{deficit.learnersWaiting} learners</strong> seeking guidance with only{' '}
                            <strong>{deficit.availableMentors} verified mentors</strong> available.
                          </p>
                        </div>

                        <Link to="/profile">
                          <Button size="sm" variant="outline" className="text-xs shrink-0">
                            Offer to Teach {deficit.skillName}
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 3: Learning Circle Opportunities */}
          {activeTab === 'CIRCLES' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">High-Impact Learning Circle Opportunities</CardTitle>
                  <CardDescription className="text-xs">
                    Identified skill areas with enough interested learners (3+) where starting a peer study group would create immediate value.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {circleOpportunities.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center italic">
                      All high-demand skills currently have active learning circles.
                    </p>
                  ) : (
                    circleOpportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {opp.skillName}
                            </span>
                            <Badge variant="indigo" size="sm">0 Active Circles</Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mb-1">
                            {opp.interestedLearners} community members are actively seeking to learn {opp.skillName}.
                          </p>
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 italic">
                            {opp.recommendation}
                          </p>
                        </div>

                        <Link to="/circles">
                          <Button size="sm" variant="primary" className="text-xs shrink-0" rightIcon={ArrowRight}>
                            Start Circle
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default CommunityInsightsPage;
