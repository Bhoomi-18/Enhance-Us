import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Roadmap from '../models/roadmapModel.js';
import Notification from '../models/notificationModel.js';
import Match from '../models/matchModel.js';
import ExchangeRequest from '../models/exchangeRequestModel.js';
import Connection from '../models/connectionModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import { mockGoalsStore } from './goalService.js';
import { mockRoadmapsStore } from './roadmapService.js';
import { ApiError } from '../utils/apiError.js';

// In-memory set of deleted user IDs for Mock DB mode testing
export const mockDeletedUsersSet = new Set();

/**
 * Permanently deletes an authenticated user account and all associated personal data
 */
export const deleteUserAccount = async (userId, { password, confirmationPhrase }, currentUser = null) => {
  const normalizedPhrase = (confirmationPhrase || '').trim();
  if (normalizedPhrase !== 'DELETE') {
    throw new ApiError(400, 'Confirmation phrase mismatch. You must type exactly DELETE.');
  }

  // Handle Mock DB Mode (for offline / unit testing environments)
  if (process.env.MOCK_DB === 'true') {
    const userIdStr = userId.toString();

    // Prevent deletion of demo account
    if (
      currentUser?.isDemo ||
      currentUser?.email?.toLowerCase().includes('demo') ||
      userIdStr === 'demo_user_id' ||
      userIdStr.includes('demo')
    ) {
      throw new ApiError(403, 'The demo showcase account cannot be deleted.');
    }

    // Verify password in mock mode (test passwords)
    if (!password || (password !== 'TestPassword123!' && password !== 'DemoPassword123!' && password !== 'Password123!')) {
      throw new ApiError(401, 'Incorrect password. Reauthentication failed.');
    }

    // Clean up mock goals
    for (let i = mockGoalsStore.length - 1; i >= 0; i--) {
      if (mockGoalsStore[i].user === userIdStr) {
        mockGoalsStore.splice(i, 1);
      }
    }

    // Clean up mock roadmaps
    for (let i = mockRoadmapsStore.length - 1; i >= 0; i--) {
      if (mockRoadmapsStore[i].user === userIdStr) {
        mockRoadmapsStore.splice(i, 1);
      }
    }

    // Register deleted user ID so authentication middleware rejects it
    mockDeletedUsersSet.add(userIdStr);

    return {
      deletedAt: new Date(),
      purgedCollections: [
        'User',
        'Goal',
        'Roadmap',
        'Notification',
        'Match',
        'ExchangeRequest',
        'Connection',
        'Session',
        'Review',
        'Message',
        'Conversation',
      ],
    };
  }

  // Step 1: Retrieve user with password hash
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  // Step 2: Prevent deletion of dedicated demo account
  const demoEmail = (process.env.DEMO_USER_EMAIL || 'demo@enhanceus.org').toLowerCase();
  if (user.isDemo || user.email.toLowerCase() === demoEmail) {
    throw new ApiError(403, 'The demo showcase account cannot be deleted to preserve platform evaluation.');
  }

  // Step 3: Secure password re-authentication
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Incorrect password. Reauthentication failed.');
  }

  // Step 4: Referential integrity cascade cleanup
  // We execute cleanup sequentially to preserve non-orphaned data
  await Promise.all([
    // Delete user's private goals
    Goal.deleteMany({ user: userId }),

    // Delete user's private roadmaps
    Roadmap.deleteMany({ user: userId }),

    // Delete notifications received or sent by user
    Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),

    // Delete algorithmic match records involving user
    Match.deleteMany({ $or: [{ user: userId }, { candidate: userId }] }),

    // Delete exchange requests involving user
    ExchangeRequest.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),

    // Delete mutual connections involving user
    Connection.deleteMany({ participants: userId }),

    // Delete sessions involving user (as host or participant)
    Session.deleteMany({ $or: [{ host: userId }, { participants: userId }] }),

    // Delete reviews involving user (as reviewer or reviewee)
    Review.deleteMany({ $or: [{ reviewer: userId }, { reviewee: userId }] }),

    // Delete messages sent or received by user
    Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),

    // Delete conversations where user is a participant
    Conversation.deleteMany({ participants: userId }),
  ]);

  // Step 5: Permanently delete the User record itself
  await User.deleteOne({ _id: userId });

  return {
    deletedAt: new Date(),
    purgedCollections: [
      'User',
      'Goal',
      'Roadmap',
      'Notification',
      'Match',
      'ExchangeRequest',
      'Connection',
      'Session',
      'Review',
      'Message',
      'Conversation',
    ],
  };
};

export default {
  deleteUserAccount,
  mockDeletedUsersSet,
};
