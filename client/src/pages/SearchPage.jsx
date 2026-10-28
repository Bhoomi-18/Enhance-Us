import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  Target,
  Tag,
  Filter,
  ArrowRight,
  Trophy,
  Layers,
  Star,
  CheckCircle2,
  Clock,
  Globe,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { globalSearch } from '../services/searchService';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [skillRole, setSkillRole] = useState('ALL'); // 'ALL' | 'TEACH' | 'LEARN'
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [availability, setAvailability] = useState('');
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'rating' | 'recent'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'peers' | 'challenges' | 'workspaces' | 'goals' | 'skills'

  const [results, setResults] = useState({
    skills: [],
    people: [],
    goals: [],
    challenges: [],
    workspaces: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce search input to avoid flood of keystroke requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const executeSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: debouncedQuery,
        sortBy,
      };
      if (category) params.category = category;
      if (level) params.level = level;
      if (availability) params.availability = availability;
      if (skillRole === 'TEACH') params.teachableSkill = debouncedQuery || 'true';
      if (skillRole === 'LEARN') params.desiredSkill = debouncedQuery || 'true';

      const res = await globalSearch(params);
      if (res?.data) {
        setResults({
          skills: res.data.skills || [],
          people: res.data.people || [],
          goals: res.data.goals || [],
          challenges: res.data.challenges || [],
          workspaces: res.data.workspaces || [],
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [debouncedQuery, skillRole, category, level, availability, sortBy]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSkillRole('ALL');
    setCategory('');
    setLevel('');
    setAvailability('');
    setSortBy('relevance');
    setActiveTab('all');
  };

  const hasActiveFilters = Boolean(
    searchTerm || skillRole !== 'ALL' || category || level || availability || sortBy !== 'relevance'
  );

  const peopleCount = results.people?.length || 0;
  const challengesCount = results.challenges?.length || 0;
  const workspacesCount = results.workspaces?.length || 0;
  const goalsCount = results.goals?.length || 0;
  const skillsCount = results.skills?.length || 0;
  const totalResultsCount = peopleCount + challengesCount + workspacesCount + goalsCount + skillsCount;

  return (
    <PageContainer
      title="Universal Discovery & Skill Search"
      subtitle="Discover peers offering verified capabilities, time-boxed community challenges, collaborative workspaces, and public goal blueprints."
    >
      {/* Search Input & Filtering Hub */}
      <Card className="mb-6 p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <label htmlFor="universal-search-input" className="sr-only">
            Search skills, peers, goals, challenges, or workspaces
          </label>
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="universal-search-input"
            type="search"
            placeholder="Search by skill name, peer name, challenge, or workspace (e.g. React, UI/UX, Docker, Python)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Skill Intent Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSkillRole('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                skillRole === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Skills
            </button>
            <button
              type="button"
              onClick={() => setSkillRole('TEACH')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                skillRole === 'TEACH'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Teachable Skills
            </button>
            <button
              type="button"
              onClick={() => setSkillRole('LEARN')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                skillRole === 'LEARN'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Learning Desires
            </button>
          </div>

          {/* Level Filter */}
          <div>
            <label htmlFor="filter-level" className="sr-only">Skill Proficiency Level</label>
            <select
              id="filter-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label htmlFor="filter-availability" className="sr-only">Peer Availability</label>
            <select
              id="filter-availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Any Availability</option>
              <option value="flexible">Flexible</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="filter-sortby" className="sr-only">Sort Results By</label>
            <select
              id="filter-sortby"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="recent">Sort: Recently Active</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-auto flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </Card>

      {/* Discovery Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Discovery categories"
        className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-px"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
            activeTab === 'all'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Results ({totalResultsCount})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'peers'}
          onClick={() => setActiveTab('peers')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'peers'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Peers ({peopleCount})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'challenges'}
          onClick={() => setActiveTab('challenges')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'challenges'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Challenges ({challengesCount})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'workspaces'}
          onClick={() => setActiveTab('workspaces')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'workspaces'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Workspaces ({workspacesCount})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'goals'}
          onClick={() => setActiveTab('goals')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'goals'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Goal Blueprints ({goalsCount})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'skills'}
          onClick={() => setActiveTab('skills')}
          className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'skills'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Taxonomy ({skillsCount})</span>
        </button>
      </div>

      {/* Main Results Container */}
      {loading ? (
        <div className="py-16 flex justify-center" role="status" aria-live="polite">
          <LoadingSpinner size="lg" label="Searching across skills, peers, challenges, and workspaces..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs text-center" role="alert">
          {error}
        </div>
      ) : totalResultsCount === 0 ? (
        <EmptyState
          icon={Search}
          title="No discovery matches found"
          description={`We couldn't find any skills, peers, challenges, or workspaces matching "${debouncedQuery}". Try refining your query or resetting filters.`}
          action={
            hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-10">
          {/* SECTION 1: Compatible Peers */}
          {(activeTab === 'all' || activeTab === 'peers') && peopleCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Compatible Learning Peers ({peopleCount})</span>
                </h3>
                {activeTab === 'all' && peopleCount > 3 && (
                  <button
                    onClick={() => setActiveTab('peers')}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    View all {peopleCount} peers
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeTab === 'all' ? results.people.slice(0, 6) : results.people).map((person) => {
                  const teachSkills = (person.skills || []).filter(
                    (s) => s.type === 'TEACH' || s.type === 'both' || !s.type
                  );
                  const learnSkills = person.learningInterests || [];

                  return (
                    <Card
                      key={person._id}
                      hover
                      className="p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                              {person.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                {person.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-slate-400" />
                                <span>{person.timezone || 'UTC'}</span>
                                <span>•</span>
                                <span className="capitalize">{person.availability || 'Flexible'}</span>
                              </p>
                            </div>
                          </div>

                          {person.reputation?.averageRating && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{Number(person.reputation.averageRating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                          {person.bio || 'Active EnhanceUs skill partner.'}
                        </p>

                        {/* Teachable Skills */}
                        {teachSkills.length > 0 && (
                          <div className="mb-2">
                            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide block mb-1">
                              Can Teach:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {teachSkills.slice(0, 3).map((s, idx) => (
                                <Badge key={idx} variant="teal" size="sm">
                                  {s.name}
                                </Badge>
                              ))}
                              {teachSkills.length > 3 && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                                  +{teachSkills.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Wants to Learn */}
                        {learnSkills.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide block mb-1">
                              Wants to Learn:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {learnSkills.slice(0, 3).map((l, idx) => (
                                <Badge key={idx} variant="indigo" size="sm">
                                  {l.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Link to={`/profile/${person._id}`} className="focus:outline-none">
                          <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Community Challenges */}
          {(activeTab === 'all' || activeTab === 'challenges') && challengesCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Time-Boxed Community Challenges ({challengesCount})</span>
                </h3>
                {activeTab === 'all' && challengesCount > 2 && (
                  <button
                    onClick={() => setActiveTab('challenges')}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    View all {challengesCount} challenges
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.challenges.slice(0, 4) : results.challenges).map((ch) => (
                  <Card key={ch._id} hover className="p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="teal">{ch.associatedSkill}</Badge>
                        <Badge variant="slate" className="text-[10px]">
                          {ch.participationType === 'TEAM' ? 'Team Sprint' : 'Individual'}
                        </Badge>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                          {ch.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                        {ch.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {ch.description}
                      </p>

                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <span>{ch.milestones?.length || 0} Deliverable Stages</span>
                        <span>•</span>
                        <span>{ch.capacity ? `Max ${ch.capacity} peers` : 'Open Capacity'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link to={`/challenges/${ch._id}`}>
                        <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                          View Challenge
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Collaborative Workspaces */}
          {(activeTab === 'all' || activeTab === 'workspaces') && workspacesCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Collaborative Workspaces ({workspacesCount})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.workspaces.slice(0, 4) : results.workspaces).map((ws) => (
                  <Card key={ws._id} hover className="p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="indigo">{ws.associatedSkill}</Badge>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
                          {ws.members?.length || 1} members
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                        {ws.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {ws.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link to={`/workspaces/${ws._id}`}>
                        <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                          View Workspace
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: Goal Blueprints */}
          {(activeTab === 'all' || activeTab === 'goals') && goalsCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Public Goal Blueprints ({goalsCount})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.goals.slice(0, 4) : results.goals).map((g) => (
                  <Card key={g._id} hover className="p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                        {g.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {g.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {g.requiredSkills?.map((rs, idx) => (
                          <Badge key={idx} variant="slate" size="sm">
                            {rs.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link to={`/goals/${g._id}`}>
                        <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                          View Blueprint
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: Skill Taxonomy */}
          {(activeTab === 'all' || activeTab === 'skills') && skillsCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Skill Taxonomy ({skillsCount})</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {results.skills?.map((sk, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSearchTerm(sk.name)}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-2 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <Tag className="w-3.5 h-3.5 text-purple-500" />
                    <span>{sk.name}</span>
                    <Badge variant="slate" className="text-[10px]">
                      {sk.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
