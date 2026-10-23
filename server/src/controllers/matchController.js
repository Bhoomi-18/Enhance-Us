import * as matchingService from '../services/matchingService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getMatches = async (req, res, next) => {
  try {
    const { goalId, type, minScore, skill, availability } = req.query;
    let matches = await matchingService.generateMatchesForUser(req.user._id, goalId);

    // Filter by match type: RECIPROCAL_EXCHANGE vs PARTIAL_MATCH
    if (type && type !== 'all') {
      matches = matches.filter((m) => m.matchType === type);
    }

    // Filter by minimum score
    if (minScore) {
      const numMin = Number(minScore);
      if (!isNaN(numMin)) {
        matches = matches.filter((m) => m.overallScore >= numMin);
      }
    }

    // Filter by specific skill
    if (skill && skill.trim()) {
      const sLower = skill.toLowerCase().trim();
      matches = matches.filter(
        (m) =>
          m.matchedSkills?.some(
            (ms) =>
              ms.candidateTeachSkill?.toLowerCase().includes(sLower) ||
              ms.needSkill?.toLowerCase().includes(sLower)
          ) ||
          m.reciprocalSkills?.some(
            (rs) =>
              rs.userTeachSkill?.toLowerCase().includes(sLower) ||
              rs.candidateLearnSkill?.toLowerCase().includes(sLower)
          )
      );
    }

    // Filter by availability
    if (availability && availability !== 'all') {
      matches = matches.filter(
        (m) => (m.candidate?.availability || 'flexible').toLowerCase() === availability.toLowerCase()
      );
    }

    return ApiResponse.success(res, 'Matches generated successfully', {
      matches,
      totalCount: matches.length,
      reciprocalCount: matches.filter((m) => m.matchType === 'RECIPROCAL_EXCHANGE').length,
      partialCount: matches.filter((m) => m.matchType === 'PARTIAL_MATCH').length,
    });
  } catch (error) {
    next(error);
  }
};

export const getMatch = async (req, res, next) => {
  try {
    const match = await matchingService.getMatchById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Match details retrieved', { match });
  } catch (error) {
    next(error);
  }
};

export default {
  getMatches,
  getMatch,
};
