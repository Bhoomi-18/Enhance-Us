import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Users, Mail, Compass, Sparkles, Filter } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import WorkspaceCard from '../components/workspaces/WorkspaceCard';
import CreateWorkspaceModal from '../components/workspaces/CreateWorkspaceModal';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  getUserWorkspaces,
  getDiscoverableWorkspaces,
  respondToInvitation,
} from '../services/workspaceService';

export const WorkspacesPage = () => {
  usePageMeta({
    title: 'Collaborative Workspaces | EnhanceUs',
    description: 'Collaborate with peers on shared learning goals, milestones, notes, and discussions on EnhanceUs.',
    canonical: 'https://www.briefenai.me/workspaces',
  });

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-workspaces'); // 'my-workspaces' | 'discover' | 'invitations'
  const [workspaces, setWorkspaces] = useState([]);
  const [discoverWorkspaces, setDiscoverWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, discoverRes] = await Promise.all([
        getUserWorkspaces(),
        getDiscoverableWorkspaces(),
      ]);

      if (userRes?.data) {
        setWorkspaces(userRes.data.workspaces || []);
        setInvitations(userRes.data.pendingInvitations || []);
      }

      if (discoverRes?.data) {
        setDiscoverWorkspaces(discoverRes.data.workspaces || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load collaborative workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleWorkspaceCreated = (newWorkspace) => {
    setWorkspaces((prev) => [newWorkspace, ...prev]);
    setActiveTab('my-workspaces');
  };

  const handleAcceptInvite = async (workspaceId) => {
    try {
      const res = await respondToInvitation(workspaceId, 'ACCEPT');
      if (res?.data?.workspace) {
        setWorkspaces((prev) => [res.data.workspace, ...prev]);
        setInvitations((prev) => prev.filter((ws) => ws._id !== workspaceId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (workspaceId) => {
    try {
      await respondToInvitation(workspaceId, 'DECLINE');
      setInvitations((prev) => prev.filter((ws) => ws._id !== workspaceId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline invitation');
    }
  };

  // Filter items based on active tab and search query
  const getDisplayItems = () => {
    let source = [];
    if (activeTab === 'my-workspaces') {
      source = workspaces;
    } else if (activeTab === 'discover') {
      source = discoverWorkspaces;
    } else if (activeTab === 'invitations') {
      source = invitations;
    }

    if (!searchQuery.trim()) return source;

    const q = searchQuery.toLowerCase();
    return source.filter(
      (ws) =>
        ws.title?.toLowerCase().includes(q) ||
        ws.associatedSkill?.toLowerCase().includes(q) ||
        ws.description?.toLowerCase().includes(q)
    );
  };

  const displayItems = getDisplayItems();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60">
              V3.7 Collaboration
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Shared Learning Spaces
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Collaborative Workspaces
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Co-learn and build with peers on shared goals, milestones, notes, and discussions with server-enforced access controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 pb-2 sm:pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('my-workspaces')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my-workspaces'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>My Workspaces</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'my-workspaces'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {workspaces.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'discover'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Discover Public</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'discover'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {discoverWorkspaces.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'invitations'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Invitations</span>
            {invitations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white animate-pulse">
                {invitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, skill..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-slate-400 mt-3">Loading workspaces...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs">
            {error}
          </div>
        ) : displayItems.length === 0 ? (
          <EmptyState
            icon={activeTab === 'invitations' ? Mail : Layers}
            title={
              activeTab === 'invitations'
                ? 'No Pending Invitations'
                : activeTab === 'discover'
                ? 'No Public Workspaces Found'
                : 'No Workspaces Yet'
            }
            description={
              activeTab === 'invitations'
                ? 'You do not have any pending workspace invitations at this time.'
                : activeTab === 'discover'
                ? 'There are currently no public workspaces matching your filter. Be the first to create one!'
                : 'You have not created or joined any collaborative workspaces yet. Start one now to track shared goals with peers.'
            }
            actionLabel={activeTab === 'my-workspaces' ? 'Create First Workspace' : undefined}
            onAction={activeTab === 'my-workspaces' ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayItems.map((ws) => (
              <WorkspaceCard
                key={ws._id}
                workspace={ws}
                currentUserId={user?._id}
                isInvitation={activeTab === 'invitations'}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
};

export default WorkspacesPage;
