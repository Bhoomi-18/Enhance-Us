import React, { useState } from 'react';
import { Calendar, TrendingUp, Users, CheckCircle2, Award, Zap, AlertCircle } from 'lucide-react';

/**
 * Responsive SVG Area / Bar Chart for User Registration Trends
 */
export const RegistrationGrowthChart = ({ data = [], days = 30, onDaysChange }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const points = data && data.length > 0 ? data : [];
  const maxCount = Math.max(...points.map((p) => p.count), 5);

  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 20;
  const paddingY = 20;

  // Generate coordinates
  const stepX = points.length > 1 ? (chartWidth - paddingX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, idx) => {
    const x = paddingX + idx * stepX;
    const y = chartHeight - paddingY - (p.count / maxCount) * (chartHeight - paddingY * 2);
    return { x, y, ...p };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPoints = coords.length > 0
    ? `${coords[0].x},${chartHeight - paddingY} ${polylinePoints} ${coords[coords.length - 1].x},${chartHeight - paddingY}`
    : '';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            New User Registrations
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily registered accounts over time (real accounts only)
          </p>
        </div>

        {onDaysChange && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysChange(d)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  days === d
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No registration activity recorded within the past {days} days.
          </p>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Filled Area */}
            {areaPoints && (
              <polygon points={areaPoints} fill="url(#regGradient)" />
            )}

            {/* Line Path */}
            {polylinePoints && (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Circles */}
            {coords.map((c, idx) => (
              <circle
                key={idx}
                cx={c.x}
                cy={c.y}
                r={hoveredPoint?.date === c.date ? 5 : 3}
                className="fill-teal-600 dark:fill-teal-400 stroke-white dark:stroke-slate-900 transition-all cursor-pointer"
                strokeWidth="2"
                onMouseEnter={() => setHoveredPoint(c)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute top-2 right-2 bg-slate-900/90 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none transition-all"
            >
              <span>{hoveredPoint.date}: </span>
              <strong className="text-teal-400 dark:text-teal-600">{hoveredPoint.count} signups</strong>
            </div>
          )}

          <div className="flex justify-between text-[10px] text-slate-400 pt-1 px-2 font-mono">
            <span>{points[0]?.date}</span>
            <span>{points[points.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Onboarding and Activation Conversion Funnel
 */
export const ConversionFunnelChart = ({ steps = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          User Activation & Onboarding Funnel
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drop-off rates from initial registration to first peer session
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {steps.map((step, idx) => {
          const rate = step.conversionRate || 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {step.step}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  <strong>{step.count}</strong> users ({rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 dark:bg-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(3, Math.min(100, rate))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Session Status Breakdown
 */
export const SessionStatusChart = ({ stats = {} }) => {
  const total = stats.total || 0;
  const items = [
    { label: 'Completed', count: stats.completed || 0, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Scheduled', count: stats.scheduled || 0, color: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' },
    { label: 'In Progress', count: stats.inProgress || 0, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    { label: 'Cancelled', count: stats.cancelled || 0, color: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    { label: 'Missed', count: stats.missed || 0, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Peer Session Distribution
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Total sessions created: <strong className="text-slate-800 dark:text-slate-200">{total}</strong>
        </p>
      </div>

      {total === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400">No sessions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* Multi-segment progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
            {items.map((item, idx) => {
              const pct = (item.count / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={idx}
                  className={`${item.color} h-full transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                <span className="text-slate-600 dark:text-slate-400">{item.label}:</span>
                <strong className={`font-mono ${item.text}`}>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Feature Adoption Breakdown
 */
export const FeatureAdoptionChart = ({ items = [] }) => {
  const maxVal = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Core Feature Utilization
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Entity counts across primary EnhanceUs capabilities
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {items.map((item, idx) => {
          const pct = Math.round((item.count / maxVal) * 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {item.feature}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                  {item.count}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default {
  RegistrationGrowthChart,
  ConversionFunnelChart,
  SessionStatusChart,
  FeatureAdoptionChart,
};
