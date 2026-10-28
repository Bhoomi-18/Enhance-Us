import mongoose from 'mongoose';
import UserAchievement, { ACHIEVEMENT_DEFINITIONS } from '../models/userAchievementModel.js';
import ChallengeParticipation from '../models/challengeParticipationModel.js';
import { createFilteredNotification } from './notificationService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Checks eligibility and awards an achievement if not already unlocked.
 * Strictly guarantees no duplicate awards via unique compound database index.
 */
export const checkAndAwardAchievement = async (userId, achievementKey, metadata = {}) => {
  if (!userId) return { awarded: false, reason: 'No user ID provided' };

  const definition = ACHIEVEMENT_DEFINITIONS[achievementKey];
  if (!definition) {
    return { awarded: false, reason: `Invalid achievement key: ${achievementKey}` };
  }

  try {
    const existing = await UserAchievement.findOne({ user: userId, achievementKey });
    if (existing) {
      return { awarded: false, alreadyUnlocked: true, achievement: existing };
    }

    const achievement = await UserAchievement.create({
      user: userId,
      achievementKey,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      metadata,
      unlockedAt: new Date(),
    });

    // Send filtered celebration notification respecting user preferences
    try {
      await createFilteredNotification({
        recipientId: userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: `🏆 Achievement Unlocked: ${definition.title}`,
        message: definition.description,
        link: '/profile',
      });
    } catch (notifErr) {
      console.warn('[Achievement Notification Error]', notifErr.message);
    }

    // Check for meta-achievement: CHALLENGE_MASTER (if >= 3 completed challenges)
    if (achievementKey === 'FIRST_CHALLENGE_COMPLETED') {
      const completedCount = await ChallengeParticipation.countDocuments({
        user: userId,
        status: 'COMPLETED',
      });
      if (completedCount >= 3) {
        await checkAndAwardAchievement(userId, 'CHALLENGE_MASTER', { totalCompleted: completedCount });
      }
    }

    return { awarded: true, achievement };
  } catch (err) {
    // Catch duplicate key error gracefully in case of concurrent writes
    if (err.code === 11000) {
      const existing = await UserAchievement.findOne({ user: userId, achievementKey });
      return { awarded: false, alreadyUnlocked: true, achievement: existing };
    }
    console.error(`[Achievement Award Error] ${achievementKey} for user ${userId}:`, err);
    return { awarded: false, error: err.message };
  }
};

/**
 * Returns all achievements unlocked by a user, including progress against all possible definitions.
 */
export const getUserAchievements = async (userId) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const unlocked = await UserAchievement.find({ user: userId }).sort({ unlockedAt: -1 }).lean();
  const unlockedKeys = new Set(unlocked.map((a) => a.achievementKey));

  const allAchievements = Object.values(ACHIEVEMENT_DEFINITIONS).map((def) => {
    const found = unlocked.find((u) => u.achievementKey === def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      isUnlocked: unlockedKeys.has(def.key),
      unlockedAt: found ? found.unlockedAt : null,
      metadata: found ? found.metadata : null,
    };
  });

  return {
    achievements: allAchievements,
    unlockedCount: unlocked.length,
    totalCount: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
  };
};

/**
 * Returns public achievements for profile view.
 */
export const getPublicUserAchievements = async (targetUserId) => {
  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const unlocked = await UserAchievement.find({ user: targetUserId })
    .select('achievementKey title description icon unlockedAt')
    .sort({ unlockedAt: -1 })
    .lean();

  return {
    achievements: unlocked,
    count: unlocked.length,
  };
};

export default {
  checkAndAwardAchievement,
  getUserAchievements,
  getPublicUserAchievements,
};
