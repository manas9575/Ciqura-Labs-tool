from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Query, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import requests as http_requests
from io import BytesIO, StringIO
import csv
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from backend.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from backend.storage import init_storage, put_object, get_object, APP_NAME
from backend.email_service import send_email, send_fee_reminder, send_assignment_notification, send_announcement

# ✅ SAFE ENV HANDLING
mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME")

print("ENV CHECK:", mongo_url, db_name)

if not mongo_url:
    raise Exception("❌ MONGO_URL is not set")
if not db_name:
    raise Exception("❌ DB_NAME is not set")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ✅ FastAPI app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ✅ Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── ID Generators ───
async def generate_display_id(prefix: str, collection_name: str) -> str:
    count = await db[collection_name].count_documents({}) + 1
    return f"CL-{prefix}-{count:03d}"

def make_course_code(name: str, duration: str) -> str:
    skip = {'and', 'the', 'of', 'in', 'for', 'a', 'an', 'or', 'certified', 'program', 'course', 'professional', '&'}
    words = [w for w in name.split() if w.lower() not in skip and len(w) > 1]
    if len(words) >= 2:
        return (words[0][0] + words[1][0:2]).upper()[:3]
    elif len(words) == 1:
        return words[0][:3].upper()
    return name[:3].upper()

async def gen_course_id(name: str, duration: str) -> str:
    code = make_course_code(name, duration)
    dur = ''.join(filter(str.isdigit, duration)) or '00'
    count = await db.courses.count_documents({}) + 1
    return f"CL-{code}-{dur}"

async def gen_batch_id(course_name: str) -> str:
    code = make_course_code(course_name, "")
    count = await db.batches.count_documents({}) + 1
    return f"CL-{code}-B{count:02d}"

async def gen_student_id() -> str:
    count = await db.users.count_documents({"role": "student"}) + 1
    return f"CL-STD-{count:03d}"

async def gen_faculty_id() -> str:
    count = await db.users.count_documents({"role": "faculty"}) + 1
    return f"CL-FAC-{count:03d}"

def gen_receipt_id() -> str:
    return f"CL-RCP-{uuid.uuid4().hex[:6].upper()}"

# ─── Request Models ───
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleCallbackRequest(BaseModel):
    session_id: str

class CourseCreate(BaseModel):
    name: str
    description: str
    duration: str
    fee_structure: float
    cover_image: Optional[str] = ""

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    fee_structure: Optional[float] = None
    cover_image: Optional[str] = None

class BatchCreate(BaseModel):
    course_id: str
    name: str
    start_date: str
    end_date: str
    faculty_id: str
    schedule: str

class EnrollmentCreate(BaseModel):
    student_id: str
    course_id: str
    batch_id: str

class AttendanceCreate(BaseModel):
    batch_id: str
    records: List[dict]  # [{student_id, status}]
    date: str

class AssignmentCreate(BaseModel):
    batch_id: str
    title: str
    description: str
    due_date: str
    assigned_students: Optional[List[str]] = None

class SubmissionGrade(BaseModel):
    grade: str
    feedback: str

class CommentCreate(BaseModel):
    entity_type: str  # "batch" or "assignment"
    entity_id: str
    text: str

class FeeCreate(BaseModel):
    student_id: str
    course_id: str
    amount: float
    due_date: str
    category: str = "Tuition"
    installments: int = 1

class PaymentCreate(BaseModel):
    fee_id: str
    amount: float
    payment_mode: str

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    title: str
    message: str
    type: str = "announcement"

class SettingsUpdate(BaseModel):
    institute_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    theme: Optional[str] = None

class RoleUpdate(BaseModel):
    role: str  # Can be comma-separated for dual roles e.g. "admin,faculty"

class EmailSend(BaseModel):
    to: str
    subject: str
    message: str

class HolidayCreate(BaseModel):
    date: str
    name: str
    description: Optional[str] = ""

class CourseResourceCreate(BaseModel):
    course_id: str
    title: str
    url: str
    type: str = "link"

class UserProfileUpdate(BaseModel):
    picture: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    bio: Optional[str] = None
    availability: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    blood_group: Optional[str] = None
    qualification: Optional[str] = None

class LeaveCreate(BaseModel):
    date: str
    reason: Optional[str] = ""

class LeaveStatusUpdate(BaseModel):
    status: str  # approved, rejected

# ─── Auth Helper ───
async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=7200, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

def user_has_role(user: dict, *roles) -> bool:
    user_roles = [r.strip() for r in user.get("role", "").split(",")]
    return any(r in user_roles for r in roles)
# ─── Auth Endpoints ───
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing and existing.get("password_hash"):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "password_hash": hash_password(req.password),
                "name": req.name
            }}
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        scount = await db.users.count_documents({"role": "student"}) + 1
        display_id = f"CL-STD-{scount:03d}"

        user = {
            "user_id": user_id,
            "display_id": display_id,
            "email": email,
            "name": req.name,
            "password_hash": hash_password(req.password),
            "picture": None,
            "role": "student",
            "phone": "",
            "address": "",
            "dob": "",
            "guardian_name": "",
            "guardian_phone": "",
            "blood_group": "",
            "qualification": "",
            "skills": [],
            "interests": [],
            "bio": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.users.insert_one(user)

    user.pop("password_hash", None)
    user.pop("_id", None)

    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])

    set_auth_cookies(response, access, refresh)

    return user
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()

    user = await db.users.find_one({"email": email}, {"_id": 0})

    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.pop("password_hash", None)

    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])

    set_auth_cookies(response, access, refresh)

    return user
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google-callback")
async def google_callback(req: GoogleCallbackRequest, response: Response):
    try:
        resp = http_requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()

        email = data["email"].lower()

        user = await db.users.find_one({"email": email}, {"_id": 0})

        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            scount = await db.users.count_documents({"role": "student"}) + 1
            display_id = f"CL-STD-{scount:03d}"

            user = {
                "user_id": user_id,
                "display_id": display_id,
                "email": email,
                "name": data["name"],
                "picture": data.get("picture"),
                "role": "student",
                "phone": "",
                "address": "",
                "dob": "",
                "guardian_name": "",
                "guardian_phone": "",
                "blood_group": "",
                "qualification": "",
                "skills": [],
                "interests": [],
                "bio": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            await db.users.insert_one(user)
        else:
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "picture": data.get("picture"),
                    "name": data["name"]
                }}
            )
            user = await db.users.find_one({"email": email}, {"_id": 0})

        user.pop("password_hash", None)
        user.pop("_id", None)

        access = create_access_token(user["user_id"], email)
        refresh = create_refresh_token(user["user_id"])

        set_auth_cookies(response, access, refresh)

        return user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google auth failed: {str(e)}")
