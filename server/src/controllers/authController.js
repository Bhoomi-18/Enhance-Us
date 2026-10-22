import * as authService from '../services/authService.js';
import { provisionDemoAccount } from '../services/demoProvisioningService.js';
import { validateRegisterInput, validateLoginInput } from '../validators/authValidator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req, res, next) => {
  try {
    validateRegisterInput(req.body);
    const { user, token } = await authService.registerUser(req.body);

    // Set secure HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    return ApiResponse.success(
      res,
      'Registration successful. Welcome to EnhanceUs!',
      { user, token },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    validateLoginInput(req.body);
    const { user, token } = await authService.loginUser(req.body);

    // Set secure HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    return ApiResponse.success(
      res,
      'Log in successful',
      { user, token },
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return ApiResponse.success(res, 'Successfully logged out', {}, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userProfile = await authService.getCurrentUserProfile(req.user);
    return ApiResponse.success(res, 'User session active', { user: userProfile }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getDemoCredentials = async (req, res, next) => {
  try {
    const demoInfo = await provisionDemoAccount();
    return ApiResponse.success(res, 'Demo account credentials', demoInfo, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.body?.token || req.query?.token;
    const result = await authService.verifyEmailToken(token);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const email = req.body?.email;
    const result = await authService.resendVerificationEmail(email, req.user || null);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = req.body?.email;
    const result = await authService.requestPasswordReset(email);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    const result = await authService.completePasswordReset({ token, password });
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
