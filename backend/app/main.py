from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Query, Response, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import io
import json
import uuid
import openpyxl
from datetime import datetime
import urllib.parse

from database import get_db, init_db
from seed_data import seed_all
import paymob

app = FastAPI(title="Monir Smart LMS API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as cnt FROM lectures")
    if c.fetchone()["cnt"] < 32:
        seed_all()
    conn.close()

# ========== PYDANTIC SCHEMAS ==========
class JoinLectureRequest(BaseModel):
    student_id: int
    duration_minutes: Optional[int] = 60

class PostponeLectureRequest(BaseModel):
    lecture_id: int
    new_scheduled_time: str
    reason: str

class PaymobCheckoutRequest(BaseModel):
    student_id: int
    course_name: str
    block_to_unlock: int = 2
    payment_method: str = "card"

class PaymobWebhookRequest(BaseModel):
    transaction_id: str

class QuranRecordSessionRequest(BaseModel):
    student_id: int
    teacher_id: Optional[int] = None
    course_name: Optional[str] = "مسار القرآن الكريم والتدبر"
    session_status: Optional[str] = None # "present", "attended", "excused", "absent"
    session_type: Optional[str] = None
    surah_covered: Optional[str] = None
    teacher_notes: Optional[str] = None

class QuranUpdateSurahRequest(BaseModel):
    student_id: int
    teacher_id: Optional[int] = None
    course_name: Optional[str] = "مسار القرآن الكريم والتدبر"
    surah_name: Optional[str] = None
    new_surah: Optional[str] = None
    aya_number: Optional[int] = 1
    notes: Optional[str] = None

class TeacherReassignRequest(BaseModel):
    teacher_id: Optional[int] = None
    new_teacher_id: Optional[int] = None
    course_name: str
    student_id: Optional[int] = None

class BulkCourseRescheduleRequest(BaseModel):
    course_name: Optional[str] = None
    new_scheduled_time: Optional[str] = None
    new_day: Optional[str] = None
    new_time: Optional[str] = None
    reason: Optional[str] = "تنسيق المواعيد الأسبوعية بناءً على طلب أولياء الأمور"

class SubmitQuizRequest(BaseModel):
    student_id: int
    answers: Dict[str, Any]

class CreateSupportTicketRequest(BaseModel):
    student_id: int
    course_name: Optional[str] = "عام"
    category: Optional[str] = "عام"
    subject: str
    message: str

class ReplySupportTicketRequest(BaseModel):
    ticket_id: Optional[int] = None
    admin_reply: str
    status: Optional[str] = "replied"

class StudentImportItem(BaseModel):
    name: str
    age: int
    phone: str
    parent_name: str
    parent_phone: str
    course_name: str

class UpdateCourseLimitsRequest(BaseModel):
    min_age: int
    max_age: int
    max_capacity: int
    default_duration_minutes: Optional[int] = 60

class TeacherSettlePayoutRequest(BaseModel):
    amount: float
    sessions_count: int
    period_month: str
    payment_method: Optional[str] = "instapay"
    reference_number: Optional[str] = ""
    notes: Optional[str] = ""

class UpdateLectureDurationRequest(BaseModel):
    duration_minutes: int

class AuthLoginRequest(BaseModel):
    username: str
    password: str
    expected_role: Optional[str] = None

class StudentSelfRegisterRequest(BaseModel):
    name: str
    age: int
    phone: str
    parent_name: str
    parent_phone: str
    course_name: str
    username: str
    password: str

# ========== AUTHENTICATION & ACCESS CONTROL ENDPOINTS ==========

@app.post("/api/auth/login")
def auth_login(req: AuthLoginRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("""
    SELECT u.*, s.student_code, s.id as student_id, t.id as teacher_id
    FROM users u
    LEFT JOIN students s ON u.role = 'student' AND (u.related_id = s.id OR u.username = s.student_code)
    LEFT JOIN teachers t ON u.role = 'teacher' AND u.related_id = t.id
    WHERE (u.username = ? OR u.email = ? OR s.student_code = ?) AND u.status = 'active'
    """, (req.username.strip(), req.username.strip(), req.username.strip()))
    
    user = c.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
        
    if user["password_hash"] != req.password.strip():
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
        
    if req.expected_role and user["role"] != req.expected_role:
        raise HTTPException(status_code=403, detail=f"هذا الحساب غير مصرح له بالدخول كـ ({req.expected_role})")
        
    token = f"token_{user['role']}_{user['id']}_{uuid.uuid4().hex[:12]}"
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "related_id": user["related_id"],
            "student_id": user["student_id"] or (user["related_id"] if user["role"] == "student" else None),
            "teacher_id": user["teacher_id"] or (user["related_id"] if user["role"] == "teacher" else None),
            "email": user["email"],
            "phone": user["phone"]
        }
    }

@app.post("/api/auth/register-student")
def auth_register_student(req: StudentSelfRegisterRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT id FROM users WHERE username = ?", (req.username.strip(),))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم مستخدم آخر")
        
    code = f"MNR-2026-{uuid.uuid4().hex[:4].upper()}"
    qr = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={code}"
    
    c.execute("""
    INSERT INTO students (name, student_code, age, phone, parent_name, parent_phone, qr_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (req.name.strip(), code, req.age, req.phone.strip(), req.parent_name.strip(), req.parent_phone.strip(), qr))
    student_id = c.lastrowid
    
    c.execute("""
    INSERT INTO users (username, password_hash, role, related_id, full_name, email, phone, status)
    VALUES (?, ?, 'student', ?, ?, ?, ?, 'active')
    """, (req.username.strip(), req.password.strip(), student_id, req.name.strip(), f"{req.username.strip()}@student.monir.edu.eg", req.phone.strip()))
    user_id = c.lastrowid
    
    c.execute("""
    INSERT INTO enrollments (student_id, course_name, teacher_id, unlocked_blocks, total_lectures_unlocked, remaining_credits, status)
    VALUES (?, ?, 1, 1, 4, 4, 'active')
    """, (student_id, req.course_name))
    
    c.execute("""
    INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
    VALUES (?, ?, 'أهلاً بك في أكاديمية منير الذكية', ?, 'general', 'student.html')
    """, (student_id, req.course_name, f"تم تفعيل مسارك التعليمي بنجاح! كودك التعليمي هو: {code}"))
    
    conn.commit()
    conn.close()
    
    token = f"token_student_{user_id}_{uuid.uuid4().hex[:12]}"
    return {
        "success": True,
        "message": "تم إنشاء حسابك بنجاح! مرحباً بك في أكاديمية منير الذكية.",
        "token": token,
        "user": {
            "id": user_id,
            "username": req.username.strip(),
            "full_name": req.name.strip(),
            "role": "student",
            "related_id": student_id,
            "student_id": student_id,
            "student_code": code
        }
    }

# ========== COURSES ENDPOINTS ==========

@app.get("/api/courses")
def get_all_courses():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM courses ORDER BY id ASC")
    courses_raw = [dict(r) for r in c.fetchall()]
    
    result = []
    for cr in courses_raw:
        c_name = cr["name"]
        
        # Enrolled students count
        c.execute("SELECT COUNT(*) as cnt FROM enrollments WHERE course_name = ?", (c_name,))
        students_cnt = c.fetchone()["cnt"]
        
        # Renewals count & revenue
        c.execute("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_rev FROM payments WHERE course_name = ? AND status = 'completed'", (c_name,))
        pay_row = c.fetchone()
        
        # Attendance rate
        c.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_cnt,
            COUNT(*) as total_att
        FROM attendance WHERE course_name = ?
        """, (c_name,))
        att_row = c.fetchone()
        att_rate = round((att_row["present_cnt"] / att_row["total_att"] * 100), 1) if att_row["total_att"] > 0 else 100.0
        
        cr["enrolled_students_count"] = students_cnt
        cr["renewals_count"] = pay_row["cnt"]
        cr["total_revenue"] = pay_row["total_rev"]
        cr["attendance_rate"] = att_rate
        result.append(cr)
        
    conn.close()
    return result

