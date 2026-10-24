import User from '../models/userModel.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'name',
      'bio',
      'avatar',
      'languages',
      'availability',
      'timezone',
      'experienceLevel',
      'preferredLearningStyle',
      'skills',
      'learningInterests',
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.user?.isDemo && req.user?.workspaceId) {
      const updatedUser = await demoWorkspaceService.updateProfile(req.user.workspaceId, updates);
      return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
    }

    if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
      const updatedUser = { ...req.user, ...updates };
      return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, 'User not found');

    Object.assign(user, updates);

    await user.save();
    return ApiResponse.success(res, 'Profile updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

export const getPublicProfile = async (req, res, next) => {
  try {
    if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
      return ApiResponse.success(res, 'Public profile', {
        user: {
          _id: req.params.id,
          name: 'Sarah Chen (UI/UX Specialist)',
          bio: 'Product Designer with 5 years experience creating intuitive interfaces.',
          skills: [{ name: 'UI/UX Design', level: 'EXPERT' }],
          learningInterests: [{ name: 'React' }],
          reputation: { averageRating: 5.0, reviewCount: 8 },
          hoursTaught: 24,
          hoursLearned: 18,
          exchangesCompleted: 6,
        },
      });
    }

    const user = await User.findById(req.params.id).select('-password -email');
    if (!user) throw new ApiError(404, 'User not found');

    return ApiResponse.success(res, 'Public profile retrieved', { user });
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
      return ApiResponse.success(res, 'Onboarding completed', { onboardingCompletedAt: new Date() });
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, 'User not found');

    if (!user.onboardingCompletedAt) {
      user.onboardingCompletedAt = new Date();
      await user.save();
    }

    return ApiResponse.success(res, 'Onboarding completed successfully', { user });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { validateAccountDeletionInput } = await import('../validators/userValidator.js');
    const userService = await import('../services/userService.js');

    validateAccountDeletionInput(req.body);

    const result = await userService.deleteUserAccount(req.user._id, req.body, req.user);

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return ApiResponse.success(
      res,
      'Account and all associated personal data have been permanently deleted.',
      result,
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

