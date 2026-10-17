import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, ArrowLeftRight, Check, Sparkles, RefreshCw, Clock, BookOpen, ArrowRight } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getMatches } from '../services/matchService';

export const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatchesList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMatches();
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
  }, []);

  return (
    <PageContainer
      title="Goal-Driven Peer Matches"
      subtitle="Discover people in the network whose skills solve your goal gaps and who need what you can teach."
      action={
        <Button variant="outline" size="sm" onClick={fetchMatchesList} leftIcon={RefreshCw} isLoading={loading}>
          Recalculate Matches
        </Button>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Analyzing goal gaps & finding reciprocal peer matches..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No Compatible Matches Found Yet"
            description="Matches are generated when you define an active goal with skill gaps and have skills listed in your profile."
            actionLabel="View Active Goals"
            onAction={() => window.location.href = '/goals'}
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

            return (
              <Card key={match._id} hover className="border-teal-200/80 bg-gradient-to-r from-white via-slate-50/30 to-teal-50/20 p-6">
                
                {/* Top Bar: Compatibility Score & Goal Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-extrabold text-base border-2 border-white shadow-sm">
                      {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{candidate.name || 'Peer Candidate'}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Target className="w-3.5 h-3.5 text-teal-600" /> Goal: <span className="font-semibold text-slate-700">{goal.title}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Fit Score</span>
                      <span className="text-2xl font-black text-teal-600">{match.overallScore}%</span>
                    </div>
                    <Badge variant={match.overallScore >= 80 ? 'emerald' : 'indigo'} icon={Sparkles}>
                      {match.overallScore >= 80 ? 'High Reciprocal Fit' : 'Good Fit'}
                    </Badge>
                  </div>
                </div>

                {/* Main Reciprocal Skill Swap Visual Pipeline */}
                <div className="my-6 p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-subtle items-center">
                  
                  {/* What Candidate Teaches (Solves User Gap) */}
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80">
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-1">THEY CAN TEACH YOU</span>
                    <p className="font-extrabold text-slate-900 text-xs">
                      {matchedSkills.length > 0
                        ? matchedSkills.map((m) => m.candidateTeachSkill).join(', ')
                        : candidate.skills?.map((s) => s.name).join(', ') || 'Skills'}
                    </p>
                    <span className="text-[10px] text-teal-600 mt-1 block">Fills your goal skill gap</span>
                  </div>

                  {/* Reciprocal Swap Connector */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center mb-1">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reciprocal Exchange</span>
                  </div>

                  {/* What User Teaches Candidate */}
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">YOU CAN TEACH THEM</span>
                    <p className="font-extrabold text-slate-900 text-xs">
                      {reciprocalSkills.length > 0
                        ? reciprocalSkills.map((r) => r.userTeachSkill).join(', ')
                        : 'Your Verified Profile Skills'}
                    </p>
                    <span className="text-[10px] text-indigo-600 mt-1 block">Matches their learning goal</span>
                  </div>

                </div>

                {/* Explanation Checklist */}
                <div className="mb-6 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Why This Match Exists</span>
                  {explanation.map((exp, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{exp.replace(/^✓\s*/, '')}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Availability: <strong className="text-slate-700 capitalize">{candidate.availability || 'Flexible'}</strong></span>
                  </div>

                  <Link to={`/matches/${match._id}`}>
                    <Button size="sm" rightIcon={ArrowRight}>
                      View Exchange Matrix & Request
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
