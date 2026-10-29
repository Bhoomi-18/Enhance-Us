import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Users,
  Award,
  Zap,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  ArrowLeftRight,
  ShieldCheck,
} from 'lucide-react';
import { getAdminAnalytics } from '../../services/adminService';
import {
  RegistrationGrowthChart,
  ConversionFunnelChart,
  FeatureAdoptionChart,
} from './AdminCharts';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Card from '../ui/Card';

export const AdminAnalyticsTab = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await getAdminAnalytics(days);
      setData(res?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanceus_analytics_${days}d_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <LoadingSpinner size="lg" label="Computing Platform Analytics..." />
      </div>
    );
  }

  const ops = data?.operationalInsights || {};
  const events = data?.eventAnalytics || [];

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Usage Analytics & Funnel Conversion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real historical metrics, telemetry events, and engagement funnels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJson}
            disabled={!data}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export Data
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-2xl">
          {error}
        </div>
      )}

      {/* Operational KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Onboarding Rate</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {ops.users?.onboardingCompletionRate ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {ops.users?.onboardedCount || 0} of {ops.users?.totalRealUsers || 0} real accounts
          </p>
        </Card>

        <Card className="p-4 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Profile Setup</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {ops.users?.profileSetupRate ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {ops.users?.profileCompleteCount || 0} with teachable & learning skills
          </p>
        </Card>

        <Card className="p-4 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Session Completion</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {ops.sessions?.completionRate ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {ops.sessions?.completedCount || 0} completed / {ops.sessions?.scheduledCount || 0} scheduled
          </p>
        </Card>

        <Card className="p-4 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exchange Acceptance</span>
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {ops.exchanges?.acceptanceRate ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {ops.exchanges?.acceptedCount || 0} of {ops.exchanges?.totalRequests || 0} requests accepted
          </p>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegistrationGrowthChart
          data={data?.registrationGrowth || []}
          days={days}
          onDaysChange={setDays}
        />
        <ConversionFunnelChart steps={data?.conversionFunnel || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureAdoptionChart items={data?.featureAdoption || []} />

        {/* Analytics Notes / Historical limitations card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-sm">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Analytics Methodology & Data Integrity
          </div>
          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              • <strong>Isolation of Demo Showcase:</strong> All calculations strictly exclude the designated demo showcase account (<code className="text-teal-600 dark:text-teal-400">demo@enhanceus.org</code>) to ensure metrics reflect real user growth.
            </p>
            <p>
              • <strong>Real Historical Data:</strong> Trends are generated by querying MongoDB aggregation pipelines across verified user creation timestamps and completed session records.
            </p>
            <p>
              • <strong>Privacy-Centric Telemetry:</strong> No message texts, passwords, or personal credentials are ever collected or stored in analytics event queues.
            </p>
          </div>
        </div>
      </div>

      {/* Product Telemetry Event Table */}
      <Card className="p-6 border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-600" />
              Verified Product Telemetry Events
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregate event counts and unique active users over the past {days} days
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {events.length} Event Types Recorded
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
            No telemetry events recorded within this time window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Total Occurrences</th>
                  <th className="py-2.5 px-3">Unique Users</th>
                  <th className="py-2.5 px-3">First Recorded</th>
                  <th className="py-2.5 px-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {events.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {ev.eventType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100 font-bold">
                      {ev.totalEvents}
                    </td>
                    <td className="py-2.5 px-3 text-teal-600 dark:text-teal-400 font-bold">
                      {ev.uniqueUsersCount}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {ev.firstSeen ? new Date(ev.firstSeen).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {ev.lastSeen ? new Date(ev.lastSeen).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAnalyticsTab;
