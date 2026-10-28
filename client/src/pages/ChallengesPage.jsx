import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { Trophy, Plus, Search, Filter, Target, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { ChallengeCard } from '../components/challenges/ChallengeCard';
import { CreateChallengeModal } from '../components/challenges/CreateChallengeModal';
import { ChallengeTeamJoinModal } from '../components/challenges/ChallengeTeamJoinModal';
import { AchievementsList } from '../components/challenges/AchievementsList';
import { getChallenges, getUserChallenges, joinChallenge, getMyAchievements } from '../services/challengeService';

export const ChallengesPage = () => {
  usePageMeta({
    title: 'Community Challenges & Collaborative Sprints | EnhanceUs',
    description: 'Participate in time-boxed community challenges, track team deliverable milestones, and earn verified skill achievements.',
  });

  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'my' | 'achievements'
  const [challenges, setChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState({ joinedChallenges: [], createdChallenges: [] });
  const [achievementsData, setAchievementsData] = useState({ achievements: [], unlockedCount: 0, totalCount: 6 });

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamJoinChallenge, setTeamJoinChallenge] = useState(null);

  const fetchExploreChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getChallenges({
        search: search.trim() || undefined,
        status: selectedStatus || undefined,
        type: selectedType || undefined,
        skill: selectedSkill || undefined,
      });
      setChallenges(res?.data?.challenges || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserChallenges = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await getUserChallenges();
      setUserChallenges(res?.data || { joinedChallenges: [], createdChallenges: [] });
    } catch (err) {
      console.warn('Failed to fetch user challenges:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await getMyAchievements();
      setAchievementsData(res?.data || { achievements: [], unlockedCount: 0, totalCount: 6 });
    } catch (err) {
      console.warn('Failed to fetch achievements:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchExploreChallenges();
    } else if (activeTab === 'my') {
      fetchUserChallenges();
    } else if (activeTab === 'achievements') {
      fetchAchievements();
    }
  }, [activeTab, search, selectedStatus, selectedType, selectedSkill]);

  const handleJoinClick = async (challenge) => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/challenges';
      return;
    }

    if (challenge.participationType === 'TEAM') {
      setTeamJoinChallenge(challenge);
    } else {
      try {
        await joinChallenge(challenge._id);
        fetchExploreChallenges();
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to join challenge');
      }
    }
  };

  const handleTeamJoined = () => {
    fetchExploreChallenges();
  };

  const handleChallengeCreated = (newCh) => {
    setChallenges((prev) => [newCh, ...prev]);
    setActiveTab('explore');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Trophy className="w-5 h-5" />
            </span>
            <Badge variant="teal" className="text-[10px] font-bold uppercase tracking-wider">
              V3.8 Community Sprints
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Community Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Collaborate on time-boxed skill milestones, participate as an individual or team workspace, and earn verified peer achievements.
          </p>
        </div>

        {isAuthenticated && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start md:self-auto shrink-0 shadow-sm"
          >
            Create Challenge
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition-all ${
            activeTab === 'explore'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 font-bold bg-teal-50/40 dark:bg-teal-950/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Explore Challenges
        </button>
        {isAuthenticated && (
          <>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition-all ${
                activeTab === 'my'
                  ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 font-bold bg-teal-50/40 dark:bg-teal-950/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              My Sprints ({userChallenges.joinedChallenges?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition-all ${
                activeTab === 'achievements'
                  ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 font-bold bg-teal-50/40 dark:bg-teal-950/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Achievements ({achievementsData.unlockedCount} / {achievementsData.totalCount})
            </button>
          </>
        )}
      </div>

      {/* Tab: Explore Challenges */}
      {activeTab === 'explore' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search challenges..."
                className="pl-9 text-xs"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="">All Participation Types</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="TEAM">Team (Workspace)</option>
            </select>

            <Input
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              placeholder="Filter by skill..."
              className="text-xs"
            />
          </div>

          {/* Challenges Grid */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              Loading challenges...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 text-center">
              {error}
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Challenges Found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                No community challenges match your current search criteria. Try clearing filters or create a new challenge!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.map((ch) => (
                <ChallengeCard
                  key={ch._id}
                  challenge={ch}
                  currentUserId={user?._id}
                  onJoin={handleJoinClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Sprints */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Enrolled Challenges ({userChallenges.joinedChallenges?.length || 0})
            </h2>

            {userChallenges.joinedChallenges?.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                You have not joined any community challenges yet. Explore active challenges to start!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userChallenges.joinedChallenges.map((ch) => (
                  <ChallengeCard
                    key={ch._id}
                    challenge={{ ...ch, isJoined: true, userProgress: ch.progress }}
                    currentUserId={user?._id}
                  />
                ))}
              </div>
            )}
          </div>

          {userChallenges.createdChallenges?.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Challenges Created by You ({userChallenges.createdChallenges.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userChallenges.createdChallenges.map((ch) => (
                  <ChallengeCard
                    key={ch._id}
                    challenge={ch}
                    currentUserId={user?._id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Achievements */}
      {activeTab === 'achievements' && (
        <AchievementsList
          achievements={achievementsData.achievements}
          unlockedCount={achievementsData.unlockedCount}
          totalCount={achievementsData.totalCount}
        />
      )}

      {/* Modals */}
      <CreateChallengeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onChallengeCreated={handleChallengeCreated}
      />

      {teamJoinChallenge && (
        <ChallengeTeamJoinModal
          isOpen={Boolean(teamJoinChallenge)}
          onClose={() => setTeamJoinChallenge(null)}
          challenge={teamJoinChallenge}
          onJoined={handleTeamJoined}
        />
      )}
    </div>
  );
};

export default ChallengesPage;
