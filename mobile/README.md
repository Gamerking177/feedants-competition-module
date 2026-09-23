# Feedants Mobile Application

This directory contains the mobile application for the **Feedants Competition Details Module**, built with Expo, React Native, and TypeScript.

---

## 1. System Overview

The mobile application provides the participant-facing interface for discovering competitions, viewing details, registering, and tracking submissions. The foundation is built with:

- **Expo & Expo Router**: File-based typed routing with safe-area and screen lifecycle management.
- **Strict TypeScript**: End-to-end typed contracts strictly matching the backend API.
- **Centralized API Client**: Unified HTTP client with automatic JWT header attachment and standard error normalization.
- **Secure Authentication Storage**: Hardware-backed token storage via `expo-secure-store` on native devices, with an in-memory adapter for non-native/test execution.
- **Theme & Design Tokens**: Centralized color palette, spacing, typography, border radius, and elevation presets.
- **Reusable UI Primitives**: Accessible, performant foundation components (`Screen`, `Text`, `Button`, `Card`, `LoadingView`, `ErrorView`).

---

## 2. Prerequisites

- **Node.js**: `v18+` (recommended: `v22+`)
- **npm**: `v9+`
- **Expo Go** app on your physical mobile device, OR an active Android Emulator / iOS Simulator.
- Running Feedants backend service (default: `http://localhost:5000`).

---

## 3. Installation

From the repository root:

```bash
cd mobile
npm install
```

---

## 4. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Define the backend API base URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

> [!IMPORTANT]
> `EXPO_PUBLIC_*` variables are client-visible in the compiled JavaScript bundle. Never store private API secrets, encryption keys, or credentials in `EXPO_PUBLIC_*` variables.

---

## 5. Local Networking & Device Configuration

Because mobile runtimes handle network hostnames differently, configure `EXPO_PUBLIC_API_URL` based on your target device:

| Target Device | Expected `EXPO_PUBLIC_API_URL` | Explanation |
| :--- | :--- | :--- |
| **iOS Simulator** | `http://localhost:5000` | Shares the host machine network stack directly. |
| **Android Emulator** | `http://10.0.2.2:5000` | `10.0.2.2` maps to the host development machine's `localhost`. |
| **Physical Device** (Expo Go / Dev Build) | `http://<YOUR-LAN-IP>:5000` | E.g. `http://192.168.1.50:5000`. Both computer and phone must be on the same Wi-Fi network. |

> [!NOTE]
> `localhost` will **not** work on an Android Emulator or physical phone, as it resolves to the device itself.

---

## 6. Development Commands

```bash
# Start Expo development server (interactive Metro CLI)
npm start

# Start directly on Android emulator
npm run android

# Start directly on iOS simulator (macOS required)
npm run ios

# Run TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint

# Run unit tests (Vitest)
npm test

# Run Expo dependency and project validation
npx expo-doctor
```

---

## 7. Project Architecture

```
mobile/
├── app/                                 # Expo Router file-based routes
│   ├── _layout.tsx                      # Root stack navigation, safe area & status bar
│   ├── index.tsx                        # Home / competition listing placeholder
│   └── competition/
│       └── [competitionId].tsx          # Competition details placeholder screen
│
├── src/
│   ├── components/
│   │   └── ui/                          # Reusable foundation UI primitives
│   │       ├── Button.tsx               # Accessible button with states & sizes
│   │       ├── Card.tsx                 # Surface container with elevation & border
│   │       ├── ErrorView.tsx            # Standard error state with retry action
│   │       ├── LoadingView.tsx          # Accessible progress indicator
│   │       ├── Screen.tsx               # Safe-area container with scroll support
│   │       ├── Text.tsx                 # Typography with semantic variants
│   │       └── index.ts
│   │
│   ├── features/                        # Domain feature modules
│   │   ├── auth/
│   │   │   ├── auth.api.ts              # Authentication API service (/register, /login, /me)
│   │   │   └── auth.types.ts            # User and auth response contracts
│   │   └── competitions/
│   │       ├── __tests__/
│   │       │   └── competition.api.test.ts # Endpoint path & parameter tests
│   │       ├── competition.api.ts       # Competition API service (getCompetitionDetails)
│   │       └── competition.types.ts     # Domain types mirroring backend models
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── __tests__/
│   │   │   │   └── errors.test.ts       # Error normalization unit tests
│   │   │   ├── client.ts                # Centralized fetch client with JWT injection
│   │   │   ├── errors.ts                # Error normalization & AppApiError class
│   │   │   └── types.ts                 # ApiError, ApiSuccessResponse, ApiErrorResponse
│   │   └── storage/
│   │       ├── __tests__/
│   │       │   └── authStorage.test.ts  # Token persistence unit tests
│   │       └── authStorage.ts           # SecureStore adapter with in-memory fallback
│   │
│   ├── theme/                           # Design tokens
│   │   ├── borderRadius.ts              # Corner radius presets
│   │   ├── colors.ts                    # Brand, neutral, and semantic colors
│   │   ├── index.ts                     # Unified theme export
│   │   ├── shadows.ts                   # Platform-specific elevation & shadows
│   │   ├── spacing.ts                   # 4-point spacing scale
│   │   └── typography.ts                # Font sizes, line heights, weights
│   │
│   └── config/
│       ├── __tests__/
│       │   └── env.test.ts              # Environment URL parsing & error tests
│       └── env.ts                       # Validated environment configuration
│
├── assets/                              # App icons and splash assets
├── .env.example                         # Mobile environment template
├── .gitignore                           # Excludes .env, node_modules, .expo
├── app.json                             # Expo application configuration
├── eslint.config.js                     # ESLint configuration
├── package.json                         # Dependencies and scripts
├── tsconfig.json                        # Strict TypeScript configuration
└── vitest.config.ts                     # Unit test configuration
```

---

## 8. API & Storage Architecture

### API Client
- **Centralized Client** (`src/services/api/client.ts`): All HTTP communication flows through `apiClient`. Components never invoke `fetch()` directly.
- **Automatic Authorization**: On every request, `apiClient` checks `authStorage.getToken()` and attaches `Authorization: Bearer <token>` when a token exists. If no token is stored, the header is omitted.
- **Error Normalization** (`src/services/api/errors.ts`): Network drops, timeouts, 4xx/5xx responses, and validation failures are mapped to an `ApiError` interface (`{ status, code, message, details }`). Stack traces and internal server objects are never exposed to components.

### Secure Token Storage
- **Native Platforms (iOS / Android)**: Tokens are stored in the device's hardware-backed secure storage (iOS Keychain, Android Keystore) via `expo-secure-store`.
- **Testing & Non-Native Environments**: An `InMemoryStorageAdapter` is used during tests and web development. Tokens are never written to unencrypted `localStorage` or `AsyncStorage`.
- **Information Protection**: Auth tokens are never logged to console or exposed directly to UI components.