@app.get("/api/course/{course_name}")
def get_course_details(course_name: str):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM courses WHERE name = ?", (course_name,))
    course_info = c.fetchone()
    if not course_info:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")
        
    c.execute("SELECT * FROM lectures WHERE course_name = ? ORDER BY lecture_number ASC", (course_name,))
    lectures = [dict(l) for l in c.fetchall()]
    
    c.execute("""
    SELECT 
        s.id as student_id, s.name, s.student_code, s.age, s.phone, s.parent_name, s.parent_phone,
        e.unlocked_blocks, e.total_lectures_unlocked, e.renewal_count, e.remaining_credits, e.excuse_count, e.current_surah,
        t.name as teacher_name
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    LEFT JOIN teachers t ON e.teacher_id = t.id
    WHERE e.course_name = ?
    """, (course_name,))
    students = [dict(s) for s in c.fetchall()]
    
    for st in students:
        sid = st["student_id"]
        c.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_cnt,
            COUNT(*) as total_records
        FROM attendance WHERE student_id = ? AND course_name = ?
        """, (sid, course_name))
        att_data = c.fetchone()
        st["present_count"] = att_data["present_cnt"]
        st["attendance_rate"] = round((att_data["present_cnt"] / max(att_data["total_records"], 1) * 100), 1) if att_data["total_records"] > 0 else 100.0
    
    c.execute("""
    SELECT p.*, s.name as student_name, s.student_code
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.course_name = ?
    ORDER BY p.id DESC
    """, (course_name,))
    payments = [dict(p) for p in c.fetchall()]
    
    c.execute("""
    SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_cnt,
        COUNT(*) as total_att
    FROM attendance WHERE course_name = ?
    """, (course_name,))
    att_row = c.fetchone()
    course_att_rate = round((att_row["present_cnt"] / att_row["total_att"] * 100), 1) if att_row["total_att"] > 0 else 100.0
    
    conn.close()
    return {
        "course": dict(course_info),
        "attendance_rate": course_att_rate,
        "enrolled_students": students,
        "lectures": lectures,
        "payments": payments
    }

@app.get("/api/courses/analytics")
def get_courses_analytics():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM courses ORDER BY id ASC")
    courses = [dict(r) for r in c.fetchall()]
    
    analytics = []
    for cr in courses:
        c_name = cr["name"]
        
        # Enrolled students with ages
        c.execute("""
        SELECT s.id, s.name, s.age, e.status
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.course_name = ?
        ORDER BY s.age ASC
        """, (c_name,))
        students = [dict(s) for s in c.fetchall()]
        
        enrolled_count = len(students)
        max_cap = cr.get("max_capacity") or 8
        min_ag = cr.get("min_age") or 10
        max_ag = cr.get("max_age") or 16
        duration = cr.get("default_duration_minutes") or 60
        
        ages = [s["age"] for s in students]
        avg_age = round(sum(ages) / len(ages), 1) if ages else None
        vacant_seats = max(0, max_cap - enrolled_count)
        is_incomplete = (vacant_seats > 0)
        
        analytics.append({
            "course_name": c_name,
            "track_name": cr["track_name"],
            "target_age": cr["target_age"],
            "min_age": min_ag,
            "max_age": max_ag,
            "max_capacity": max_cap,
            "default_duration_minutes": duration,
            "enrolled_count": enrolled_count,
            "enrolled_ages": ages,
            "average_age": avg_age,
            "vacant_seats": vacant_seats,
            "is_incomplete": is_incomplete,
            "students": students
        })
        
    conn.close()
    return analytics

@app.post("/api/courses/{course_name}/update-limits")
def update_course_limits(course_name: str, req: UpdateCourseLimitsRequest):
    conn = get_db()
    c = conn.cursor()
    
    new_target_age = f"{req.min_age} - {req.max_age} سنة"
    c.execute("""
    UPDATE courses 
    SET min_age = ?, max_age = ?, target_age = ?, max_capacity = ?, default_duration_minutes = COALESCE(?, default_duration_minutes)
    WHERE name = ?
    """, (req.min_age, req.max_age, new_target_age, req.max_capacity, req.default_duration_minutes, course_name))
    
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"تم تحديث الفئة العمرية لمسار ({course_name}) إلى {new_target_age} وسعة الجروب إلى {req.max_capacity} طلاب بنجاح."
    }

# ========== STUDENT ENDPOINTS ==========

@app.get("/api/students")
def get_all_students():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM students ORDER BY id ASC")
    students = [dict(s) for s in c.fetchall()]
    conn.close()
    return students

@app.get("/api/student/{student_id}")
def get_student_profile(student_id: int):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    student = c.fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")
        
    c.execute("""
    SELECT 
        e.course_name, e.unlocked_blocks, e.total_lectures_unlocked, e.renewal_count, 
        e.remaining_credits, e.excuse_count, e.max_allowed_excuses, e.current_surah, e.status as enrollment_status,
        c.icon, c.track_name, c.target_age, c.price_per_block, c.default_day, c.default_time,
        t.id as teacher_id, t.name as teacher_name, t.specialty as teacher_specialty
    FROM enrollments e
    JOIN courses c ON e.course_name = c.name
    LEFT JOIN teachers t ON e.teacher_id = t.id
    WHERE e.student_id = ?
    ORDER BY e.id ASC
    """, (student_id,))
    enrolled_courses = [dict(ec) for ec in c.fetchall()]
    
    for ec in enrolled_courses:
        c_name = ec["course_name"]
        c.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_cnt,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_cnt,
            COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_cnt,
            COUNT(*) as total_att
        FROM attendance WHERE student_id = ? AND course_name = ?
        """, (student_id, c_name))
        att_row = c.fetchone()
        ec["present_count"] = att_row["present_cnt"]
        ec["absent_count"] = att_row["absent_cnt"]
        ec["excused_count"] = att_row["excused_cnt"]
        ec["attendance_rate"] = round((att_row["present_cnt"] / max(att_row["total_att"], 1) * 100), 1) if att_row["total_att"] > 0 else 100.0

    c.execute("""
    SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count
    FROM attendance WHERE student_id = ?
    """, (student_id,))
    att_summary = c.fetchone()
    
    c.execute("SELECT COUNT(*) as unread FROM notifications WHERE student_id = ? AND is_read = 0", (student_id,))
    unread_notifs = c.fetchone()["unread"]
    
    c.execute("SELECT * FROM payments WHERE student_id = ? ORDER BY id DESC", (student_id,))
    payment_history = [dict(p) for p in c.fetchall()]
    
    conn.close()
    return {
        "student": dict(student),
        "enrolled_courses": enrolled_courses,
        "enrolled_courses_count": len(enrolled_courses),
        "attendance_summary": dict(att_summary),
        "unread_notifications": unread_notifs,
        "payment_history": payment_history
    }

