/**
 * Environment configuration for Feedants Mobile App.
 *
 * Centralizes all environment variable access.
 * Components must NEVER access process.env directly.
 */

/**
 * Normalizes a URL by trimming whitespace and removing any trailing slashes.
 */
export function normalizeApiUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.replace(/\/+$/, '');
}

/**
 * Validates and retrieves the backend API base URL from EXPO_PUBLIC_API_URL.
 * Throws a clear descriptive error if the variable is missing or empty.
 */
export function resolveApiBaseUrl(rawUrl?: string): string {
  const url = rawUrl !== undefined ? rawUrl : process.env.EXPO_PUBLIC_API_URL;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL environment variable. ' +
        'Please define EXPO_PUBLIC_API_URL in your mobile/.env file ' +
        '(e.g., EXPO_PUBLIC_API_URL=http://localhost:5000). See mobile/.env.example for details.'
    );
  }

  return normalizeApiUrl(url);
}

/**
 * The normalized backend API base URL.
 */
export const API_BASE_URL: string = (() => {
  // In non-test environments or when process.env is populated, resolve immediately
  try {
    return resolveApiBaseUrl();
  } catch {
    // If running in an environment without EXPO_PUBLIC_API_URL set (e.g. during initial imports in unit tests),
    // fallback to empty string and let resolveApiBaseUrl() throw when invoked directly.
    return '';
  }
})();

export const ENV_CONFIG = Object.freeze({
  API_BASE_URL,
});
