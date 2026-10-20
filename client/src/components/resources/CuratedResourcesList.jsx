import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getResources, toggleResourceBookmark, rateResource } from '../../services/resourceService';

export const CuratedResourcesList = ({
  roadmap = null,
  skillName = '',
  initialSkillName = '',
  milestoneId = null,
  initialMilestoneId = null,
  onOpenCoach = null,
  onResourceSelect = null,
}) => {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(skillName || initialSkillName || '');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkingId, setBookmarkingId] = useState(null);
  const [ratingId, setRatingId] = useState(null);

  // Extract skills from roadmap for filter chips
  const availableSkills = React.useMemo(() => {
    const set = new Set();
    if (roadmap?.skills) {
      roadmap.skills.forEach((s) => s.name && set.add(s.name));
    }
    if (roadmap?.stages) {
      roadmap.stages.forEach((st) => {
        st.skills?.forEach((sk) => sk.name && set.add(sk.name));
      });
    }
    if (roadmap?.milestones) {
      roadmap.milestones.forEach((m) => m.skillName && set.add(m.skillName));
    }
    return Array.from(set);
  }, [roadmap]);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {};
      if (selectedSkill) params.skillName = selectedSkill;
      if (activeTypeFilter !== 'all') params.type = activeTypeFilter;

      const res = await getResources(params);
      if (res?.data?.data?.resources) {
        setResources(res.data.data.resources);
      }
    } catch (err) {
      setError(err.message || 'Failed to load curated resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedSkill, activeTypeFilter]);

  const handleToggleBookmark = async (resource) => {
    try {
      setBookmarkingId(resource.resourceId);
      const res = await toggleResourceBookmark(resource.resourceId);
      if (res?.data?.data) {
        setResources((prev) =>
          prev.map((r) =>
            r.resourceId === resource.resourceId
              ? { ...r, isBookmarked: res.data.data.isBookmarked }
              : r
          )
        );
      }
    } catch (err) {
      alert(err.message || 'Could not update bookmark');
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleRate = async (resource, isUseful) => {
    try {
      setRatingId(resource.resourceId);
      const res = await rateResource(resource.resourceId, isUseful);
      if (res?.data?.data) {
        setResources((prev) =>
          prev.map((r) =>
            r.resourceId === resource.resourceId
              ? {
                  ...r,
                  userRating: res.data.data.userRating,
                  usefulCount: res.data.data.usefulCount,
                  notUsefulCount: res.data.data.notUsefulCount,
                }
              : r
          )
        );
      }
    } catch (err) {
      alert(err.message || 'Could not record rating');
    } finally {
      setRatingId(null);
    }
  };

  const getTypeBadgeVariant = (type) => {
    switch (type) {
      case 'documentation':
        return 'teal';
      case 'tutorial':
        return 'emerald';
      case 'interactive':
        return 'indigo';
      case 'reference':
        return 'amber';
      case 'video':
        return 'rose';
      default:
        return 'slate';
    }
  };

  const filteredResources = resources.filter((r) => {
    if (onlyBookmarked && !r.isBookmarked) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.source || '').toLowerCase().includes(q) ||
      (r.skillName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Skill Filter Chips (Roadmap Connected) */}
      {availableSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
            Roadmap Skills:
          </span>
          <button
            onClick={() => setSelectedSkill('')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              !selectedSkill
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Skills
          </button>
          {availableSkills.map((sk) => (
            <button
              key={sk}
              onClick={() => setSelectedSkill(sk)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                selectedSkill === sk
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {sk}
            </button>
          ))}
        </div>
      )}

      {/* Search & Type Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Filter Chips & Bookmarked Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
          {['all', 'documentation', 'tutorial', 'interactive', 'reference'].map((type) => (
            <button
              key={type}
              onClick={() => setActiveTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                activeTypeFilter === type
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}

          <button
            onClick={() => setOnlyBookmarked((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              onlyBookmarked
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            Saved Only
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter resources..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchResources} className="text-xs">
            Retry
          </Button>
        </div>
      ) : filteredResources.length === 0 ? (
        <Card className="p-6 text-center space-y-2 border-dashed border-slate-300 dark:border-slate-700">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No resources match this filter
          </h4>
          <p className="text-[11px] text-slate-500">
            Switch the filter to "All Types" or clear the search query to explore the full educational library.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredResources.map((res) => (
            <Card
              key={res.resourceId}
              className="p-4 border-slate-200/90 dark:border-slate-800 flex flex-col justify-between hover:border-teal-300 dark:hover:border-teal-700/60 transition-colors shadow-xs"
            >
              <div className="space-y-2.5">
                {/* Header: Type, Source, Verified Indicator, Bookmark */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={getTypeBadgeVariant(res.type)} className="text-[10px] uppercase font-bold">
                      {res.type}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {res.source}
                    </span>
                    {res.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Verified Docs
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        Suggested
                      </span>
                    )}
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => handleToggleBookmark(res)}
                    disabled={bookmarkingId === res.resourceId}
                    title={res.isBookmarked ? 'Remove from saved' : 'Save resource'}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      res.isBookmarked
                        ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {res.isBookmarked ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Resource Title & External Link */}
                <div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    <span>{res.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 mt-0.5" />
                  </a>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {res.description}
                  </p>
                </div>

                {/* Verification Note (if any) */}
                {res.verificationNote && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    {res.verificationNote}
                  </p>
                )}
              </div>

              {/* Card Footer: Difficulty & Usefulness Vote */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 capitalize">
                    Level: {res.difficulty}
                  </span>
                  {onOpenCoach && (
                    <button
                      onClick={() => onOpenCoach({ skillName: res.skillName, title: res.title })}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Ask Coach
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Helpful?</span>
                  <button
                    onClick={() => handleRate(res, true)}
                    disabled={ratingId === res.resourceId}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] transition-colors ${
                      res.userRating === true
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-2.5 h-2.5" />
                    {res.usefulCount || 0}
                  </button>
                  <button
                    onClick={() => handleRate(res, false)}
                    disabled={ratingId === res.resourceId}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] transition-colors ${
                      res.userRating === false
                        ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsDown className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CuratedResourcesList;