@app.get("/api/student/{student_id}/courses/{course_name}/lectures")
def get_student_course_lectures(student_id: int, course_name: str):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM enrollments WHERE student_id = ? AND course_name = ?", (student_id, course_name))
    enr = c.fetchone()
    if not enr:
        conn.close()
        raise HTTPException(status_code=404, detail="Student is not enrolled in this course")
        
    total_unlocked = enr["total_lectures_unlocked"]
    unlocked_blocks = enr["unlocked_blocks"]
    renewal_count = enr["renewal_count"]
    remaining_credits = enr["remaining_credits"]
    current_surah = enr["current_surah"]
    excuse_count = enr["excuse_count"]
    
    c.execute("SELECT * FROM lectures WHERE course_name = ? ORDER BY lecture_number ASC", (course_name,))
    lectures_raw = [dict(l) for l in c.fetchall()]
    
    c.execute("SELECT lecture_id, status, duration_minutes, joined_at FROM attendance WHERE student_id = ? AND course_name = ?", (student_id, course_name))
    att_map = {row["lecture_id"]: dict(row) for row in c.fetchall()}
    
    for l in lectures_raw:
        lec_num = l["lecture_number"]
        is_unlocked = (lec_num <= total_unlocked)
        att_info = att_map.get(l["id"], {"status": "not_recorded", "duration_minutes": 0})
        
        l["is_unlocked"] = is_unlocked
        l["attendance"] = att_info
        
    conn.close()
    return {
        "course_name": course_name,
        "total_lectures_unlocked": total_unlocked,
        "unlocked_blocks": unlocked_blocks,
        "renewal_count": renewal_count,
        "remaining_credits": remaining_credits,
        "current_surah": current_surah,
        "excuse_count": excuse_count,
        "needs_renewal": (total_unlocked == 4 or remaining_credits <= 1),
        "lectures": lectures_raw
    }

# ========== QURAN INDIVIDUAL CREDIT ENGINE ==========

@app.post("/api/quran/record-session")
def record_quran_session(req: QuranRecordSessionRequest):
    """
    Handles Quran individual session deductions & excuse policy:
    - Attended / Present: Deducts 1 credit from remaining credits.
    - Excused (1st time): Allowed without credit deduction (excuse_count -> 1).
    - Excused (>1st time): Deducts 1 credit from remaining credits.
    - If remaining credits <= 1: Automatically triggers renewal notification to student.
    """
    conn = get_db()
    c = conn.cursor()
    
    course_name = req.course_name or "مسار القرآن الكريم والتدبر"
    student_id = req.student_id
    
    c.execute("SELECT * FROM enrollments WHERE student_id = ? AND course_name = ?", (student_id, course_name))
    enr = c.fetchone()
    if not enr:
        conn.close()
        raise HTTPException(status_code=404, detail="Student enrollment in Quran course not found")
        
    current_credits = enr["remaining_credits"]
    current_excuses = enr["excuse_count"]
    
    st_type = (req.session_status or req.session_type or "present").lower()
    
    msg = ""
    deducted = 0
    
    if st_type in ["attended", "present"]:
        new_credits = max(0, current_credits - 1)
        deducted = 1
        msg = f"تم تسجيل حضور جلسة القرآن بنجاح. المتبقي في رصيدك: {new_credits} حصص."
        c.execute("""
        UPDATE enrollments 
        SET remaining_credits = ?, current_surah = COALESCE(?, current_surah)
        WHERE student_id = ? AND course_name = ?
        """, (new_credits, req.surah_covered, student_id, course_name))
    elif st_type in ["excused"]:
        if current_excuses == 0:
            new_credits = current_credits
            msg = "تم قبول اعتذار الطالب (المرة الأولى المسموح بها مجاناً) ولم يتم خصم أي رصيد."
            c.execute("""
            UPDATE enrollments 
            SET excuse_count = 1
            WHERE student_id = ? AND course_name = ?
            """, (student_id, course_name))
        else:
            new_credits = max(0, current_credits - 1)
            deducted = 1
            msg = f"تم تسجيل اعتذار الطالب (تجاوز حد الاعتذار المجاني) وخُصمت حصة من الرصيد. المتبقي: {new_credits} حصص."
            c.execute("""
            UPDATE enrollments 
            SET remaining_credits = ?, excuse_count = excuse_count + 1
            WHERE student_id = ? AND course_name = ?
            """, (new_credits, student_id, course_name))
    else: # absent
        new_credits = max(0, current_credits - 1)
        deducted = 1
        msg = f"تم تسجيل غياب الطالب وخُصمت حصة من الرصيد. المتبقي: {new_credits} حصص."
        c.execute("""
        UPDATE enrollments 
        SET remaining_credits = ?
        WHERE student_id = ? AND course_name = ?
        """, (new_credits, student_id, course_name))
            
    # Check if renewal notification is needed
    if new_credits <= 1:
        c.execute("""
        INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
        VALUES (
            ?,
            ?,
            'تنبيه: متبقي حصة واحدة في رصيد مسار القرآن',
            'عزيزي ولي الأمر، متبقي حصة قرآنية واحدة فقط في رصيد الطالب. يرجى تجديد الاشتراك لفتح المرحلة القادمة وضمان استمرارية الحفظ.',
            'renewal',
            '/student.html'
        )
        """, (student_id, course_name))
        
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": msg,
        "remaining_credits": new_credits,
        "deducted": deducted,
        "needs_renewal": (new_credits <= 1)
    }

