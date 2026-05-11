from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ Models ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    session_id: str

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserOut

class ExerciseSet(BaseModel):
    reps: int
    weight: float

class Exercise(BaseModel):
    name: str
    sets: List[ExerciseSet]

class WorkoutCreate(BaseModel):
    name: str
    exercises: List[Exercise]
    duration_minutes: int = 0
    calories_burned: int = 0
    notes: Optional[str] = ""

class Workout(WorkoutCreate):
    workout_id: str
    user_id: str
    date: str
    created_at: datetime

class DailyActivity(BaseModel):
    date: str
    steps: int = 0
    calories_burned: int = 0
    active_minutes: int = 0
    water_ml: int = 0
    distance_km: float = 0.0

class ActivityUpdate(BaseModel):
    steps: Optional[int] = None
    calories_burned: Optional[int] = None
    active_minutes: Optional[int] = None
    water_ml: Optional[int] = None
    distance_km: Optional[float] = None

class MealCreate(BaseModel):
    name: str
    meal_type: str  # breakfast, lunch, dinner, snack
    calories: int
    protein: float = 0.0
    carbs: float = 0.0
    fats: float = 0.0

class Meal(MealCreate):
    meal_id: str
    user_id: str
    date: str
    created_at: datetime

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str


# ============ Auth Helpers ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]

    # Try JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("user_id")
        if user_id:
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                return user
    except jwt.PyJWTError:
        pass

    # Try Emergent session token
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at > datetime.now(timezone.utc):
            user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
            if user:
                return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# ============ Auth Endpoints ============
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: UserRegister):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "picture": None,
        "password_hash": hash_password(req.password),
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    return AuthResponse(
        token=token,
        user=UserOut(user_id=user_id, email=req.email.lower(), name=req.name, picture=None),
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: UserLogin):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(user["user_id"])
    return AuthResponse(
        token=token,
        user=UserOut(user_id=user["user_id"], email=user["email"], name=user["name"], picture=user.get("picture")),
    )


