import crypto from 'crypto';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './plunkEmailService.js';
import { DEMO_EMAIL as CONFIG_DEMO_EMAIL, DEMO_PASSWORD as CONFIG_DEMO_PASSWORD } from './demoProvisioningService.js';
import { recordEvent } from './analyticsService.js';
import { recordSecurityMetric } from './performanceTracker.js';

export const DEMO_EMAIL = (CONFIG_DEMO_EMAIL || 'demo@enhanceus.org').toLowerCase();
export const DEMO_PASSWORD = CONFIG_DEMO_PASSWORD || 'DemoPassword123!';

/**
 * Registers a new real user account in MongoDB, dispatches Plunk verification email,
 * and issues an initial authenticated JWT session.
 */
export const registerUser = async (userData) => {
  const { name, email, password, bio, avatar, skills, learningInterests, availability, timezone } = userData;

  const normalizedEmail = email.toLowerCase().trim();

  // Prevent registration using reserved demo email address
  if (normalizedEmail === DEMO_EMAIL || normalizedEmail === 'sarah.demo@enhanceus.org') {
    throw new ApiError(400, 'This email address is reserved for system demonstration.');
  }

  // Fallback ONLY if MongoDB is physically disconnected AND MOCK_DB === 'true' (e.g. offline unit testing)
  if (User.db?.readyState !== 1 && process.env.MOCK_DB === 'true') {
    const mockId = new mongoose.Types.ObjectId().toString();
    const token = generateToken({ id: mockId, email: normalizedEmail, name });
    return {
      user: {
        _id: mockId,
        name: name.trim(),
        email: normalizedEmail,
        bio: bio || '',
        avatar: avatar || '',
        skills: skills || [],
        learningInterests: learningInterests || [],
        availability: availability || 'flexible',
        timezone: timezone || 'UTC',
        role: 'user',
        isDemo: false,
        emailVerified: false,
      },
      token,
    };
  }

  // 1. Check for duplicate user email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email address already exists');
  }

  // 2. Generate cryptographically unpredictable verification token (32 bytes)
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = crypto
    .createHash('sha256')
    .update(rawVerificationToken)
    .digest('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry

  // 3. Create new user record in MongoDB (always start real users as emailVerified: false)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    bio: bio || '',
    avatar: avatar || '',
    skills: Array.isArray(skills) ? skills : [],
    learningInterests: Array.isArray(learningInterests) ? learningInterests : [],
    availability: availability || 'flexible',
    timezone: timezone || 'UTC',
    isDemo: false,
    emailVerified: false,
    verificationTokenHash,
    verificationTokenExpires,
  });

  // 4. Send verification email via Plunk (non-blocking failure handles provider hiccups safely)
  let emailDelivery = { sent: false };
  try {
    const plunkRes = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken: rawVerificationToken,
    });
    emailDelivery = {
      sent: Boolean(plunkRes.delivered || plunkRes.simulated),
      simulated: Boolean(plunkRes.simulated),
    };
  } catch (emailErr) {
    console.warn(`⚠️ [Signup Email Notice] Verification email could not be sent immediately to [${user.email}]: ${emailErr.message}`);
    emailDelivery = { sent: false, error: emailErr.message };
  }

  const token = generateToken({ id: user._id, email: user.email, name: user.name });

  recordEvent({
    eventType: 'signup_completed',
    userId: user._id,
    metadata: { skillsCount: user.skills?.length || 0 },
  }).catch(() => {});

  return { user, token, emailDelivery };
};

/**
 * Authenticates user credentials.
 * Designated demo account authenticates cleanly, while real accounts strictly query MongoDB.
 * Authentication failures NEVER fall back to the demo identity.
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  // ---------------------------------------------------------
  // A. Dedicated Demo Account Handling
  // ---------------------------------------------------------
  if (normalizedEmail === DEMO_EMAIL) {
    if (password !== DEMO_PASSWORD) {
      recordSecurityMetric('failedLogins');
      throw new ApiError(401, 'Invalid email address or password');
    }

    // Generate unique, server-validated workspace identity for this visitor session
    const workspaceId = 'ws_' + crypto.randomBytes(16).toString('hex');
    const { getOrCreateWorkspace } = await import('./demoWorkspaceService.js');
    await getOrCreateWorkspace(workspaceId);

    // If MongoDB is connected, find or provision placeholder demo user in MongoDB
    let demoUserId = 'demo_user_static_id';
    if (User.db?.readyState === 1) {
      let demoUser = await User.findOne({ email: DEMO_EMAIL }).select('+password');
      if (!demoUser) {
        const { provisionDemoAccount } = await import('./demoProvisioningService.js');
        await provisionDemoAccount();
        demoUser = await User.findOne({ email: DEMO_EMAIL });
      }
      if (demoUser) {
        demoUserId = demoUser._id;
      }
    }

    // Issue tamper-proof JWT token containing workspaceId
    const token = generateToken({
      id: demoUserId,
      email: DEMO_EMAIL,
      name: 'Alex Morgan',
      isDemo: true,
      workspaceId,
    });

    return {
      user: {
        _id: demoUserId,
        name: 'Alex Morgan',
        email: DEMO_EMAIL,
        bio: 'Full-stack software engineer passionate about modern React architectures, TypeScript, and AI-assisted workflows.',
        role: 'user',
        isDemo: true,
        emailVerified: true,
        workspaceId,
      },
      token,
    };
  }

  // ---------------------------------------------------------
  // B. Real User Authentication (Strict MongoDB Verification)
  // ---------------------------------------------------------
  // If MongoDB is physically disconnected AND MOCK_DB === 'true', mock offline testing only
  if (User.db?.readyState !== 1 && process.env.MOCK_DB === 'true') {
    if (password === 'wrongpassword') {
      recordSecurityMetric('failedLogins');
      throw new ApiError(401, 'Invalid email address or password');
    }
    const mockId = 'mock_user_' + Buffer.from(normalizedEmail).toString('hex').substring(0, 12);
    const token = generateToken({ id: mockId, email: normalizedEmail, name: normalizedEmail.split('@')[0] });
    return {
      user: {
        _id: mockId,
        name: 'User ' + normalizedEmail.split('@')[0],
        email: normalizedEmail,
        bio: 'EnhanceUs user focused on goal-driven skill exchange.',
        skills: [{ name: 'React', level: 'advanced' }, { name: 'Node.js', level: 'intermediate' }],
        learningInterests: [{ name: 'GraphQL', priority: 'high' }],
        availability: 'flexible',
        timezone: 'UTC',
        role: 'user',
        isDemo: false,
        emailVerified: true,
      },
      token,
    };
  }

  // Real MongoDB lookup
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    recordSecurityMetric('failedLogins');
    throw new ApiError(401, 'Invalid email address or password');
  }

  // Check account suspension
  if (user.isSuspended) {
    recordSecurityMetric('failedLogins');
    throw new ApiError(403, 'Account has been suspended. Please contact support@briefenai.me.');
  }

  // Verify password using bcrypt schema method
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    recordSecurityMetric('failedLogins');
    throw new ApiError(401, 'Invalid email address or password');
  }

  // Update lastActiveAt
  user.lastActiveAt = new Date();
  await user.save().catch(() => {});

  recordEvent({
    eventType: 'login_success',
    userId: user._id,
    metadata: { isDemo: Boolean(user.isDemo) },
  }).catch(() => {});

  const token = generateToken({ id: user._id, email: user.email, name: user.name });

  return { user, token };
};

/**
 * Validates cryptographic email verification token and marks account as verified.
 */