@app.post("/api/quran/update-surah")
def update_quran_surah(req: QuranUpdateSurahRequest):
    conn = get_db()
    c = conn.cursor()
    course_name = req.course_name or "مسار القرآن الكريم والتدبر"
    surah_val = req.surah_name or req.new_surah or "سورة الفاتحة"
    if req.aya_number and "آية" not in surah_val:
        full_surah_display = f"{surah_val} (آية {req.aya_number})"
    else:
        full_surah_display = surah_val
    
    c.execute("""
    UPDATE enrollments 
    SET current_surah = ?
    WHERE student_id = ? AND course_name = ?
    """, (full_surah_display, req.student_id, course_name))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"تم تحديث مرحلة وسورة الحفظ إلى: {full_surah_display}"}

# ========== TEACHER PORTAL ENDPOINTS (WITH PRIVACY MASKING) ==========

@app.get("/api/teachers")
def get_teachers():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, specialty, email, phone, bio, active FROM teachers ORDER BY id ASC")
    teachers = [dict(t) for t in c.fetchall()]
    conn.close()
    return teachers

@app.get("/api/teacher/{teacher_id}/dashboard")
def get_teacher_dashboard(teacher_id: int):
    """
    Teacher Portal view:
    Returns assigned students with educational progress, current Surah, and attendance records
    WITHOUT exposing parent phone numbers or private billing data (Privacy Protected).
    """
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM teachers WHERE id = ?", (teacher_id,))
    teacher = c.fetchone()
    if not teacher:
        conn.close()
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    c.execute("""
    SELECT 
        s.id as student_id, s.name, s.student_code, s.age,
        e.course_name, e.current_surah, e.remaining_credits, e.excuse_count, e.unlocked_blocks, e.total_lectures_unlocked
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.teacher_id = ?
    ORDER BY s.id ASC
    """, (teacher_id,))
    assigned_students = [dict(s) for s in c.fetchall()]
    
    for st in assigned_students:
        sid = st["student_id"]
        c_name = st["course_name"]
        
        # Attendance calculation
        c.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_cnt,
            COUNT(*) as total_att
        FROM attendance WHERE student_id = ? AND course_name = ?
        """, (sid, c_name))
        att_row = c.fetchone()
        st["present_count"] = att_row["present_cnt"]
        st["attendance_rate"] = round((att_row["present_cnt"] / max(att_row["total_att"], 1) * 100), 1) if att_row["total_att"] > 0 else 100.0
        
        # Recent attendance log
        c.execute("""
        SELECT a.status, a.joined_at, l.title as lecture_title
        FROM attendance a
        JOIN lectures l ON a.lecture_id = l.id
        WHERE a.student_id = ? AND a.course_name = ?
        ORDER BY a.id DESC LIMIT 3
        """, (sid, c_name))
        st["recent_sessions"] = [dict(r) for r in c.fetchall()]
        
    assigned_courses = list(set([st["course_name"] for st in assigned_students]))
    
    # Teacher personal payroll stats
    rate = teacher["rate_per_session"] if "rate_per_session" in teacher.keys() and teacher["rate_per_session"] else 150.0
    c.execute("""
    SELECT COUNT(DISTINCT a.lecture_id) as comp_cnt
    FROM attendance a
    JOIN lectures l ON a.lecture_id = l.id
    WHERE l.course_name IN ({}) AND l.status = 'completed'
    """.format(','.join(['?']*len(assigned_courses)) if assigned_courses else "''"), assigned_courses if assigned_courses else [])
    completed_sessions = c.fetchone()["comp_cnt"]
    
    c.execute("SELECT COALESCE(SUM(amount), 0) as paid_sum FROM teacher_payouts WHERE teacher_id = ?", (teacher_id,))
    paid_sum = c.fetchone()["paid_sum"]
    
    total_earned = completed_sessions * rate
    balance_due = max(0.0, total_earned - paid_sum)
    
    c.execute("SELECT * FROM teacher_payouts WHERE teacher_id = ? ORDER BY id DESC LIMIT 5", (teacher_id,))
    recent_payouts = [dict(p) for p in c.fetchall()]

    conn.close()
    return {
        "teacher": dict(teacher),
        "teacher_name": teacher["name"],
        "specialty": teacher["specialty"],
        "email": teacher["email"],
        "phone": teacher["phone"],
        "assigned_courses": assigned_courses,
        "total_students": len(assigned_students),
        "students": assigned_students,
        "payroll": {
            "rate_per_session": rate,
            "completed_sessions": completed_sessions,
            "total_earned": total_earned,
            "total_paid": paid_sum,
            "balance_due": balance_due,
            "payouts_history": recent_payouts
        }
    }

@app.post("/api/admin/reassign-teacher")
def reassign_teacher(req: TeacherReassignRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
    UPDATE enrollments 
    SET teacher_id = ?
    WHERE student_id = ? AND course_name = ?
    """, (req.new_teacher_id, req.student_id, req.course_name))
    
    c.execute("SELECT name FROM teachers WHERE id = ?", (req.new_teacher_id,))
    t_name = c.fetchone()["name"]
    
    conn.commit()
    conn.close()
    return {"success": True, "message": f"تم نقل الطالب بنجاح إلى المعلم: {t_name}"}

# ========== TEACHER PAYROLL & SETTLEMENTS ==========

@app.get("/api/admin/teachers/payroll")
def get_teachers_payroll():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM teachers ORDER BY id ASC")
    teachers = [dict(t) for t in c.fetchall()]
    
    payroll_list = []
    total_payroll_earned = 0
    total_payroll_paid = 0
    
    for t in teachers:
        t_id = t["id"]
        c.execute("SELECT DISTINCT course_name FROM enrollments WHERE teacher_id = ?", (t_id,))
        courses = [r["course_name"] for r in c.fetchall()]
        
        c.execute("""
        SELECT COUNT(*) as comp_cnt 
        FROM lectures 
        WHERE status = 'completed' AND course_name IN ({})
        """.format(','.join(['?']*len(courses)) if courses else "''"), courses if courses else [])
        completed_sessions = c.fetchone()["comp_cnt"]
        
        rate = t.get("rate_per_session") or 150.0
        earned = completed_sessions * rate
        
        c.execute("SELECT COALESCE(SUM(amount), 0) as paid_sum FROM teacher_payouts WHERE teacher_id = ?", (t_id,))
        paid = c.fetchone()["paid_sum"]
        
        balance = max(0.0, earned - paid)
        
        c.execute("SELECT * FROM teacher_payouts WHERE teacher_id = ? ORDER BY id DESC", (t_id,))
        history = [dict(p) for p in c.fetchall()]
        
        total_payroll_earned += earned
        total_payroll_paid += paid
        
        payroll_list.append({
            "teacher_id": t_id,
            "name": t["name"],
            "specialty": t["specialty"],
            "phone": t["phone"],
            "rate_per_session": rate,
            "rate_per_private_session": t.get("rate_per_private_session") or 80.0,
            "completed_sessions": completed_sessions,
            "total_earned": earned,
            "total_paid": paid,
            "balance_due": balance,
            "courses_supervised": courses,
            "payouts_history": history
        })
        
    conn.close()
    return {
        "teachers_payroll": payroll_list,
        "summary": {
            "total_earned_all": total_payroll_earned,
            "total_paid_all": total_payroll_paid,
            "total_balance_due": max(0.0, total_payroll_earned - total_payroll_paid)
        }
    }

