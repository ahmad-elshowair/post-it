import dotenv from "dotenv";

dotenv.config();

export default {
  // ──────────────── SERVER CONFIGURATION ────────────────
  port: Number(process.env.PORT),
  client_url_dev: String(process.env.CLIENT_URL_DEV),
  client_url_prod: String(process.env.CLIENT_URL_PROD),
  node_env: String(process.env.NODE_ENV),

  // ──────────────── POSTGRESQL DATABASE CONFIGURATION ────────────────
  pg_port: Number(process.env.PG_PORT),
  pg_host: process.env.PG_HOST,
  pg_user: process.env.PG_USER,
  pg_password: process.env.PG_PASSWORD,
  pg_database: process.env.PG_DATABASE,

  // ──────────────── AUTHENTICATION SECURITY SETTINGS ────────────────
  jwt_access_secret: String(process.env.JWT_ACCESS_SECRET),
  jwt_refresh_secret: String(process.env.JWT_REFRESH_SECRET),

  // ──────────────── PASSWORD HASHING SETTINGS ────────────────
  salt: Number(process.env.SALT_ROUNDS),
  pepper: process.env.PEPPER,

  // ──────────────── TOKEN EXPIRATION SETTINGS (IN MINUTES/DAYS) ────────────────
  access_token_expiry: process.env.ACCESS_TOKEN_EXPIRY as "15m",
  refresh_token_expiry: process.env.REFRESH_TOKEN_EXPIRY as "7d",

  // ──────────────── ENHANCED SECURITY FEATURES ────────────────
  csrf_protection_enabled: process.env.CSRF_PROTECTION_ENABLED !== "false",

  // ──────────────── COOKIE SECURITY SETTINGS ────────────────
  cookie_secure:
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true",
  cookie_same_site: process.env.COOKIE_SAME_SITE || "strict",

  // ──────────────── TOKEN SECURITY SETTINGS ────────────────
  token_issuer: process.env.TOKEN_ISSUER || "chat-it-api",
  token_audience: process.env.TOKEN_AUDIENCE || "chat-it-client",

  // ──────────────── REDIS CONFIGURATION ────────────────
  redisUrl: String(process.env.REDIS_URL || "redis://localhost:6379"),

  // ──────────────── RATE LIMITING (TIERED THRESHOLDS) ────────────────
  rate_limit_global_window_ms: Number(
    process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || 60000,
  ), // 1 minute
  rate_limit_global_max_requests: Number(
    process.env.RATE_LIMIT_GLOBAL_MAX || 150,
  ), // 150 requests per minute

  // ──────────────── AUTH GROUP LIMITING (REGISTRATION, LOGIN, PASSWORD RESET) ────────────────
  rate_limit_auth_window_ms: Number(
    process.env.RATE_LIMIT_AUTH_WINDOW_MS || 900000,
  ), // 15 minutes
  rate_limit_auth_max_requests: Number(process.env.RATE_LIMIT_AUTH_MAX || 5), // 5 attempts per 15 minutes

  // ──────────────── CONTENT CREATION GROUP LIMITING (POSTS, COMMENTS) ────────────────
  rate_limit_content_window_ms: Number(
    process.env.RATE_LIMIT_CONTENT_WINDOW_MS || 60000,
  ), // 1 minute
  rate_limit_content_max_requests: Number(
    process.env.RATE_LIMIT_CONTENT_MAX || 25,
  ), // 25 posts/comments per minute

  // ──────────────── FILE UPLOAD SETTINGS ────────────────
  upload_max_size_bytes: Number(process.env.UPLOAD_MAX_SIZE_BYTES || 5242880), // 5MB
  upload_allowed_mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  upload_allowed_folders: ["posts", "profiles", "covers"],

  // ──────────────── SESSION MANAGEMENT ────────────────
  enable_token_rotation: process.env.ENABLE_TOKEN_ROTATION !== "false",
  enable_fingerprinting: process.env.ENABLE_FINGERPRINTING !== "false",
};
