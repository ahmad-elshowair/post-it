import { NextFunction, Request, Response } from 'express';
import config from '../configs/config.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IUserPayload } from '../interfaces/IUserPayload.js';
import {
  handleAuthError,
  handleInvalidToken,
  rotateTokens,
  sendAuthStatusResponse,
  validateAuthToken,
  validateFingerprint,
} from '../utilities/auth-helpers.js';
import { sendResponse } from '../utilities/response.js';
import {
  calculateExpirationDate,
  clearAuthCookies,
  generateFingerprint,
  generateToken,
  hashFingerprint,
  setTokensInCookies,
} from '../utilities/tokens.js';
import { auth_model, refresh_token_model, user_model } from './factory.js';

const register = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    // Generate a fingerprint for additional security
    const fingerprint = generateFingerprint();
    const hashedFingerprint = hashFingerprint(fingerprint);
    // Register the user.
    const user = await auth_model.register(req.body);

    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
      fingerprint: hashedFingerprint,
    };

    // Generate access token - short lived (15 minutes)
    const access_token = generateToken(
      payload,
      config.jwt_access_secret,
      config.access_token_expiry,
    );

    // Generate refresh token - long lived (7 days)
    const refresh_token = generateToken(
      payload,
      config.jwt_refresh_secret,
      config.refresh_token_expiry,
    );

    // calculate the expiration date
    const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

    // Create refresh token
    await refresh_token_model.createToken(user.user_id!, hashedFingerprint, expiresAt);

    // Set tokens in HttpOnly cookies
    setTokensInCookies(res, access_token, refresh_token, fingerprint);

    // Return minimal user info to client
    return sendResponse.success(
      res,
      {
        user: {
          user_id: user.user_id,
          email: user.email,
          is_admin: user.is_admin,
          user_name: user.user_name,
          first_name: user.first_name,
          last_name: user.last_name,
          picture: user.picture,
          cover: user.cover,
        },
        ...(config.csrf_protection_enabled && {
          csrf: res.getHeader('X-CSRF-Token'),
        }),
        fingerprint: fingerprint,
      },
      201,
    );
  } catch (error) {
    console.error('[AUTH]: Register Error: ', error);
    let errorMessage = 'Registration Failed';
    let statusCode = 500;
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      statusCode = (error as { status: number }).status || statusCode;
    }

    return sendResponse.error(res, errorMessage, statusCode, error);
  }
};

const login = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await auth_model.login(email, password);

    // Generate a fingerprint for additional security
    const fingerprint = generateFingerprint();
    const hashedFingerprint = hashFingerprint(fingerprint);

    // Create payload with minimal required data and fingerprint
    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
      fingerprint: hashedFingerprint,
    };

    // Generate access token - short lived (15 minutes)
    const access_token = generateToken(
      payload,
      config.jwt_access_secret,
      config.access_token_expiry,
    );
    // Generate refresh token - long lived (7 days)
    const refresh_token = generateToken(
      payload,
      config.jwt_refresh_secret,
      config.refresh_token_expiry,
    );

    // Calculate token expiration date (7 days from now)
    const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

    // Revoke any existing refresh tokens for this user
    await refresh_token_model.revokeAllUserTokens(user.user_id!);

    // Create new refresh token
    await refresh_token_model.createToken(user.user_id!, hashedFingerprint, expiresAt);

    // Set tokens in HttpOnly cookies
    setTokensInCookies(res, access_token, refresh_token, fingerprint);

    // Return minimal user info to client

    return sendResponse.success(
      res,
      {
        user: {
          user_id: user.user_id,
          email: user.email,
          is_admin: user.is_admin,
          user_name: user.user_name,
          first_name: user.first_name,
          last_name: user.last_name,
          picture: user.picture,
          cover: user.cover,
        },
        ...(config.csrf_protection_enabled && {
          csrf: res.getHeader('X-CSRF-Token'),
        }),
        fingerprint: fingerprint,
      },
      200,
    );
  } catch (error) {
    console.error('[AUTH]: Login Error: ', error);
    let errorMessage = 'Login Failed';
    let statusCode = 500;
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      if (errorMessage === 'BANNED') {
        return sendResponse.error(res, 'Account is suspended', 403);
      }
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      statusCode = (error as { status: number }).status || statusCode;
    }

    return sendResponse.error(res, errorMessage, statusCode, error);
  }
};

