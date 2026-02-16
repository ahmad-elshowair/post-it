import dotenv from "dotenv";

dotenv.config();

export default {
  // Server configuration
  port: Number(process.env.PORT),
  client_url_dev: String(process.env.CLIENT_URL_DEV),
  client_url_prod: String(process.env.CLIENT_URL_PROD),
  node_env: String(process.env.NODE_ENV),

  // PostgreSQL database configuration
  pg_port: Number(process.env.PG_PORT),
  pg_host: process.env.PG_HOST,
  pg_user: process.env.PG_USER,
  pg_password: process.env.PG_PASSWORD,
  pg_database: process.env.PG_DATABASE,

  // Authentication security settings
  jwt_access_secret: String(process.env.JWT_ACCESS_SECRET),
  jwt_refresh_secret: String(process.env.JWT_REFRESH_SECRET),

  // Password hashing settings
  salt: Number(process.env.SALT_ROUNDS),
  pepper: process.env.PEPPER,

  // Token expiration settings (in minutes/days)
  access_token_expiry: process.env.ACCESS_TOKEN_EXPIRY as "15m",
  refresh_token_expiry: process.env.REFRESH_TOKEN_EXPIRY as "7d",

  // Enhanced security features
  csrf_protection_enabled: process.env.CSRF_PROTECTION_ENABLED !== "false",

  // Cookie security settings
  cookie_secure:
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true",
  cookie_same_site: process.env.COOKIE_SAME_SITE || "strict",

  // Token security settings
  token_issuer: process.env.TOKEN_ISSUER || "chat-it-api",
  token_audience: process.env.TOKEN_AUDIENCE || "chat-it-client",

  // Rate limiting (to prevent brute force attacks)
  rate_limit_window_ms: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), // 1 minute
  rate_limit_max_requests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60), // 60 requests per minute

  // Session management
  enable_token_rotation: process.env.ENABLE_TOKEN_ROTATION !== "false",
  enable_fingerprinting: process.env.ENABLE_FINGERPRINTING !== "false",
};
