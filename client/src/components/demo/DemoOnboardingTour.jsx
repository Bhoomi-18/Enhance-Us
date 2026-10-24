import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Compass, Users, Award, X, RotateCcw } from 'lucide-react';
import * as demoService from '../../services/demoService';

const DemoOnboardingTour = ({ onOpenResetModal }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    const localDismissed = sessionStorage.getItem('enhanceus_demo_tour_dismissed');
    if (localDismissed === 'true') {
      return;
    }

    demoService
      .getDemoStatus()
      .then((res) => {
        if (!res?.data?.tourDismissed) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Fallback: show if not dismissed in session
        setVisible(true);
      });
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('enhanceus_demo_tour_dismissed', 'true');
    demoService.dismissDemoTour().catch(() => {});
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Interactive Demo Sandbox Tour"
      className="relative mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900/90 via-slate-900/95 to-indigo-950/90 text-white border border-teal-500/30 shadow-xl overflow-hidden animate-fade-in"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">
                Interactive Demo Sandbox
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Isolated Workspace
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Explore and interact with all EnhanceUs features using coherent sample data. Your changes stay in this session sandbox.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
          title="Dismiss guide"
          aria-label="Dismiss guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feature Navigation Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
        <Link
          to="/coach"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 group-hover:text-teal-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Coach</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Adaptive recommendations & skill guidance
          </p>
        </Link>

        <Link
          to="/matches"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 group-hover:text-teal-200">
            <Compass className="w-3.5 h-3.5" />
            <span>Skill Matches</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Reciprocal exchange with peer Sarah Chen
          </p>
        </Link>

        <Link
          to="/circles"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 group-hover:text-teal-200">
            <Users className="w-3.5 h-3.5" />
            <span>Learning Circles</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Full-Stack & UI/UX collaborative groups
          </p>
        </Link>

        <Link
          to="/profile"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 group-hover:text-teal-200">
            <Award className="w-3.5 h-3.5" />
            <span>Proof of Skill</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Verified session achievements & trust scores
          </p>
        </Link>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
        <span className="text-[11px] text-slate-400">
          Want to restore the original baseline? Use the reset button anytime.
        </span>
        <div className="flex items-center gap-2">
          {onOpenResetModal && (
            <button
              onClick={onOpenResetModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/30"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sandbox</span>
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors"
          >
            Got it, Start Exploring
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DemoOnboardingTour;