@api_router.post("/auth/google", response_model=AuthResponse)
async def google_auth(req: GoogleAuthRequest):
    """Exchange Emergent session_id for user data, create/find user, return session_token."""
    async with httpx.AsyncClient(timeout=15.0) as hc:
        try:
            resp = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
            )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=401, detail=f"Google auth failed: {e}")
        data = resp.json()

    email = data.get("email", "").lower()
    name = data.get("name", "")
    picture = data.get("picture")
    session_token = data.get("session_token")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "password_hash": None,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })

    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })

    return AuthResponse(
        token=session_token,
        user=UserOut(user_id=user_id, email=email, name=name, picture=picture),
    )


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(user_id=user["user_id"], email=user["email"], name=user["name"], picture=user.get("picture"))


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ============ Workouts ============
@api_router.post("/workouts", response_model=Workout)
async def create_workout(w: WorkoutCreate, user: dict = Depends(get_current_user)):
    workout_id = f"w_{uuid.uuid4().hex[:12]}"
    doc = {
        "workout_id": workout_id,
        "user_id": user["user_id"],
        "name": w.name,
        "exercises": [e.dict() for e in w.exercises],
        "duration_minutes": w.duration_minutes,
        "calories_burned": w.calories_burned,
        "notes": w.notes or "",
        "date": today_str(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.workouts.insert_one(doc.copy())

    # Auto-update daily activity
    if w.calories_burned or w.duration_minutes:
        await db.daily_activity.update_one(
            {"user_id": user["user_id"], "date": today_str()},
            {"$inc": {
                "calories_burned": w.calories_burned,
                "active_minutes": w.duration_minutes,
            }},
            upsert=True,
        )

    return Workout(**doc)


@api_router.get("/workouts", response_model=List[Workout])
async def list_workouts(user: dict = Depends(get_current_user)):
    docs = await db.workouts.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Workout(**d) for d in docs]


@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str, user: dict = Depends(get_current_user)):
    res = await db.workouts.delete_one({"workout_id": workout_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ============ Activity ============
@api_router.get("/activity/today", response_model=DailyActivity)
async def get_today(user: dict = Depends(get_current_user)):
    doc = await db.daily_activity.find_one(
        {"user_id": user["user_id"], "date": today_str()}, {"_id": 0}
    )
    if not doc:
        return DailyActivity(date=today_str())
    return DailyActivity(**{k: v for k, v in doc.items() if k in DailyActivity.model_fields})


@api_router.post("/activity/today", response_model=DailyActivity)
async def update_today(upd: ActivityUpdate, user: dict = Depends(get_current_user)):
    changes = {k: v for k, v in upd.dict().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.daily_activity.update_one(
        {"user_id": user["user_id"], "date": today_str()},
        {"$set": changes, "$setOnInsert": {"user_id": user["user_id"], "date": today_str()}},
        upsert=True,
    )
    doc = await db.daily_activity.find_one(
        {"user_id": user["user_id"], "date": today_str()}, {"_id": 0}
    )
    return DailyActivity(**{k: v for k, v in doc.items() if k in DailyActivity.model_fields})


@api_router.post("/activity/increment")
async def increment_activity(upd: ActivityUpdate, user: dict = Depends(get_current_user)):
    inc = {k: v for k, v in upd.dict().items() if v is not None}
    if not inc:
        raise HTTPException(status_code=400, detail="No fields to increment")
    await db.daily_activity.update_one(
        {"user_id": user["user_id"], "date": today_str()},
        {"$inc": inc, "$setOnInsert": {"user_id": user["user_id"], "date": today_str()}},
        upsert=True,
    )
    doc = await db.daily_activity.find_one(
        {"user_id": user["user_id"], "date": today_str()}, {"_id": 0}
    )
    return DailyActivity(**{k: v for k, v in doc.items() if k in DailyActivity.model_fields})


# ============ Meals / Nutrition ============
@api_router.post("/meals", response_model=Meal)
async def create_meal(m: MealCreate, user: dict = Depends(get_current_user)):
    meal_id = f"m_{uuid.uuid4().hex[:12]}"
    doc = {
        "meal_id": meal_id,
        "user_id": user["user_id"],
        "name": m.name,
        "meal_type": m.meal_type,
        "calories": m.calories,
        "protein": m.protein,
        "carbs": m.carbs,
        "fats": m.fats,
        "date": today_str(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.meals.insert_one(doc.copy())
    return Meal(**doc)


@api_router.get("/meals/today", response_model=List[Meal])
async def list_meals_today(user: dict = Depends(get_current_user)):
    docs = await db.meals.find(
        {"user_id": user["user_id"], "date": today_str()}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return [Meal(**d) for d in docs]


@api_router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str, user: dict = Depends(get_current_user)):
    res = await db.meals.delete_one({"meal_id": meal_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ============ Progress (weekly stats) ============
@api_router.get("/progress/weekly")
async def progress_weekly(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

    activity_docs = await db.daily_activity.find(
        {"user_id": user["user_id"], "date": {"$in": days}}, {"_id": 0}
    ).to_list(100)
    activity_map = {d["date"]: d for d in activity_docs}

    workout_docs = await db.workouts.find(
        {"user_id": user["user_id"], "date": {"$in": days}}, {"_id": 0}
    ).to_list(500)
    workout_count = {}
    for w in workout_docs:
        workout_count[w["date"]] = workout_count.get(w["date"], 0) + 1

    result = []
    for d in days:
        a = activity_map.get(d, {})
        result.append({
            "date": d,
            "steps": a.get("steps", 0),
            "calories_burned": a.get("calories_burned", 0),
            "active_minutes": a.get("active_minutes", 0),
            "workouts": workout_count.get(d, 0),
        })
    return {"days": result}


# ============ AI Coach ============
@api_router.post("/coach/chat", response_model=ChatResponse)
async def coach_chat(req: ChatMessage, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    # Get user context
    activity = await db.daily_activity.find_one(
        {"user_id": user["user_id"], "date": today_str()}, {"_id": 0}
    ) or {}
    workouts_today = await db.workouts.count_documents(
        {"user_id": user["user_id"], "date": today_str()}
    )

    system_msg = (
        f"You are a friendly, knowledgeable AI fitness coach for {user.get('name', 'the user')}. "
        f"Today's stats — Steps: {activity.get('steps', 0)}, "
        f"Calories burned: {activity.get('calories_burned', 0)}, "
        f"Active minutes: {activity.get('active_minutes', 0)}, "
        f"Workouts logged today: {workouts_today}. "
        "Give concise, motivating, evidence-based advice. Keep responses under 120 words. "
        "Suggest specific workouts (sets/reps) when asked. Be encouraging but realistic."
    )

    session_id = f"coach_{user['user_id']}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        reply = await chat.send_message(UserMessage(text=req.message))
    except Exception as e:
        logger.exception("AI coach error")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    # Save chat history
    await db.coach_messages.insert_one({
        "user_id": user["user_id"],
        "user_message": req.message,
        "ai_reply": reply,
        "created_at": datetime.now(timezone.utc),
    })

    return ChatResponse(reply=reply)


@api_router.get("/coach/history")
async def coach_history(user: dict = Depends(get_current_user)):
    docs = await db.coach_messages.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return {"messages": [
        {"user_message": d["user_message"], "ai_reply": d["ai_reply"]} for d in docs
    ]}


@api_router.get("/")
async def root():
    return {"message": "Fitness Tracker API", "status": "ok"}


# Register router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
