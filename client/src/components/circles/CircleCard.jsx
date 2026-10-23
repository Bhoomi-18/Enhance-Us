import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, Shield, BookOpen, ArrowRight, Lock, Unlock, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const CircleCard = ({ circle }) => {
  const membersCount = circle.members?.length || 0;
  const memberLimit = circle.memberLimit || 20;
  const isFull = membersCount >= memberLimit;
  const percentFilled = Math.min(100, Math.round((membersCount / memberLimit) * 100));

  const policyConfig = {
    OPEN: { label: 'Open Enrollment', variant: 'emerald', icon: Unlock },
    APPLY_TO_JOIN: { label: 'Apply to Join', variant: 'amber', icon: Clock },
    INVITE_ONLY: { label: 'Invite Only', variant: 'purple', icon: Lock },
  };

  const currentPolicy = policyConfig[circle.membershipPolicy] || policyConfig.OPEN;
  const PolicyIcon = currentPolicy.icon;

  return (
    <Card hover className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all p-5">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Badge variant="teal" icon={Target}>
            {circle.primarySkill}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Badge variant={currentPolicy.variant} icon={PolicyIcon}>
              {currentPolicy.label}
            </Badge>
            <Badge variant="slate">
              {circle.skillLevel.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Title & Description */}
        <Link to={`/circles/${circle._id}`} className="block group">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
            {circle.title}
          </h3>
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {circle.description}
        </p>

        {/* Secondary Skills tags */}
        {circle.secondarySkills && circle.secondarySkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {circle.secondarySkills.slice(0, 3).map((sk, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {sk}
              </span>
            ))}
            {circle.secondarySkills.length > 3 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{circle.secondarySkills.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Information: Capacity Meter & Owner */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {/* Member Capacity Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Members
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {membersCount} / {memberLimit} {isFull ? '(Full)' : ''}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFull ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>

        {/* Creator Info & Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
              {circle.owner?.name ? circle.owner.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
              {circle.owner?.name || 'Peer'}
            </span>
          </div>

          <Link to={`/circles/${circle._id}`}>
            <Button size="sm" variant="outline" rightIcon={ArrowRight} className="text-xs">
              View Circle
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default CircleCard;
