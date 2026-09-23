/**
 * Sanitized user profile returned by the backend.
 */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Authentication response payload containing the user profile and JWT.
 */
export interface AuthResult {
  user: SafeUser;
  token: string;
}

/**
 * User registration request payload.
 */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/**
 * User login request payload.
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Response for GET /api/v1/auth/me.
 */
export interface CurrentUserResponse {
  user: SafeUser;
}
