import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Target,
  ArrowLeftRight,
  Check,
  Sparkles,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
  Filter,
  Search,
  ShieldCheck,
  Award,
  ChevronDown,
  Info,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getMatches } from '../services/matchService';

export const MatchesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'RECIPROCAL_EXCHANGE' | 'PARTIAL_MATCH'
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [skillFilter, setSkillFilter] = useState('');
  const [showBreakdownId, setShowBreakdownId] = useState(null);

  const fetchMatchesList = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (typeFilter !== 'ALL') filters.type = typeFilter;
      if (minScoreFilter > 0) filters.minScore = minScoreFilter;
      if (skillFilter.trim()) filters.skill = skillFilter.trim();

      const response = await getMatches(filters);
      if (response?.data?.matches) {
        setMatches(response.data.matches);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate peer matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesList();
  }, [typeFilter, minScoreFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMatchesList();
  };

  return (
    <PageContainer
      title="Intelligent Peer Skill Matching"
      subtitle="Discover peers whose verified capabilities solve your gaps, with transparent fit scoring and reciprocal exchange indicators."
      action={
        <Button variant="outline" size="sm" onClick={fetchMatchesList} leftIcon={RefreshCw} isLoading={loading}>
          Recalculate Matches
        </Button>
      }
    >
      {/* Filtering & Search Bar */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Match Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Type:
            </span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setTypeFilter('RECIPROCAL_EXCHANGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                typeFilter === 'RECIPROCAL_EXCHANGE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Reciprocal (2-Way)
            </button>
            <button
              onClick={() => setTypeFilter('PARTIAL_MATCH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'PARTIAL_MATCH'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Partial / Mentorship
            </button>
          </div>

          {/* Min Score Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
              Min Fit:
            </span>
            {[0, 50, 70, 80].map((score) => (
              <button
                key={score}
                onClick={() => setMinScoreFilter(score)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  minScoreFilter === score
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {score === 0 ? 'Any' : `${score}%+`}
              </button>
            ))}
          </div>
        </div>

        {/* Skill Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="Filter by skill name (e.g. React, Python, UI/UX)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <Button type="submit" size="sm" variant="ghost">Filter</Button>
          {skillFilter && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSkillFilter('');
                fetchMatchesList();
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Analyzing goal gaps & finding reciprocal peer matches..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs text-center">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Users}
            title={
              (!user?.skills || user.skills.length === 0)
                ? "Offer Skills to Unlock Reciprocal Peer Matches"
                : "No Compatible Peer Matches Found"
            }
            description={
              (!user?.skills || user.skills.length === 0)
                ? "EnhanceUs pairs you based on mutual exchange: skills you can teach and skills you want to learn. Add at least one teachable skill in your profile and define a target goal to find matching partners."
                : "No peers match your current filter criteria. Try relaxing the fit score filter, adjusting availability, or using universal discovery to browse all skills and mentors."
            }
            actionLabel={
              (!user?.skills || user.skills.length === 0)
                ? "Add Teachable Skills"
                : "Search All Skills & Peers"
            }
            onAction={
              (!user?.skills || user.skills.length === 0)
                ? () => navigate('/profile')
                : () => navigate('/search')
            }
          />
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto">
          {matches.map((match) => {
            const candidate = match.candidate || {};
            const goal = match.goal || {};
            const matchedSkills = match.matchedSkills || [];
            const reciprocalSkills = match.reciprocalSkills || [];
            const explanation = match.explanation || [];
            const breakdown = match.scoreBreakdown || null;
            const isReciprocal = match.matchType === 'RECIPROCAL_EXCHANGE';
            const isExpandedBreakdown = showBreakdownId === match._id;

            return (
              <Card
                key={match._id}
                hover
                className="border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-r from-white via-slate-50/30 to-teal-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-6"
              >
                {/* Top Bar: Candidate Avatar, Type Badge & Fit Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${candidate._id}`} title="View Candidate Profile">
                      <div className="w-12 h-12 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-extrabold text-base border-2 border-white dark:border-slate-800 shadow-sm hover:scale-105 transition-transform">
                        {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${candidate._id}`}
                          className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          {candidate.name || 'Peer Candidate'}
                        </Link>
                        {isReciprocal ? (
                          <Badge variant="emerald" icon={ArrowLeftRight}>
                            Reciprocal (2-Way)
                          </Badge>
                        ) : (
                          <Badge variant="amber" icon={BookOpen}>
                            Partial Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{goal.title || 'Profile Skill Matrix'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                        Fit Score
                      </span>
                      <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                        {match.overallScore}%
                      </span>
                    </div>
                    <Badge variant={match.overallScore >= 80 ? 'emerald' : match.overallScore >= 60 ? 'teal' : 'indigo'} icon={Sparkles}>
                      {match.overallScore >= 80 ? 'Excellent Fit' : match.overallScore >= 60 ? 'Strong Fit' : 'Fair Fit'}
                    </Badge>
                  </div>
                </div>

                {/* Score Breakdown Drawer/Pill Bar */}
                {breakdown && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3 h-3 text-teal-500" /> Explainable Score Breakdown
                      </span>
                      <button
                        onClick={() => setShowBreakdownId(isExpandedBreakdown ? null : match._id)}
                        className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline"
                      >
                        {isExpandedBreakdown ? 'Hide Details' : 'View Weights'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Skill Overlap (60%)</span>
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400">{breakdown.skillOverlapScore}%</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Reciprocity (25%)</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{breakdown.reciprocityScore}%</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Reliability (15%)</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{breakdown.reliabilityScore}%</span>
                      </div>
                    </div>

                    {isExpandedBreakdown && (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-2">
                        Formula: <strong>60%</strong> skill coverage & level compatibility + <strong>25%</strong> 2-way symmetry (both users learn something valuable) + <strong>15%</strong> past session completion track record (defaults to safe 80% for new members).
                      </p>
                    )}
                  </div>
                )}

                {/* Main Reciprocal Skill Swap Visual Pipeline */}
                <div className="my-6 p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-subtle items-center">
                  {/* What Candidate Teaches (Solves User Gap) */}
                  <div className="p-3 bg-teal-50/60 dark:bg-teal-950/40 rounded-xl border border-teal-200/80 dark:border-teal-800/50">
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block mb-1">
                      THEY CAN TEACH YOU
                    </span>
                    <div className="flex flex-wrap gap-1.5 items-center my-1">
                      {matchedSkills.length > 0 ? (
                        matchedSkills.map((m, idx) => {
                          const matchedCandidateSkill = (candidate.skills || []).find(
                            (s) => s.name?.toLowerCase() === m.candidateTeachSkill?.toLowerCase()
                          );
                          const isVerified = matchedCandidateSkill?.evidence?.verificationStatus === 'VERIFIED';
                          return (
                            <span key={idx} className="inline-flex items-center gap-1 font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                              <span>{m.candidateTeachSkill}</span>
                              {isVerified && (
                                <span
                                  title="Platform-Verified Skill"
                                  className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] rounded font-bold"
                                >
                                  <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {idx < matchedSkills.length - 1 && <span className="text-slate-400 font-normal">,</span>}
                            </span>
                          );
                        })
                      ) : (candidate.skills || []).length > 0 ? (
                        (candidate.skills || [])
                          .filter((s) => !s.type || s.type === 'TEACH' || s.type === 'both')
                          .map((s, idx, arr) => (
                            <span key={idx} className="inline-flex items-center gap-1 font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                              <span>{s.name}</span>
                              {s.evidence?.verificationStatus === 'VERIFIED' && (
                                <span
                                  title="Platform-Verified Skill"
                                  className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] rounded font-bold"
                                >
                                  <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {idx < arr.length - 1 && <span className="text-slate-400 font-normal">,</span>}
                            </span>
                          ))
                      ) : (
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">No teaching skills listed</span>
                      )}
                    </div>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block">
                      Fills your requested capability gap
                    </span>
                  </div>

                  {/* Reciprocal Swap Connector */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-teal-500 text-white dark:text-slate-900 flex items-center justify-center mb-1">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {isReciprocal ? '2-Way Reciprocal Swap' : 'One-Way Learning Match'}
                    </span>
                  </div>

                  {/* What User Teaches Candidate */}
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-1">
                      YOU CAN TEACH THEM
                    </span>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                      {reciprocalSkills.length > 0
                        ? reciprocalSkills.map((r) => r.userTeachSkill).join(', ')
                        : isReciprocal
                        ? 'Your Teaching Skills'
                        : 'Potential Mentorship / One-Way'}
                    </p>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {isReciprocal ? 'Matches their growth interest' : 'Not yet symmetric'}
                    </span>
                  </div>
                </div>

                {/* Explanation Checklist */}
                <div className="mb-6 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    Why This Match Exists
                  </span>
                  {explanation.map((exp, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>{exp.replace(/^✓\s*/, '')}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Availability: <strong className="text-slate-700 dark:text-slate-200 capitalize">{candidate.availability || 'Flexible'}</strong>
                      </span>
                    </div>
                    <Link
                      to={`/profile/${candidate._id}`}
                      className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> View Portfolio
                    </Link>
                  </div>

                  <Link to={`/matches/${match._id}`}>
                    <Button size="sm" rightIcon={ArrowRight}>
                      View Matrix & Propose Exchange
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

export default MatchesPage;
