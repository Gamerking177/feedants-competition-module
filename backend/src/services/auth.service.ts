import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Generates a signed JWT with explicit HS256 algorithm.
 */
function generateToken(user: IUserDocument): string {
  const payload = {
    sub: user.id,
    role: user.role,
  };

  const signOptions: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };

  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

/**
 * Converts a User document to a sanitized user object without sensitive fields.
 */
function toSafeUser(user: IUserDocument): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const authService = {
  /**
   * Registers a new user with hashed password and generates a JWT.
   */
  async registerUser(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw AppError.conflict('Email already registered', 'EMAIL_ALREADY_EXISTS');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await User.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      isActive: true,
    });

    const token = generateToken(user);

    return {
      user: toSafeUser(user),
      token,
    };
  },

  /**
   * Authenticates user with email and password, returning user profile and JWT.
   */
  async loginUser(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Explicitly select passwordHash which is excluded by default
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check account status
    if (!user.isActive) {
      throw AppError.unauthorized('Account is deactivated', 'ACCOUNT_INACTIVE');
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user);

    return {
      user: toSafeUser(user),
      token,
    };
  },

  /**
   * Retrieves the current authenticated user by their ID.
   */
  async getCurrentUser(userId: string): Promise<{ user: SafeUser }> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User not found or inactive', 'USER_NOT_FOUND');
    }

    return {
      user: toSafeUser(user),
    };
  },

  /**
   * Verifies a JWT token with HS256, extracts the subject, validates the user
   * in MongoDB, and returns the AuthenticatedUser object.
   */
  async verifyTokenAndGetUser(token: string): Promise<SafeUser> {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
      }
      throw AppError.unauthorized('Authentication failed', 'UNAUTHORIZED');
    }

    if (!decoded.sub) {
      throw AppError.unauthorized('Invalid token payload', 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized('Authenticated user not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account is deactivated', 'ACCOUNT_INACTIVE');
    }

    return toSafeUser(user);
  },
};
