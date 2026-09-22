# Feedants Competition Details Module - Backend Service

This repository provides the backend service for the **Feedants Competition Details Module**, powering competition listings, competition details, lifecycle management, user authentication, and participant capacity management.

---

## 1. System Overview

The backend is built as a secure, maintainable, and scalable REST API using Node.js, Express.js, TypeScript, and MongoDB.

### Core Capabilities
- **Competition Data Model & Lifecycle**: Comprehensive domain model covering prizes, entry fees, participant caps, judges, rewards, previous winners, judging criteria, rules, and eight deterministic lifecycle states.
- **Dynamic Lifecycle Determination**: Effective lifecycle state is computed server-side using UTC time and date windows without mutating database records on read.
- **Capacity Management**: Server-side calculation of remaining participation spots ensuring non-negative values.
- **User Authentication**: Secure registration, login, and identity verification using `bcryptjs` password hashing and `jsonwebtoken` with explicit `HS256` enforcement.
- **Security & Hardening**: Helmet HTTP headers, strict CORS origin controls, IP rate limiting, 10kb JSON payload limits, and dual-mode structured logging with sensitive field redaction.
- **Production-Safe Error Handling**: Centralized error mapping that suppresses stack traces and internal database errors in production.

---

## 2. Competition Data Model & Lifecycle

### Competition Model
The `Competition` model (`src/models/Competition.ts`) is the authoritative source of truth for competition data:

- **Identity**: `title` (3-120 chars), `slug` (unique, URL-safe), `category`, `type`.
- **Content**: `description`, `language` (default: English).
- **Financial & Capacity**: `prizePool` (non-negative number), `entryFee` (non-negative number), `maxParticipants` (>= 1), `registeredCount` (>= 0, never exceeds `maxParticipants`), `certificateAvailable` (boolean).
- **Lifecycle Windows**:
  - `registrationStart` & `registrationEnd`
  - `submissionStart` & `submissionEnd`
  - `resultDate` (optional; when absent, competition remains `SUBMISSION_CLOSED` after submission closes)
- **Structured Subdocuments**:
  - `judge`: Name, designation, organization, avatar URL, video URL.
  - `rewards`: Ordered list with position, title, amount, and description.
  - `previousWinners`: Name, position, year, image URL.
  - `judgingParameters`: Criteria name, description, and non-negative weight.
  - `rules`: Ordered list with display order, title, and description.

### Lifecycle States
Competitions transition through 8 standardized states:

| Status | Meaning |
| :--- | :--- |
| `DRAFT` | Administrative preparation; not publicly open. |
| `UPCOMING` | Publicly visible; registration window has not opened yet. |
| `REGISTRATION_OPEN` | Users may register if remaining capacity exists. |
| `REGISTRATION_CLOSED` | Registration window has ended OR capacity has been reached. |
| `SUBMISSION_OPEN` | Registered participants may submit their entries. |
| `SUBMISSION_CLOSED` | Submission window has closed; entries under review. |
| `RESULT_PUBLISHED` | Competition results are officially published. |
| `COMPLETED` | Competition lifecycle has concluded. |

### Business Rules & Date Validation
1. **Date Chronology**:
   - `registrationStart < registrationEnd`
   - `registrationEnd <= submissionStart`
   - `submissionStart < submissionEnd`
   - If `resultDate` is present: `submissionEnd <= resultDate`
   - If `resultDate` is absent: competition is allowed and remains `SUBMISSION_CLOSED` after `submissionEnd`.
2. **Effective Status Determination**:
   - Persisted `DRAFT` and `COMPLETED` are administrative overrides.
   - For all other states, the server determines the effective runtime status dynamically based on server UTC time.
   - Client-provided status, remaining spots, or local device time are never trusted.
3. **Capacity & Remaining Spots**:
   - `remainingSpots = Math.max(0, maxParticipants - registeredCount)`
   - Never returns a negative number.

---

## 3. Database Design & Indexes

Mongoose schema optimization and indexes:
- `{ slug: 1 }`: Unique index for fast lookups.
- `{ status: 1 }`: Lifecycle filtering.
- `{ category: 1 }`: Category filtering.
- `{ registrationStart: 1 }`, `{ registrationEnd: 1 }`, `{ submissionStart: 1 }`, `{ resultDate: 1 }`: Date-range queries.
- `{ status: 1, category: 1 }`: Compound index for filtered competition listings.
- User email unique index: `{ email: 1 }`.

---

