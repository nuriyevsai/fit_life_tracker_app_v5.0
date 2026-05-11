# Stride — AI-Powered Fitness Tracker

A full-stack mobile fitness tracker built with **Expo (React Native)**, **FastAPI**, and **MongoDB** — featuring an AI coach that has live context of your daily stats and gives personalised workout and nutrition advice.

---

## Features

- **Dual authentication** — email/password (JWT) and Google sign-in via OAuth
- **Dashboard** — animated step ring with calories, active minutes, water, and distance tiles
- **Workout logger** — log exercises with multiple sets (reps × weight), duration, and calories burned
- **Nutrition tracking** — log meals by type (breakfast / lunch / dinner / snack) with full macro breakdown (protein, carbs, fats) and a daily calorie progress bar
- **Progress charts** — last-7-days bar charts for steps and calories with summary tiles
- **AI Coach** — conversational coach powered by Claude Sonnet 4.5; has live access to today's stats and gives personalised advice
- **Mobile-first UI** — light and minimal design with safe-area handling, keyboard avoidance, and pull-to-refresh

---

## Tech Stack

| Layer     | Technology                                                              |
|-----------|-------------------------------------------------------------------------|
| Frontend  | Expo SDK 54, Expo Router, React Native 0.81, TypeScript, react-native-svg, AsyncStorage |
| Backend   | FastAPI, Motor (async MongoDB driver), Pydantic v2                      |
| Database  | MongoDB                                                                 |
| Auth      | JWT (PyJWT + bcrypt) + Google OAuth                                     |
| AI        | Claude Sonnet 4.5 via the Anthropic API                                 |

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # All FastAPI routes (auth, workouts, activity, meals, progress, coach)
│   ├── requirements.txt
│   └── .env               # MONGO_URL, DB_NAME, JWT_SECRET, ANTHROPIC_API_KEY
└── frontend/
    ├── app/
    │   ├── _layout.tsx    # Root layout + AuthProvider
    │   ├── index.tsx      # Splash redirect (auth check)
    │   ├── login.tsx      # Email/password + Google auth screen
    │   └── (tabs)/
    │       ├── _layout.tsx     # Bottom tab navigator
    │       ├── index.tsx       # Dashboard (step ring + stats)
    │       ├── workouts.tsx
    │       ├── nutrition.tsx
    │       ├── coach.tsx       # AI Coach chat
    │       └── progress.tsx
    ├── src/
    │   └── AuthContext.tsx     # Auth state + apiFetch helper
    └── .env               # EXPO_PUBLIC_BACKEND_URL
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)
- Anthropic API key

### Backend

```bash
cd app/backend
pip install -r requirements.txt
```

Create a `.env` file:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="stride"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="your-api-key"
```

```bash
uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd app/frontend
npm install
npx expo start
```

Create a `.env` file:

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your device, or press `i` / `a` to open in a simulator.

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path                | Body                              | Description                        |
|--------|---------------------|-----------------------------------|------------------------------------|
| POST   | `/auth/register`    | `{ email, password, name }`       | Create account → `{ token, user }` |
| POST   | `/auth/login`       | `{ email, password }`             | Sign in → `{ token, user }`        |
| POST   | `/auth/google`      | `{ session_id }`                  | Google OAuth → `{ token, user }`   |
| GET    | `/auth/me`          | —                                 | Current user                       |
| POST   | `/auth/logout`      | —                                 | Invalidate session                 |

### Workouts

| Method | Path                    | Body                                                                 | Description                                          |
|--------|-------------------------|----------------------------------------------------------------------|------------------------------------------------------|
| GET    | `/workouts`             | —                                                                    | List all workouts for the current user               |
| POST   | `/workouts`             | `{ name, exercises[], duration_minutes, calories_burned, notes? }` | Log a workout; auto-increments daily activity totals |
| DELETE | `/workouts/{id}`        | —                                                                    | Delete a workout                                     |

### Daily Activity

| Method | Path                    | Body                                                                 | Description          |
|--------|-------------------------|----------------------------------------------------------------------|----------------------|
| GET    | `/activity/today`       | —                                                                    | Today's totals       |
| POST   | `/activity/today`       | `{ steps?, calories_burned?, active_minutes?, water_ml?, distance_km? }` | Set fields      |
| POST   | `/activity/increment`   | same shape                                                           | Increment fields     |

### Nutrition

| Method | Path              | Body                                              | Description   |
|--------|-------------------|---------------------------------------------------|---------------|
| GET    | `/meals/today`    | —                                                 | Today's meals |
| POST   | `/meals`          | `{ name, meal_type, calories, protein, carbs, fats }` | Log a meal |
| DELETE | `/meals/{id}`     | —                                                 | Delete a meal |

### Progress

| Method | Path               | Description                                          |
|--------|--------------------|------------------------------------------------------|
| GET    | `/progress/weekly` | Last 7 days: steps, calories, active minutes, workout count |

### AI Coach

| Method | Path              | Body        | Description                              |
|--------|-------------------|-------------|------------------------------------------|
| POST   | `/coach/chat`     | `{ message }` | Send a message; coach has live daily context |
| GET    | `/coach/history`  | —           | Retrieve chat history                    |

---

## Environment Variables

**`/app/backend/.env`**

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="stride"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="your-api-key"
```

**`/app/frontend/.env`**

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

---

## Design Decisions

**Single daily activity document** — the dashboard, workout logger, and activity inputs all read from and write to a single document per user per day. The increment endpoint allows additive updates (e.g. logging a new workout automatically adds to the day's calorie and active-minutes totals) without requiring a separate sync step.

**Context-aware AI Coach** — rather than a generic chatbot, the coach fetches the user's live stats (steps, calories, meals, workouts logged today) before each response. This means advice is grounded in actual data, not generic recommendations.

**Monetisation path** — the core tracker (dashboard, workout logger, nutrition, progress charts) is designed to remain free and drive daily engagement. The AI Coach is intentionally positioned as a premium feature that can be metered behind a subscription (e.g. 10 messages/day free → unlimited with a paid plan) without requiring architectural changes.

**Pure React Native** — no HTML or CSS; all UI is built with React Native components and `StyleSheet`. The step ring is drawn with `react-native-svg`. Every interactive element has a `testID` for automated testing.