@app.post("/api/admin/teachers/{teacher_id}/settle")
def settle_teacher_payout(teacher_id: int, req: TeacherSettlePayoutRequest):
    conn = get_db()
    c = conn.cursor()
    
    ref = req.reference_number or f"PAYOUT-{datetime.now().strftime('%Y%m%d%H%M')}-{teacher_id}"
    notes = req.notes or f"تسوية مستحقات شهر {req.period_month} ({req.sessions_count} حصة)"
    
    c.execute("""
    INSERT INTO teacher_payouts (teacher_id, amount, sessions_count, period_month, status, payment_method, reference_number, notes)
    VALUES (?, ?, ?, ?, 'paid', ?, ?, ?)
    """, (teacher_id, req.amount, req.sessions_count, req.period_month, req.payment_method, ref, notes))
    
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"تم تسجيل تسوية المستحقات بنجاح بمبلغ {req.amount} ج.م برقم مرجعي: {ref}",
        "reference_number": ref
    }

# ========== TEACHER PERFORMANCE & ACCOUNTABILITY REPORT ==========

@app.get("/api/admin/teachers/performance-report")
def get_teachers_performance_report():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM teachers ORDER BY id ASC")
    teachers = [dict(t) for t in c.fetchall()]
    
    report = []
    for t in teachers:
        t_id = t["id"]
        
        c.execute("""
        SELECT e.student_id, e.status, e.remaining_credits, s.name as student_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.teacher_id = ?
        """, (t_id,))
        assigned = [dict(r) for r in c.fetchall()]
        total_assigned = len(assigned)
        
        dropouts = sum(1 for a in assigned if a["status"] == "expired" or a["remaining_credits"] == 0)
        dropout_rate = round((dropouts / max(total_assigned, 1) * 100), 1)
        
        c.execute("SELECT DISTINCT course_name FROM enrollments WHERE teacher_id = ?", (t_id,))
        t_courses = [r["course_name"] for r in c.fetchall()]
        
        c.execute("""
        SELECT COUNT(*) as post_cnt
        FROM lectures
        WHERE status = 'postponed' AND course_name IN ({})
        """.format(','.join(['?']*len(t_courses)) if t_courses else "''"), t_courses if t_courses else [])
        postponed_cnt = c.fetchone()["post_cnt"]
        
        late_starts = t.get("late_count") or 0
        cancellations = t.get("cancellation_count") or 0
        
        score = max(50, 100 - (cancellations * 10 + late_starts * 5 + dropouts * 10))
        
        report.append({
            "teacher_id": t_id,
            "name": t["name"],
            "specialty": t["specialty"],
            "phone": t["phone"],
            "total_assigned_students": total_assigned,
            "dropouts_count": dropouts,
            "dropout_rate_pct": dropout_rate,
            "late_starts_count": late_starts,
            "cancellations_count": cancellations,
            "postponed_lectures_count": postponed_cnt,
            "commitment_score": score,
            "supervised_courses": t_courses
        })
        
    conn.close()
    return report

# ========== PAUSED & EXPIRED STUDENTS MONITORING ==========

@app.get("/api/admin/students/status-summary")
def get_students_status_summary():
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM students ORDER BY id ASC")
    students = [dict(s) for s in c.fetchall()]
    
    detailed_students = []
    active_count = 0
    expired_count = 0
    dropout_count = 0
    
    for s in students:
        sid = s["id"]
        c.execute("""
        SELECT e.*, c.track_name
        FROM enrollments e
        JOIN courses c ON e.course_name = c.name
        WHERE e.student_id = ?
        """, (sid,))
        enrollments = [dict(e) for e in c.fetchall()]
        
        is_expired = any(e["status"] == "expired" or e["remaining_credits"] == 0 for e in enrollments)
        
        c.execute("SELECT COUNT(*) as absent_cnt FROM attendance WHERE student_id = ? AND status = 'absent'", (sid,))
        absent_cnt = c.fetchone()["absent_cnt"]
        is_dropout = (absent_cnt >= 3 and not is_expired)
        
        if is_expired:
            st_status = "expired"
            expired_count += 1
        elif is_dropout:
            st_status = "dropout"
            dropout_count += 1
        else:
            st_status = "active"
            active_count += 1
            
        courses_str = "، ".join([e["course_name"] for e in enrollments])
        
        wa_text = f"السلام عليكم ورحمة الله أستاذ {s['parent_name']}. نود الاطمئنان على الطالب البطل {s['name']} في أكاديمية منير الذكية، وحرصاً على استمرار تميزه في ({courses_str}) يسعدنا تيسير تجديد الاشتراك ومتابعة الحصص القادمة."
        clean_phone = s['parent_phone'].replace(" ", "").replace("-", "")
        if clean_phone.startswith("0"):
            clean_phone = "2" + clean_phone
        wa_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(wa_text)}"
        
        detailed_students.append({
            "id": sid,
            "name": s["name"],
            "student_code": s["student_code"],
            "age": s["age"],
            "parent_name": s["parent_name"],
            "parent_phone": s["parent_phone"],
            "status": st_status,
            "enrollments": enrollments,
            "courses_str": courses_str,
            "whatsapp_reactivation_url": wa_url
        })
        
    conn.close()
    return {
        "summary": {
            "total_students": len(students),
            "active_count": active_count,
            "expired_count": expired_count,
            "dropout_count": dropout_count,
            "total_paused": expired_count + dropout_count,
            "retention_rate": round((active_count / max(len(students), 1) * 100), 1)
        },
        "students": detailed_students
    }

# ========== LECTURE DURATION UPDATE ==========

@app.post("/api/lectures/{lecture_id}/duration")
def update_lecture_duration(lecture_id: int, req: UpdateLectureDurationRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE lectures SET duration_minutes = ? WHERE id = ?", (req.duration_minutes, lecture_id))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"تم تحديث مدة المحاضرة بنجاح لتصبح {req.duration_minutes} دقيقة."
    }

# ========== BULK COURSE RESCHEDULE ENDPOINT ==========

