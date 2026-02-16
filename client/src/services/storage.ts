import configs from "../configs";

export const setFingerprint = (fingerprint: string): void => {
  if (fingerprint) {
    localStorage.setItem("fingerprint", fingerprint);
  }
};

export const getFingerprint = (): string | null => {
  return localStorage.getItem("fingerprint");
};

export const removeFingerprint = (): void => {
  localStorage.removeItem("fingerprint");
};

export const setCsrf = (csrf: string): void => {
  localStorage.setItem("csrf", csrf);
};

export const getCsrf = (): string | null => {
  return localStorage.getItem("csrf");
};

export const removeCsrf = (): void => {
  localStorage.removeItem("csrf");
};

export const getFingerprintFromCookie = (): string | null => {
  const cookieName =
    configs.node_env === "development"
      ? "x-fingerprint"
      : "__Host-x-fingerprint";
  const cookies = document.cookie.split("; ");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const getCsrfFromCookie = (): string | null => {
  const cookieName =
    configs.node_env === "development" ? "csrf_token" : "__Secure-csrf_token";
  const cookies = document.cookie.split("; ");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const syncFingerprintFromCookies = (): string | null => {
  const cookieFingerprint = getFingerprintFromCookie();
  const localFingerprint = getFingerprint();
  if (cookieFingerprint && cookieFingerprint !== localFingerprint) {
    console.info("Synchronizing fingerprint from cookie to localStorage");
    setFingerprint(cookieFingerprint);
    return cookieFingerprint;
  }
  return localFingerprint;
};

export const syncCsrfFromCookies = () => {
  const cookieCsrf = getCsrfFromCookie();
  const localCsrf = getCsrf();
  if (cookieCsrf && cookieCsrf !== localCsrf) {
    console.info("Synchronizing CSRF from cookie to localStorage");
    setCsrf(cookieCsrf);
    return cookieCsrf;
  }
  return localCsrf;
};

export const syncAllAuthTokensFromCookies = () => {
  const cookieFingerprint = getFingerprintFromCookie();
  const localFingerprint = getFingerprint();
  const fingerprintSynced =
    cookieFingerprint && cookieFingerprint !== localFingerprint;

  const cookieCsrf = getCsrfFromCookie();
  const localCsrf = getCsrf();
  const csrfSynced = cookieCsrf && cookieCsrf !== localCsrf;

  if (fingerprintSynced && cookieFingerprint) {
    console.info("Synchronizing fingerprint from cookie to localStorage");
    setFingerprint(cookieFingerprint);
  }

  if (csrfSynced && cookieCsrf) {
    console.info("Synchronizing CSRF from cookie to localStorage");
    setCsrf(cookieCsrf);
  }
  return fingerprintSynced || csrfSynced;
};

const parseExpiryTime = (expireString: string) => {
  const unit = expireString.slice(-1);
  const value = parseInt(expireString.slice(0, -1), 10);

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
      return 15 * 60 * 1000;
  }
};

export const setTokenExpiration = (expiresIn: string) => {
  const expiresInMs = parseExpiryTime(expiresIn);
  const expirationTime = Date.now() + expiresInMs;
  localStorage.setItem("token_expiration", expirationTime.toString());
};

export const getTokenExpiration = (): number | null => {
  const expiration = localStorage.getItem("token_expiration");
  return expiration ? parseInt(expiration, 10) : null;
};

export const isTokenExpired = (): boolean => {
  const expiration = getTokenExpiration();
  return expiration ? Date.now() > expiration : false;
};

export const clearAuthStorage = (): void => {
  removeFingerprint();
  removeCsrf();
  localStorage.removeItem("token_expiration");
};
