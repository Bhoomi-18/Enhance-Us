import React from 'react';
import { Trophy, Target, Users, Layers, Award, Compass, Lock, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const ICON_MAP = {
  Compass,
  Target,
  Trophy,
  Users,
  Layers,
  Award,
};

export const AchievementsList = ({ achievements = [], unlockedCount = 0, totalCount = 6 }) => {
  return (
    <div className="space-y-4">
      {/* Header Stat Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-purple-500/10 border border-teal-500/20 dark:border-teal-500/30">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Community Challenge Achievements</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Earned through verified deliverable milestones and collaborative sprints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" className="text-xs font-extrabold px-3 py-1">
            {unlockedCount} / {totalCount} Unlocked
          </Badge>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map((ach) => {
          const IconComponent = ICON_MAP[ach.icon] || Award;
          const isUnlocked = Boolean(ach.isUnlocked);

          return (
            <Card
              key={ach.key}
              className={`p-4 transition-all relative overflow-hidden border ${
                isUnlocked
                  ? 'border-teal-500/30 dark:border-teal-500/40 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isUnlocked ? (
                    <IconComponent className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isUnlocked
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {ach.title}
                    </h4>
                    {isUnlocked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {ach.description}
                  </p>
                  {isUnlocked && ach.unlockedAt && (
                    <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400 mt-2">
                      Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Transparency Disclaimer */}
      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center pt-2">
        Note: EnhanceUs achievements signify verified peer milestones and community sprints; they do not represent accredited certifications or formal academic credentials.
      </p>
    </div>
  );
};

export default AchievementsList;
