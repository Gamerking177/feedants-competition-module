# Feedants Competition Module

Full-stack technical implementation for the **Feedants Competition Details Module**, comprising a hardened Express + TypeScript backend service and an Expo React Native mobile application.

---

## Repository Structure

```
feedants-competition-module/
├── backend/                  # Express.js + TypeScript + MongoDB REST API service
├── mobile/                   # Expo React Native + TypeScript mobile application
└── README.md
```

---

## 1. Backend Service (`backend/`)

The backend service is a hardened, production-ready REST API powering competition data, dynamic lifecycle state computation, participant capacity management, and authenticated user registration/submissions.

### Quick Start
```bash
cd backend
npm install
cp .env.example .env     # Configure MongoDB URI and JWT secrets
npm run dev             # Starts server on http://localhost:5000
npm test                # Run test suite
```

For complete architectural details, security rules, and endpoint specifications, see [`backend/README.md`](./backend/README.md).

---

## 2. Mobile Application (`mobile/`)

The mobile client is built with Expo, React Native, TypeScript, and Expo Router. It establishes the mobile architectural foundation supporting API communication, secure authentication storage, theme tokens, and reusable UI primitives.

### Quick Start
```bash
cd mobile
npm install
cp .env.example .env     # Configure EXPO_PUBLIC_API_URL
npm start               # Starts Expo development server
npm test                # Run unit tests
npm run typecheck       # Typecheck TypeScript
npm run lint            # ESLint validation
```

### Local Networking
- **iOS Simulator**: `EXPO_PUBLIC_API_URL=http://localhost:5000`
- **Android Emulator**: `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`
- **Physical Device**: `EXPO_PUBLIC_API_URL=http://<YOUR-LAN-IP>:5000`

For full mobile architecture, navigation structure, and token storage details, see [`mobile/README.md`](./mobile/README.md).
