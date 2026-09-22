import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { authService } from '../services/auth.service';

/**
 * Optional authentication middleware.
 * If no Authorization header is present, the request proceeds anonymously (req.user = undefined).
 * If an Authorization header is present, it MUST be a valid Bearer JWT;
 * invalid or expired tokens are rejected with HTTP 401.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.header('Authorization') || req.header('authorization');

    // Anonymous request
    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw AppError.unauthorized(
        'Invalid authorization header format. Expected Bearer <token>',
        'UNAUTHORIZED'
      );
    }

    const token = parts[1];
    if (!token) {
      throw AppError.unauthorized('Authentication token is missing', 'UNAUTHORIZED');
    }

    // Verify token and attach user; throws 401 if invalid/expired
    req.user = await authService.verifyTokenAndGetUser(token);

    next();
  } catch (error) {
    next(error);
  }
}
