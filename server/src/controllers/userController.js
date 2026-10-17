import User from '../models/userModel.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

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

    if (process.env.MOCK_DB === 'true') {
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
    if (process.env.MOCK_DB === 'true') {
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
    if (process.env.MOCK_DB === 'true') {
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
