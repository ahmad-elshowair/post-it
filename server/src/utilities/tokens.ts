import crypto from "crypto";
import { Response } from "express";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../configs/config";
import { IUserPayload } from "../interfaces/IUserPayload";

// Parse a duration string (like "7d", "15m") to milliseconds
export const getDurationInMs = (duration: string): number => {
  // Validate duration format
  if (!/^[0-9]+[smhd]$/.test(duration)) {
    throw new Error(
      "Invalid duration format. Must be a number followed by s, m, h, or d",
    );
  }

  const value = parseInt(duration.slice(0, -1), 10);
  const unit = duration.slice(-1);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

// Calculate token expiration date from duration string
export const calculateExpirationDate = (duration: string): Date => {
  const durationMs = getDurationInMs(duration);
  return new Date(Date.now() + durationMs);
};

export const generateFingerprint = () => {
  return crypto.randomUUID();
};
export const hashFingerprint = (fingerprint: string) => {
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
};

export const generateToken = (
  payload: IUserPayload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
) => {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };
  return jwt.sign(tokenPayload, secret, { expiresIn, algorithm: "HS256" });
};

const generateCSRF = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const setTokensInCookies = (
  res: Response,
  access_token: string,
  refresh_token: string,
  fingerprint?: string,
) => {
  const isProduction = config.node_env === "production";

  const cookieConfigs = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("strict" as const) : ("lax" as const),
    path: "/",
  };

  const accessTokenName = isProduction ? "__Host-access_token" : "access_token";
  const refreshTokenName = isProduction
    ? "__Host-refresh_token"
    : "refresh_token";
  const fingerprintName = isProduction
    ? "__Host-x-fingerprint"
    : "x-fingerprint";
  const csrfTokenName = isProduction ? "__Secure-csrf_token" : "csrf_token";

  // SET THE ACCESS TOKEN IN COOKIES.
  res.cookie(accessTokenName, access_token, {
    ...cookieConfigs,
    maxAge: getDurationInMs(config.access_token_expiry),
  });

  // SET THE REFRESH TOKEN IN COOKIES.
  res.cookie(refreshTokenName, refresh_token, {
    ...cookieConfigs,
    maxAge: getDurationInMs(config.refresh_token_expiry),
  });

  // SET THE FINGERPRINT IN COOKIES.
  if (fingerprint) {
    res.cookie(fingerprintName, fingerprint, {
      ...cookieConfigs,
      httpOnly: false,
    });
  }

  // SET THE CSRF TOKEN IN COOKIES AND RESPONSE HEADER.
  if (config.csrf_protection_enabled) {
    const csrf_token = generateCSRF();
    res.cookie(csrfTokenName, csrf_token, {
      ...cookieConfigs,
      httpOnly: false,
      maxAge: getDurationInMs(config.access_token_expiry),
    });

    res.setHeader("X-CSRF-Token", csrf_token);
  }
};

export const clearAuthCookies = (res: Response) => {
  const cookiesOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: config.node_env === "production",
    path: "/",
  };

  // CLEAR COOKIES BASE ON ENVIRONMENT.
  if (config.node_env === "development") {
    res.clearCookie("access_token", { ...cookiesOptions });
    res.clearCookie("refresh_token", { ...cookiesOptions });
    // Clear CSRF token if it exists
    if (config.csrf_protection_enabled) {
      res.clearCookie("csrf_token", { ...cookiesOptions });
    }

    res.clearCookie("x-fingerprint", { ...cookiesOptions });
  } else {
    res.clearCookie("__Host-access_token", {
      ...cookiesOptions,
      secure: true,
      path: "/",
    });
    res.clearCookie("__Host-refresh_token", {
      ...cookiesOptions,
      secure: true,
      path: "/",
    });
    // Clear CSRF token if it exists
    if (config.csrf_protection_enabled) {
      res.clearCookie("__Secure-csrf_token", {
        ...cookiesOptions,
        httpOnly: false,
        path: "/",
      });
    }

    res.clearCookie("__Host-x-fingerprint", { ...cookiesOptions });
  }
};

export const verifyAccessToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload;

    // ADDITIONAL VALIDATION CHECKS.
    if (!decoded.id || !decoded.fingerprint) {
      console.warn("Token missing required fields!");
      return null;
    }

    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid token");
    }
    return null;
  }
};

export const verifyRefreshToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_refresh_secret) as JwtPayload;

    // ADDITIONAL VALIDATION CHECKS.
    if (!decoded.id || !decoded.fingerprint) {
      console.warn("Token missing required fields!");
      return null;
    }

    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid token");
    }
    return null;
  }
};
