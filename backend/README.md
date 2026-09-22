# Feedants Competition Details Module - Backend

> **Current Phase: Phase 4 - User Authentication & User Management**

This repository contains the backend service for the **Feedants Competition Details Module**. Phase 4 focuses on secure user authentication, registration, login, JWT issuance and verification, and user management.

---

## 1. Project Overview & Scope

### Implemented in Phase 4
- **User Model**: Mongoose schema with unique lowercase email index, bcrypt-hashed passwords (`select: false`), and safe JSON serialization.
- **Password Security**: Strong password hashing using `bcryptjs` (cost factor 10). Plaintext passwords are never stored or logged.
- **JWT Authentication**: Token generation and verification with explicit `HS256` algorithm enforcement and expiration tracking.
- **Authentication Middleware**: `authenticate` middleware that extracts Bearer tokens, verifies signatures, checks user existence and active status in MongoDB, and attaches `req.user`.
- **Request Identity Rule**: User identity supplied via request bodies, queries, params, or custom headers is never trusted; authenticated identity is derived exclusively from the verified Bearer JWT.
- **Auth Rate Limiting**: Stricter rate limits on `/api/v1/auth/register` and `/api/v1/auth/login` (10 requests per 15 minutes in production).
- **Validation**: Strict Zod schemas for registration and login inputs.
- **Safe Error Responses**: Centralized error handler with field-aware MongoDB duplicate key (code 11000) mapping (`EMAIL_ALREADY_EXISTS`).
- **Authentication Endpoints**:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- **Automated Tests**: 37 automated tests across 4 test suites with isolated test database support.

### Implemented in Phase 3 (Foundation)
- Express Application, strict TypeScript configuration, MongoDB connection management with graceful shutdown.
- Request ID tracing (`X-Request-ID`), structured logging, Helmet security headers, CORS origin whitelist, 10kb body size limit, and `/health` endpoint.

### Not Yet Implemented (Deferred to Future Phases)
- Competition models and database schemas
- Competition details and listing APIs
- Registration and spot reservation logic
- Submissions and file upload handling
- Winners and leaderboard management
- Mobile application (React Native)

---

## 2. Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose 8.x
- **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`
- **Validation**: Zod 3.x
- **Security**: Helmet, CORS, express-rate-limit
- **Testing**: Vitest, Supertest
- **Tooling**: ESLint, tsx

---

## 3. Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **MongoDB**: Local MongoDB instance (or MongoDB Atlas connection URI)

---

## 4. Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

---

## 5. Environment Variables

Create a `.env` file in the `backend/` directory (refer to `.env.example`):

```env
# Server Port
PORT=5000

# Environment Mode: development | production | test
NODE_ENV=development

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/feedants_competition

# CORS Allowed Origins (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:3000,http://localhost:8081

# JWT Configuration
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_EXPIRES_IN=7d

# Isolated Test Database URI
TEST_MONGODB_URI=mongodb://localhost:27017/feedants_test_isolated
```

> **Note**: Never commit `.env` to version control. The repository ignores `.env` files.

---

## 6. Development & Build Commands

```bash
# Run in development mode with live reload (tsx)
npm run dev

# Typecheck TypeScript source
npm run typecheck

# Lint source code and tests
npm run lint

# Run automated tests (Vitest)
npm test

# Build production bundle
npm run build

# Run compiled production build
npm start
```

---

## 7. Architecture Overview

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # Mongoose connection with lifecycle & graceful shutdown
│   │   └── env.ts             # Zod-validated typed environment configuration
│   ├── middleware/
│   │   ├── authenticate.ts   # JWT authentication middleware (HS256 only)
│   │   ├── errorHandler.ts   # Centralized error handling (dev vs prod safe responses)
│   │   ├── notFound.ts       # 404 handler returning standardized error format
│   │   ├── rateLimiter.ts    # Global & route-specific rate limiter factory
│   │   └── validate.ts       # Generic Zod validation middleware (body, query, params)
│   ├── routes/
│   │   ├── auth.routes.ts    # Authentication routes (/register, /login, /me)
│   │   └── index.ts          # Root API router mounted at /api/v1
│   ├── controllers/
│   │   └── auth.controller.ts # Authentication request handlers
│   ├── services/
│   │   └── auth.service.ts    # Authentication business logic & password hashing
│   ├── models/
│   │   └── User.ts            # User Mongoose model with safe serialization
│   ├── validators/
│   │   └── auth.validator.ts  # Zod schemas for register and login
│   ├── utils/
│   │   ├── AppError.ts        # Custom operational error class with HTTP status & codes
│   │   ├── logger.ts          # Structured logger with sanitization of sensitive data
│   │   ├── requestId.ts       # Request ID generator/extractor middleware
│   │   └── response.ts        # Standardized API response helpers (sendSuccess, sendError)
│   ├── types/
│   │   └── express.d.ts       # Express Request extensions (requestId, user)
│   ├── app.ts                 # Express application setup, middlewares, routes
│   └── server.ts              # HTTP server lifecycle, DB connection, graceful shutdown
├── tests/
│   ├── auth.test.ts           # 20 authentication test scenarios
│   ├── health.test.ts         # Health check endpoint tests
│   ├── middleware.test.ts     # Error handler, 404, rate limiter, and validate tests
│   └── utils.test.ts          # AppError, requestId, response helpers tests
├── .env.example               # Template environment file with placeholders
├── .gitignore                 # Node, env, dist, and log exclusions
├── package.json               # Scripts, dependencies, type definitions
├── tsconfig.json              # Strict TypeScript configuration
├── vitest.config.ts           # Vitest testing configuration
└── README.md                  # Complete backend documentation
```

---

## 8. Security Decisions

1. **Strict Startup Sequence**: The HTTP server will not accept traffic until MongoDB connection succeeds. Startup fails fast if `MONGODB_URI` or required variables are missing or invalid.
2. **Password Security**: Strong bcrypt hashing with salt cost factor 10. Passwords are never stored in plaintext and never exposed in JSON responses or log outputs.
3. **Explicit JWT Algorithm**: JWT generation and verification strictly enforce `HS256` (`algorithms: ['HS256']`), preventing algorithm downgrade or confusion attacks.
4. **Identity Trust Rule**: Authenticated identity is derived exclusively from the verified Bearer JWT. User identity supplied via request bodies, queries, params, or custom headers is never trusted.
5. **Payload Size Limiting**: `express.json({ limit: '10kb' })` prevents memory exhaustion attacks via oversized request bodies. Future competition submissions will use direct object-storage or dedicated upload streams rather than standard JSON parsers.
6. **Information Disclosure Prevention**: In production (`NODE_ENV=production`), error responses return generic messages (`"Something went wrong"`) without leaking stack traces, database credentials, or internal file paths.
7. **Structured Log Sanitization**: All loggers recursively redact sensitive keys including passwords, tokens, cookies, authorization headers, and connection URIs.
8. **CORS Isolation**: Whitelisted origins are enforced via environment variables. Wildcard `*` is prohibited for authenticated production environments.
9. **Request Tracing**: `X-Request-ID` is assigned to each incoming request and propagated through logs and responses for end-to-end auditability.

---

## 9. Standard API Responses

### Success Response
```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "status": "Healthy",
    "timestamp": "2026-09-22T10:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Route not found: GET /api/v1/unknown",
  "code": "NOT_FOUND"
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 10. Health Endpoint

- **Method**: `GET`
- **Path**: `/health`
- **Authentication**: None (public & lightweight)
- **Response**:
```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "status": "Healthy",
    "timestamp": "2026-09-22T10:00:00.000Z"
  }
}
```