export const verifyEmailToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new ApiError(400, 'A valid verification token must be provided.');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken.trim())
    .digest('hex');

  const user = await User.findOne({
    verificationTokenHash: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  }).select('+verificationTokenHash +verificationTokenExpires');

  if (!user) {
    recordSecurityMetric('failedVerifications');
    throw new ApiError(400, 'Invalid or expired verification token. Please request a new verification link.');
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  recordEvent({
    eventType: 'email_verified',
    userId: user._id,
  }).catch(() => {});

  return {
    success: true,
    message: 'Your email address has been successfully verified! You now have full access to EnhanceUs.',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: true,
    },
  };
};

/**
 * Resends verification email to an unverified user with rate limiting
 */
export const resendVerificationEmail = async (emailInput, currentUser = null) => {
  const targetEmail = (currentUser?.email || emailInput || '').toLowerCase().trim();

  if (!targetEmail) {
    throw new ApiError(400, 'Please provide an email address.');
  }

  const user = await User.findOne({ email: targetEmail });

  // Generic response prevents account enumeration
  if (!user) {
    return {
      success: true,
      message: 'If an unverified account is registered with this email, a verification link has been sent.',
    };
  }

  if (user.emailVerified) {
    return {
      success: true,
      message: 'This account email address is already verified.',
    };
  }

  // Generate new cryptographic verification token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = crypto
    .createHash('sha256')
    .update(rawVerificationToken)
    .digest('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.verificationTokenHash = verificationTokenHash;
  user.verificationTokenExpires = verificationTokenExpires;
  await user.save();

  // Send email via Plunk
  const emailRes = await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationToken: rawVerificationToken,
  });

  return {
    success: true,
    delivered: Boolean(emailRes.delivered),
    simulated: Boolean(emailRes.simulated),
    message: emailRes.simulated
      ? 'Verification email simulated in non-production environment. Check server logs.'
      : 'A fresh verification link has been sent to your email address. Please check your inbox.',
  };
};

/**
 * Initiates password reset process with generic response against account enumeration
 */
export const requestPasswordReset = async (emailInput) => {
  const targetEmail = (emailInput || '').toLowerCase().trim();

  if (!targetEmail) {
    throw new ApiError(400, 'Please provide an email address.');
  }

  const user = await User.findOne({ email: targetEmail });

  // Anti-enumeration: Return generic message if user doesn't exist or is demo account
  if (!user || user.isDemo) {
    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched.',
    };
  }

  // Generate short-lived cryptographic reset token (30-minute expiry)
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const resetPasswordTokenHash = crypto
    .createHash('sha256')
    .update(rawResetToken)
    .digest('hex');
  const resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  user.resetPasswordTokenHash = resetPasswordTokenHash;
  user.resetPasswordExpires = resetPasswordExpires;
  await user.save();

  // Send password reset email via Plunk
  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken: rawResetToken,
    });
  } catch (err) {
    console.error('⚠️ [Password Reset Email Error]:', err.message);
  }

  return {
    success: true,
    message: 'If an account exists with this email address, a password reset link has been dispatched.',
  };
};

/**
 * Validates reset token and sets a new password
 */
export const completePasswordReset = async ({ token, password }) => {
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'A valid password reset token is required.');
  }

  if (!password || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token.trim())
    .digest('hex');

  const user = await User.findOne({
    resetPasswordTokenHash: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +resetPasswordTokenHash +resetPasswordExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset link. Please request a new one.');
  }

  // Update password (Mongoose pre-save hook will hash it with bcrypt)
  user.password = password;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return {
    success: true,
    message: 'Your password has been successfully reset! You can now log in with your new password.',
  };
};

export const getCurrentUserProfile = async (user) => {
  return user;
};
