import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Target,
  Lock,
  Globe,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
  MessageSquare,
  FileText,
  UserPlus,
  Send,
  AlertCircle,
  Shield,
  UserCheck,
  FolderGit2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import InviteMemberModal from '../components/workspaces/InviteMemberModal';
import WorkspaceMilestoneModal from '../components/workspaces/WorkspaceMilestoneModal';
import WorkspaceResourceModal from '../components/workspaces/WorkspaceResourceModal';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  getWorkspaceById,
  updateMilestone,
  deleteMilestone,
  deleteResource,
  updateNotes,
  addDiscussionMessage,
  removeMember,
} from '../services/workspaceService';

export const WorkspaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'resources' | 'discussions' | 'members'

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneToEdit, setMilestoneToEdit] = useState(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);

  // Notes state
  const [notesContent, setNotesContent] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Discussion state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  usePageMeta({
    title: workspace ? `${workspace.title} | Workspace` : 'Collaborative Workspace | EnhanceUs',
    description: workspace?.description || 'Collaborative workspace on EnhanceUs',
    canonical: `https://www.briefenai.me/workspaces/${id}`,
  });

  const fetchWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspaceById(id);
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
        setNotesContent(res.data.workspace.notes?.content || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-400 mt-3">Loading workspace details...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <h2 className="text-base font-bold">Access Restricted or Not Found</h2>
          <p className="text-xs mt-1 max-w-md mx-auto">{error || 'Workspace could not be found or you do not have permission to view it.'}</p>
          <div className="mt-4">
            <Link to="/workspaces">
              <Button size="sm" variant="outline">
                Back to Workspaces
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Current user permissions
  const currentUserId = user?._id?.toString();
  const ownerId = (workspace.owner?._id || workspace.owner)?.toString();
  const isOwner = currentUserId === ownerId;
  const userMember = workspace.members?.find((m) => (m.user?._id || m.user)?.toString() === currentUserId);
  const isMember = Boolean(userMember) || isOwner;
  const userRole = isOwner ? 'OWNER' : userMember?.role || null;
  const canManage = isOwner || userRole === 'ADMIN';

  // Stats calculation
  const totalMilestones = workspace.milestones?.length || 0;
  const completedMilestones = workspace.milestones?.filter((m) => m.status === 'COMPLETED').length || 0;
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Toggle milestone status
  const handleToggleMilestone = async (milestone) => {
    if (!isMember) return;
    const nextStatus =
      milestone.status === 'PENDING'
        ? 'IN_PROGRESS'
        : milestone.status === 'IN_PROGRESS'
        ? 'COMPLETED'
        : 'PENDING';

    try {
      const res = await updateMilestone(workspace._id, milestone._id, { status: nextStatus });
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update milestone status');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!canManage && !isOwner) return;
    if (!window.confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const res = await deleteMilestone(workspace._id, milestoneId);
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete milestone');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to remove this resource?')) return;

    try {
      const res = await deleteResource(workspace._id, resourceId);
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove resource');
    }
  };

  const handleSaveNotes = async () => {
    if (!isMember) return;
    setSavingNotes(true);
    setNotesSuccess(false);
    try {
      const res = await updateNotes(workspace._id, notesContent);
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
        setNotesSuccess(true);
        setTimeout(() => setNotesSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isMember) return;

    setSendingMessage(true);
    try {
      const res = await addDiscussionMessage(workspace._id, newMessage.trim());
      if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
        setNewMessage('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    const isSelf = memberUserId === currentUserId;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this workspace?'
      : 'Are you sure you want to remove this member?';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await removeMember(workspace._id, memberUserId);
      if (isSelf) {
        navigate('/workspaces');
      } else if (res?.data?.workspace) {
        setWorkspace(res.data.workspace);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Breadcrumb & Nav */}
      <div className="mb-4">
        <Link
          to="/workspaces"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspaces</span>
        </Link>
      </div>

      {/* Main Workspace Header Card */}
      <Card className="p-6 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="teal" icon={Target}>
                {workspace.associatedSkill}
              </Badge>
              <Badge
                variant={workspace.visibility === 'PRIVATE' ? 'slate' : 'emerald'}
                icon={workspace.visibility === 'PRIVATE' ? Lock : Globe}
                className="text-[10px]"
              >
                {workspace.visibility === 'PRIVATE' ? 'Private' : 'Public'}
              </Badge>
              {userRole && (
                <Badge variant="indigo" className="text-[10px] font-bold">
                  {userRole}
                </Badge>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {workspace.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
              {workspace.description || 'Collaborative workspace for shared skill development.'}
            </p>

            {workspace.associatedGoalTitle && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <FolderGit2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="font-semibold">Shared Objective:</span>
                <span>{workspace.associatedGoalTitle}</span>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Peer</span>
              </Button>
            )}

            {isMember && !isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveMember(currentUserId)}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Leave Space
              </Button>
            )}
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Overall Milestone Progress
              </span>
              <span className="text-slate-400">
                ({completedMilestones} of {totalMilestones} completed)
              </span>
            </div>
            <span className="font-extrabold text-teal-600 dark:text-teal-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Secondary Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mt-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'milestones'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Milestones</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {totalMilestones}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'resources'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Resources & Notes</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {workspace.resources?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discussions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'discussions'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Discussions</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {workspace.discussions?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {workspace.members?.length || 0}
          </span>
        </button>
      </div>

      {/* Sub-Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Shared Workspace Milestones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deliverables agreed upon by the workspace team. Completing a milestone tracks collaborative progress without mutating personal goal achievements.
              </p>
            </div>
            {isMember && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setMilestoneToEdit(null);
                  setIsMilestoneModalOpen(true);
                }}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Milestone</span>
              </Button>
            )}
          </div>

          {totalMilestones === 0 ? (
            <EmptyState
              icon={Target}
              title="No Milestones Defined"
              description="Add your first shared milestone to break down the collaborative learning goal into achievable tasks."
              actionLabel={isMember ? 'Add First Milestone' : undefined}
              onAction={isMember ? () => setIsMilestoneModalOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {workspace.milestones.map((milestone) => {
                const isCompleted = milestone.status === 'COMPLETED';
                const isInProgress = milestone.status === 'IN_PROGRESS';

                return (
                  <Card
                    key={milestone._id}
                    className={`p-4 border transition-all ${
                      isCompleted
                        ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(milestone)}
                          disabled={!isMember}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : isInProgress
                              ? 'border-2 border-teal-500 text-teal-600'
                              : 'border-2 border-slate-300 dark:border-slate-700 text-transparent hover:border-teal-500'
                          }`}
                          title={isMember ? 'Click to toggle status' : 'Membership required'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-sm font-bold ${
                                isCompleted
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {milestone.title}
                            </h3>
                            <Badge
                              variant={
                                isCompleted ? 'emerald' : isInProgress ? 'amber' : 'slate'
                              }
                              className="text-[10px]"
                            >
                              {milestone.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          {milestone.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {milestone.description}
                            </p>
                          )}

                          {milestone.targetDate && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMilestoneToEdit(milestone);
                              setIsMilestoneModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(milestone._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Resources & Notes */}
      {activeTab === 'resources' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Shared Resource Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Shared Web Resources
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verified external links, docs, tutorials, and repositories.
                </p>
              </div>
              {isMember && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => setIsResourceModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </Button>
              )}
            </div>

            {(!workspace.resources || workspace.resources.length === 0) ? (
              <EmptyState
                icon={FileText}
                title="No Resources Added"
                description="Share documentation or tutorials that assist the team in achieving workspace deliverables."
                actionLabel={isMember ? 'Add First Resource' : undefined}
                onAction={isMember ? () => setIsResourceModalOpen(true) : undefined}
              />
            ) : (
              <div className="space-y-3">
                {workspace.resources.map((res) => (
                  <Card
                    key={res._id}
                    className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline group"
                        >
                          <span className="truncate">{res.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                        {res.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {res.description}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-2 truncate font-mono">
                          {res.url}
                        </p>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Collaborative Workspace Notes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Collaborative Notes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shared scratchpad and documentation for all members.
                </p>
              </div>
              {notesSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Saved successfully!
                </span>
              )}
            </div>

            <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <textarea
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                placeholder={isMember ? 'Write shared meeting notes, architecture decisions, or key links here...' : 'Members can view notes here.'}
                disabled={!isMember || savingNotes}
                maxLength={5000}
                rows={12}
                className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {notesContent.length}/5000 characters
                  {workspace.notes?.updatedAt && (
                    <span className="ml-2">
                      (Last updated: {new Date(workspace.notes.updatedAt).toLocaleTimeString()})
                    </span>
                  )}
                </span>
                {isMember && (
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Discussions */}
      {activeTab === 'discussions' && (
        <div className="mt-6 max-w-3xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Workspace Discussion Feed
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Asynchronous messages and status updates restricted to workspace members.
            </p>
          </div>

          {/* New Message Input */}
          {isMember ? (
            <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="space-y-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Share an update or question with the workspace..."
                  rows={3}
                  maxLength={1000}
                  disabled={sendingMessage}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {newMessage.length}/1000
                  </span>
                  <Button
                    type="submit"
                    size="xs"
                    variant="primary"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingMessage ? 'Posting...' : 'Post Message'}</span>
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="p-3 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
              You must be a member of this workspace to participate in discussions.
            </div>
          )}

          {/* Messages Feed */}
          {(!workspace.discussions || workspace.discussions.length === 0) ? (
            <EmptyState
              icon={MessageSquare}
              title="No Discussion Messages"
              description="Start the conversation! Post an update, ask a question, or coordinate milestones with the team."
            />
          ) : (
            <div className="space-y-3">
              {[...workspace.discussions].reverse().map((msg) => {
                const authorName = msg.sender?.name || 'Workspace Member';
                const initial = authorName.charAt(0).toUpperCase();

                return (
                  <Card
                    key={msg._id}
                    className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {authorName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: Members */}
      {activeTab === 'members' && (
        <div className="mt-6 max-w-3xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Workspace Members ({workspace.members?.length || 0})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All authorized learners participating in this collaborative workspace.
            </p>
          </div>

          <div className="space-y-2">
            {workspace.members.map((member) => {
              const memUser = member.user || {};
              const memUserId = (memUser._id || memUser).toString();
              const memName = memUser.name || 'Member';
              const memInitial = memName.charAt(0).toUpperCase();
              const isThisOwner = member.role === 'OWNER';
              const isSelf = memUserId === currentUserId;

              return (
                <Card
                  key={member._id || memUserId}
                  className="p-3.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                      {memInitial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {memName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                            (You)
                          </span>
                        )}
                        <Badge
                          variant={isThisOwner ? 'amber' : member.role === 'ADMIN' ? 'indigo' : 'slate'}
                          className="text-[10px]"
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {canManage && !isThisOwner && !isSelf && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleRemoveMember(memUserId)}
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Remove
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Pending Invitations Section (Visible to Owner/Admin) */}
          {canManage && workspace.invitations && workspace.invitations.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                Pending Invitations ({workspace.invitations.filter((i) => i.status === 'PENDING').length})
              </h3>
              <div className="space-y-2">
                {workspace.invitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {inv.user?.name || inv.user?.email || 'Invited User'}
                      </span>
                      <span className="text-slate-400 ml-2">Role: {inv.role}</span>
                    </div>
                    <Badge variant={inv.status === 'PENDING' ? 'amber' : 'slate'} className="text-[10px]">
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={workspace._id}
        onMemberInvited={(updatedWs) => setWorkspace(updatedWs)}
      />

      <WorkspaceMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setMilestoneToEdit(null);
        }}
        workspaceId={workspace._id}
        milestoneToEdit={milestoneToEdit}
        onMilestoneSaved={(updatedWs) => setWorkspace(updatedWs)}
      />

      <WorkspaceResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        workspaceId={workspace._id}
        onResourceAdded={(updatedWs) => setWorkspace(updatedWs)}
      />
    </div>
  );
};

export default WorkspaceDetailPage;
