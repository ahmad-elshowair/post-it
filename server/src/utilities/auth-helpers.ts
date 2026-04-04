import { Request, Response } from "express";
import config from "../configs/config.js";
import { refresh_token_model, user_model } from "../controllers/factory.js";
import { IUserPayload } from "../interfaces/IUserPayload.js";
import {
  calculateExpirationDate,
  clearAuthCookies,
  generateFingerprint,
  generateToken,
  hashFingerprint,
  setTokensInCookies,
  verifyRefreshToken,
} from "./tokens.js";

export const getUserData = async (user_id?: string) => {
  try {
    const user = await user_model.getUserById(user_id!);
    return {
      success: true,
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
    };
  } catch (error) {
    console.error("[AUTH HELPERS] Fetching user data error:", error);
    return {
      success: false,
      error: `[AUTH HELPERS] Failed to fetch user data ${
        (error as Error).message
      }`,
    };
  }
};

export const validateAuthToken = (req: Request) => {
  const tokenName =
    config.node_env === "production" ? "__Host-refresh_token" : "refresh_token";

  const token = req.cookies[tokenName];

  if (!token) {
    return {
      valid: false,
      reason: "Missing Refresh Token!",
    };
  }

  const decodedUser = verifyRefreshToken(token);
  if (!decodedUser) {
    return {
      valid: false,
      reason: "Invalid Refresh Token or Expired!",
    };
  }

  return {
    valid: true,
    user: decodedUser,
  };
};

export const validateFingerprint = (
  req: Request,
  decodedUser: IUserPayload
) => {
  const fingerprintName =
    config.node_env === "production" ? "__Host-x-fingerprint" : "x-fingerprint";

  const fingerprint = (req.cookies[fingerprintName] ||
    req.headers["x-fingerprint"]) as string;

  if (!fingerprint) {
    return {
      valid: false,
      reason: "Missing Fingerprint!",
    };
  }

  if (decodedUser.fingerprint) {
    const hashedFingerprint = hashFingerprint(fingerprint);
    if (decodedUser.fingerprint !== hashedFingerprint) {
      return {
        valid: false,
        reason: "Fingerprint Mismatch!",
      };
    }
  }

  return {
    valid: true,
    fingerprint,
  };
};

export const handleInvalidToken = (
  res: Response,
  reason?: string,
  userId?: string
) => {
  const statusCode = userId ? 403 : 401;
  clearAuthCookies(res);
  return res.status(statusCode).json({
    message: `Authentication failed: ${reason}!`,
    authenticated: false,
  });
};

export const sendAuthStatusResponse = async (
  res: Response,
  user_id: string,
  tokenRotation: {
    access_token: string;
    refresh_token: string;
    fingerprint: string;
    expiresAt: Date;
  }
) => {
  const userData = await getUserData(user_id);

  if (!userData.success) {
    clearAuthCookies(res);
    return res.status(401).json({
      message: `Authentication failed: ${userData.error}`,
      authenticated: false,
    });
  }

  setTokensInCookies(
    res,
    tokenRotation.access_token,
    tokenRotation.refresh_token,
    tokenRotation.fingerprint
  );

  return res.status(200).json({
    message: "Authentication successful: Tokens refreshed and rotated!",
    authenticated: true,
    user: userData.user,
    ...(config.csrf_protection_enabled && {
      csrf: res.getHeader("X-CSRF-Token"),
    }),
    fingerprint: tokenRotation.fingerprint,
    expiresAt: tokenRotation.expiresAt,
  });
};

export const handleAuthError = (res: Response, error: unknown) => {
  console.error("[AUTH HELPERS] handleAuthError: ", error);

  return res.status(500).json({
    message: `server error during authentication`,
    error: error instanceof Error ? error.message : String(error),
    authenticated: false,
  });
};

export const rotateTokens = async (
  user: IUserPayload,
  oldFingerprint: string
) => {
  const newFingerprint = generateFingerprint();
  const hashedNewFingerprint = hashFingerprint(newFingerprint);

  const payload: IUserPayload = {
    id: user.id,
    is_admin: user.is_admin,
    fingerprint: hashedNewFingerprint,
  };

  const accessToken = generateToken(
    payload,
    config.jwt_access_secret,
    config.access_token_expiry
  );

  const refreshToken = generateToken(
    payload,
    config.jwt_refresh_secret,
    config.refresh_token_expiry
  );

  const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

  await refresh_token_model.rotateToken(
    user.id!,
    hashFingerprint(oldFingerprint),
    hashedNewFingerprint,
    expiresAt
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    fingerprint: newFingerprint,
    expiresAt,
  };
};