const logout = async (req: ICustomRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // CHECK IF userId EXISTS BEFORE PROCEEDING.
    if (!userId) {
      console.error('[AUTH]: User Id is MISSING!');
      return sendResponse.error(res, 'Unauthorized: User ID is Missing!', 401);
    }

    // Update online status to false if user ID is available
    try {
      await user_model.updateOnlineStatus(userId, false);
    } catch (error) {
      console.warn(`Failed to update online status for user: ${userId}`, error);
    }

    // Revoke all refresh tokens for this user
    try {
      await refresh_token_model.revokeAllUserTokens(userId);
    } catch (error) {
      console.warn(`Failed to revoke all refresh tokens for user: ${userId}`, error);
    }

    // Clear all auth cookies
    clearAuthCookies(res);
    // Return success message
    return sendResponse.success(res, 'Logout Successfully!', 200);
  } catch (error) {
    console.error('Logout Error:', error);
    return sendResponse.error(res, 'Error during logout', 500, error);
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    // 1- VALIDATE AUTH TOKEN.
    const tokeValidationResult = validateAuthToken(req);
    if (!tokeValidationResult.valid) {
      return handleInvalidToken(res, tokeValidationResult.reason);
    }

    const decodeUser = tokeValidationResult.user;

    if (!decodeUser?.id) {
      return handleInvalidToken(res, 'Invalid token payload');
    }

    // 2- VALIDATE FINGERPRINT.
    const fingerprintValidationResult = validateFingerprint(req, decodeUser);
    if (!fingerprintValidationResult.valid) {
      return handleInvalidToken(res, fingerprintValidationResult.reason, decodeUser.id);
    }

    // 3- VERIFY TOKEN IN DATABASE.
    const isTokenValid = await refresh_token_model.verifyToken(
      decodeUser.id,
      hashFingerprint(fingerprintValidationResult.fingerprint!),
    );
    if (!isTokenValid) {
      return handleInvalidToken(res, 'Token has been revoked or expired!', decodeUser.id);
    }

    // 4- ROTATE TOKENS FOR ENHANCED SECURITY.
    const tokenRotation = await rotateTokens(decodeUser, fingerprintValidationResult.fingerprint!);

    // 5- SEND AUTH STATUS RESPONSE WITH USER DATA.
    return await sendAuthStatusResponse(res, decodeUser.id, tokenRotation);
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const checkAuthStatus = async (req: ICustomRequest, res: Response) => {
  try {
    // 1- VALIDATE AUTH TOKEN
    const tokenValidationResult = validateAuthToken(req);
    if (!tokenValidationResult.valid) {
      return handleInvalidToken(res, tokenValidationResult.reason);
    }

    const decodeUser = tokenValidationResult.user;

    if (!decodeUser?.id) {
      return handleInvalidToken(res, 'Invalid token payload');
    }

    // 2- VALIDATE FINGERPRINT
    const fingerprintValidationResult = validateFingerprint(req, decodeUser);
    if (!fingerprintValidationResult.valid) {
      return handleInvalidToken(res, fingerprintValidationResult.reason, decodeUser.id);
    }

    // 3- VERIFY TOKEN IN DATABASE.
    const isTokenValid = await refresh_token_model.verifyToken(
      decodeUser.id,
      hashFingerprint(fingerprintValidationResult.fingerprint!),
    );
    if (!isTokenValid) {
      return handleInvalidToken(
        res,
        'Token has been revoked or not found in database!',
        decodeUser.id,
      );
    }

    // 4- ROTATE TOKENS FOR ENHANCED SECURITY.
    const tokenRotation = await rotateTokens(decodeUser, fingerprintValidationResult.fingerprint!);

    // 5- SEND AUTH STATUS RESPONSE WITH USER DATA.
    return await sendAuthStatusResponse(res, decodeUser.id, tokenRotation);
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  checkAuthStatus,
};