## 4. Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript 5.x (strict configuration)
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose 8.x
- **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`
- **Validation**: Zod 3.x
- **Security**: Helmet, CORS, express-rate-limit
- **Testing**: Vitest, Supertest

---

## 5. Environment Variables

Create a `.env` file in the `backend/` directory (see `.env.example`):

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
│   │   ├── authenticate.ts          # JWT authentication middleware (HS256 only)
│   │   ├── optionalAuthenticate.ts  # Optional JWT authentication middleware
│   │   ├── errorHandler.ts          # Centralized error handling (production-safe error masking)
│   │   ├── notFound.ts              # 404 handler returning standardized error format
│   │   ├── rateLimiter.ts           # Global & route-specific rate limiter factory
│   │   └── validate.ts              # Generic Zod validation middleware (body, query, params)
│   ├── routes/
│   │   ├── auth.routes.ts           # Authentication routes (/register, /login, /me)
│   │   ├── competition.routes.ts    # Competition routes (/:competitionId)
│   │   └── index.ts                 # Root API router mounted at /api/v1
│   ├── controllers/
│   │   ├── auth.controller.ts        # Authentication request handlers
│   │   └── competition.controller.ts # Competition request handlers
│   ├── services/
│   │   ├── auth.service.ts        # Authentication business logic & password hashing
│   │   └── competition.service.ts # Competition details, lifecycle & capacity calculation
│   ├── models/
│   │   ├── Competition.ts    # Competition model with subdocuments & lifecycle
│   │   └── User.ts           # User Mongoose model with safe serialization
│   ├── validators/
│   │   ├── auth.validator.ts        # Zod schemas for register and login
│   │   └── competition.validator.ts # Zod schemas for competition data
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
│   ├── auth.test.ts                # Authentication test scenarios
│   ├── competition.test.ts         # Competition model and lifecycle test scenarios
│   ├── competition-details.test.ts # Competition details API test scenarios
│   ├── health.test.ts              # Health check endpoint tests
│   ├── middleware.test.ts          # Error handler, 404, rate limiter, and validate tests
│   └── utils.test.ts               # AppError, requestId, response helpers tests
├── .env.example               # Template environment file with placeholders
├── .gitignore                 # Node, env, dist, and log exclusions
├── package.json               # Scripts, dependencies, type definitions
├── tsconfig.json              # Strict TypeScript configuration
├── vitest.config.ts           # Vitest testing configuration
└── README.md                  # Complete backend documentation
```

---

## 8. Security Decisions

1. **Strict Startup Sequence**: The HTTP server will not accept traffic until MongoDB connection succeeds. Startup fails fast if required environment variables are missing or invalid.
2. **Password Security**: Strong bcrypt hashing with salt cost factor 10. Passwords are never stored in plaintext and never exposed in JSON responses or log outputs.
3. **Explicit JWT Algorithm**: JWT generation and verification strictly enforce `HS256` (`algorithms: ['HS256']`), preventing algorithm downgrade or confusion attacks.
4. **Identity Trust Rule**: Authenticated identity is derived exclusively from the verified Bearer JWT. User identity supplied via request bodies, queries, params, or custom headers is never trusted.
5. **Payload Size Limiting**: `express.json({ limit: '10kb' })` prevents memory exhaustion attacks via oversized request bodies.
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

## 10. API Endpoints

### Health Check
- **Method**: `GET`
- **Path**: `/health`
- **Access**: Public (unauthenticated)
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

### Authentication
- `POST /api/v1/auth/register`: Register new user with name, email, password (>= 8 chars).
- `POST /api/v1/auth/login`: Authenticate user and receive JWT.
- `GET /api/v1/auth/me`: Retrieve current user profile (requires `Authorization: Bearer <token>`).

### Competition Details
- **Method**: `GET`
- **Path**: `/api/v1/competitions/:competitionId`
- **Access**: Public (optional authentication via `Bearer <JWT>`)
  - Anonymous requests receive default user state (`isRegistered: false, hasSubmitted: false`).
  - Valid `Bearer <JWT>` derives authenticated user identity.
  - Invalid/expired `Bearer` tokens return HTTP 401.
- **Response Structure**:
```json
{
  "success": true,
  "message": "Competition details retrieved successfully",
  "data": {
    "competition": {
      "id": "60c72b2f9b1d8b001c8e4e01",
      "title": "National Coding Challenge",
      "slug": "national-coding-challenge-2026",
      "category": "Coding",
      "type": "Individual",
      "description": "...",
      "language": "English",
      "prizePool": 100000,
      "entryFee": 0,
      "maxParticipants": 1000,
      "registeredCount": 735,
      "remainingSpots": 265,
      "certificateAvailable": true,
      "registrationStart": "2026-06-01T00:00:00.000Z",
      "registrationEnd": "2026-06-10T00:00:00.000Z",
      "submissionStart": "2026-06-11T00:00:00.000Z",
      "submissionEnd": "2026-06-20T00:00:00.000Z",
      "resultDate": "2026-06-25T00:00:00.000Z",
      "status": "REGISTRATION_OPEN",
      "judge": {
        "name": "Alex Rivera",
        "designation": "Principal Architect",
        "organization": "CloudScale"
      },
      "rewards": [],
      "previousWinners": [],
      "judgingParameters": [],
      "rules": []
    },
    "userState": {
      "isRegistered": false,
      "hasSubmitted": false
    },
    "actions": {
      "canRegister": true,
      "canSubmit": false
    }
  }
}
```

