import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import GoalCreateModal from '../components/goals/GoalCreateModal';
import { getGoals } from '../services/goalService';

export const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchGoalsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGoals(statusFilter);
      if (response?.data?.goals) {
        setGoals(response.data.goals);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsList();
  }, [statusFilter]);

  return (
    <PageContainer
      title="Goal Blueprints & Skill Gap Engine"
      subtitle="Define your target outcomes. EnhanceUs extracts required skills and maps missing gaps against your profile."
      action={
        <Button leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          Define Goal Blueprint
        </Button>
      }
    >
      {/* Filter Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === '' ? 'All Goals' : st}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={fetchGoalsList} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Fetching goals..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
          {error}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No Goal Blueprints Defined Yet"
            description="EnhanceUs operates on goal-driven skill gap matching. Define your first target project to unlock automated skill extraction."
            actionLabel="Define Goal Blueprint"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const { skillGaps = {}, progress = 0 } = goal;
            const missingCount = skillGaps.missingSkills?.length || 0;
            const knownCount = skillGaps.knownSkills?.length || 0;

            return (
              <Card key={goal._id} hover className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={goal.status === 'COMPLETED' ? 'emerald' : 'teal'}>
                      {goal.status}
                    </Badge>
                    <span className="text-xs font-bold text-slate-500">{progress}% Coverage</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{goal.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {goal.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-teal-600 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Skill Gap Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="emerald">{knownCount} Skills Verified</Badge>
                    <Badge variant="rose">{missingCount} Gaps to Learn</Badge>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Created {new Date(goal.createdAt).toLocaleDateString()}
                  </span>
                  <Link to={`/goals/${goal._id}`}>
                    <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                      View Matrix
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal Creation Modal */}
      <GoalCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={fetchGoalsList}
      />
    </PageContainer>
  );
};

export default GoalsPage;
