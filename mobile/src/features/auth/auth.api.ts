import { apiClient } from '../../services/api/client';
import { AuthResult, CurrentUserResponse, LoginPayload, RegisterPayload, SafeUser } from './auth.types';

/**
 * Authentication API Service.
 * Interfaces directly with the backend authentication endpoints via the centralized API client.
 */
export const authApi = {
  /**
   * Registers a new user and returns user info with a JWT.
   * POST /api/v1/auth/register
   */
  async register(payload: RegisterPayload): Promise<AuthResult> {
    return apiClient.post<AuthResult>('/api/v1/auth/register', payload, { skipAuth: true });
  },

  /**
   * Authenticates an existing user and returns user info with a JWT.
   * POST /api/v1/auth/login
   */
  async login(payload: LoginPayload): Promise<AuthResult> {
    return apiClient.post<AuthResult>('/api/v1/auth/login', payload, { skipAuth: true });
  },

  /**
   * Fetches the profile of the currently authenticated user.
   * Requires a valid Bearer token.
   * GET /api/v1/auth/me
   */
  async getMe(): Promise<SafeUser> {
    const data = await apiClient.get<CurrentUserResponse>('/api/v1/auth/me');
    return data.user;
  },
};
