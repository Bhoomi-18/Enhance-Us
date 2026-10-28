import User from '../models/userModel.js';
import Skill from '../models/skillModel.js';
import Goal from '../models/goalModel.js';
import Challenge from '../models/challengeModel.js';
import Workspace from '../models/workspaceModel.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { isValidTeachableSkill } from '../utils/skillNormalizer.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const globalSearch = async (req, res, next) => {
  try {
    const {
      q = '',
      category,
      level,
      availability,
      language,
      teachableSkill,
      desiredSkill,
      sortBy = 'relevance',
      page = 1,
      limit = 15,
    } = req.query;

    // 1. Demo sandbox workspace routing (zero leakage)
    if (req.user?.isDemo && req.user?.workspaceId) {
      const results = await demoWorkspaceService.searchInWorkspace(req.user.workspaceId, req.query);
      return ApiResponse.success(res, 'Search results retrieved', results);
    }

    const queryTerm = (q || '').trim();
    const regex = queryTerm ? new RegExp(queryTerm, 'i') : null;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (parsedPage - 1) * parsedLimit;

    // 2. Search Skills
    const skillQuery = {};
    if (regex) skillQuery.$or = [{ name: regex }, { category: regex }];
    if (category) skillQuery.category = category;
    const skills = await Skill.find(skillQuery).limit(10).lean();

    // 3. Search People (Strict security: exclude demo accounts, suspended accounts, and sensitive fields)
    const peopleQuery = {
      isDemo: { $ne: true },
      isSuspended: { $ne: true },
    };
    if (req.user?._id) {
      peopleQuery._id = { $ne: req.user._id };
    }

    if (regex) {
      peopleQuery.$or = [{ name: regex }, { bio: regex }, { 'skills.name': regex }];
    }
    if (availability) peopleQuery.availability = new RegExp(availability.trim(), 'i');
    if (language) peopleQuery.languages = new RegExp(language.trim(), 'i');
    if (level) peopleQuery['skills.level'] = level.toUpperCase();

    // Teachable vs Desired skill criteria
    if (teachableSkill) {
      peopleQuery.skills = {
        $elemMatch: {
          type: { $in: ['TEACH', 'both', 'BOTH', 'teach'] },
          name: new RegExp(teachableSkill.trim(), 'i'),
        },
      };
    }
    if (desiredSkill) {
      peopleQuery.learningInterests = {
        $elemMatch: {
          name: new RegExp(desiredSkill.trim(), 'i'),
        },
      };
    }

    // Sort order
    let sortObj = { createdAt: -1 };
    if (sortBy === 'rating') {
      sortObj = { 'reputation.averageRating': -1, 'reputation.reviewCount': -1 };
    } else if (sortBy === 'recent') {
      sortObj = { lastActiveAt: -1, createdAt: -1 };
    }

    // Explicit projection: NEVER expose password, email, role, reset tokens
    const rawPeople = await User.find(peopleQuery)
      .select('name avatar bio skills learningInterests availability timezone experienceLevel reputation createdAt lastActiveAt')
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Secondary filter: Exclude users without valid teachable skills if search specifically asks for instructors
    let people = rawPeople;
    if (teachableSkill || queryTerm) {
      people = rawPeople.filter((p) => Array.isArray(p.skills) && p.skills.some(isValidTeachableSkill));
    }

    // 4. Search Goals (Active public goals)
    const goalQuery = { status: 'ACTIVE' };
    if (regex) {
      goalQuery.$or = [{ title: regex }, { description: regex }, { 'requiredSkills.name': regex }];
    }
    if (category) {
      goalQuery.category = category;
    }
    const goals = await Goal.find(goalQuery)
      .select('title description requiredSkills user category status createdAt')
      .populate('user', 'name avatar')
      .limit(10)
      .lean();

    // 5. Search Challenges (V3.8 Community Challenges)
    const challengeQuery = {
      visibility: 'PUBLIC',
      isArchived: false,
    };
    if (regex) {
      challengeQuery.$or = [
        { title: regex },
        { description: regex },
        { associatedSkill: regex },
      ];
    }
    const challenges = await Challenge.find(challengeQuery)
      .select('title description associatedSkill startDate endDate participationType status capacity milestones')
      .populate('creator', 'name avatar')
      .sort({ startDate: -1 })
      .limit(10)
      .lean();

    // 6. Search Workspaces (V3.7 Collaborative Workspaces)
    const workspaceQuery = {
      visibility: 'PUBLIC',
    };
    if (regex) {
      workspaceQuery.$or = [
        { title: regex },
        { description: regex },
        { associatedSkill: regex },
      ];
    }
    const workspaces = await Workspace.find(workspaceQuery)
      .select('title description associatedSkill visibility members milestones createdAt')
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return ApiResponse.success(res, 'Search results retrieved', {
      skills,
      people,
      goals,
      challenges,
      workspaces,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPeople: people.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  globalSearch,
};

