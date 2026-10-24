import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Users,
  CalendarCheck,
  Star,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getUserTrustProfile } from '../../services/trustService';

export const TrustProfileSection = ({ targetUserId, isOwner = false }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormulaDrawer, setShowFormulaDrawer] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (targetUserId) {
      setLoading(true);
      setError(null);
      getUserTrustProfile(targetUserId)
        .then((res) => {
          if (isMounted && res?.data) {
            setProfile(res.data);
          }
        })
        .catch((err) => {
          if (isMounted) setError(err.message || 'Failed to load trust profile');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [targetUserId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading verified contribution metrics...</span>
        </div>
      </Card>
    );
  }

  if (error || !profile) {
    return null; // Gracefully suppress if not available
  }

  const { standing, metrics, isNewContributor } = profile;
  const { exchanges, peerFeedback, portfolioEvidence, circleContributions } = metrics || {};

  return (
    <Card className="border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-br from-white via-slate-50/40 to-teal-50/20 dark:from-slate-900 dark:via-slate-900/80 dark:to-teal-950/20 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Trust & Contribution Standing
                </CardTitle>
                <Badge variant={isNewContributor ? 'indigo' : 'teal'} size="sm">
                  {standing?.status === 'NEW_CONTRIBUTOR' ? 'New Contributor' : 'Verified Contributor'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Auditable metrics computed directly from completed sessions, peer reviews, and circle milestones.
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFormulaDrawer(!showFormulaDrawer)}
            className="text-xs text-teal-700 dark:text-teal-300 self-start sm:self-center"
            rightIcon={showFormulaDrawer ? ChevronUp : ChevronDown}
          >
            How Metrics are Calculated
          </Button>
        </div>

        {/* Expandable Transparency Drawer */}
        {showFormulaDrawer && (
          <div className="mt-4 p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 text-slate-700 dark:text-slate-300 transition-all">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Transparent & Fair Calculation Policy
            </div>
            <p>
              <strong>Formula:</strong> {standing?.formula}
            </p>
            <p>
              <strong>Exclusions:</strong> {standing?.exclusions}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              <strong>Notice:</strong> {standing?.disclaimer}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* New Contributor Banner if applicable */}
        {isNewContributor && (
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-start gap-2.5 text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Establishing Exchange History:</span> New community members receive a welcoming baseline status without low score penalties. Attendance and peer ratings activate once you complete your first two verified sessions.
            </div>
          </div>
        )}

        {/* Standing Highlight & 4 Pillar Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Pillar 1: Completed Exchanges */}
          <div className="p-3.5 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                COMPLETED SESSIONS
              </span>
              <CalendarCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {exchanges?.completedTotal || 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {exchanges?.completed1on1 || 0} 1-on-1 • {exchanges?.completedGroup || 0} group
            </div>
          </div>

          {/* Pillar 2: Attendance Rate */}
          <div className="p-3.5 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ATTENDANCE RATE
              </span>
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {exchanges?.attendanceRate || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {exchanges?.missed > 0 ? `${exchanges.missed} missed` : '0 unexcused misses'}
            </div>
          </div>

          {/* Pillar 3: Peer Feedback */}
          <div className="p-3.5 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                PEER REVIEWS
              </span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {peerFeedback?.overallRatingAverage ? `${peerFeedback.overallRatingAverage.toFixed(1)} / 5` : 'None yet'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Sample size: {peerFeedback?.sampleSize || 0} peer {peerFeedback?.sampleSize === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Pillar 4: Verified Artifacts */}
          <div className="p-3.5 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                VERIFIED PROOFS
              </span>
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {(portfolioEvidence?.exchangeConfirmed || 0) + (portfolioEvidence?.portfolioEvidence || 0)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {portfolioEvidence?.exchangeConfirmed || 0} exchange confirmed
            </div>
          </div>

        </div>

        {/* Detailed Peer Dimensions & Circle Contributions Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Peer Ratings Breakdown */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Peer Rating Breakdown</span>
              <span className="text-[11px] font-normal text-slate-500">
                Based on {peerFeedback?.sampleSize || 0} verified reviews
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Teaching Quality & Clarity:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {peerFeedback?.teachingRatingAverage ? `${peerFeedback.teachingRatingAverage.toFixed(1)} / 5` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Communication & Respect:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {peerFeedback?.communicationRatingAverage ? `${peerFeedback.communicationRatingAverage.toFixed(1)} / 5` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Reliability & Punctuality:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {peerFeedback?.reliabilityRatingAverage ? `${peerFeedback.reliabilityRatingAverage.toFixed(1)} / 5` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Learning Circle Contributions */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Learning Circle Impact</span>
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Circles Joined:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {circleContributions?.circlesJoined || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Circles Owned / Moderated:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {circleContributions?.circlesModerated || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Roadmap Tasks Completed:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {circleContributions?.tasksCompleted || 0}
                </span>
              </div>
            </div>
          </div>

        </div>

      </CardContent>
    </Card>
  );
};

export default TrustProfileSection;
