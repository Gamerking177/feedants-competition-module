import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { User } from '../models/User';

interface TokenPayload extends JwtPayload {
  sub: string;
  role: string;
}

/**
 * Authentication middleware that verifies the Bearer JWT.
 * Derives user identity exclusively from the verified JWT.
 * User identity supplied via body, query, params, or custom headers is NEVER trusted.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.header('Authorization') || req.header('authorization');

    if (!authHeader) {
      throw AppError.unauthorized('Authentication token is missing', 'UNAUTHORIZED');
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

    // Verify JWT with explicit algorithm restriction (HS256 only)
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
      }
      if (err instanceof JsonWebTokenError) {
        throw AppError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
      }
      throw AppError.unauthorized('Authentication failed', 'UNAUTHORIZED');
    }

    if (!decoded.sub) {
      throw AppError.unauthorized('Invalid token payload', 'INVALID_TOKEN');
    }

    // Validate user existence and account status in database
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized('Authenticated user not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account is deactivated', 'ACCOUNT_INACTIVE');
    }

    // Attach verified user identity to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
