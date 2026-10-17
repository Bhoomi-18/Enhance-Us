import React, { useState, useEffect } from 'react';
import { Target, Cpu, Users, ArrowLeftRight, TrendingUp, Sparkles, Check } from 'lucide-react';

export const GoalPipelineVisual = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'goal',
      title: '1. GOAL',
      label: 'Build AI SaaS App',
      icon: Target,
      color: 'from-amber-500 to-teal-600',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-400',
      badge: 'Target Ambition',
    },
    {
      id: 'skills',
      title: '2. SKILLS GAP',
      label: 'PyTorch + React Design',
      icon: Cpu,
      color: 'from-teal-500 to-indigo-600',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-400',
      badge: 'Gap Matrix',
    },
    {
      id: 'people',
      title: '3. PEOPLE MATCH',
      label: 'Matched: Alex (ML Eng)',
      icon: Users,
      color: 'from-indigo-500 to-indigo-700',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-400',
      badge: 'Dual Fit',
    },
    {
      id: 'exchange',
      title: '4. EXCHANGE',
      label: 'Knowledge Swap Sessions',
      icon: ArrowLeftRight,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-400',
      badge: 'Mutual Sessions',
    },
    {
      id: 'growth',
      title: '5. GROWTH',
      label: 'Goal Delivered Ahead',
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-400',
      badge: 'Achieved',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-card relative overflow-hidden">
      {/* Background Subtle Gradient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Top Interactive Banner */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">EnhanceUs Concept Engine</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/80">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Pipeline</span>
        </div>
      </div>

      {/* Main Responsive Node Graph / Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === activeStep;
          const isPassed = idx < activeStep;

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between relative ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-elevated scale-[1.02]'
                  : isPassed
                  ? 'bg-teal-50/60 border-teal-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              {/* Connector indicator for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-20">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      idx < activeStep ? 'bg-teal-500 border-teal-600' : 'bg-slate-200 border-slate-300'
                    }`}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-teal-400' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {isPassed ? (
                    <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/10 text-teal-400' : 'bg-slate-200/60 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <p className={`text-xs font-extrabold leading-snug ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {step.label}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-current/10 flex items-center justify-between text-[10px]">
                <span className={isActive ? 'text-slate-300 font-medium' : 'text-slate-500 font-normal'}>
                  {step.badge}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-400 animate-ping' : 'bg-slate-300'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Dynamic Status Line */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 relative z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Active Node State:</span>
          <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            {steps[activeStep].title} &rarr; {steps[activeStep].label}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Click any node to explore stage details</span>
      </div>
    </div>
  );
};

export default GoalPipelineVisual;
