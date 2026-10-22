import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Mail,
  Sparkles,
  ShieldCheck,
  Key,
  Clock,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getAdminHealth } from '../../services/adminService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

export const AdminHealthTab = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHealth = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await getAdminHealth();
      setHealth(res?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to retrieve health snapshot.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <LoadingSpinner size="lg" label="Running System Diagnostics..." />
      </div>
    );
  }

  const proc = health?.process || {};
  const db = health?.database || {};
  const integrations = health?.integrations || {};
  const traffic = health?.traffic || {};
  const latency = traffic?.latency || {};
  const statusCodes = traffic?.statusCodes || {};
  const totalRequests = traffic?.totalRequests || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Technical Health & Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time diagnostics, integration readiness, and response latency percentiles
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="gap-1 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Run Health Check
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-2xl">
          {error}
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Node Process Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Process Uptime</span>
            <Server className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {proc.uptimeHuman || '0s'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Node.js: {proc.nodeVersion || 'v20'}
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Database Status</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                db.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {db.status || 'Unknown'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Ping Latency: <strong>{db.pingMs !== null ? `${db.pingMs}ms` : 'N/A'}</strong>
          </div>
        </div>

        {/* Memory Footprint Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Memory Allocation</span>
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {proc.memoryMb?.heapUsed || 0} MB / {proc.memoryMb?.rss || 0} MB
          </div>
          <div className="text-[11px] text-slate-500">
            Safe Render Free bounds (&lt;512 MB)
          </div>
        </div>

        {/* Traffic Total Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Handled Requests</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {totalRequests}
          </div>
          <div className="text-[11px] text-slate-500">
            Avg: <strong>{latency.avg || 0}ms</strong> • p95: <strong>{latency.p95 || 0}ms</strong>
          </div>
        </div>
      </div>

      {/* Integration Readiness Checklist & Response Times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations Checklist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-teal-600" />
            Integrations Configuration Checklist
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Safe verification of backend environment readiness (no secrets exposed)
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {/* Email Provider */}
            <div className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-600 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Transactional Email (Plunk)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {integrations.emailService?.keyType}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  integrations.emailService?.configured
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {integrations.emailService?.configured ? 'Configured' : 'Missing'}
              </span>
            </div>

            {/* Gemini AI */}
            <div className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Google Gemini AI Roadmaps
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Model: {integrations.geminiAi?.model}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  integrations.geminiAi?.configured
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {integrations.geminiAi?.configured ? 'Active' : 'Rule Engine Fallback'}
              </span>
            </div>

            {/* Admin Security */}
            <div className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Admin Allowlist (ADMIN_EMAILS)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {integrations.adminSecurity?.allowlistCount || 0} allowed administrators
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  integrations.adminSecurity?.adminEmailsConfigured
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {integrations.adminSecurity?.adminEmailsConfigured ? 'Enforced' : 'Default Allowlist'}
              </span>
            </div>
          </div>
        </div>

        {/* Traffic Status Code Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            HTTP Status Codes & Latency Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Request completion distribution and percentile latencies
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/50 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">2xx Success</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {statusCodes['2xx'] || 0}
              </span>
            </div>
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/50 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">3xx Redirect</span>
              <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">
                {statusCodes['3xx'] || 0}
              </span>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">4xx Client</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                {statusCodes['4xx'] || 0}
              </span>
            </div>
            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/50 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">5xx Server</span>
              <span className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">
                {statusCodes['5xx'] || 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">AVG LATENCY</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{latency.avg || 0}ms</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">P50 (MEDIAN)</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{latency.p50 || 0}ms</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">P95</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{latency.p95 || 0}ms</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">P99</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{latency.p99 || 0}ms</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tables: Recent Slow Requests and Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slow Requests Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Recent Slow Requests (&gt;500ms)
          </h3>
          {health?.slowRequests && health.slowRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Endpoint</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {health.slowRequests.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        <span className="font-bold text-teal-600 mr-1.5">{s.method}</span>
                        {s.path}
                      </td>
                      <td className="py-2 font-bold text-amber-600">{s.durationMs}ms</td>
                      <td className="py-2 text-right text-slate-400">
                        {new Date(s.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              No slow requests recorded in recent sample buffer.
            </p>
          )}
        </div>

        {/* Recent Application Errors Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Recent Application Exceptions (Sanitized)
          </h3>
          {health?.recentErrors && health.recentErrors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Endpoint</th>
                    <th className="py-2">Message</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                  {health.recentErrors.map((e, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-mono text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {e.method} {e.path}
                      </td>
                      <td className="py-2 text-rose-600 dark:text-rose-400 truncate max-w-xs">
                        {e.message}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-slate-500">
                        {e.statusCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              No unhandled application exceptions recorded in recent buffer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHealthTab;
