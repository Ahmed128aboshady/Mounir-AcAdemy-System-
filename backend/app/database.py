import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "smart_lms.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Teachers Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        bio TEXT,
        rate_per_session REAL DEFAULT 150.0,
        rate_per_private_session REAL DEFAULT 80.0,
        late_count INTEGER DEFAULT 0,
        cancellation_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 2. Students Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_code TEXT UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        phone TEXT NOT NULL,
        parent_name TEXT NOT NULL,
        parent_phone TEXT NOT NULL,
        qr_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 3. Courses Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        track_name TEXT NOT NULL,
        target_age TEXT NOT NULL,
        min_age INTEGER DEFAULT 10,
        max_age INTEGER DEFAULT 16,
        max_capacity INTEGER DEFAULT 8,
        default_duration_minutes INTEGER DEFAULT 60,
        description TEXT,
        icon TEXT,
        price_per_block REAL DEFAULT 450.0,
        total_lectures INTEGER DEFAULT 8,
        default_day TEXT DEFAULT 'السبت',
        default_time TEXT DEFAULT '17:00'
    )
    ''')
    
    # 4. Student Enrollments (Multi-course & Quran individual credit system)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_name TEXT NOT NULL,
        teacher_id INTEGER DEFAULT 1,
        unlocked_blocks INTEGER DEFAULT 1,
        total_lectures_unlocked INTEGER DEFAULT 4,
        renewal_count INTEGER DEFAULT 0,
        remaining_credits INTEGER DEFAULT 4,
        excuse_count INTEGER DEFAULT 0,
        max_allowed_excuses INTEGER DEFAULT 1,
        current_surah TEXT DEFAULT 'سورة الرحمن - المرحلة الأولى',
        status TEXT DEFAULT 'active',
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (course_name) REFERENCES courses(name),
        UNIQUE(student_id, course_name)
    )
    ''')
    
    # 5. Lectures Table (1 to 8 per course + Google Drive and Calendar integration)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS lectures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        lecture_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        block_number INTEGER NOT NULL, -- 1 for (1-4), 2 for (5-8)
        scheduled_time TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        google_meet_url TEXT NOT NULL,
        drive_recording_url TEXT DEFAULT '',
        drive_materials_url TEXT DEFAULT '',
        calendar_title TEXT DEFAULT '',
        status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed', 'postponed'
        postpone_reason TEXT,
        rescheduled_to TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_name) REFERENCES courses(name)
    )
    ''')
    
    # 6. Attendance Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        lecture_id INTEGER NOT NULL,
        course_name TEXT NOT NULL,
        status TEXT DEFAULT 'absent', -- 'present', 'absent', 'excused'
        joined_at TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (lecture_id) REFERENCES lectures(id)
    )
    ''')
    
    # 7. Quizzes Table (In-App Online Assessments)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        block_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        total_score INTEGER DEFAULT 50,
        time_limit_minutes INTEGER DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_name) REFERENCES courses(name)
    )
    ''')

    # 8. Quiz Questions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
        points INTEGER DEFAULT 10,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
    ''')

    # 9. Quiz Submissions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quiz_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        percentage REAL NOT NULL,
        status TEXT DEFAULT 'passed', -- 'passed', 'retake'
        answers_json TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    ''')

    # 10. Support & Complaints Tickets Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        course_name TEXT,
        category TEXT NOT NULL, -- 'technical', 'teacher', 'schedule', 'billing', 'general'
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
        admin_reply TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    ''')

    # 11. Notifications Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_name TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL, -- 'postpone', 'renewal', 'quiz', 'support', 'general'
        action_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    ''')
    
    # 12. Paymob Payments & Digital Receipts Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'EGP',
        block_unlocked INTEGER NOT NULL,
        transaction_id TEXT UNIQUE,
        receipt_number TEXT UNIQUE,
        payment_method TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        whatsapp_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    ''')

    # 13. Teacher Payouts & Financial Settlements Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teacher_payouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        sessions_count INTEGER NOT NULL,
        period_month TEXT NOT NULL,
        status TEXT DEFAULT 'paid', -- 'pending', 'paid'
        payment_method TEXT DEFAULT 'instapay', -- 'instapay', 'vodafone_cash', 'bank_transfer'
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )
    ''')

    # Run safe migrations for existing databases
    def safe_add_col(table, col_def):
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
        except Exception:
            pass

    safe_add_col("courses", "min_age INTEGER DEFAULT 10")
    safe_add_col("courses", "max_age INTEGER DEFAULT 16")
    safe_add_col("courses", "max_capacity INTEGER DEFAULT 8")
    safe_add_col("courses", "default_duration_minutes INTEGER DEFAULT 60")
    
    safe_add_col("teachers", "rate_per_session REAL DEFAULT 150.0")
    safe_add_col("teachers", "rate_per_private_session REAL DEFAULT 80.0")
    safe_add_col("teachers", "late_count INTEGER DEFAULT 0")
    safe_add_col("teachers", "cancellation_count INTEGER DEFAULT 0")
    
    safe_add_col("lectures", "duration_minutes INTEGER DEFAULT 60")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema upgraded successfully!")