@api_router.post("/auth/microsoft-callback")
async def microsoft_callback():
    raise HTTPException(status_code=501, detail="Microsoft auth coming soon. Configure Azure AD credentials to enable.")

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out"}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["user_id"], user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=True, samesite="none", max_age=7200, path="/")
        user.pop("password_hash", None)
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── User Management ───
@api_router.get("/users")
async def list_users(request: Request, role: Optional[str] = None):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, req: RoleUpdate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if req.role == "super_admin" and not user_has_role(user, "super_admin"):
        raise HTTPException(status_code=403, detail="Only super_admin can assign super_admin role")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": req.role}})
    return {"message": "Role updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.users.delete_one({"user_id": user_id})
    return {"message": "User deleted"}

# ─── Courses ───
@api_router.post("/courses")
async def create_course(req: CourseCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    code = make_course_code(req.name, req.duration)
    dur_match = re.search(r'(\d+)', req.duration or '')
    dur = dur_match.group(1).zfill(2) if dur_match else '00'
    display_id = f"CL-{code}-{dur}"
    course = {
        "course_id": course_id, "display_id": display_id,
        "name": req.name, "description": req.description,
        "duration": req.duration, "fee_structure": req.fee_structure,
        "cover_image": req.cover_image or "", "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    course.pop("_id", None)
    return course

@api_router.get("/courses")
async def list_courses(request: Request):
    user = await get_current_user(request)
    if user_has_role(user, "student"):
        enrollments = await db.enrollments.find({"student_id": user["user_id"]}, {"_id": 0, "course_id": 1}).to_list(1000)
        course_ids = [e["course_id"] for e in enrollments]
        courses = await db.courses.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
        for c in courses:
            c.pop("fee_structure", None)
    elif user_has_role(user, "faculty"):
        my_batches = await db.batches.find({"faculty_id": user["user_id"]}, {"_id": 0, "course_id": 1}).to_list(100)
        course_ids = list(set(b["course_id"] for b in my_batches))
        courses = await db.courses.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
    else:
        courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, request: Request):
    await get_current_user(request)
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, req: CourseUpdate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.courses.update_one({"course_id": course_id}, {"$set": updates})
    return {"message": "Course updated"}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.courses.delete_one({"course_id": course_id})
    return {"message": "Course deleted"}

# ─── Batches ───
@api_router.post("/batches")
async def create_batch(req: BatchCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    course = await db.courses.find_one({"course_id": req.course_id}, {"_id": 0, "name": 1})
    code = make_course_code(course["name"], "") if course else "GEN"
    bcount = await db.batches.count_documents({"course_id": req.course_id}) + 1
    display_id = f"CL-{code}-B{bcount:02d}"
    batch = {
        "batch_id": batch_id, "display_id": display_id,
        "course_id": req.course_id, "name": req.name,
        "start_date": req.start_date, "end_date": req.end_date,
        "faculty_id": req.faculty_id, "schedule": req.schedule,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.batches.insert_one(batch)
    batch.pop("_id", None)
    return batch

@api_router.get("/batches")
async def list_batches(request: Request, course_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if course_id:
        query["course_id"] = course_id
    if user_has_role(user, "faculty"):
        query["faculty_id"] = user["user_id"]
    elif user_has_role(user, "student"):
        enrollments = await db.enrollments.find({"student_id": user["user_id"]}, {"_id": 0, "batch_id": 1}).to_list(100)
        query["batch_id"] = {"$in": [e["batch_id"] for e in enrollments]}
    batches = await db.batches.find(query, {"_id": 0}).to_list(1000)
    for b in batches:
        course = await db.courses.find_one({"course_id": b["course_id"]}, {"_id": 0, "name": 1})
        b["course_name"] = course["name"] if course else "Unknown"
        faculty = await db.users.find_one({"user_id": b["faculty_id"]}, {"_id": 0, "name": 1})
        b["faculty_name"] = faculty["name"] if faculty else "Unknown"
        enrollment_count = await db.enrollments.count_documents({"batch_id": b["batch_id"]})
        b["student_count"] = enrollment_count
    return batches

@api_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.batches.delete_one({"batch_id": batch_id})
    return {"message": "Batch deleted"}

# ─── Enrollments ───
@api_router.post("/enrollments")
async def create_enrollment(req: EnrollmentCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = await db.enrollments.find_one({"student_id": req.student_id, "batch_id": req.batch_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Student already enrolled in this batch")
    enrollment_id = f"enrollment_{uuid.uuid4().hex[:12]}"
    enrollment = {
        "enrollment_id": enrollment_id, "student_id": req.student_id,
        "course_id": req.course_id, "batch_id": req.batch_id,
        "enrollment_date": datetime.now(timezone.utc).isoformat(), "status": "active"
    }
    await db.enrollments.insert_one(enrollment)
    enrollment.pop("_id", None)
    return enrollment

@api_router.get("/enrollments")
async def list_enrollments(request: Request, student_id: Optional[str] = None, course_id: Optional[str] = None, batch_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if student_id:
        query["student_id"] = student_id
    if course_id:
        query["course_id"] = course_id
    if batch_id:
        query["batch_id"] = batch_id
    if user_has_role(user, "student"):
        query["student_id"] = user["user_id"]
    enrollments = await db.enrollments.find(query, {"_id": 0}).to_list(1000)
    for e in enrollments:
        student = await db.users.find_one({"user_id": e["student_id"]}, {"_id": 0, "name": 1, "email": 1})
        e["student_name"] = student["name"] if student else "Unknown"
        e["student_email"] = student["email"] if student else ""
        course = await db.courses.find_one({"course_id": e["course_id"]}, {"_id": 0, "name": 1})
        e["course_name"] = course["name"] if course else "Unknown"
        batch = await db.batches.find_one({"batch_id": e["batch_id"]}, {"_id": 0, "name": 1})
        e["batch_name"] = batch["name"] if batch else "Unknown"
    return enrollments

@api_router.delete("/enrollments/{enrollment_id}")
async def delete_enrollment(enrollment_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.enrollments.delete_one({"enrollment_id": enrollment_id})
    return {"message": "Enrollment deleted"}

# ─── Attendance ───
@api_router.post("/attendance")
async def mark_attendance(req: AttendanceCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    results = []
    for record in req.records:
        existing = await db.attendance.find_one({
            "batch_id": req.batch_id, "student_id": record["student_id"], "date": req.date
        }, {"_id": 0})
        if existing:
            await db.attendance.update_one(
                {"attendance_id": existing["attendance_id"]},
                {"$set": {"status": record["status"], "marked_by": user["user_id"], "marked_at": datetime.now(timezone.utc).isoformat()}}
            )
            results.append(existing["attendance_id"])
        else:
            att_id = f"att_{uuid.uuid4().hex[:12]}"
            att = {
                "attendance_id": att_id, "batch_id": req.batch_id,
                "student_id": record["student_id"], "date": req.date,
                "status": record["status"], "marked_by": user["user_id"],
                "marked_at": datetime.now(timezone.utc).isoformat()
            }
            await db.attendance.insert_one(att)
            results.append(att_id)
    return {"message": f"Attendance marked for {len(results)} students", "ids": results}

@api_router.get("/attendance")
async def list_attendance(request: Request, batch_id: Optional[str] = None, student_id: Optional[str] = None, date: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if batch_id:
        query["batch_id"] = batch_id
    if student_id:
        query["student_id"] = student_id
    if date:
        query["date"] = date
    if user_has_role(user, "student"):
        query["student_id"] = user["user_id"]
    records = await db.attendance.find(query, {"_id": 0}).to_list(5000)
    for r in records:
        student = await db.users.find_one({"user_id": r["student_id"]}, {"_id": 0, "name": 1})
        r["student_name"] = student["name"] if student else "Unknown"
    return records

# ─── Assignments ───
@api_router.post("/assignments")
async def create_assignment(req: AssignmentCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    assignment_id = f"assgn_{uuid.uuid4().hex[:12]}"
    assignment = {
        "assignment_id": assignment_id, "batch_id": req.batch_id,
        "title": req.title, "description": req.description,
        "due_date": req.due_date, "created_by": user["user_id"],
        "assigned_students": req.assigned_students or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.assignments.insert_one(assignment)
    assignment.pop("_id", None)
    return assignment

@api_router.get("/assignments")
async def list_assignments(request: Request, batch_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if batch_id:
        query["batch_id"] = batch_id
    if user_has_role(user, "student"):
        enrollments = await db.enrollments.find({"student_id": user["user_id"]}, {"_id": 0, "batch_id": 1}).to_list(1000)
        batch_ids = [e["batch_id"] for e in enrollments]
        query["batch_id"] = {"$in": batch_ids}
    elif user_has_role(user, "faculty"):
        batches = await db.batches.find({"faculty_id": user["user_id"]}, {"_id": 0, "batch_id": 1}).to_list(1000)
        batch_ids = [b["batch_id"] for b in batches]
        if not batch_id:
            query["batch_id"] = {"$in": batch_ids}
    assignments = await db.assignments.find(query, {"_id": 0}).to_list(1000)
    filtered = []
    for a in assignments:
        if user_has_role(user, "student") and a.get("assigned_students") and user["user_id"] not in a["assigned_students"]:
            continue
        batch = await db.batches.find_one({"batch_id": a["batch_id"]}, {"_id": 0, "name": 1, "course_id": 1})
        a["batch_name"] = batch["name"] if batch else "Unknown"
        if batch:
            course = await db.courses.find_one({"course_id": batch["course_id"]}, {"_id": 0, "name": 1})
            a["course_name"] = course["name"] if course else "Unknown"
        else:
            a["course_name"] = "Unknown"
        sub_count = await db.submissions.count_documents({"assignment_id": a["assignment_id"]})
        a["submission_count"] = sub_count
        if user_has_role(user, "student"):
            sub = await db.submissions.find_one({"assignment_id": a["assignment_id"], "student_id": user["user_id"]}, {"_id": 0})
            a["my_submission"] = sub
        filtered.append(a)
    return filtered

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.assignments.delete_one({"assignment_id": assignment_id})
    return {"message": "Assignment deleted"}

# ─── Submissions ───
@api_router.post("/submissions")
async def create_submission(request: Request, assignment_id: str = Query(...), file: UploadFile = File(None)):
    user = await get_current_user(request)
    file_path = None
    if file:
        ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        path = f"{APP_NAME}/submissions/{user['user_id']}/{uuid.uuid4()}.{ext}"
        data = await file.read()
        result = put_object(path, data, file.content_type or "application/octet-stream")
        file_path = result["path"]
    
    sub_id = f"sub_{uuid.uuid4().hex[:12]}"
    submission = {
        "submission_id": sub_id, "assignment_id": assignment_id,
        "student_id": user["user_id"], "file_path": file_path,
        "original_filename": file.filename if file else None,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "grade": None, "feedback": None
    }
    await db.submissions.insert_one(submission)
    submission.pop("_id", None)
    return submission

@api_router.get("/submissions")
async def list_submissions(request: Request, assignment_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if assignment_id:
        query["assignment_id"] = assignment_id
    if user_has_role(user, "student"):
        query["student_id"] = user["user_id"]
    submissions = await db.submissions.find(query, {"_id": 0}).to_list(1000)
    for s in submissions:
        student = await db.users.find_one({"user_id": s["student_id"]}, {"_id": 0, "name": 1, "email": 1})
        s["student_name"] = student["name"] if student else "Unknown"
    return submissions

@api_router.put("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, req: SubmissionGrade, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"grade": req.grade, "feedback": req.feedback}}
    )
    return {"message": "Submission graded"}

# ─── Fees ───
@api_router.post("/fees")
async def create_fee(req: FeeCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if req.installments > 1:
        installment_amount = round(req.amount / req.installments, 2)
        fees_created = []
        for i in range(req.installments):
            fee_id = f"fee_{uuid.uuid4().hex[:12]}"
            due = datetime.fromisoformat(req.due_date) + timedelta(days=30 * i)
            fee = {
                "fee_id": fee_id, "student_id": req.student_id, "course_id": req.course_id,
                "amount": installment_amount, "due_date": due.strftime("%Y-%m-%d"),
                "status": "pending", "category": req.category,
                "installment": i + 1, "total_installments": req.installments,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.fees.insert_one(fee)
            fee.pop("_id", None)
            fees_created.append(fee)
        return fees_created
    else:
        fee_id = f"fee_{uuid.uuid4().hex[:12]}"
        fee = {
            "fee_id": fee_id, "student_id": req.student_id, "course_id": req.course_id,
            "amount": req.amount, "due_date": req.due_date, "status": "pending",
            "category": req.category, "installment": 1, "total_installments": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.fees.insert_one(fee)
        fee.pop("_id", None)
        return fee

@api_router.get("/fees")
async def list_fees(request: Request, student_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if student_id:
        query["student_id"] = student_id
    elif user_has_role(user, "student"):
        query["student_id"] = user["user_id"]
    fees = await db.fees.find(query, {"_id": 0}).to_list(1000)
    for f in fees:
        student = await db.users.find_one({"user_id": f["student_id"]}, {"_id": 0, "name": 1, "email": 1})
        f["student_name"] = student["name"] if student else "Unknown"
        course = await db.courses.find_one({"course_id": f["course_id"]}, {"_id": 0, "name": 1})
        f["course_name"] = course["name"] if course else "Unknown"
        payments = await db.payments.find({"fee_id": f["fee_id"]}, {"_id": 0}).to_list(1000)
        f["total_paid"] = sum(p["amount"] for p in payments)
        f["balance"] = f["amount"] - f["total_paid"]
    return fees

# ─── Payments ───
@api_router.post("/payments")
async def create_payment(req: PaymentCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    fee = await db.fees.find_one({"fee_id": req.fee_id}, {"_id": 0})
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    receipt_number = gen_receipt_id()
    payment = {
        "payment_id": payment_id, "fee_id": req.fee_id,
        "student_id": fee["student_id"], "amount": req.amount,
        "payment_date": datetime.now(timezone.utc).isoformat(),
        "payment_mode": req.payment_mode, "receipt_number": receipt_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment)
    payment.pop("_id", None)
    
    all_payments = await db.payments.find({"fee_id": req.fee_id}, {"_id": 0}).to_list(1000)
    total_paid = sum(p["amount"] for p in all_payments)
    new_status = "paid" if total_paid >= fee["amount"] else "partial"
    await db.fees.update_one({"fee_id": req.fee_id}, {"$set": {"status": new_status}})
    return payment

@api_router.get("/payments")
async def list_payments(request: Request, student_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if student_id:
        query["student_id"] = student_id
    elif user_has_role(user, "student"):
        query["student_id"] = user["user_id"]
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    for p in payments:
        student = await db.users.find_one({"user_id": p["student_id"]}, {"_id": 0, "name": 1})
        p["student_name"] = student["name"] if student else "Unknown"
    return payments

@api_router.get("/payments/{payment_id}/receipt")
async def generate_receipt(payment_id: str, request: Request):
    user = await get_current_user(request)
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if user_has_role(user, "student") and payment["student_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student = await db.users.find_one({"user_id": payment["student_id"]}, {"_id": 0})
    fee = await db.fees.find_one({"fee_id": payment["fee_id"]}, {"_id": 0})
    course = await db.courses.find_one({"course_id": fee["course_id"]}, {"_id": 0})
    settings = await db.institute_settings.find_one({}, {"_id": 0}) or {"institute_name": "Ciqura Labs"}
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 22)
    c.drawString(1*inch, height - 1*inch, settings["institute_name"])
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 1.3*inch, "Fee Payment Receipt")
    c.line(1*inch, height - 1.4*inch, width - 1*inch, height - 1.4*inch)
    
    y = height - 1.8*inch
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y, f"Receipt #: {payment['receipt_number']}")
    c.drawString(4*inch, y, f"Date: {payment['payment_date'][:10]}")
    
    y -= 0.5*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y, "Student Information")
    y -= 0.25*inch
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y, f"Name: {student['name']}")
    y -= 0.2*inch
    c.drawString(1*inch, y, f"Student ID: {student.get('display_id', '')}")
    y -= 0.2*inch
    c.drawString(1*inch, y, f"Email: {student['email']}")
    
    y -= 0.4*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y, "Course Information")
    y -= 0.25*inch
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y, f"Course: {course['name']}  ({course.get('display_id', '')})")
    c.drawString(4*inch, y, f"Duration: {course['duration']}")
    
    y -= 0.4*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y, "Payment Details")
    y -= 0.25*inch
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y, f"Amount Paid: Rs.{payment['amount']:.2f}")
    c.drawString(4*inch, y, f"Mode: {payment['payment_mode']}")
    y -= 0.2*inch
    c.drawString(1*inch, y, f"Total Course Fee: Rs.{fee['amount']:.2f}")
    
    all_pmts = await db.payments.find({"fee_id": fee["fee_id"]}, {"_id": 0}).to_list(1000)
    total_paid = sum(pm["amount"] for pm in all_pmts)
    y -= 0.2*inch
    c.drawString(1*inch, y, f"Total Paid: Rs.{total_paid:.2f}")
    c.drawString(4*inch, y, f"Balance: Rs.{fee['amount'] - total_paid:.2f}")
    
    y -= 0.4*inch
    c.line(1*inch, y, width - 1*inch, y)
    y -= 0.3*inch
    c.setFont("Helvetica", 8)
    c.drawString(1*inch, y, "This is a computer-generated receipt and does not require a signature.")
    
    c.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=receipt_{payment['receipt_number']}.pdf"
    })

# ─── Files ───
@api_router.post("/files/upload")
async def upload_file(request: Request, file: UploadFile = File(...), course_id: str = Query(None), batch_id: str = Query(None), file_type: str = Query("course_material")):
    user = await get_current_user(request)
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/files/{user['user_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    file_doc = {
        "file_id": file_id, "storage_path": result["path"],
        "original_filename": file.filename, "content_type": file.content_type,
        "size": result["size"], "uploaded_by": user["user_id"],
        "course_id": course_id, "batch_id": batch_id,
        "type": file_type, "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    file_doc.pop("_id", None)
    return file_doc

@api_router.get("/files")
async def list_files(request: Request, course_id: Optional[str] = None, batch_id: Optional[str] = None):
    await get_current_user(request)
    query = {"is_deleted": False}
    if course_id:
        query["course_id"] = course_id
    if batch_id:
        query["batch_id"] = batch_id
    files = await db.files.find(query, {"_id": 0}).to_list(1000)
    for f in files:
        uploader = await db.users.find_one({"user_id": f["uploaded_by"]}, {"_id": 0, "name": 1})
        f["uploader_name"] = uploader["name"] if uploader else "Unknown"
    return files

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str, request: Request):
    await get_current_user(request)
    record = await db.files.find_one({"file_id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type), headers={
        "Content-Disposition": f"attachment; filename={record['original_filename']}"
    })

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.files.update_one({"file_id": file_id}, {"$set": {"is_deleted": True}})
    return {"message": "File deleted"}

# ─── Notifications ───
@api_router.post("/notifications")
async def create_notification(req: NotificationCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if req.user_id:
        targets = [req.user_id]
    else:
        all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
        targets = [u["user_id"] for u in all_users]
    
    for target in targets:
        notif_id = f"notif_{uuid.uuid4().hex[:12]}"
        notif = {
            "notification_id": notif_id, "user_id": target,
            "title": req.title, "message": req.message,
            "type": req.type, "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notif)
    return {"message": f"Notification sent to {len(targets)} users"}

@api_router.get("/notifications")
async def list_notifications(request: Request):
    user = await get_current_user(request)
    notifs = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifs

@api_router.put("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, request: Request):
    user = await get_current_user(request)
    await db.notifications.update_one({"notification_id": notification_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(request: Request):
    user = await get_current_user(request)
    await db.notifications.update_many({"user_id": user["user_id"], "read": False}, {"$set": {"read": True}})
    return {"message": "All marked as read"}

# ─── Settings ───
@api_router.get("/settings")
async def get_settings(request: Request):
    await get_current_user(request)
    settings = await db.institute_settings.find_one({}, {"_id": 0})
    if not settings:
        sid = f"setting_{uuid.uuid4().hex[:12]}"
        settings = {
            "setting_id": sid, "institute_name": "Ciqura Labs",
            "logo_url": "", "primary_color": "#002FA7", "theme": "light",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.institute_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings

@api_router.put("/settings")
async def update_settings(req: SettingsUpdate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can update settings")
    updates = {}
    for k, v in req.model_dump().items():
        if v is not None and v != "":
            updates[k] = v
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings = await db.institute_settings.find_one({}, {"_id": 0})
    if settings:
        await db.institute_settings.update_one({"setting_id": settings["setting_id"]}, {"$set": updates})
    else:
        sid = f"setting_{uuid.uuid4().hex[:12]}"
        new_settings = {
            "setting_id": sid,
            "institute_name": req.institute_name or "Ciqura Labs",
            "logo_url": req.logo_url or "",
            "primary_color": req.primary_color or "#002FA7",
            "theme": req.theme or "light",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.institute_settings.insert_one(new_settings)
    updated = await db.institute_settings.find_one({}, {"_id": 0})
    return updated

# ─── Dashboard Stats ───
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    stats = {}
    
    if user["role"] in ["super_admin", "admin"]:
        stats["total_students"] = await db.users.count_documents({"role": "student"})
        stats["total_faculty"] = await db.users.count_documents({"role": "faculty"})
        stats["total_courses"] = await db.courses.count_documents({})
        stats["total_batches"] = await db.batches.count_documents({})
        stats["total_enrollments"] = await db.enrollments.count_documents({})
        stats["pending_fees"] = await db.fees.count_documents({"status": {"$in": ["pending", "partial"]}})
        fees = await db.fees.find({}, {"_id": 0}).to_list(10000)
        stats["total_revenue"] = 0
        for f in fees:
            pmts = await db.payments.find({"fee_id": f["fee_id"]}, {"_id": 0}).to_list(100)
            stats["total_revenue"] += sum(p["amount"] for p in pmts)
        stats["total_assignments"] = await db.assignments.count_documents({})
    
    elif user_has_role(user, "faculty"):
        my_batches = await db.batches.find({"faculty_id": user["user_id"]}, {"_id": 0}).to_list(100)
        batch_ids = [b["batch_id"] for b in my_batches]
        stats["total_batches"] = len(my_batches)
        stats["total_students"] = await db.enrollments.count_documents({"batch_id": {"$in": batch_ids}})
        stats["total_assignments"] = await db.assignments.count_documents({"batch_id": {"$in": batch_ids}})
        stats["pending_submissions"] = await db.submissions.count_documents({"grade": None})
    
    elif user_has_role(user, "student"):
        enrollments = await db.enrollments.find({"student_id": user["user_id"]}, {"_id": 0}).to_list(100)
        batch_ids = [e["batch_id"] for e in enrollments]
        stats["total_courses"] = len(enrollments)
        stats["total_assignments"] = await db.assignments.count_documents({"batch_id": {"$in": batch_ids}})
        my_subs = await db.submissions.count_documents({"student_id": user["user_id"]})
        stats["completed_assignments"] = my_subs
        stats["pending_assignments"] = stats["total_assignments"] - my_subs
        stats["pending_fees"] = await db.fees.count_documents({"student_id": user["user_id"], "status": {"$in": ["pending", "partial"]}})
        att_total = await db.attendance.count_documents({"student_id": user["user_id"]})
        att_present = await db.attendance.count_documents({"student_id": user["user_id"], "status": "present"})
        stats["attendance_percentage"] = round((att_present / att_total * 100) if att_total > 0 else 0, 1)
    
    return stats

# ─── Analytics ───
@api_router.get("/analytics/revenue")
async def revenue_analytics(request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    monthly = {}
    for p in payments:
        month = p["payment_date"][:7]
        monthly[month] = monthly.get(month, 0) + p["amount"]
    return [{"month": k, "revenue": v} for k, v in sorted(monthly.items())]

@api_router.get("/analytics/enrollment")
async def enrollment_analytics(request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    result = []
    for c in courses:
        count = await db.enrollments.count_documents({"course_id": c["course_id"]})
        result.append({"course": c["name"], "enrollments": count})
    return result

@api_router.get("/analytics/attendance-summary")
async def attendance_analytics(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    batches = await db.batches.find({}, {"_id": 0}).to_list(100)
    result = []
    for b in batches:
        total = await db.attendance.count_documents({"batch_id": b["batch_id"]})
        present = await db.attendance.count_documents({"batch_id": b["batch_id"], "status": "present"})
        pct = round((present / total * 100) if total > 0 else 0, 1)
        result.append({"batch": b["name"], "total": total, "present": present, "percentage": pct})
    return result

# ─── CSV Export ───
@api_router.get("/export/students")
async def export_students(request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(10000)
    output = StringIO()
    fieldnames = ["user_id", "name", "email", "role", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(students)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=students.csv"})

@api_router.get("/export/fees")
async def export_fees(request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    fees = await db.fees.find({}, {"_id": 0}).to_list(10000)
    for f in fees:
        student = await db.users.find_one({"user_id": f["student_id"]}, {"_id": 0, "name": 1})
        f["student_name"] = student["name"] if student else "Unknown"
        course = await db.courses.find_one({"course_id": f["course_id"]}, {"_id": 0, "name": 1})
        f["course_name"] = course["name"] if course else "Unknown"
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["fee_id", "student_name", "course_name", "amount", "due_date", "status"])
    writer.writeheader()
    for f in fees:
        writer.writerow({k: f.get(k, "") for k in ["fee_id", "student_name", "course_name", "amount", "due_date", "status"]})
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=fees.csv"})

# ─── Course Detail & Resources ───
@api_router.get("/courses/{course_id}/detail")
async def get_course_detail(course_id: str, request: Request):
    user = await get_current_user(request)
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if user_has_role(user, "student"):
        enrollment = await db.enrollments.find_one({"student_id": user["user_id"], "course_id": course_id}, {"_id": 0})
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
    elif user_has_role(user, "faculty"):
        batches = await db.batches.find({"course_id": course_id, "faculty_id": user["user_id"]}, {"_id": 0}).to_list(100)
        if not batches:
            raise HTTPException(status_code=403, detail="Not assigned to this course")
    
    batches = await db.batches.find({"course_id": course_id}, {"_id": 0}).to_list(100)
    for b in batches:
        faculty = await db.users.find_one({"user_id": b["faculty_id"]}, {"_id": 0, "name": 1})
        b["faculty_name"] = faculty["name"] if faculty else "Unknown"
        b["student_count"] = await db.enrollments.count_documents({"batch_id": b["batch_id"]})
    
    enrollments = await db.enrollments.find({"course_id": course_id}, {"_id": 0}).to_list(1000)
    students = []
    for e in enrollments:
        s = await db.users.find_one({"user_id": e["student_id"]}, {"_id": 0, "password_hash": 0})
        if s:
            batch = await db.batches.find_one({"batch_id": e["batch_id"]}, {"_id": 0, "name": 1})
            s["batch_name"] = batch["name"] if batch else "Unknown"
            s["batch_id"] = e["batch_id"]
            s["enrollment_date"] = e["enrollment_date"]
            students.append(s)
    
    materials = await db.files.find({"course_id": course_id, "is_deleted": False}, {"_id": 0}).to_list(1000)
    for m in materials:
        uploader = await db.users.find_one({"user_id": m["uploaded_by"]}, {"_id": 0, "name": 1})
        m["uploader_name"] = uploader["name"] if uploader else "Unknown"
    
    resources = await db.course_resources.find({"course_id": course_id}, {"_id": 0}).to_list(1000)
    assignments = await db.assignments.find({"batch_id": {"$in": [b["batch_id"] for b in batches]}}, {"_id": 0}).to_list(1000)
    
    result = {
        **course, "batches": batches, "students": students,
        "materials": materials, "resources": resources, "assignments": assignments,
        "total_students": len(students), "total_batches": len(batches)
    }
    if user_has_role(user, "student"):
        result.pop("fee_structure", None)
    return result

@api_router.post("/courses/{course_id}/resources")
async def add_course_resource(course_id: str, req: CourseResourceCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    rid = f"res_{uuid.uuid4().hex[:12]}"
    resource = {"resource_id": rid, "course_id": course_id, "title": req.title, "url": req.url, "type": req.type, "added_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.course_resources.insert_one(resource)
    resource.pop("_id", None)
    return resource

@api_router.delete("/courses/{course_id}/resources/{resource_id}")
async def delete_course_resource(course_id: str, resource_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.course_resources.delete_one({"resource_id": resource_id})
    return {"message": "Resource deleted"}

# ─── Batch Detail ───
@api_router.get("/batches/{batch_id}/detail")
async def get_batch_detail(batch_id: str, request: Request):
    user = await get_current_user(request)
    batch = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if user_has_role(user, "faculty") and batch["faculty_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to this batch")
    
    course = await db.courses.find_one({"course_id": batch["course_id"]}, {"_id": 0})
    batch["course_name"] = course["name"] if course else "Unknown"
    faculty = await db.users.find_one({"user_id": batch["faculty_id"]}, {"_id": 0, "password_hash": 0})
    batch["faculty"] = faculty
    
    enrollments = await db.enrollments.find({"batch_id": batch_id}, {"_id": 0}).to_list(1000)
    students = []
    for e in enrollments:
        s = await db.users.find_one({"user_id": e["student_id"]}, {"_id": 0, "password_hash": 0})
        if s:
            att_total = await db.attendance.count_documents({"batch_id": batch_id, "student_id": s["user_id"]})
            att_present = await db.attendance.count_documents({"batch_id": batch_id, "student_id": s["user_id"], "status": "present"})
            s["attendance_pct"] = round((att_present / att_total * 100) if att_total > 0 else 0, 1)
            subs = await db.submissions.count_documents({"student_id": s["user_id"]})
            s["submissions_count"] = subs
            students.append(s)
    
    assignments = await db.assignments.find({"batch_id": batch_id}, {"_id": 0}).to_list(1000)
    for a in assignments:
        a["submission_count"] = await db.submissions.count_documents({"assignment_id": a["assignment_id"]})
    
    attendance_dates = await db.attendance.distinct("date", {"batch_id": batch_id})
    
    return {**batch, "students": students, "assignments": assignments, "attendance_dates": sorted(attendance_dates), "total_students": len(students)}

# ─── Student Profile ───
@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, request: Request):
    current = await get_current_user(request)
    if current["role"] == "student" and current["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    enrollments = await db.enrollments.find({"student_id": user_id}, {"_id": 0}).to_list(100)
    courses = []
    for e in enrollments:
        c = await db.courses.find_one({"course_id": e["course_id"]}, {"_id": 0})
        b = await db.batches.find_one({"batch_id": e["batch_id"]}, {"_id": 0, "name": 1})
        if c:
            c["batch_name"] = b["name"] if b else "Unknown"
            c["enrollment_date"] = e["enrollment_date"]
            courses.append(c)
    
    fees = await db.fees.find({"student_id": user_id}, {"_id": 0}).to_list(100)
    for f in fees:
        c = await db.courses.find_one({"course_id": f["course_id"]}, {"_id": 0, "name": 1})
        f["course_name"] = c["name"] if c else "Unknown"
        pmts = await db.payments.find({"fee_id": f["fee_id"]}, {"_id": 0}).to_list(100)
        f["total_paid"] = sum(p["amount"] for p in pmts)
        f["balance"] = f["amount"] - f["total_paid"]
    
    att_total = await db.attendance.count_documents({"student_id": user_id})
    att_present = await db.attendance.count_documents({"student_id": user_id, "status": "present"})
    
    if user_has_role(user, "faculty"):
        batches = await db.batches.find({"faculty_id": user_id}, {"_id": 0}).to_list(100)
        for b in batches:
            c = await db.courses.find_one({"course_id": b["course_id"]}, {"_id": 0, "name": 1})
            b["course_name"] = c["name"] if c else "Unknown"
            b["student_count"] = await db.enrollments.count_documents({"batch_id": b["batch_id"]})
        user["batches"] = batches
    
    return {
        **user, "courses": courses, "fees": fees,
        "attendance_total": att_total, "attendance_present": att_present,
        "attendance_pct": round((att_present / att_total * 100) if att_total > 0 else 0, 1)
    }

@api_router.put("/users/{user_id}/profile")
async def update_user_profile(user_id: str, req: UserProfileUpdate, request: Request):
    current = await get_current_user(request)
    is_admin = current["role"] in ["super_admin", "admin"]
    is_own = current["user_id"] == user_id
    if not is_own and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {}
    for k, v in req.model_dump().items():
        if v is not None:
            updates[k] = v
    if updates:
        await db.users.update_one({"user_id": user_id}, {"$set": updates})
    return {"message": "Profile updated"}

# ─── Holidays ───
@api_router.post("/holidays")
async def create_holiday(req: HolidayCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    hid = f"holiday_{uuid.uuid4().hex[:12]}"
    holiday = {"holiday_id": hid, "date": req.date, "name": req.name, "description": req.description, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.holidays.insert_one(holiday)
    holiday.pop("_id", None)
    return holiday

@api_router.get("/holidays")
async def list_holidays(request: Request):
    await get_current_user(request)
    holidays = await db.holidays.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    return holidays

@api_router.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.holidays.delete_one({"holiday_id": holiday_id})
    return {"message": "Holiday deleted"}

# ─── Leave Management ───
@api_router.post("/leaves")
async def apply_leave(req: LeaveCreate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "faculty", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only faculty/admin can apply for leave")
    lid = f"leave_{uuid.uuid4().hex[:12]}"
    leave = {
        "leave_id": lid, "user_id": user["user_id"], "user_name": user["name"],
        "date": req.date, "reason": req.reason, "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leaves.insert_one(leave)
    leave.pop("_id", None)
    return leave

@api_router.get("/leaves")
async def list_leaves(request: Request, user_id: Optional[str] = None, status: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if user_id:
        query["user_id"] = user_id
    elif user_has_role(user, "faculty"):
        query["user_id"] = user["user_id"]
    if status:
        query["status"] = status
    leaves = await db.leaves.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return leaves

@api_router.put("/leaves/{leave_id}/status")
async def update_leave_status(leave_id: str, req: LeaveStatusUpdate, request: Request):
    user = await get_current_user(request)
    if not user_has_role(user, "super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.leaves.update_one({"leave_id": leave_id}, {"$set": {"status": req.status}})
    if req.status == "approved":
        leave = await db.leaves.find_one({"leave_id": leave_id}, {"_id": 0})
        if leave:
            approved_leaves = await db.leaves.find({"user_id": leave["user_id"], "status": "approved", "date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}}, {"_id": 0}).to_list(100)
            leave_dates = [l["date"] for l in approved_leaves]
            avail_text = f"On leave: {', '.join(leave_dates[:5])}" if leave_dates else "Available"
            await db.users.update_one({"user_id": leave["user_id"]}, {"$set": {"availability": avail_text}})
    return {"message": f"Leave {req.status}"}

@api_router.delete("/leaves/{leave_id}")
async def delete_leave(leave_id: str, request: Request):
    user = await get_current_user(request)
    leave = await db.leaves.find_one({"leave_id": leave_id}, {"_id": 0})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave["user_id"] != user["user_id"] and user["role"] not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.leaves.delete_one({"leave_id": leave_id})
    return {"message": "Leave deleted"}

@api_router.get("/faculty/availability")
async def get_faculty_availability(request: Request):
    await get_current_user(request)
    faculty = await db.users.find({"role": "faculty"}, {"_id": 0, "password_hash": 0}).to_list(100)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for f in faculty:
        approved_leaves = await db.leaves.find({"user_id": f["user_id"], "status": "approved"}, {"_id": 0}).to_list(100)
        f["leaves"] = approved_leaves
        today_leave = await db.leaves.find_one({"user_id": f["user_id"], "status": "approved", "date": today}, {"_id": 0})
        f["available_today"] = today_leave is None
    return faculty

# ─── Comments ───
@api_router.post("/comments")
async def create_comment(req: CommentCreate, request: Request):
    user = await get_current_user(request)
    cid = f"comment_{uuid.uuid4().hex[:12]}"
    comment = {
        "comment_id": cid, "entity_type": req.entity_type, "entity_id": req.entity_id,
        "text": req.text, "user_id": user["user_id"], "user_name": user["name"],
        "user_role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    return comment

@api_router.get("/comments")
async def list_comments(request: Request, entity_type: str = Query(...), entity_id: str = Query(...)):
    await get_current_user(request)
    comments = await db.comments.find({"entity_type": entity_type, "entity_id": entity_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return comments

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, request: Request):
    user = await get_current_user(request)
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user["user_id"] and user["role"] not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.comments.delete_one({"comment_id": comment_id})
    return {"message": "Comment deleted"}

# ─── Enhanced Dashboard ───
@api_router.get("/dashboard/enhanced")
async def get_enhanced_dashboard(request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    today_attendance = await db.attendance.count_documents({"date": today})
    today_present = await db.attendance.count_documents({"date": today, "status": "present"})
    
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_enrollments = await db.enrollments.find({"enrollment_date": {"$gte": seven_days_ago}}, {"_id": 0}).to_list(100)
    for e in new_enrollments:
        s = await db.users.find_one({"user_id": e["student_id"]}, {"_id": 0, "name": 1})
        c = await db.courses.find_one({"course_id": e["course_id"]}, {"_id": 0, "name": 1})
        e["student_name"] = s["name"] if s else "Unknown"
        e["course_name"] = c["name"] if c else "Unknown"
    
    upcoming_holidays = await db.holidays.find({"date": {"$gte": today}}, {"_id": 0}).sort("date", 1).to_list(5)
    active_batches = await db.batches.count_documents({})
    active_courses = await db.courses.count_documents({})
    
    return {
        "today_attendance": today_attendance, "today_present": today_present,
        "new_enrollments": new_enrollments[:5],
        "upcoming_holidays": upcoming_holidays,
        "active_batches": active_batches, "active_courses": active_courses
    }

# ─── Email ───
@api_router.post("/email/send")
async def send_email_endpoint(req: EmailSend, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = send_email(req.to, req.subject, req.message)
    return {"success": result}

# ─── App Setup ───
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ciqura-labs-tool.vercel.app",
        "https://ciqura-labs-tool-lznd9ffpc-maa2.vercel.app",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ciquralabs.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "display_id": "CL-ADM-001",
            "email": admin_email, "name": "Super Admin",
            "password_hash": hash_password(admin_password), "picture": None,
            "role": "super_admin", "skills": [], "interests": [], "bio": "",
            "phone": "", "availability": "", "address": "", "dob": "",
            "guardian_name": "", "guardian_phone": "", "blood_group": "", "qualification": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    
    settings = await db.institute_settings.find_one({}, {"_id": 0})
    if not settings:
        sid = f"setting_{uuid.uuid4().hex[:12]}"
        await db.institute_settings.insert_one({
            "setting_id": sid, "institute_name": "Ciqura Labs",
            "logo_url": "", "primary_color": "#002FA7", "theme": "light",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.users.create_index("email", unique=True)

@app.on_event("startup")
async def startup():
    await seed_admin()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
