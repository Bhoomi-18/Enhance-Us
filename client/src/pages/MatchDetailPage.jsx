import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Target, ArrowLeftRight, CheckCircle2, ArrowLeft, Send, Sparkles, Clock, BookOpen, AlertCircle } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMatch } from '../services/matchService';
import { sendExchangeRequest } from '../services/exchangeService';

export const MatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Proposal State
  const [offeredSkill, setOfferedSkill] = useState('');
  const [requestedSkill, setRequestedSkill] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    const fetchMatchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMatch(id);
        if (response?.data?.match) {
          const m = response.data.match;
          setMatch(m);

          // Pre-populate proposal defaults
          const defaultOffer = m.reciprocalSkills?.[0]?.userTeachSkill || 'React';
          const defaultReq = m.matchedSkills?.[0]?.candidateTeachSkill || 'UI/UX Design';
          setOfferedSkill(defaultOffer);
          setRequestedSkill(defaultReq);
          setProposalText(`Hi! I'd like to exchange ${defaultOffer} for ${defaultReq} to help accomplish our goals.`);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch match details');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetail();
  }, [id]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!match) return;

    setSendingRequest(true);
    try {
      await sendExchangeRequest({
        recipientId: match.candidate?._id || match.candidate,
        goalId: match.goal?._id || match.goal,
        matchId: match._id,
        offeredSkill,
        requestedSkill,
        proposedExchange: proposalText,
      });

      setRequestSuccess(true);
      setTimeout(() => {
        setIsRequestModalOpen(false);
        navigate('/messages');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to send exchange request');
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading Match Compatibility Matrix..." />
        </div>
      </PageContainer>
    );
  }

  if (error || !match) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Match Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'The requested match record could not be loaded.'}</p>
          <Link to="/matches">
            <Button leftIcon={ArrowLeft}>Back to Matches</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const candidate = match.candidate || {};
  const goal = match.goal || {};

  return (
    <PageContainer>
      <div className="mb-6">
        <Link to="/matches" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to All Matches
        </Link>
      </div>

      {/* Header Match Card */}
      <Card className="mb-8 border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-r from-white via-slate-50/50 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-extrabold text-xl border-4 border-white dark:border-slate-800 shadow-md">
              {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="teal">{match.overallScore}% Compatibility Score</Badge>
                <Badge variant="emerald">Reciprocal Fit</Badge>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{candidate.name}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">{candidate.bio || 'Skill partner ready for mutual goal learning.'}</p>
            </div>
          </div>

          <Button size="lg" rightIcon={Send} onClick={() => setIsRequestModalOpen(true)}>
            Propose Skill Exchange
          </Button>
        </div>
      </Card>

      {/* POTENTIAL EXCHANGE PIPELINE */}
      <Card className="mb-8 p-6 bg-slate-900 dark:bg-slate-950 border-slate-800 text-white">
        <div className="text-center max-w-md mx-auto mb-6">
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">POTENTIAL EXCHANGE PIPELINE</span>
          <h3 className="text-lg font-extrabold">Proposed Mutual Knowledge Swap</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center max-w-3xl mx-auto">
          
          <div className="p-4 bg-slate-800 dark:bg-slate-900 rounded-2xl border border-slate-700 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">YOU NEED</span>
            <p className="font-extrabold text-white text-sm">{match.matchedSkills?.[0]?.needSkill || 'UI/UX Design'}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Candidate Can Teach</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-slate-900 flex items-center justify-center font-black">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-teal-300 mt-2">
              {offeredSkill || 'React'} &harr; {requestedSkill || 'UI/UX'}
            </span>
          </div>

          <div className="p-4 bg-slate-800 dark:bg-slate-900 rounded-2xl border border-slate-700 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">THEY NEED</span>
            <p className="font-extrabold text-white text-sm">{match.reciprocalSkills?.[0]?.candidateLearnSkill || 'React'}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">You Can Teach</span>
          </div>

        </div>
      </Card>

      {/* COMPATIBILITY BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <Card>
          <CardHeader>
            <CardTitle>Why You Match</CardTitle>
            <CardDescription>Algorithmic justification breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {match.explanation?.map((exp, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{exp.replace(/^✓\s*/, '')}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidate Profile & Availability</CardTitle>
            <CardDescription>Verified domain skills & schedule preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Skills Candidate Teaches</span>
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.map((sk, idx) => (
                  <Badge key={idx} variant="teal">{sk.name} ({sk.level || 'INTERMEDIATE'})</Badge>
                ))}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Skills Candidate Wants To Learn</span>
              <div className="flex flex-wrap gap-2">
                {candidate.learningInterests?.map((interest, idx) => (
                  <Badge key={idx} variant="indigo">{interest.name}</Badge>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Availability: <strong className="text-slate-800 dark:text-slate-200 capitalize">{candidate.availability || 'Flexible'}</strong></span>
              <span>Timezone: <strong className="text-slate-800 dark:text-slate-200">{candidate.timezone || 'UTC'}</strong></span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Exchange Proposal Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Propose Skill Exchange"
        description={`Send an exchange request to ${candidate.name}`}
      >
        {requestSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Exchange Request Sent!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Redirecting to your messages workspace...</p>
          </div>
        ) : (
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300">
              <span className="font-bold">Target Goal:</span> {goal.title || 'Your Active Goal'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">You Offer (Teach)</label>
                <input
                  type="text"
                  value={offeredSkill}
                  onChange={(e) => setOfferedSkill(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">You Request (Learn)</label>
                <input
                  type="text"
                  value={requestedSkill}
                  onChange={(e) => setRequestedSkill(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Personalized Exchange Proposal</label>
              <textarea
                rows={4}
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={sendingRequest} rightIcon={Send}>
                Send Exchange Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PageContainer>
  );
};

export default MatchDetailPage;
