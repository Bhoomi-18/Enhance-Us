import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Target, Tag, Filter, ArrowRight } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { globalSearch } from '../services/searchService';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [availability, setAvailability] = useState('');

  const [results, setResults] = useState({ skills: [], people: [], goals: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await globalSearch({ q: searchTerm, category, level, availability });
      if (res?.data) {
        setResults(res.data);
      }
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, category, level, availability]);

  return (
    <PageContainer
      title="Universal Discovery & Skill Search"
      subtitle="Find skills in the taxonomy, peers offering complementary expertise, and active public goal blueprints."
    >
      {/* Search Input & Filter Bar */}
      <Card className="mb-8 p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by skill name, goal title, or peer name (e.g. React, UI/UX, Python)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>

            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Any Availability</option>
              <option value="flexible">Flexible</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Content */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Searching skills, peers, and goals..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">{error}</div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 1: Matching Peers */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Compatible Peers ({results.people?.length || 0})
            </h3>
            {results.people?.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No matching peer profiles found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {results.people.map((person) => (
                  <Card key={person._id} hover className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                          {person.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{person.name}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{person.timezone || 'UTC'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{person.bio || 'Skill partner'}</p>
                      <div className="flex flex-wrap gap-1">
                        {person.skills?.map((s, idx) => (
                          <Badge key={idx} variant="teal">{s.name}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link to={`/profile/${person._id}`}>
                        <Button variant="outline" size="sm" rightIcon={ArrowRight}>View Profile</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Goals */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Active Goal Blueprints ({results.goals?.length || 0})
            </h3>
            {results.goals?.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No matching public goals found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.goals.map((g) => (
                  <Card key={g._id} hover className="p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1">{g.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{g.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {g.requiredSkills?.map((rs, idx) => (
                          <Badge key={idx} variant="indigo">{rs.name}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link to={`/goals/${g._id}`}>
                        <Button variant="outline" size="sm" rightIcon={ArrowRight}>View Matrix</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Skill Taxonomy */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Skill Taxonomy ({results.skills?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {results.skills?.map((sk, idx) => (
                <div key={idx} className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-subtle flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{sk.name}</span>
                  <Badge variant="slate" className="text-[10px]">{sk.category}</Badge>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
