import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  Shield,
  BookOpen,
  Calendar,
  MessageSquare,
  Settings,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Unlock,
  AlertCircle,
  Pin,
  Trash2,
  Send,
  UserCheck,
  UserX,
  Sparkles,
  ChevronRight,
  Award,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getCircleById,
  updateCircle,
  joinCircle,
  leaveCircle,
  manageJoinRequest,
  updateMemberRole,
  removeMember,
  closeCircle,
  addMilestone,
  updateMilestone,
  addTask,
  toggleTask,
  proposeSession,
  getSessions,
  rsvpSession,
  getPosts,
  createPost,
  addReply,
  deletePost,
} from '../services/circleService';

export const CircleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();

  const [circle, setCircle] = useState(null);
  const [permissions, setPermissions] = useState({
    isOwner: false,
    isModerator: false,
    isMember: false,
    role: null,
    hasPendingRequest: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'overview' | 'roadmap' | 'sessions' | 'discussions' | 'members' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-resource states
  const [sessions, setSessions] = useState({ upcoming: [], past: [] });
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Modals & Action States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);

  // Roadmap Modals
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', targetDate: '', completionCriteria: '' });
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', linkUrl: '' });

  // Session Modal
  const [isProposeSessionModalOpen, setIsProposeSessionModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    date: '',
    time: '18:00',
    durationMinutes: 60,
    meetingUrl: '',
    maxParticipants: 20,
  });

  // Discussion Post Modal
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', isAnnouncement: false, isPinned: false });
  const [replyInput, setReplyInput] = useState({});

  const fetchCircleDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCircleById(id);
      if (res?.data?.circle) {
        setCircle(res.data.circle);
        if (res.data.viewerPermissions) {
          setPermissions(res.data.viewerPermissions);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load circle');
    } finally {
      setLoading(false);
    }
  };

  const fetchCircleSessions = async () => {
    try {
      const res = await getSessions(id);
      if (res?.data) setSessions(res.data);
    } catch (e) {
      console.warn('[Sessions fetch error]', e.message);
    }
  };

  const fetchCirclePosts = async () => {
    setPostsLoading(true);
    try {
      const res = await getPosts(id);
      if (res?.data?.posts) setPosts(res.data.posts);
    } catch (e) {
      console.warn('[Discussions fetch error]', e.message);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchCircleDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchCircleSessions();
    if (activeTab === 'discussions') fetchCirclePosts();
  }, [activeTab, id]);

  // Actions
  const handleJoinCircle = async (e) => {
    e.preventDefault();
    setJoining(true);
    try {
      const res = await joinCircle(id, { message: joinMessage });
      setIsJoinModalOpen(false);
      setJoinMessage('');
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to join circle');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCircle = async () => {
    if (!window.confirm('Are you sure you want to leave this learning circle?')) return;
    try {
      await leaveCircle(id);
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to leave circle');
    }
  };

  const handleReviewJoinRequest = async (requestId, action) => {
    try {
      await manageJoinRequest(id, requestId, action);
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action failed');
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await updateMemberRole(id, targetUserId, newRole);
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this user from the learning circle?')) return;
    try {
      await removeMember(id, targetUserId);
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to remove member');
    }
  };

  // Roadmap Actions
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      await addMilestone(id, newMilestone);
      setIsAddMilestoneModalOpen(false);
      setNewMilestone({ title: '', description: '', targetDate: '', completionCriteria: '' });
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add milestone');
    }
  };

  const handleToggleMilestoneComplete = async (milestoneId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateMilestone(id, milestoneId, { status: nextStatus });
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update milestone');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!selectedMilestoneId) return;
    try {
      await addTask(id, selectedMilestoneId, newTask);
      setIsAddTaskModalOpen(false);
      setNewTask({ title: '', description: '', linkUrl: '' });
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add task');
    }
  };

  const handleToggleTask = async (milestoneId, taskId) => {
    try {
      await toggleTask(id, milestoneId, taskId);
      await fetchCircleDetails();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to toggle task');
    }
  };

  // Session Actions
  const handleProposeSession = async (e) => {
    e.preventDefault();
    try {
      await proposeSession(id, newSession);
      setIsProposeSessionModalOpen(false);
      setNewSession({
        title: '',
        description: '',
        date: '',
        time: '18:00',
        durationMinutes: 60,
        meetingUrl: '',
        maxParticipants: 20,
      });
      await fetchCircleSessions();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to propose group session');
    }
  };

  const handleRsvpSession = async (sessionId, status) => {
    try {
      await rsvpSession(sessionId, status);
      await fetchCircleSessions();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'RSVP action failed');
    }
  };

  // Discussion Actions
  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await createPost(id, newPost);
      setIsCreatePostModalOpen(false);
      setNewPost({ title: '', content: '', isAnnouncement: false, isPinned: false });
      await fetchCirclePosts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to post message');
    }
  };

  const handleAddReply = async (postId) => {
    const text = replyInput[postId];
    if (!text || !text.trim()) return;
    try {
      await addReply(id, postId, text.trim());
      setReplyInput({ ...replyInput, [postId]: '' });
      await fetchCirclePosts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add reply');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(id, postId);
      await fetchCirclePosts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete post');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" label="Loading Learning Circle Workspace..." />
        </div>
      </PageContainer>
    );
  }

  if (error || !circle) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto py-16 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Circle Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{error || 'Circle could not be loaded.'}</p>
          <Link to="/circles">
            <Button leftIcon={ArrowLeft}>Back to Circles</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const membersCount = circle.members?.length || 0;
  const isFull = membersCount >= circle.memberLimit;
  const milestones = circle.roadmap || [];
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  return (
    <PageContainer>
      {/* Top Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/circles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Circles
        </Link>
      </div>

      {/* Circle Header Hero Card */}
      <Card className="mb-6 p-6 border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50/50 to-teal-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md border-2 border-white dark:border-slate-800">
              {circle.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant="teal" icon={Target}>
                  {circle.primarySkill}
                </Badge>
                <Badge variant="slate">
                  {circle.skillLevel.replace('_', ' ')}
                </Badge>
                <Badge variant={circle.membershipPolicy === 'OPEN' ? 'emerald' : circle.membershipPolicy === 'APPLY_TO_JOIN' ? 'amber' : 'purple'}>
                  {circle.membershipPolicy.replace(/_/g, ' ')}
                </Badge>
                {permissions.isMember && (
                  <Badge variant="indigo" icon={Shield}>
                    {permissions.role || 'MEMBER'}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{circle.title}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {circle.description}
              </p>
            </div>
          </div>

          {/* Action Button: Join / Leave / Status */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {!permissions.isMember ? (
              permissions.hasPendingRequest ? (
                <Badge variant="amber" icon={Clock} className="px-3 py-2 text-xs">
                  Join Request Pending Review
                </Badge>
              ) : isFull ? (
                <Badge variant="rose" className="px-3 py-2 text-xs">
                  Circle Capacity Full ({membersCount}/{circle.memberLimit})
                </Badge>
              ) : (
                <Button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="font-bold shadow-md"
                >
                  {circle.membershipPolicy === 'OPEN' ? 'Join Circle' : 'Apply to Join'}
                </Button>
              )
            ) : (
              !permissions.isOwner && (
                <Button variant="outline" size="sm" onClick={handleLeaveCircle} className="text-rose-600 hover:text-rose-700">
                  Leave Circle
                </Button>
              )
            )}
          </div>
        </div>

        {/* Capacity & Progress Mini Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">MEMBERS</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {membersCount} / {circle.memberLimit} enrolled
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">ROADMAP PROGRESS</span>
            <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
              {progressPercent}% completed ({completedMilestones}/{milestones.length})
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">FOUNDED BY</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {circle.owner?.name || 'Peer'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">STATUS</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {circle.status}
            </span>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="mb-6 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: BookOpen },
          { key: 'roadmap', label: `Roadmap (${milestones.length})`, icon: Target },
          { key: 'sessions', label: `Sessions (${sessions.upcoming?.length || 0})`, icon: Calendar },
          { key: 'discussions', label: 'Discussions', icon: MessageSquare },
          { key: 'members', label: `Members (${membersCount})`, icon: Users },
          ...(permissions.isOwner ? [{ key: 'settings', label: 'Settings', icon: Settings }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Objectives & Goals</CardTitle>
                <CardDescription>Target competencies and collaborative scope for this circle.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {circle.learningObjectives && circle.learningObjectives.length > 0 ? (
                  <ul className="space-y-2">
                    {circle.learningObjectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">No explicit objectives set for this circle.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Circle Activity Log</CardTitle>
                <CardDescription>Recent milestones, member enrollments, and moderation actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {(circle.activityLog || []).slice(-5).reverse().map((act, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{act.details}</span>
                    <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Primary Domain</CardTitle>
                <CardDescription>Core skill focus</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="teal" icon={Target} className="text-sm py-1">
                  {circle.primarySkill}
                </Badge>
                {circle.secondarySkills && circle.secondarySkills.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Related Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {circle.secondarySkills.map((sk, idx) => (
                        <Badge key={idx} variant="slate">{sk}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Circle Founder</CardTitle>
                <CardDescription>Organizer and primary host</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  {circle.owner?.name ? circle.owner.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{circle.owner?.name}</h4>
                  <p className="text-[10px] text-slate-400">{circle.owner?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. ROADMAP TAB */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Collaborative Milestone Roadmap</h3>
              <p className="text-xs text-slate-500">Shared goals and community learning targets.</p>
            </div>
            {permissions.isModerator && (
              <Button size="sm" onClick={() => setIsAddMilestoneModalOpen(true)} leftIcon={Plus}>
                Add Milestone
              </Button>
            )}
          </div>

          {milestones.length === 0 ? (
            <Card>
              <EmptyState
                icon={Target}
                title="No Milestones Defined Yet"
                description="Circle moderators can define collaborative roadmap milestones and actionable tasks for members."
                actionLabel={permissions.isModerator ? 'Add First Milestone' : undefined}
                onAction={() => setIsAddMilestoneModalOpen(true)}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {milestones.map((ms) => {
                const isCompleted = ms.status === 'COMPLETED';
                const tasks = ms.tasks || [];
                const completedTasks = tasks.filter((t) => t.isCompleted).length;

                return (
                  <Card key={ms._id} className="p-5 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isCompleted ? 'emerald' : 'teal'}>
                            {ms.status.replace('_', ' ')}
                          </Badge>
                          {ms.targetDate && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due {new Date(ms.targetDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ms.title}</h4>
                        {ms.description && <p className="text-xs text-slate-500 mt-1">{ms.description}</p>}
                      </div>

                      {permissions.isModerator && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleMilestoneComplete(ms._id, ms.status)}
                          className={isCompleted ? 'text-amber-600' : 'text-emerald-600'}
                        >
                          {isCompleted ? 'Reopen Milestone' : 'Mark Completed'}
                        </Button>
                      )}
                    </div>

                    {/* Tasks List within Milestone */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Actionable Tasks ({completedTasks}/{tasks.length})</span>
                        {permissions.isMember && (
                          <button
                            onClick={() => {
                              setSelectedMilestoneId(ms._id);
                              setIsAddTaskModalOpen(true);
                            }}
                            className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Plus className="w-3 h-3" /> Add Task
                          </button>
                        )}
                      </div>

                      {tasks.map((task) => (
                        <div
                          key={task._id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={task.isCompleted}
                              onChange={() => handleToggleTask(ms._id, task._id)}
                              disabled={!permissions.isMember}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <span className={task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                              {task.title}
                            </span>
                          </div>

                          {task.linkUrl && (
                            <a
                              href={task.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" /> Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Circle Group Sessions</h3>
              <p className="text-xs text-slate-500">Live pair programming, architecture reviews, and study calls.</p>
            </div>
            {permissions.isMember && (
              <Button size="sm" onClick={() => setIsProposeSessionModalOpen(true)} leftIcon={Plus}>
                Schedule Group Session
              </Button>
            )}
          </div>

          {sessions.upcoming.length === 0 ? (
            <Card>
              <EmptyState
                icon={Calendar}
                title="No Upcoming Group Sessions"
                description="Members can propose a study call or pairing session."
                actionLabel={permissions.isMember ? 'Propose Session' : undefined}
                onAction={() => setIsProposeSessionModalOpen(true)}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.upcoming.map((sess) => {
                const isGoing = (sess.rsvps || []).some(
                  (r) => (r.user?._id || r.user).toString() === authUser?._id && r.status === 'GOING'
                );
                const attendeesCount = (sess.rsvps || []).filter((r) => r.status === 'GOING').length;

                return (
                  <Card key={sess._id} className="p-5 border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="teal">Group Call</Badge>
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {sess.time} ({sess.durationMinutes} mins)
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{sess.title}</h4>
                      <p className="text-xs text-slate-500 mb-3">{sess.sessionNotes || 'Community study session.'}</p>

                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <div>Date: <strong>{new Date(sess.date).toLocaleDateString()}</strong></div>
                        <div>Attendees: <strong>{attendeesCount} / {sess.maxParticipants || 20}</strong></div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {sess.meetingUrl && isGoing ? (
                        <a href={sess.meetingUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" rightIcon={ExternalLink} className="text-xs">
                            Join Call
                          </Button>
                        </a>
                      ) : <span />}

                      {permissions.isMember && (
                        <Button
                          size="sm"
                          variant={isGoing ? 'outline' : 'teal'}
                          onClick={() => handleRsvpSession(sess._id, isGoing ? 'NOT_GOING' : 'GOING')}
                          className="text-xs font-bold"
                        >
                          {isGoing ? 'Leave Session' : 'RSVP (Going)'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. DISCUSSIONS TAB */}
      {activeTab === 'discussions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Circle Discussion Board</h3>
              <p className="text-xs text-slate-500">Announcements, technical threads, and learning questions.</p>
            </div>
            {permissions.isMember && (
              <Button size="sm" onClick={() => setIsCreatePostModalOpen(true)} leftIcon={Plus}>
                New Thread
              </Button>
            )}
          </div>

          {postsLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" label="Loading circle discussions..." />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <EmptyState
                icon={MessageSquare}
                title="No Discussion Threads Yet"
                description="Start the conversation by sharing a resource, asking a question, or announcing a study schedule."
                actionLabel={permissions.isMember ? 'Start First Thread' : undefined}
                onAction={() => setIsCreatePostModalOpen(true)}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post._id} className="p-5 border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                        {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{post.author?.name}</span>
                          {post.isAnnouncement && <Badge variant="amber" icon={Pin}>Announcement</Badge>}
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {(post.author?._id === authUser?._id || permissions.isModerator) && (
                      <button onClick={() => handleDeletePost(post._id)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{post.title}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed mb-4">
                    {post.content}
                  </p>

                  {/* Replies List */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Replies ({post.replies.length})
                      </span>
                      {post.replies.map((reply) => (
                        <div key={reply._id} className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              {reply.author?.name || 'Member'}
                            </span>
                            <span className="text-[9px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-xs">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Input */}
                  {permissions.isMember && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyInput[post._id] || ''}
                        onChange={(e) => setReplyInput({ ...replyInput, [post._id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleAddReply(post._id)}>
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Join Requests Drawer (For Owner & Moderator) */}
          {permissions.isModerator && circle.joinRequests?.some((r) => r.status === 'PENDING') && (
            <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-5">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Join Requests
              </h3>
              <div className="space-y-3">
                {circle.joinRequests.filter((r) => r.status === 'PENDING').map((req) => (
                  <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-850 rounded-xl border border-amber-200/80 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{req.user?.name}</span>
                      <p className="text-slate-500 mt-0.5">"{req.message || 'No message attached'}"</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReviewJoinRequest(req._id, 'REJECT')} className="text-xs">
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleReviewJoinRequest(req._id, 'ACCEPT')} className="text-xs font-bold">
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Members Roster */}
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Members ({membersCount})</CardTitle>
              <CardDescription>Collaborators currently participating in this learning circle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {circle.members?.map((member) => {
                  const mUser = member.user || {};
                  const isCurrent = mUser._id === authUser?._id;
                  const isOwnerMember = member.role === 'OWNER';
                  const isModMember = member.role === 'MODERATOR';

                  return (
                    <div key={mUser._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                          {mUser.name ? mUser.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{mUser.name}</span>
                            <Badge variant={isOwnerMember ? 'amber' : isModMember ? 'indigo' : 'slate'}>
                              {member.role}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Moderation Actions for Owner */}
                      {permissions.isOwner && !isCurrent && (
                        <div className="flex items-center gap-2">
                          {!isModMember ? (
                            <Button size="sm" variant="ghost" onClick={() => handleRoleChange(mUser._id, 'MODERATOR')} className="text-[11px]">
                              Appoint Moderator
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleRoleChange(mUser._id, 'MEMBER')} className="text-[11px]">
                              Demote to Member
                            </Button>
                          )}

                          <Button size="sm" variant="ghost" onClick={() => handleRoleChange(mUser._id, 'OWNER')} className="text-[11px] text-amber-600">
                            Transfer Ownership
                          </Button>

                          <button onClick={() => handleRemoveMember(mUser._id)} className="p-1.5 text-slate-400 hover:text-rose-600">
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. SETTINGS TAB (Owner Only) */}
      {activeTab === 'settings' && permissions.isOwner && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Circle Administration & Settings</CardTitle>
            <CardDescription>Manage policy controls and circle lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-xs">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-rose-800 dark:text-rose-200">Close Learning Circle</h4>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">Permanently archive and close this circle.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to close this circle?')) {
                    await closeCircle(id);
                    navigate('/circles');
                  }
                }}
                className="text-rose-600 border-rose-300"
              >
                Close Circle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODALS */}

      {/* Join Request Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title={circle.membershipPolicy === 'OPEN' ? 'Join Learning Circle' : 'Apply to Join Circle'}
        description={`Confirm your enrollment in ${circle.title}`}
        className="max-w-md"
      >
        <form onSubmit={handleJoinCircle} className="space-y-4 text-xs mt-2">
          {circle.membershipPolicy === 'APPLY_TO_JOIN' && (
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Application Message (Tell the moderators why you'd like to join)
              </label>
              <textarea
                rows={3}
                placeholder="Share your background and learning goals..."
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={joining} className="font-bold">
              {circle.membershipPolicy === 'OPEN' ? 'Confirm & Join' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isAddMilestoneModalOpen}
        onClose={() => setIsAddMilestoneModalOpen(false)}
        title="Add Shared Roadmap Milestone"
        description="Define a collective target competency or milestone."
        className="max-w-md"
      >
        <form onSubmit={handleAddMilestone} className="space-y-4 text-xs mt-2">
          <Input
            label="Milestone Title"
            placeholder="e.g. Master React Data Loaders"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={2}
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <Input
            label="Target Date"
            type="date"
            value={newMilestone.targetDate}
            onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddMilestoneModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold">
              Add Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Add Actionable Task"
        description="Attach a learning task or resource link to this milestone."
        className="max-w-md"
      >
        <form onSubmit={handleAddTask} className="space-y-4 text-xs mt-2">
          <Input
            label="Task Title"
            placeholder="e.g. Build demo dashboard layout"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <Input
            label="External Resource / Artifact Link (Optional)"
            placeholder="https://github.com/..."
            value={newTask.linkUrl}
            onChange={(e) => setNewTask({ ...newTask, linkUrl: e.target.value })}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold">
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Propose Group Session Modal */}
      <Modal
        isOpen={isProposeSessionModalOpen}
        onClose={() => setIsProposeSessionModalOpen(false)}
        title="Schedule Circle Group Session"
        description="Host a group study call or live pairing workshop."
        className="max-w-md"
      >
        <form onSubmit={handleProposeSession} className="space-y-4 text-xs mt-2">
          <Input
            label="Session Title"
            placeholder="e.g. Weekly Group Pairing Workshop"
            value={newSession.title}
            onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
              required
            />
            <Input
              label="Time (HH:mm)"
              type="time"
              value={newSession.time}
              onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
              required
            />
          </div>
          <Input
            label="Meeting URL (e.g. Google Meet, Zoom)"
            placeholder="https://meet.google.com/..."
            value={newSession.meetingUrl}
            onChange={(e) => setNewSession({ ...newSession, meetingUrl: e.target.value })}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsProposeSessionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold">
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Discussion Post Modal */}
      <Modal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        title="Start Discussion Thread"
        description="Share questions, thoughts, or resources with your circle."
        className="max-w-lg"
      >
        <form onSubmit={handleCreatePost} className="space-y-4 text-xs mt-2">
          <Input
            label="Thread Title"
            placeholder="e.g. Best architecture for custom hooks"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Content</label>
            <textarea
              rows={4}
              placeholder="Write your discussion topic or resource details..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          {permissions.isModerator && (
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPost.isAnnouncement}
                  onChange={(e) => setNewPost({ ...newPost, isAnnouncement: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Post as Announcement</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPost.isPinned}
                  onChange={(e) => setNewPost({ ...newPost, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Pin to Top</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreatePostModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold">
              Post Thread
            </Button>
          </div>
        </form>
      </Modal>

    </PageContainer>
  );
};

export default CircleDetailPage;
