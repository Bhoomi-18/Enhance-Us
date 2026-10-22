import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Activity,
  Mail,
  Database,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getAdminOverview, getAdminAnalytics } from '../../services/adminService';
import {
  RegistrationGrowthChart,
  SessionStatusChart,
  ConversionFunnelChart,
  FeatureAdoptionChart,
} from './AdminCharts';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const AdminOverviewTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [growthDays, setGrowthDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOverviewData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [overviewRes, analyticsRes] = await Promise.all([
        getAdminOverview(),
        getAdminAnalytics(growthDays),
      ]);
      setData(overviewRes?.data || null);
      setAnalytics(analyticsRes?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load overview data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [growthDays]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <LoadingSpinner size="lg" label="Loading Platform Telemetry..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-3">
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>
        <Button size="sm" variant="outline" onClick={() => fetchOverviewData(true)}>
          Retry Loading
        </Button>
      </div>
    );
  }

  const users = data?.users || {};
  const sessions = data?.sessions || {};
  const feedback = data?.feedback || {};
  const health = data?.health || {};

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-5 rounded-3xl border border-teal-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Platform Command Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live operational monitoring for EnhanceUs production systems
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.database?.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              DB: {health?.database?.status || 'Unknown'}
            </span>
            {health?.database?.pingMs !== null && (
              <span className="text-[10px] text-slate-400 font-mono">({health?.database?.pingMs}ms)</span>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchOverviewData(true)}
            disabled={refreshing}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real Users Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Real Registered Users</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {users.totalRealUsers ?? 0}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {users.verifiedCount ?? 0} verified
              </span>
              <span>•</span>
              <span className="text-slate-400 font-medium">
                {users.unverifiedCount ?? 0} unverified
              </span>
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Users (MAU)</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {users.active30d ?? 0}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>DAU: <strong>{users.active24h ?? 0}</strong></span>
              <span>•</span>
              <span>WAU: <strong>{users.active7d ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Skill Exchange Sessions</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {sessions.total ?? 0}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {sessions.completed ?? 0} completed
              </span>
              <span>•</span>
              <span className="text-teal-600 dark:text-teal-400 font-semibold">
                {sessions.scheduled ?? 0} upcoming
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Feedback</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              {feedback.total ?? 0}
              <span className="text-sm font-semibold text-amber-500">
                ★ {feedback.averageRating ?? 5.0}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {feedback.unresolved ?? 0} unresolved
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {feedback.emailDeliveredCount ?? 0} emailed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegistrationGrowthChart
          data={analytics?.registrationGrowth || []}
          days={growthDays}
          onDaysChange={setGrowthDays}
        />
        <ConversionFunnelChart steps={analytics?.conversionFunnel || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SessionStatusChart stats={sessions} />
        <FeatureAdoptionChart items={analytics?.featureAdoption || []} />
      </div>
    </div>
  );
};

export default AdminOverviewTab;
