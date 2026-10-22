import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Target, Users, Zap, Plus, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import GoalCreateModal from '../components/goals/GoalCreateModal';
import { getGoals } from '../services/goalService';

export const DashboardPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchGoalsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGoals();
      if (response?.data?.goals) {
        setGoals(response.data.goals);
      }
    } catch (e) {
      console.warn('[Dashboard Fetch Error]', e.message);
      setError(e?.response?.data?.message || e.message || 'Unable to load goals. The server may be waking up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const totalGoals = goals.length;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0;
  const totalGaps = goals.reduce((acc, g) => acc + (g.skillGaps?.missingSkills?.length || 0), 0);

  return (
    <PageContainer
      title="Goal Dashboard"
      subtitle="Overview of active project blueprints, skill gap analytics, and peer match readiness."
      action={
        <Button leftIcon={Plus} size="sm" onClick={() => setIsCreateModalOpen(true)}>
          New Goal Blueprint
        </Button>
      }
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Goals</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalGoals}</span>
            <Badge variant="teal">{totalGoals === 1 ? 'Goal Blueprint' : 'Goal Blueprints'}</Badge>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Identified Skill Gaps</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalGaps}</span>
            <Badge variant="rose">Target Competencies</Badge>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Skill Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{avgProgress}%</span>
            <Badge variant="emerald">Profile Fit</Badge>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Goal Blueprints</CardTitle>
            <CardDescription>
              Goal breakdown, AI skill extraction, and skill gap matrix.
            </CardDescription>
          </div>
          <Link to="/goals">
            <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
              View All Goals
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" label="Loading active goals..." />
            </div>
          ) : error ? (
            <div className="py-8 px-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Unable to load goals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                {error}
              </p>
              <Button
                size="sm"
                variant="outline"
                leftIcon={RefreshCw}
                onClick={fetchGoalsData}
              >
                Retry
              </Button>
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Active Goals Created Yet"
              description="EnhanceUs matches you based on defined goals rather than static profiles. Create your first goal blueprint to unlock skill gap analysis."
              actionLabel="Create Goal Blueprint"
              onAction={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal._id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="teal">{goal.status}</Badge>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{goal.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{goal.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-teal-700 dark:text-teal-300">{goal.progress}%</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Coverage</span>
                    </div>
                    <Link to={`/goals/${goal._id}`}>
                      <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                        Detail Matrix
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={fetchGoalsData}
      />
    </PageContainer>
  );
};

export default DashboardPage;