@app.post("/api/courses/{course_name}/reschedule-all")
def bulk_reschedule_course(course_name: str, req: BulkCourseRescheduleRequest):
    """
    Updates the recurring weekly schedule for an entire course and updates all upcoming scheduled lectures.
    Broadcasts postponement/update notification to all enrolled students.
    """
    conn = get_db()
    c = conn.cursor()
    
    new_time_str = req.new_scheduled_time or (f"{req.new_day or ''} {req.new_time or ''}").strip()
    reason_str = req.reason or "تنسيق المواعيد الأسبوعية بناءً على طلب أولياء الأمور"
    
    c.execute("UPDATE courses SET default_time = ? WHERE name = ?", (new_time_str, course_name))
    
    # Update future scheduled lectures
    c.execute("""
    UPDATE lectures 
    SET status = 'postponed', scheduled_time = ?, postpone_reason = ?
    WHERE course_name = ? AND status IN ('scheduled', 'postponed')
    """, (new_time_str, reason_str, course_name))
    updated_lectures = c.rowcount
    
    # Broadcast notification to enrolled students
    c.execute("SELECT student_id FROM enrollments WHERE course_name = ?", (course_name,))
    students = c.fetchall()
    for s in students:
        c.execute("""
        INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
        VALUES (
            ?,
            ?,
            'تعديل الموعد الأسبوعي المعتمد للمسار',
            ?,
            'postpone',
            '/student.html'
        )
        """, (s["student_id"], course_name, f"عزيزي ولي الأمر والطالب، تم تحديث الموعد الأسبوعي لمسار ({course_name}) ليصبح: {new_time_str}. السبب: {reason_str}. لن يتم احتساب أي غياب."))
        
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"تم تحديث موعد مسار ({course_name}) بنجاح وإرسال إشعار فوري للطلاب.",
        "updated_lectures_count": updated_lectures,
        "notifications_sent": len(students)
    }

# ========== QUIZZES & ASSESSMENTS ENGINE ==========

