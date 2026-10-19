import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Trash2, Tag } from 'lucide-react';
import { getSkills } from '../../services/skillService';
import Button from './Button';
import Badge from './Badge';

export const SkillSelector = ({ value = [], onChange, mode = 'TEACH' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSkills, setAvailableSkills] = useState([]);
  const [customSkillName, setCustomSkillName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('INTERMEDIATE');

  useEffect(() => {
    const fetchSkillsList = async () => {
      try {
        const res = await getSkills(searchTerm);
        if (res?.data?.skills) {
          setAvailableSkills(res.data.skills);
        }
      } catch (e) {
        console.warn('[SkillSelector Error]', e.message);
      }
    };
    fetchSkillsList();
  }, [searchTerm]);

  const handleAddSkill = (skillObj) => {
    const exists = value.some((s) => s.name.toLowerCase() === skillObj.name.toLowerCase());
    if (exists) return;

    const newSkill = {
      name: skillObj.name,
      category: skillObj.category || 'General',
      level: selectedLevel,
      type: mode,
    };

    onChange([...value, newSkill]);
    setSearchTerm('');
  };

  const handleAddCustom = () => {
    if (!customSkillName.trim()) return;
    handleAddSkill({ name: customSkillName.trim(), category: 'Custom' });
    setCustomSkillName('');
  };

  const handleRemoveSkill = (index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleLevelChange = (index, newLevel) => {
    const updated = [...value];
    updated[index].level = newLevel;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      
      {/* Search and Quick Select */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search skills (e.g. React, Python, UI/UX)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
          <option value="EXPERT">Expert</option>
        </select>
      </div>

      {/* Suggested Skill Badges */}
      {searchTerm && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Matching Taxonomy Skills</span>
          <div className="flex flex-wrap gap-2">
            {availableSkills.map((sk) => (
              <button
                key={sk._id || sk.name}
                type="button"
                onClick={() => handleAddSkill(sk)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-500 dark:hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                <Plus className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>{sk.name}</span>
              </button>
            ))}
            {availableSkills.length === 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add custom skill name"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg"
                />
                <Button type="button" size="sm" onClick={handleAddCustom}>Add</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Skills Matrix */}
      <div className="space-y-2">
        {value.map((skill, index) => (
          <div key={index} className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-subtle">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{skill.name}</span>
              <Badge variant={mode === 'TEACH' ? 'teal' : 'indigo'} className="text-[10px]">
                {skill.category || 'General'}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={skill.level || 'INTERMEDIATE'}
                onChange={(e) => handleLevelChange(index, e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>

              <button
                type="button"
                onClick={() => handleRemoveSkill(index)}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default SkillSelector;
