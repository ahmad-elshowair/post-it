import crypto from "crypto";
import { NextFunction, Response } from "express";
import config from "../configs/config.js";
import { ICustomRequest } from "../interfaces/ICustomRequest.js";
import { hashFingerprint, verifyAccessToken } from "../utilities/tokens.js";

const authorizeUser = (
  req: ICustomRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from cookie first (preferred) or from Authorization header if not in cookie.
    const accessTokenName =
      config.node_env === "development"
        ? "access_token"
        : "__Host-access_token";

    const token =
      req.cookies[accessTokenName] ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    // Check if token exists
    if (!token) {
      console.error(
        ` No token found in the cookies (${accessTokenName}) or Authorization header`,
      );
      return res.status(401).json({
        message: "Authentication Required",
        error: "Access Token is missing!",
      });
    }

    // Verify the access token
    const decodedUser = verifyAccessToken(token);

    if (!decodedUser) {
      console.error("Token verification failed - invalid or expired token");

      return res.status(403).json({
        message: "Authentication Failed",
        error: "Invalid or Expired Access token",
      });
    }

    // GET fingerprint FROM COOKIES OR HEADERS.
    const fingerprintName =
      config.node_env === "development"
        ? "x-fingerprint"
        : "__Host-x-fingerprint";

    const fingerprint =
      req.cookies[fingerprintName] || (req.headers["x-fingerprint"] as string);

    // VERIFY fingerprint IF PROVIDED I BOTH TOKEN AND REQUEST.
    if (decodedUser.fingerprint && fingerprint) {
      const hashedFingerprint = hashFingerprint(fingerprint);

      // COMPARE fingerprints.
      if (hashedFingerprint !== decodedUser.fingerprint) {
        console.warn(
          `Potential token theft detected for user ID: ${decodedUser.id}`,
        );
        return res.status(403).json({
          message: "Authentication Failed",
          error: "Fingerprint Mismatch!",
        });
      }
    }

    // CSRF Protection (if enabled)
    if (config.csrf_protection_enabled) {
      // Skip CSRF check for GET requests
      if (req.method.toUpperCase() === "GET") {
        req.user = decodedUser;
        return next();
      }

      // NORMALIZE AND CHECK FOR CSRF TOKEN IN VARIOUS HEADERS(case-insensitive).
      const csrfToken = (req.headers["x-csrf-token"] ||
        req.headers["csrf-token"] ||
        req.headers["X-CSRF-Token"] ||
        req.headers["CSRF-Token"]) as string;

      const csrfTokenName =
        config.node_env === "development"
          ? "csrf_token"
          : "__Secure-csrf_token";

      const storedCsrfToken = req.cookies[csrfTokenName];

      // PROPER VALIDATION OF TOKEN PRESENCE AND FORMAT.
      if (!csrfToken || typeof csrfToken !== "string") {
        console.error(
          "CSRF validation failed - missing or invalid format in header",
        );
        return res.status(403).json({
          message: "Authentication failed",
          error: "Missing or Invalid CSRF token format!",
        });
      }

      if (!storedCsrfToken) {
        console.error("CSRF validation failed - missing cookie");
        return res.status(403).json({
          message: "Authentication failed",
          error: "Missing CSRF cookie!",
        });
      }

      // USE CONSTANT-TIME COMPARISON TO PREVENT TIMING ATTACKS.
      // Using top-level crypto import for constant-time comparison
      try {
        const tokenMatch = crypto.timingSafeEqual(
          Buffer.from(csrfToken, "utf8"),
          Buffer.from(storedCsrfToken, "utf8"),
        );
        if (!tokenMatch) {
          console.error("CSRF validation failed - token mismatch");
          return res.status(403).json({
            message: "Authentication failed",
            error: "CSRF token mismatch!",
          });
        }
      } catch (error) {
        console.error("CSRF validation error: ", error);
        return res.status(403).json({
          message: "Authentication failed",
          error: "Failed to verify CSRF token!",
        });
      }
    }

    // Attach user info to request object
    req.user = decodedUser;

    // Continue to the protected route
    next();
  } catch (error) {
    console.error("Authentication error: ", error);
    return res.status(403).json({
      message: "Authentication Failed",
      error: "Invalid Access token",
    });
  }
};
export default authorizeUser;