@app.get("/api/courses/{course_name}/quizzes")
def get_course_quizzes(course_name: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM quizzes WHERE course_name = ? ORDER BY block_number ASC", (course_name,))
    quizzes = [dict(q) for q in c.fetchall()]
    conn.close()
    return quizzes

@app.get("/api/quizzes/{quiz_id}")
def get_quiz_details(quiz_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    quiz = c.fetchone()
    if not quiz:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    c.execute("SELECT id, quiz_id, question_text, option_a, option_b, option_c, option_d, points FROM quiz_questions WHERE quiz_id = ?", (quiz_id,))
    raw_questions = c.fetchall()
    
    questions = []
    for q in raw_questions:
        opts = [q["option_a"], q["option_b"]]
        if q["option_c"]: opts.append(q["option_c"])
        if q["option_d"]: opts.append(q["option_d"])
        questions.append({
            "id": q["id"],
            "quiz_id": q["quiz_id"],
            "question_text": q["question_text"],
            "options": opts,
            "points": q["points"]
        })
    
    conn.close()
    return {
        "id": quiz["id"],
        "title": quiz["title"],
        "course_name": quiz["course_name"],
        "block_number": quiz["block_number"],
        "passing_score": 70,
        "questions": questions
    }

@app.post("/api/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, req: SubmitQuizRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    quiz = c.fetchone()
    if not quiz:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    c.execute("SELECT id, correct_option, points FROM quiz_questions WHERE quiz_id = ?", (quiz_id,))
    questions = c.fetchall()
    
    total_score = 0
    max_score = sum(q["points"] for q in questions)
    option_letters = ['A', 'B', 'C', 'D']
    
    for q in questions:
        qid = str(q["id"])
        selected = req.answers.get(qid)
        if selected is not None:
            selected_letter = None
            if isinstance(selected, int) and 0 <= selected < 4:
                selected_letter = option_letters[selected]
            elif isinstance(selected, str) and selected.isdigit() and 0 <= int(selected) < 4:
                selected_letter = option_letters[int(selected)]
            elif isinstance(selected, str):
                selected_letter = selected.upper()
                
            if selected_letter and selected_letter == q["correct_option"].upper():
                total_score += q["points"]
            
    percentage = round((total_score / max(max_score, 1)) * 100, 1)
    passed = (percentage >= 60.0)
    status = "passed" if passed else "retake"
    
    c.execute("""
    INSERT INTO quiz_submissions (quiz_id, student_id, score, max_score, percentage, status, answers_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (quiz_id, req.student_id, total_score, max_score, percentage, status, json.dumps(req.answers)))
    
    # Send notification
    c.execute("""
    INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
    VALUES (
        ?,
        ?,
        'نتيجة الاختبار الشهري',
        ?,
        'quiz',
        '/student.html'
    )
    """, (req.student_id, quiz["course_name"], f"أحسنت يا بطل! حصلت على درجة {total_score} من {max_score} ({percentage}%) في {quiz['title']}."))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "score": total_score,
        "total_questions": len(questions),
        "max_score": max_score,
        "percentage": percentage,
        "passed": passed,
        "status": status,
        "message": f"تم تصحيح الاختبار بنجاح! نتيجتك: {total_score} من {max_score} ({percentage}%)"
    }

@app.get("/api/student/{student_id}/quizzes")
def get_student_quizzes(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
    SELECT qs.*, q.title as quiz_title, q.course_name, q.block_number
    FROM quiz_submissions qs
    JOIN quizzes q ON qs.quiz_id = q.id
    WHERE qs.student_id = ?
    ORDER BY qs.id DESC
    """, (student_id,))
    submissions = [dict(s) for s in c.fetchall()]
    conn.close()
    return submissions

# ========== SUPPORT & TICKETS ENGINE ==========

@app.post("/api/support/tickets")
def create_support_ticket(req: CreateSupportTicketRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT name FROM students WHERE id = ?", (req.student_id,))
    student = c.fetchone()
    st_name = student["name"] if student else "طالب"
    
    c.execute("""
    INSERT INTO support_tickets (student_id, student_name, course_name, category, subject, message, status)
    VALUES (?, ?, ?, ?, ?, ?, 'open')
    """, (req.student_id, st_name, req.course_name, req.category, req.subject, req.message))
    
    ticket_id = cursor_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "تم استلام استفسارك/شكواك بنجاح وسيتم الرد من إدارة الأكاديمية خلال ساعات قليلة."
    }

@app.get("/api/admin/support/tickets")
def get_admin_support_tickets(status: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    if status and status != "all":
        c.execute("SELECT * FROM support_tickets WHERE status = ? ORDER BY id DESC", (status,))
    else:
        c.execute("SELECT * FROM support_tickets ORDER BY id DESC")
    tickets = [dict(t) for t in c.fetchall()]
    conn.close()
    return tickets

@app.post("/api/admin/support/tickets/{ticket_id}/reply")
def reply_support_ticket(ticket_id: int, req: ReplySupportTicketRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
    ticket = c.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    c.execute("""
    UPDATE support_tickets 
    SET admin_reply = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (req.admin_reply, req.status, ticket_id))
    
    # Notify student
    c.execute("""
    INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
    VALUES (
        ?,
        ?,
        'رد جديد على تذكرة الدعم الفني',
        ?,
        'support',
        '/student.html'
    )
    """, (ticket["student_id"], ticket["course_name"], f"تم الرد على استفسارك بخصوص ({ticket['subject']}): {req.admin_reply}"))
    
    conn.commit()
    conn.close()
    return {"success": True, "message": "تم إرسال الرد للطالب وتحديث حالة التذكرة بنجاح."}

@app.get("/api/student/{student_id}/support/tickets")
def get_student_support_tickets(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM support_tickets WHERE student_id = ? ORDER BY id DESC", (student_id,))
    tickets = [dict(t) for t in c.fetchall()]
    conn.close()
    return tickets

# ========== EXCEL SYNC & EXPORT ENDPOINTS ==========

@app.get("/api/admin/export/attendance-excel")
def export_attendance_excel():
    """
    Generates and streams an Excel file containing comprehensive attendance logs.
    """
    conn = get_db()
    c = conn.cursor()
    
    c.execute("""
    SELECT 
        a.id, s.name as student_name, s.student_code, s.parent_phone, 
        a.course_name, l.title as lecture_title, l.lecture_number, 
        a.status as attendance_status, a.duration_minutes, a.joined_at
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN lectures l ON a.lecture_id = l.id
    ORDER BY a.id DESC
    """)
    rows = c.fetchall()
    conn.close()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "كشف الحضور والانصراف"
    
    headers = ["#", "اسم الطالب", "كود الطالب", "تليفون ولي الأمر", "المسار / الكورس", "المحاضرة", "رقم الحصة", "حالة الحضور", "المدة (دقيقة)", "وقت الانضمام"]
    ws.append(headers)
    
    for r in rows:
        ws.append([
            r["id"], r["student_name"], r["student_code"], r["parent_phone"],
            r["course_name"], r["lecture_title"], r["lecture_number"],
            r["attendance_status"], r["duration_minutes"], str(r["joined_at"] or "")
        ])
        
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    
    headers = {'Content-Disposition': 'attachment; filename="Monir_Academy_Attendance_Report.xlsx"'}
    return StreamingResponse(out, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.get("/api/admin/export/students-excel")
def export_students_excel():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
    SELECT 
        s.id, s.name, s.student_code, s.age, s.phone, s.parent_name, s.parent_phone,
        e.course_name, e.remaining_credits, e.current_surah, e.renewal_count, t.name as teacher_name
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.student_id
    LEFT JOIN teachers t ON e.teacher_id = t.id
    ORDER BY s.id ASC
    """)
    rows = c.fetchall()
    conn.close()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "بيانات الطلاب والمسارات"
    
    headers = ["#", "اسم الطالب", "كود الطالب", "السن", "تليفون الطالب", "ولي الأمر", "تليفون ولي الأمر", "المسار", "رصيد الحصص المتبقي", "السورة الحالية", "مرات التجديد", "المعلم المخصص"]
    ws.append(headers)
    
    for r in rows:
        ws.append([
            r["id"], r["name"], r["student_code"], r["age"], r["phone"], r["parent_name"], r["parent_phone"],
            r["course_name"] or "", r["remaining_credits"] or 0, r["current_surah"] or "", r["renewal_count"] or 0, r["teacher_name"] or ""
        ])
        
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    
    headers = {'Content-Disposition': 'attachment; filename="Monir_Academy_Students_Roster.xlsx"'}
    return StreamingResponse(out, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.post("/api/admin/import/students")
def import_students(students_list: List[StudentImportItem]):
    """
    Imports and auto-enrolls new students from Excel/JSON.
    """
    conn = get_db()
    c = conn.cursor()
    
    imported_count = 0
    for item in students_list:
        code = f"MNR-2026-{uuid.uuid4().hex[:4].upper()}"
        qr = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={code}"
        
        c.execute("""
        INSERT INTO students (name, student_code, age, phone, parent_name, parent_phone, qr_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (item.name, code, item.age, item.phone, item.parent_name, item.parent_phone, qr))
        
        student_id = c.lastrowid
        
        # Auto enroll
        c.execute("""
        INSERT INTO enrollments (student_id, course_name, teacher_id, unlocked_blocks, total_lectures_unlocked, remaining_credits, status)
        VALUES (?, ?, 1, 1, 4, 4, 'active')
        """, (student_id, item.course_name))
        
        imported_count += 1
        
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "imported_count": imported_count,
        "message": f"تم استيراد وتسجيل {imported_count} طالب بنجاح وتفعيل كروت الـ ID والمسارات تلقائياً."
    }

# ========== PAYMOB & WHATSAPP RECEIPT ENDPOINT ==========

@app.get("/api/payments/{transaction_id}/receipt")
def get_payment_receipt(transaction_id: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
    SELECT 
        p.*, s.name as student_name, s.student_code, s.parent_name, s.parent_phone
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.transaction_id = ?
    """, (transaction_id,))
    payment = c.fetchone()
    conn.close()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Receipt not found")
        
    p_dict = dict(payment)
    wa_text = f"إيصال سداد أكاديمية منير الذكية\nرقم الإيصال: {p_dict.get('receipt_number')}\nالطالب: {p_dict.get('student_name')} ({p_dict.get('student_code')})\nالمسار: {p_dict.get('course_name')}\nالمبلغ: {p_dict.get('amount')} ج.م\nرقم المعاملة: {transaction_id}\nالحالة: مدفوع بنجاح"
    p_dict["whatsapp_share_url"] = f"https://wa.me/?text={wa_text.replace(' ', '%20').replace(chr(10), '%0A')}"
    return p_dict

# ========== LIVE ATTENDANCE & POSTPONE ==========

@app.post("/api/lectures/{lecture_id}/join")
def join_lecture(lecture_id: int, req: JoinLectureRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM lectures WHERE id = ?", (lecture_id,))
    lec = c.fetchone()
    if not lec:
        conn.close()
        raise HTTPException(status_code=404, detail="Lecture not found")
        
    c_name = lec["course_name"]
    
    c.execute("SELECT id FROM attendance WHERE student_id = ? AND lecture_id = ?", (req.student_id, lecture_id))
    existing = c.fetchone()
    
    if existing:
        c.execute("""
        UPDATE attendance 
        SET status = 'present', joined_at = CURRENT_TIMESTAMP, duration_minutes = ?
        WHERE id = ?
        """, (req.duration_minutes, existing["id"]))
    else:
        c.execute("""
        INSERT INTO attendance (student_id, lecture_id, course_name, status, joined_at, duration_minutes)
        VALUES (?, ?, ?, 'present', CURRENT_TIMESTAMP, ?)
        """, (req.student_id, lecture_id, c_name, req.duration_minutes))
        
    c.execute("UPDATE lectures SET status = 'completed' WHERE id = ? AND status = 'live'", (lecture_id,))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "تم تسجيل حضورك بنجاح في المحاضرة!",
        "google_meet_url": lec["google_meet_url"]
    }

@app.post("/api/admin/lectures/save")
def admin_save_lecture(lec: dict = Body(...)):
    conn = get_db()
    c = conn.cursor()
    lec_id = lec.get("id")
    if lec_id:
        c.execute("""
            UPDATE lectures 
            SET title = ?, scheduled_time = ?, google_meet_url = ?, drive_recording_url = ?, drive_materials_url = ?, status = ?
            WHERE id = ?
        """, (lec.get("title"), lec.get("scheduled_time"), lec.get("google_meet_url"), lec.get("drive_recording_url"), lec.get("drive_materials_url"), lec.get("status", "scheduled"), lec_id))
    else:
        c.execute("""
            INSERT INTO lectures (course_name, lecture_number, title, block_number, scheduled_time, google_meet_url, drive_recording_url, drive_materials_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (lec.get("course_name"), lec.get("lecture_number", 1), lec.get("title"), lec.get("block_number", 1), lec.get("scheduled_time"), lec.get("google_meet_url"), lec.get("drive_recording_url"), lec.get("drive_materials_url"), lec.get("status", "scheduled")))
    conn.commit()
    conn.close()
    return {"success": True, "message": "تم حفظ المحاضرة وروابط الدرايف بنجاح"}

@app.post("/api/lectures/postpone")
def postpone_lecture(req: PostponeLectureRequest):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM lectures WHERE id = ?", (req.lecture_id,))
    lec = c.fetchone()
    if not lec:
        conn.close()
        raise HTTPException(status_code=404, detail="Lecture not found")
        
    c_name = lec["course_name"]
    
    c.execute("""
    UPDATE lectures 
    SET status = 'postponed', scheduled_time = ?, postpone_reason = ?, rescheduled_to = ?
    WHERE id = ?
    """, (req.new_scheduled_time, req.reason, req.new_scheduled_time, req.lecture_id))
    
    c.execute("UPDATE attendance SET status = 'excused' WHERE lecture_id = ?", (req.lecture_id,))
    
    c.execute("SELECT student_id FROM enrollments WHERE course_name = ?", (c_name,))
    enrolled_students = c.fetchall()
    
    for s in enrolled_students:
        c.execute("""
        INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
        VALUES (
            ?,
            ?,
            'تنبيه: تم تأجيل وتحديد موعد جديد للمحاضرة',
            ?,
            'postpone',
            '/student.html'
        )
        """, (s["student_id"], c_name, f"نحيطكم علماً بأنه تم تأجيل {lec['title']} في مسار ({c_name}) بسبب ({req.reason}). الموعد الجديد هو: {req.new_scheduled_time}. ولن يتم احتساب أي غياب عن الموعد السابق."))
        
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "تم تأجيل المحاضرة وإرسال إشعار فوري لجميع الطلاب المسجلين بالمسار مع عدم احتساب غياب.",
        "new_time": req.new_scheduled_time
    }

@app.get("/api/student/{student_id}/notifications")
def get_notifications(student_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM notifications WHERE student_id = ? ORDER BY id DESC", (student_id,))
    notifs = [dict(row) for row in c.fetchall()]
    conn.close()
    return notifs

# ========== PAYMOB CHECKOUT & WEBHOOK ==========

@app.post("/api/paymob/checkout")
def paymob_checkout(req: PaymobCheckoutRequest):
    res = paymob.create_paymob_order(req.student_id, req.course_name, req.block_to_unlock, req.payment_method)
    return res

@app.post("/api/paymob/webhook")
def paymob_webhook(req: PaymobWebhookRequest):
    res = paymob.process_paymob_success(req.transaction_id)
    return res

# ========== ADMIN OVERVIEW ==========

@app.get("/api/admin/overview")
def get_admin_overview(course: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM courses ORDER BY id ASC")
    courses = [dict(r) for r in c.fetchall()]
    available_courses = [r["name"] for r in courses]
    
    c.execute("SELECT COUNT(*) as total_students FROM students")
    total_students = c.fetchone()["total_students"]
    
    c.execute("SELECT * FROM students")
    students = [dict(s) for s in c.fetchall()]
    
    if course and course != "all":
        c.execute("SELECT * FROM lectures WHERE course_name = ? ORDER BY lecture_number ASC", (course,))
    else:
        c.execute("SELECT * FROM lectures ORDER BY course_name, lecture_number ASC")
    lectures = [dict(l) for l in c.fetchall()]
    
    c.execute("""
    SELECT a.*, s.name as student_name, l.title as lecture_title
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN lectures l ON a.lecture_id = l.id
    ORDER BY a.id DESC
    """)
    attendance_logs = [dict(a) for a in c.fetchall()]
    
    c.execute("""
    SELECT p.*, s.name as student_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    ORDER BY p.id DESC
    """)
    payments = [dict(p) for p in c.fetchall()]
    
    c.execute("SELECT * FROM teachers ORDER BY id ASC")
    teachers = [dict(t) for t in c.fetchall()]
    
    c.execute("SELECT COUNT(*) as open_tickets FROM support_tickets WHERE status = 'open'")
    open_tickets = c.fetchone()["open_tickets"]
    
    conn.close()
    return {
        "available_courses": available_courses,
        "courses_list": courses,
        "selected_course": course or "all",
        "total_students": total_students,
        "total_active_lectures": len(lectures),
        "teachers": teachers,
        "open_tickets_count": open_tickets,
        "students": students,
        "lectures": lectures,
        "attendance_logs": attendance_logs,
        "payments": payments
    }

@app.get("/api/admin/db/export")
def export_database():
    conn = get_db()
    c = conn.cursor()
    tables = ['students', 'teachers', 'courses', 'enrollments', 'lectures', 'attendance', 'quizzes', 'quiz_questions', 'quiz_submissions', 'support_tickets', 'notifications', 'payments', 'teacher_payouts', 'users']
    db_dump = {
        "meta": {
            "exported_at": datetime.now().isoformat(),
            "version": "3.0.0",
            "system": "Monir Smart LMS"
        }
    }
    for tbl in tables:
        try:
            c.execute(f"SELECT * FROM {tbl}")
            db_dump[tbl] = [dict(r) for r in c.fetchall()]
        except Exception:
            db_dump[tbl] = []
    conn.close()
    return db_dump

# Mount Frontend Static Directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    images_dir = os.path.join(FRONTEND_DIR, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="images")
    css_dir = os.path.join(FRONTEND_DIR, "css")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")

@app.get("/")
@app.get("/index.html")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/student.html")
def serve_student():
    return FileResponse(os.path.join(FRONTEND_DIR, "student.html"))

@app.get("/teacher.html")
def serve_teacher():
    return FileResponse(os.path.join(FRONTEND_DIR, "teacher.html"))

@app.get("/admin.html")
def serve_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))

@app.get("/course.html")
def serve_course():
    return FileResponse(os.path.join(FRONTEND_DIR, "course.html"))

@app.get("/login.html")
def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))

@app.get("/register.html")
def serve_register():
    return FileResponse(os.path.join(FRONTEND_DIR, "register.html"))

@app.get("/admin-login.html")
def serve_admin_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin-login.html"))

@app.get("/mounir_os.html")
def serve_mounir_os():
    return FileResponse(os.path.join(os.path.dirname(FRONTEND_DIR), "mounir_os.html"))

