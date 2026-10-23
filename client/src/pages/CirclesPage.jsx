import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, Target, Sparkles, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import CircleCard from '../components/circles/CircleCard';
import CreateCircleModal from '../components/circles/CreateCircleModal';
import { getCircles } from '../services/circleService';
import { useAuth } from '../context/AuthContext';

export const CirclesPage = () => {
  const { isAuthenticated } = useAuth();

  const [circles, setCircles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [onlyMy, setOnlyMy] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('ALL_LEVELS');
  const [policy, setPolicy] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCirclesList = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        level: level !== 'ALL_LEVELS' ? level : undefined,
        policy: policy || undefined,
        onlyMy: onlyMy ? 'true' : undefined,
      };

      const res = await getCircles(params);
      if (res?.data?.circles) {
        setCircles(res.data.circles);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to retrieve learning circles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirclesList(1);
  }, [onlyMy, level, policy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCirclesList(1);
  };

  const handleCircleCreated = (newCircle) => {
    setCircles((prev) => [newCircle, ...prev]);
  };

  return (
    <PageContainer
      title="Learning Circles & Cohorts"
      subtitle="Collaborate in focused study cohorts, tackle shared roadmap milestones, and participate in peer group sessions."
      action={
        isAuthenticated && (
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={Plus}>
            Create Learning Circle
          </Button>
        )
      }
    >
      {/* Filtering & Search Bar */}
      <div className="mb-8 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* My Circles Toggle */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setOnlyMy(false)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !onlyMy
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Explore All Circles
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setOnlyMy(true)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  onlyMy
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                My Circles
              </button>
            )}
          </div>

          {/* Difficulty & Policy Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL_LEVELS">All Difficulty Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>

            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Membership Policies</option>
              <option value="OPEN">Open Enrollment</option>
              <option value="APPLY_TO_JOIN">Apply to Join</option>
              <option value="INVITE_ONLY">Invite Only</option>
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by circle topic, primary skill (e.g. React, Python, DevOps), or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <Button type="submit" size="sm" variant="ghost">Search</Button>
          {search && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                fetchCirclesList(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Content Grid / Loading / Error */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Discovering collaborative learning circles..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs text-center">
          {error}
        </div>
      ) : circles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={onlyMy ? 'You Haven\'t Joined Any Circles Yet' : 'No Learning Circles Found'}
            description={
              onlyMy
                ? 'Browse available circles or create a new cohort around your target skills.'
                : 'Try adjusting your search criteria or create a new circle to start learning together.'
            }
            actionLabel="Create Circle"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <CircleCard key={circle._id} circle={circle} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchCirclesList(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCirclesList(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Circle Modal */}
      <CreateCircleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCircleCreated={handleCircleCreated}
      />
    </PageContainer>
  );
};

export default CirclesPage;
