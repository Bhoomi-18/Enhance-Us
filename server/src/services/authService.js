import User from '../models/userModel.js';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

export const registerUser = async (userData) => {
  const { name, email, password, bio, avatar, skills, learningInterests, availability, timezone } = userData;

  // Check if mock DB mode is enabled
  if (process.env.MOCK_DB === 'true') {
    const mockId = new mongoose.Types.ObjectId().toString();
    const token = generateToken({ id: mockId, email, name });
    return {
      user: {
        _id: mockId,
        name,
        email,
        bio: bio || '',
        avatar: avatar || '',
        skills: skills || [],
        learningInterests: learningInterests || [],
        availability: availability || 'flexible',
        timezone: timezone || 'UTC',
        role: 'user',
        isDemo: email.toLowerCase().includes('demo'),
      },
      token,
    };
  }

  // Check for duplicate user email
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email address already exists');
  }

  // Create new user record
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    bio: bio || '',
    avatar: avatar || '',
    skills: Array.isArray(skills) ? skills : [],
    learningInterests: Array.isArray(learningInterests) ? learningInterests : [],
    availability: availability || 'flexible',
    timezone: timezone || 'UTC',
  });

  const token = generateToken({ id: user._id, email: user.email, name: user.name });

  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  // Check if mock DB mode is enabled
  if (process.env.MOCK_DB === 'true') {
    if (password === 'wrongpassword') {
      throw new ApiError(401, 'Invalid email address or password');
    }
    const mockId = 'mock_user_' + Buffer.from(email.toLowerCase().trim()).toString('hex').substring(0, 12);
    const token = generateToken({ id: mockId, email, name: email.split('@')[0] });
    return {
      user: {
        _id: mockId,
        name: email.includes('demo') ? 'Demo Account User' : 'User ' + email.split('@')[0],
        email,
        bio: 'EnhanceUs user focused on goal-driven skill exchange.',
        skills: [{ name: 'React', level: 'advanced' }, { name: 'Node.js', level: 'intermediate' }],
        learningInterests: [{ name: 'GraphQL', priority: 'high' }],
        availability: 'flexible',
        timezone: 'UTC',
        role: 'user',
        isDemo: email.toLowerCase().includes('demo'),
      },
      token,
    };
  }

  // Find user by email and select password explicitly
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email address or password');
  }

  // Verify password using bcrypt schema method
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email address or password');
  }

  const token = generateToken({ id: user._id, email: user.email, name: user.name });

  return { user, token };
};

export const getCurrentUserProfile = async (user) => {
  return user;
};
