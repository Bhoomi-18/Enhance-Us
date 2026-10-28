import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, Lock, Globe, CheckCircle2, Clock, ArrowRight, FolderGit2, BookOpen } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const WorkspaceCard = ({ workspace, currentUserId, onAcceptInvite, onDeclineInvite, isInvitation = false }) => {
  const isPrivate = workspace.visibility === 'PRIVATE';
  const membersCount = workspace.members?.length || 0;
  const milestonesCount = workspace.milestones?.length || 0;
  const completedMilestones = workspace.milestones?.filter((m) => m.status === 'COMPLETED').length || 0;
  const progress = milestonesCount > 0 ? Math.round((completedMilestones / milestonesCount) * 100) : 0;
  const resourcesCount = workspace.resources?.length || 0;

  // Determine user's role in this workspace
  const userMember = workspace.members?.find(
    (m) => (m.user?._id || m.user) === currentUserId || (m.user?._id || m.user)?.toString() === currentUserId?.toString()
  );
  const userRole = userMember?.role || (workspace.owner?._id === currentUserId ? 'OWNER' : null);

  return (
    <Card hover className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all p-5 h-full">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Badge variant="teal" icon={Target}>
            {workspace.associatedSkill}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={isPrivate ? 'slate' : 'emerald'}
              icon={isPrivate ? Lock : Globe}
              className="text-[10px]"
            >
              {isPrivate ? 'Private' : 'Public'}
            </Badge>
            {userRole && (
              <Badge variant="indigo" className="text-[10px] font-bold">
                {userRole}
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <Link to={`/workspaces/${workspace._id}`} className="block group">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
            {workspace.title}
          </h3>
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {workspace.description || 'Collaborative workspace for shared skill development and milestone tracking.'}
        </p>

        {workspace.associatedGoalTitle && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
            <FolderGit2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate font-medium">{workspace.associatedGoalTitle}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Milestones Progress</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>{completedMilestones} of {milestonesCount} completed</span>
            <span>{resourcesCount} {resourcesCount === 1 ? 'resource' : 'resources'}</span>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Users className="w-4 h-4 text-slate-400" />
          <span>{membersCount} {membersCount === 1 ? 'member' : 'members'}</span>
        </div>

        {isInvitation ? (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => onDeclineInvite && onDeclineInvite(workspace._id)}
            >
              Decline
            </Button>
            <Button
              size="xs"
              variant="primary"
              onClick={() => onAcceptInvite && onAcceptInvite(workspace._id)}
            >
              Accept
            </Button>
          </div>
        ) : (
          <Link to={`/workspaces/${workspace._id}`}>
            <Button size="xs" variant="outline" className="flex items-center gap-1 group">
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default WorkspaceCard;
