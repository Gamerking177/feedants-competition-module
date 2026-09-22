import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { AppError } from '../utils/AppError';

export const authController = {
  /**
   * Handles user registration.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.registerUser(req.body as RegisterInput);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handles user login.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.loginUser(req.body as LoginInput);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handles fetching the current authenticated user's profile.
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw AppError.unauthorized('Authenticated user not found on request', 'UNAUTHORIZED');
      }

      const result = await authService.getCurrentUser(req.user.id);
      sendSuccess(res, result, 'User retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};
