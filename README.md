"# Pulse — AI‑Powered Fitness Tracker

A full‑stack mobile fitness tracker built with **Expo (React Native)** + **FastAPI** + **MongoDB**, featuring an AI coach powered by **Claude Sonnet 4.5**.

Light, minimal, mobile‑first design. Track your workouts, daily activity, nutrition, progress and chat with a coach that knows your stats.

---

## ✨ Features

- 🔐 **Dual authentication** — email/password (JWT) **and** Google sign‑in (Emergent OAuth)
- 🏠 **Dashboard** — animated step ring + calories, active minutes, water, distance tiles
- 🏋️ **Workout logger** — exercises with multiple sets (reps × weight), duration, calories
- 🍎 **Nutrition tracking** — meals by type (breakfast / lunch / dinner / snack) with macros (protein, carbs, fats) and a daily calorie progress bar
- 📊 **Progress** — last‑7‑days bar charts for steps and calories + summary tiles
- 🤖 **AI Coach** — chat with Claude Sonnet 4.5; coach has live context of today's stats and gives personalised workout/nutrition advice
- 📱 Mobile‑first, light & minimal UI with safe‑area handling, keyboard avoidance and pull‑to‑refresh

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Expo SDK 54, Expo Router, React Native 0.81, TypeScript, react-native-svg, AsyncStorage |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2 |
| Database | MongoDB |
| Auth | JWT (PyJWT + bcrypt) + Emergent Google OAuth |
| AI | Claude Sonnet 4.5 via `emergentintegrations` (Emergent LLM key) |

---

## 📂 Project Structure

```
/app
├── backend/
│   ├── server.py           # All FastAPI routes (auth, workouts, activity, meals, progress, coach)
│   ├── requirements.txt
│   └── .env                # MONGO_URL, DB_NAME, JWT_SECRET, EMERGENT_LLM_KEY
└── frontend/
    ├── app/
    │   ├── _layout.tsx     # Root layout + AuthProvider
    │   ├── index.tsx       # Splash redirect (auth or app)
    │   ├── login.tsx       # Email/password + Google auth screen
    │   └── (tabs)/
    │       ├── _layout.tsx # Bottom tab navigator
    │       ├── index.tsx   # Dashboard (step ring + stats)
    │       ├── workouts.tsx
    │       ├── nutrition.tsx
    │       ├── coach.tsx   # AI Coach chat
    │       └── progress.tsx
    ├── src/
    │   └── AuthContext.tsx # Auth state + apiFetch helper
    └── .env                # EXPO_PUBLIC_BACKEND_URL, packager config
```

---

## 🚀 Running the App

The app is already running in this Emergent workspace via Supervisor.

**Services**
- Backend → `http://localhost:8001`  (proxied at `/api/*`)
- Frontend (Expo Metro) → `http://localhost:3000`
- MongoDB → `mongodb://localhost:27017`

**To preview**
1. Open the **App Preview** panel in Emergent (top‑right).
2. Or scan the QR code with **Expo Go** on your phone.

**Manage services**
```bash
sudo supervisorctl status
sudo supervisorctl restart expo
sudo supervisorctl restart backend
```

---

## 🔌 Backend API Reference

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name }` | Create account → returns `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | Sign in → returns `{ token, user }` |
| POST | `/auth/google` | `{ session_id }` | Exchange Emergent session_id → `{ token, user }` |
| GET  | `/auth/me` | — | Current user |
| POST | `/auth/logout` | — | Invalidate Emergent session |

### Workouts
| Method | Path | Body | Description |
|---|---|---|---|
| GET    | `/workouts` | — | List all user workouts |
| POST   | `/workouts` | `{ name, exercises[], duration_minutes, calories_burned, notes? }` | Create workout (auto‑increments today's calories + active minutes) |
| DELETE | `/workouts/{workout_id}` | — | Delete workout |

### Daily Activity
| Method | Path | Body | Description |
|---|---|---|---|
| GET  | `/activity/today` | — | Today's activity totals |
| POST | `/activity/today` | `{ steps?, calories_burned?, active_minutes?, water_ml?, distance_km? }` | Set fields |
| POST | `/activity/increment` | same shape | Increment fields |

### Nutrition
| Method | Path | Body | Description |
|---|---|---|---|
| GET    | `/meals/today` | — | Today's meals |
| POST   | `/meals` | `{ name, meal_type, calories, protein, carbs, fats }` | Log a meal |
| DELETE | `/meals/{meal_id}` | — | Delete meal |

### Progress
| Method | Path | Description |
|---|---|---|
| GET | `/progress/weekly` | Last 7 days: steps, calories, active minutes, workout count |

### AI Coach
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/coach/chat` | `{ message }` | Send a message to Claude (context‑aware) |
| GET  | `/coach/history` | — | Chat history |

---

## 🔐 Environment Variables

**`/app/backend/.env`**
```
MONGO_URL=\"mongodb://localhost:27017\"
DB_NAME=\"test_database\"
JWT_SECRET=\"<secret>\"
EMERGENT_LLM_KEY=\"<universal key>\"
```

**`/app/frontend/.env`** *(do not modify packager vars)*
```
EXPO_PUBLIC_BACKEND_URL=https://<preview>.preview.emergentagent.com
EXPO_PACKAGER_HOSTNAME=...
EXPO_PACKAGER_PROXY_URL=...
```

---

## 🧪 Quick API Smoke Test

```bash
# Register
curl -X POST $URL/api/auth/register \
  -H \"Content-Type: application/json\" \
  -d '{\"email\":\"a@b.com\",\"password\":\"pass1234\",\"name\":\"Alex\"}'

# Use returned token
TOKEN=\"...\"

# Log steps
curl -X POST $URL/api/activity/increment \
  -H \"Authorization: Bearer $TOKEN\" \
  -H \"Content-Type: application/json\" \
  -d '{\"steps\":2500}'

# Ask the coach
curl -X POST $URL/api/coach/chat \
  -H \"Authorization: Bearer $TOKEN\" \
  -H \"Content-Type: application/json\" \
  -d '{\"message\":\"Suggest a quick chest workout\"}'
```

---

## 🗺️ User Flow

1. Open the app → **Login** screen
2. Sign up with email/password (or tap **Continue with Google**)
3. Land on the **Home** dashboard → tap **\"+1,000 steps\"** or **\"Log manually\"** to fill in steps, water
4. **Workouts** tab → tap **+** → build a workout (name + exercises with sets) → Save
5. **Nutrition** tab → tap **+** → log a meal with calories & macros
6. **Coach** tab → tap a suggestion or type a question; Claude answers using your stats
7. **Progress** tab → see your weekly bars

---

## 🧠 Design Notes

- **Theme**: Light & minimal (`zinc` palette, accents per metric: emerald, rose, blue, cyan, purple)
- **Card‑less dashboards** with soft tinted blocks (`bg-zinc-50`) and rounded‑2xl/full radii
- **Step ring** drawn with `react-native-svg`
- **No HTML / CSS** — pure React Native components + `StyleSheet`
- Every interactive element has a `testID` for automated testing

---

## 💸 Monetisation Hook (built‑in idea)

The AI Coach is positioned as a premium hook — usage can later be metered behind a \"Pulse Pro\" subscription (e.g., free 10 messages/day → unlimited with Stripe). The dashboard, logger and progress charts remain free, driving daily engagement.

---

## 📜 License

Built on Emergent. Personal / commercial use as per Emergent's terms.
"
