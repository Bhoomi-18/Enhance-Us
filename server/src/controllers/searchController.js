import User from '../models/userModel.js';
import Skill from '../models/skillModel.js';
import Goal from '../models/goalModel.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const globalSearch = async (req, res, next) => {
  try {
    const { q = '', category, level, availability, language } = req.query;
    const queryTerm = q.trim();

    if (process.env.MOCK_DB === 'true') {
      return ApiResponse.success(res, 'Search results', {
        skills: [{ name: 'React', category: 'Frontend' }, { name: 'UI/UX Design', category: 'Design' }],
        people: [{ _id: 'cand_1', name: 'Sarah Chen', skills: [{ name: 'UI/UX Design' }] }],
        goals: [{ _id: 'goal_1', title: 'Build an AI-powered SaaS Application' }],
      });
    }

    const regex = new RegExp(queryTerm, 'i');

    // 1. Search Skills
    const skillQuery = {};
    if (queryTerm) skillQuery.$or = [{ name: regex }, { category: regex }];
    if (category) skillQuery.category = category;
    const skills = await Skill.find(skillQuery).limit(10);

    // 2. Search People
    const peopleQuery = {};
    if (queryTerm) peopleQuery.$or = [{ name: regex }, { bio: regex }, { 'skills.name': regex }];
    if (availability) peopleQuery.availability = availability;
    if (language) peopleQuery.languages = language;
    if (level) peopleQuery['skills.level'] = level;
    const people = await User.find(peopleQuery).select('-password').limit(15);

    // 3. Search Goals
    const goalQuery = { status: 'ACTIVE' };
    if (queryTerm) goalQuery.$or = [{ title: regex }, { description: regex }, { 'requiredSkills.name': regex }];
    const goals = await Goal.find(goalQuery).populate('user', 'name avatar').limit(10);

    return ApiResponse.success(res, 'Search results retrieved', {
      skills,
      people,
      goals,
    });
  } catch (error) {
    next(error);
  }
};
