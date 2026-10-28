import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, User, Calendar, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const ChallengeCard = ({ challenge, currentUserId, onJoin }) => {
  const isTeam = challenge.participationType === 'TEAM';
  const isJoined = Boolean(challenge.isJoined);
  const progress = challenge.userProgress || 0;
  const participantCount = challenge.participantCount || 0;
  const capacity = challenge.capacity;
  const isFull = capacity ? participantCount >= capacity : false;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="emerald" className="text-[10px] font-bold">Active</Badge>;
      case 'UPCOMING':
        return <Badge variant="indigo" className="text-[10px] font-bold">Upcoming</Badge>;
      case 'COMPLETED':
        return <Badge variant="purple" className="text-[10px] font-bold">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="rose" className="text-[10px] font-bold">Cancelled</Badge>;
      default:
        return <Badge variant="slate" className="text-[10px] font-bold">{status}</Badge>;
    }
  };

  return (
    <Card hover className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all p-5 h-full">
      <div>
        {/* Top Header Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Badge variant="teal" icon={Target} className="text-[11px] font-semibold">
            {challenge.associatedSkill}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={isTeam ? 'indigo' : 'cyan'}
              icon={isTeam ? Users : User}
              className="text-[10px]"
            >
              {isTeam ? 'Team Sprint' : 'Individual'}
            </Badge>
            {getStatusBadge(challenge.status)}
          </div>
        </div>

        {/* Title */}
        <Link to={`/challenges/${challenge._id}`} className="block group">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
            {challenge.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {challenge.description}
        </p>

        {/* Schedule & Capacity Details */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {formatDate(challenge.startDate)} – {formatDate(challenge.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {participantCount} {capacity ? `/ ${capacity}` : ''} joined
            </span>
          </div>
        </div>

        {/* Progress Bar (if participant has joined) */}
        {isJoined && (
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Your Progress
              </span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <Link
          to={`/challenges/${challenge._id}`}
          className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 group"
        >
          <span>View Challenge</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {!isJoined && challenge.status !== 'CANCELLED' && challenge.status !== 'COMPLETED' && (
          <Button
            size="sm"
            variant="primary"
            disabled={isFull}
            onClick={() => onJoin && onJoin(challenge)}
            className="text-xs py-1.5 px-3"
          >
            {isFull ? 'Challenge Full' : isTeam ? 'Join with Team' : 'Join Challenge'}
          </Button>
        )}

        {isJoined && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
            Enrolled
          </span>
        )}
      </div>
    </Card>
  );
};

export default ChallengeCard;
