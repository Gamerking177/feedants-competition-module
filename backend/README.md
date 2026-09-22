# Feedants Competition Details Module - Backend

> **Current Phase: Phase 3 - Secure Backend Foundation**

This repository contains the backend service for the **Feedants Competition Details Module**. Phase 3 focuses exclusively on establishing a secure, scalable, and maintainable backend foundation.

---

## 1. Project Overview & Scope

### Implemented in Phase 3
- **Express Application**: Configured with strict security and JSON limits.
- **TypeScript**: Strict configuration (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`).
- **MongoDB Connection**: Lifecycle-managed connection with connection pooling and graceful disconnection.
- **Strict Startup Lifecycle**: HTTP server will not accept traffic until MongoDB connection succeeds.
- **Environment Validation**: Zod-based startup validation with fast-fail mechanism.
- **Security Headers**: Helmet integration with recommended defaults.
- **CORS Configuration**: Environment-driven whitelist, rejecting unapproved browser origins.
- **Rate Limiting**: Global IP rate limiting and configurable middleware factory.
- **Request Validation Infrastructure**: Generic Zod validation middleware for `body`, `query`, and `params`.
- **Centralized Error Handling**: Standardized error responses masking internal details and stack traces in production.
- **Structured Logging**: Dual-mode logging (human-readable in development, JSON in production) with automatic redaction of sensitive keys.
- **Request ID Tracing**: Unique `X-Request-ID` attached to all incoming requests, responses, and structured logs.
- **Health Endpoint**: Lightweight `GET /health` monitoring endpoint.
- **Graceful Shutdown**: Controlled teardown for `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection`.
- **API Versioning**: Standardized `/api/v1` router structure.
- **Automated Tests**: Vitest test suite for foundation, utilities, and middleware.

### Not Yet Implemented (Deferred to Future Phases)
- User authentication
- JWT token generation & verification
- Password hashing (bcrypt)
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
│   │   ├── errorHandler.ts   # Centralized error handling (dev vs prod safe responses)
│   │   ├── notFound.ts       # 404 handler returning standardized error format
│   │   ├── rateLimiter.ts    # Global & route-specific rate limiter factory
│   │   └── validate.ts       # Generic Zod validation middleware (body, query, params)
│   ├── routes/
│   │   └── index.ts          # Root API router mounted at /api/v1
│   ├── controllers/          # HTTP request handlers (reserved for future phases)
│   ├── services/             # Business logic layer (reserved for future phases)
│   ├── models/               # Mongoose data models (reserved for future phases)
│   ├── validators/           # Zod schema definitions (reserved for future phases)
│   ├── utils/
│   │   ├── AppError.ts       # Custom operational error class with HTTP status & codes
│   │   ├── logger.ts         # Structured logger with sanitization of sensitive data
│   │   ├── requestId.ts      # Request ID generator/extractor middleware
│   │   └── response.ts       # Standardized API response helpers (sendSuccess, sendError)
│   ├── types/
│   │   └── express.d.ts      # Express Request extensions (requestId)
│   ├── app.ts                # Express application setup, middlewares, routes
│   └── server.ts             # HTTP server lifecycle, DB connection, graceful shutdown
├── tests/
│   ├── health.test.ts        # Health check endpoint tests
│   ├── middleware.test.ts    # Error handler, 404, rate limiter, and validate tests
│   └── utils.test.ts         # AppError, requestId, response helpers tests
├── .env.example              # Template environment file with placeholders
├── .gitignore                # Node, env, dist, and log exclusions
├── package.json              # Scripts, dependencies, type definitions
├── tsconfig.json             # Strict TypeScript configuration
├── vitest.config.ts          # Vitest testing configuration
└── README.md                 # Backend setup, architecture, and security documentation
```

---

## 8. Security Decisions

1. **Strict Startup Sequence**: The HTTP server will not accept traffic until MongoDB connection succeeds. Startup fails fast if `MONGODB_URI` or required variables are missing or invalid.
2. **Payload Size Limiting**: `express.json({ limit: '10kb' })` prevents memory exhaustion attacks via oversized request bodies. Future competition submissions will use direct object-storage or dedicated upload streams rather than standard JSON parsers.
3. **Information Disclosure Prevention**: In production (`NODE_ENV=production`), error responses return generic messages (`"Something went wrong"`) without leaking stack traces, database credentials, or internal file paths.
4. **Structured Log Sanitization**: All loggers recursively redact sensitive keys including passwords, tokens, cookies, authorization headers, and connection URIs.
5. **CORS Isolation**: Whitelisted origins are enforced via environment variables. Wildcard `*` is prohibited for authenticated production environments.
6. **Request Tracing**: `X-Request-ID` is assigned to each incoming request and propagated through logs and responses for end-to-end auditability.

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
