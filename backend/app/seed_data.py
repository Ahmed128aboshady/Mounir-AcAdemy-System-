from database import get_db, init_db
import sys
sys.stdout.reconfigure(encoding='utf-8')

def seed_all():
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Clear tables
    cursor.execute("DELETE FROM teachers")
    cursor.execute("DELETE FROM students")
    cursor.execute("DELETE FROM courses")
    cursor.execute("DELETE FROM enrollments")
    cursor.execute("DELETE FROM lectures")
    cursor.execute("DELETE FROM attendance")
    cursor.execute("DELETE FROM quizzes")
    cursor.execute("DELETE FROM quiz_questions")
    cursor.execute("DELETE FROM quiz_submissions")
    cursor.execute("DELETE FROM support_tickets")
    cursor.execute("DELETE FROM notifications")
    cursor.execute("DELETE FROM payments")
    
    # 2. Insert Teachers (with rates and accountability tracking)
    teachers = [
        # (id, name, specialty, email, phone, bio, rate_per_session, rate_per_private_session, late_count, cancellation_count, active)
        (1, 'الشيخ أحمد منصور', 'مسار القرآن الكريم والقراءات والتجويد', 'ahmed.mansour@monir-academy.com', '01001112233', 'إجازة في القراءات العشر وخبرة 12 سنة في تدريب وتدبر القرآن للأطفال والشباب.', 150.0, 80.0, 0, 0, 1),
        (2, 'أ. محمود سامي', 'مسار كتالوج الشباب وبناء الشخصية القيادية', 'mahmoud.sami@monir-academy.com', '01004445566', 'استشاري تربوي وتطوير مهارات القيادة والذكاء المالي للمراهقين.', 180.0, 90.0, 1, 0, 1),
        (3, 'أ. سارة عبدالحميد', 'مسار وعي وأمان للبنات والصحة النفسية', 'sara.abdelhamid@monir-academy.com', '01007778899', 'أخصائية نفسية وتربوية معتمدة ومتخصصة في توجيه الفتيات.', 160.0, 80.0, 0, 1, 1),
        (4, 'أ. يوسف إبراهيم', 'مسار السيرة النبوية وقصص الأنبياء', 'youssef.ibrahim@monir-academy.com', '01009990011', 'باحث في التاريخ الإسلامي وأسلوب الحكي الدرامي للناشئة.', 140.0, 70.0, 2, 1, 1),
    ]
    for t in teachers:
        cursor.execute('''
        INSERT OR REPLACE INTO teachers (id, name, specialty, email, phone, bio, rate_per_session, rate_per_private_session, late_count, cancellation_count, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', t)

    # 3. Insert Master Courses (with min/max age, max_capacity, and duration)
    courses = [
        # (name, track, target_age, min_age, max_age, max_capacity, default_duration, desc, icon, price, total_lec, day, time)
        ('كتالوج الشباب 2.0', 'مسار البنين', '12 - 16 سنة', 12, 16, 6, 60, 'بناء الشخصية القيادية والذكاء المالي والتعامل مع الضغوط.', '', 450.0, 8, 'السبت', '18:00'),
        ('وعي وأمان (للبنات)', 'مسار الفتيات', '11 - 15 سنة', 11, 15, 6, 60, 'الأمان النفسي والرقمي، العلاقات الصحية، والأنوثة الواعية.', '', 450.0, 8, 'الجمعة', '17:00'),
        ('قصص الأنبياء (سر الحاج إسماعيل)', 'مسار الناشئة', '8 - 12 سنة', 8, 12, 5, 45, 'استخلاص القيم والدروس الحياتية من سير الأنبياء بطريقة درامية.', '', 400.0, 8, 'السبت', '16:00'),
        ('مسار القرآن الكريم والتدبر', 'مسار القرآن الفردي', '6 - 18 سنة', 6, 18, 1, 45, 'حفظ متقن وتدبر عملي يومي لسور الفاتحة والكهف وجزء عم.', '', 350.0, 8, 'الأحد', '18:30'),
    ]
    
    for c in courses:
        cursor.execute('''
        INSERT OR REPLACE INTO courses (name, track_name, target_age, min_age, max_age, max_capacity, default_duration_minutes, description, icon, price_per_block, total_lectures, default_day, default_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', c)
        
    # 4. Insert Students
    students = [
        (1, 'عمر أحمد علي', 'MNR-2026-1042', 14, '01025802503', 'أحمد علي حسن', '01002530197', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-1042'),
        (2, 'مريم حسام الدين', 'MNR-2026-2055', 13, '01145892301', 'حسام الدين فؤاد', '01123456789', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-2055'),
        (3, 'يوسف محمود سالم', 'MNR-2026-3012', 9, '01234567890', 'محمود سالم', '01298765432', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-3012'),
        (4, 'عبدالرحمن خالد', 'MNR-2026-4088', 11, '01099887766', 'خالد عبدالرحيم', '01011223344', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-4088'),
        (5, 'حمزة عادل توفيق', 'MNR-2026-5120', 15, '01055566778', 'عادل توفيق النجار', '01055566778', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-5120'),
    ]
    for s in students:
        cursor.execute('''
        INSERT OR REPLACE INTO students (id, name, student_code, age, phone, parent_name, parent_phone, qr_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', s)

    # 5. Multi-Course Enrollments with Status & Quran Credits
    enrollments_data = [
        # (student_id, course_name, teacher_id, unlocked_blocks, total_lectures_unlocked, renewal_count, remaining_credits, excuse_count, current_surah, status)
        (1, 'كتالوج الشباب 2.0', 2, 2, 8, 1, 4, 0, 'المرحلة الثانية - القيادة', 'active'),
        (1, 'مسار القرآن الكريم والتدبر', 1, 1, 4, 0, 2, 0, 'سورة الرحمن - المرحلة الأولى', 'active'),
        
        (2, 'وعي وأمان (للبنات)', 3, 1, 4, 0, 4, 0, 'المرحلة الأولى - الوعي الذاتي', 'active'),
        (2, 'قصص الأنبياء (سر الحاج إسماعيل)', 4, 1, 4, 0, 4, 0, 'المرحلة الأولى - قصص البدايات', 'active'),
        
        (3, 'قصص الأنبياء (سر الحاج إسماعيل)', 4, 1, 4, 0, 4, 0, 'المرحلة الأولى - قصص البدايات', 'active'),
        (4, 'مسار القرآن الكريم والتدبر', 1, 2, 8, 1, 1, 1, 'سورة ق - المرحلة الثانية', 'active'),
        (5, 'كتالوج الشباب 2.0', 2, 1, 4, 0, 0, 2, 'المرحلة الأولى', 'expired'), # Paused/Expired student!
    ]
    
    for e in enrollments_data:
        cursor.execute('''
        INSERT OR REPLACE INTO enrollments (
            student_id, course_name, teacher_id, unlocked_blocks, total_lectures_unlocked, 
            renewal_count, remaining_credits, excuse_count, current_surah, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', e)

    # 6. Sample Teacher Payouts (Previous Settlements)
    sample_payouts = [
        (1, 1, 1200.0, 8, '2026-08', 'paid', 'instapay', 'TXN-PAYOUT-202608-01', 'مستحقات شهر أغسطس 2026 (8 حصص منفذة)'),
        (2, 2, 1440.0, 8, '2026-08', 'paid', 'vodafone_cash', 'TXN-PAYOUT-202608-02', 'مستحقات شهر أغسطس 2026 (8 حصص منفذة)'),
    ]
    for p in sample_payouts:
        cursor.execute('''
        INSERT OR REPLACE INTO teacher_payouts (id, teacher_id, amount, sessions_count, period_month, status, payment_method, reference_number, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', p)

    # 6. Insert Sample Paymob Renewals & Digital Receipts
    sample_payments = [
        (1, 'كتالوج الشباب 2.0', 450.0, 2, 'PAYMOB-KTG-9941', 'REC-2026-0814', 'card', 'completed', 'تم استلام مبلغ 450 ج.م بنجاح لتجديد مسار كتالوج الشباب 2.0 (المرحلة الثانية) للطالب عمر أحمد علي.'),
        (4, 'مسار القرآن الكريم والتدبر', 350.0, 2, 'PAYMOB-QRN-7712', 'REC-2026-0822', 'vodafone_cash', 'completed', 'تم استلام مبلغ 350 ج.م بنجاح لتجديد مسار القرآن الكريم (المرحلة الثانية) للطالب عبدالرحمن خالد.'),
    ]
    for p in sample_payments:
        cursor.execute('''
        INSERT OR REPLACE INTO payments (
            student_id, course_name, amount, block_unlocked, transaction_id, 
            receipt_number, payment_method, status, whatsapp_message
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', p)

    # 7. Insert 8 Lectures per course (32 total) with Drive Materials & Calendar Links
    all_courses_lectures = {
        'كتالوج الشباب 2.0': [
            (1, 'المحاضرة 1: لغز الانطلاق وبناء الشخصية القيادية', 'فهم التغيرات النفسية والجسدية وطريقة التفكير الإيجابي.', 1, '2026-09-10 18:00', 'https://meet.google.com/katalog-lec1', 'completed', 'https://drive.google.com/drive/folders/katalog-rec-1', 'https://drive.google.com/drive/folders/katalog-mat-1'),
            (2, 'المحاضرة 2: بوصلة المراهق والتعامل مع الضغوط', 'كيف تضبط مشاعرك وتتغلب على التشتت وضغط الأقران.', 1, '2026-09-17 18:00', 'https://meet.google.com/katalog-lec2', 'completed', 'https://drive.google.com/drive/folders/katalog-rec-2', 'https://drive.google.com/drive/folders/katalog-mat-2'),
            (3, 'المحاضرة 3: فن إدارة الوقت والمذاكرة الذكية', 'استراتيجيات تنظيم اليوم والتحصيل الدراسي بأقل مجهود.', 1, '2026-09-24 18:00', 'https://meet.google.com/katalog-lec3', 'live', '', 'https://drive.google.com/drive/folders/katalog-mat-3'),
            (4, 'المحاضرة 4: الحصن الرقمي والأمان الإلكتروني', 'حماية نفسك من مخاطر السوشيال ميديا والألعاب الإلكترونية.', 1, '2026-10-01 18:00', 'https://meet.google.com/katalog-lec4', 'scheduled', '', 'https://drive.google.com/drive/folders/katalog-mat-4'),
            (5, 'المحاضرة 5: الثقة بالنفس والتحدث أمام الجمهور', 'كسر حاجز الخوف والتعبير عن الأفكار بقوة وثبات.', 2, '2026-10-08 18:00', 'https://meet.google.com/katalog-lec5', 'scheduled', '', 'https://drive.google.com/drive/folders/katalog-mat-5'),
            (6, 'المحاضرة 6: الذكاء المالي وتأسيس المشاريع الصغيرة', 'مفاهيم الادخار والاستثمار والتفكير الريادي للشباب.', 2, '2026-10-15 18:00', 'https://meet.google.com/katalog-lec6', 'scheduled', '', 'https://drive.google.com/drive/folders/katalog-mat-6'),
            (7, 'المحاضرة 7: فن الحوار وبناء علاقة قوية مع الأهل', 'كيف تفهم والديك وتكسب ثقتهم وتحل الخلافات بهدوء.', 2, '2026-10-22 18:00', 'https://meet.google.com/katalog-lec7', 'scheduled', '', 'https://drive.google.com/drive/folders/katalog-mat-7'),
            (8, 'المحاضرة 8: مشروع التخرج وحفل الختام والتكريم', 'تقديم خطة الحياة الشخصية واستلام شهادة إتمام المسار.', 2, '2026-10-29 18:00', 'https://meet.google.com/katalog-lec8', 'scheduled', '', 'https://drive.google.com/drive/folders/katalog-mat-8'),
        ],
        'وعي وأمان (للبنات)': [
            (1, 'المحاضرة 1: لغز اختفاء فريدة واكتشاف القوة الذاتية', 'بناء التقدير الذاتي، حماية المشاعر، والاعتزاز بالهوية.', 1, '2026-09-11 17:00', 'https://meet.google.com/wa3y-lec1', 'completed', 'https://drive.google.com/drive/folders/wa3y-rec-1', 'https://drive.google.com/drive/folders/wa3y-mat-1'),
            (2, 'المحاضرة 2: الأمان العاطفي ودوائر العلاقات الصحية', 'كيف تختارين صديقاتك وتضعين حدوداً آمنة في التعامل.', 1, '2026-09-18 17:00', 'https://meet.google.com/wa3y-lec2', 'completed', 'https://drive.google.com/drive/folders/wa3y-rec-2', 'https://drive.google.com/drive/folders/wa3y-mat-2'),
            (3, 'المحاضرة 3: الخصوصية الرقمية والأمان في الفضاء الإلكتروني', 'قواعد الأمان على تطبيقات التواصل والتعامل مع الابتزاز الرقمي.', 1, '2026-09-25 17:00', 'https://meet.google.com/wa3y-lec3', 'live', '', 'https://drive.google.com/drive/folders/wa3y-mat-3'),
            (4, 'المحاضرة 4: الذكاء الوجداني وإدارة الضغوط المدرسية', 'تقنيات التوازن النفسي وتفريغ التوتر وبناء الهدوء الداخلي.', 1, '2026-10-02 17:00', 'https://meet.google.com/wa3y-lec4', 'scheduled', '', 'https://drive.google.com/drive/folders/wa3y-mat-4'),
            (5, 'المحاضرة 5: مهارات التواصل والإقناع ولغة الجسد', 'التعبير عن الرأي بلباقة وثقة في المدرسة ومع الأسرة.', 2, '2026-10-09 17:00', 'https://meet.google.com/wa3y-lec5', 'scheduled', '', 'https://drive.google.com/drive/folders/wa3y-mat-5'),
            (6, 'المحاضرة 6: التخطيط المستقبلي واكتشاف الشغف والمواهب', 'تحديد الأهداف وصناعة رؤية شخصية للمستقبل.', 2, '2026-10-16 17:00', 'https://meet.google.com/wa3y-lec6', 'scheduled', '', 'https://drive.google.com/drive/folders/wa3y-mat-6'),
            (7, 'المحاضرة 7: الأنوثة الواعية والجمال الحقيقي', 'فهم مفاهيم الأناقة الحقيقية، الصحة النفسية، والاعتزاز بالحجاب.', 2, '2026-10-23 17:00', 'https://meet.google.com/wa3y-lec7', 'scheduled', '', 'https://drive.google.com/drive/folders/wa3y-mat-7'),
            (8, 'المحاضرة 8: مشروع سفيرات الوعي وحفل التكريم والشهادات', 'عرض مبادرات الفتيات وحفل التخرج الرسمي.', 2, '2026-10-30 17:00', 'https://meet.google.com/wa3y-lec8', 'scheduled', '', 'https://drive.google.com/drive/folders/wa3y-mat-8'),
        ],
        'قصص الأنبياء (سر الحاج إسماعيل)': [
            (1, 'المحاضرة 1: لغز البداية وسر شجرة آدم عليه السلام', 'درس التوبة والمسؤولية والصدق مع النفس.', 1, '2026-09-12 16:00', 'https://meet.google.com/ismail-lec1', 'completed', 'https://drive.google.com/drive/folders/ismail-rec-1', 'https://drive.google.com/drive/folders/ismail-mat-1'),
            (2, 'المحاضرة 2: سفينة نوح عليه السلام والتحدي الأكبر', 'الصبر، الثبات على المبدأ، وبناء الأمل في الأزمات.', 1, '2026-09-19 16:00', 'https://meet.google.com/ismail-lec2', 'completed', 'https://drive.google.com/drive/folders/ismail-rec-2', 'https://drive.google.com/drive/folders/ismail-mat-2'),
            (3, 'المحاضرة 3: خليل الله إبراهيم عليه السلام واليقين العظيم', 'استخدام العقل في البحث عن الحقيقة، والتضحية والشجاعة.', 1, '2026-09-26 16:00', 'https://meet.google.com/ismail-lec3', 'live', '', 'https://drive.google.com/drive/folders/ismail-mat-3'),
            (4, 'المحاضرة 4: يوسف الصديق عليه السلام من الجب إلى القصر', 'إدارة المشاعر، العفو عند المقدرة، والأمانة والإتقان.', 1, '2026-10-03 16:00', 'https://meet.google.com/ismail-lec4', 'scheduled', '', 'https://drive.google.com/drive/folders/ismail-mat-4'),
            (5, 'المحاضرة 5: موسى كليم الله عليه السلام ومواجهة فرعون', 'الشجاعة في قول الحق والثقة المطلقة في نصر الله.', 2, '2026-10-10 16:00', 'https://meet.google.com/ismail-lec5', 'scheduled', '', 'https://drive.google.com/drive/folders/ismail-mat-5'),
            (6, 'المحاضرة 6: سليمان وداود عليهما السلام وسر القوة والشكر', 'تسخير النعم، العدالة، والحكمة في الحكم والقيادة.', 2, '2026-10-17 16:00', 'https://meet.google.com/ismail-lec6', 'scheduled', '', 'https://drive.google.com/drive/folders/ismail-mat-6'),
            (7, 'المحاضرة 7: يونس وأيوب عليهما السلام في بطن الحوت والصبر', 'قوة الدعاء والتسبيح والتفاؤل في أصعب اللحظات.', 2, '2026-10-24 16:00', 'https://meet.google.com/ismail-lec7', 'scheduled', '', 'https://drive.google.com/drive/folders/ismail-mat-7'),
            (8, 'المحاضرة 8: الحبيب محمد ﷺ وسر رسالة النور والختام', 'الرحمة، الخلق العظيم، وعهد العمل بسنة الحبيب.', 2, '2026-10-31 16:00', 'https://meet.google.com/ismail-lec8', 'scheduled', '', 'https://drive.google.com/drive/folders/ismail-mat-8'),
        ],
        'مسار القرآن الكريم والتدبر': [
            (1, 'المحاضرة 1: مفاتيح تدبر الفاتحة وسر أم الكتاب', 'تطبيق عملي لأسرار الحمد والرحمة والاستعانة اليومية.', 1, '2026-09-13 18:30', 'https://meet.google.com/quran-lec1', 'completed', 'https://drive.google.com/drive/folders/quran-rec-1', 'https://drive.google.com/drive/folders/quran-mat-1'),
            (2, 'المحاضرة 2: قصص سورة الكهف والفتن الأربعة', 'تثبيت وحفظ وتدبر سورة الكهف وأسرار النجاة.', 1, '2026-09-20 18:30', 'https://meet.google.com/quran-lec2', 'completed', 'https://drive.google.com/drive/folders/quran-rec-2', 'https://drive.google.com/drive/folders/quran-mat-2'),
            (3, 'المحاضرة 3: سورة الملك وحصن المسلم اليومي', 'ضبط التجويد ومخارج الحروف مع فهم الآيات المنجية.', 1, '2026-09-27 18:30', 'https://meet.google.com/quran-lec3', 'live', '', 'https://drive.google.com/drive/folders/quran-mat-3'),
            (4, 'المحاضرة 4: رحلة مع جزء عم والآيات الكونية', 'تثبيت الحفظ مع ربط الآيات بالكون والإيمان العملي.', 1, '2026-10-04 18:30', 'https://meet.google.com/quran-lec4', 'scheduled', '', 'https://drive.google.com/drive/folders/quran-mat-4'),
            (5, 'المحاضرة 5: روائع سورة يس وقلب القرآن', 'قواعد التلاوة المتقنة وأسرار البعث واليقين.', 2, '2026-10-11 18:30', 'https://meet.google.com/quran-lec5', 'scheduled', '', 'https://drive.google.com/drive/folders/quran-rec-5', 'https://drive.google.com/drive/folders/quran-mat-5'),
            (6, 'المحاضرة 6: سورة الرحمن وأسرار نعم الله المتجددة', 'تدبر جمالي وصوتي مع تصحيح الأحكام والتلاوة الخاشعة.', 2, '2026-10-18 18:30', 'https://meet.google.com/quran-lec6', 'scheduled', '', 'https://drive.google.com/drive/folders/quran-mat-6'),
            (7, 'المحاضرة 7: أخلاق أهل القرآن وتطبيقاتها في الحياة', 'كيف تجعل القرآن يمشي على الأرض في سلوكك اليومي.', 2, '2026-10-25 18:30', 'https://meet.google.com/quran-lec7', 'scheduled', '', 'https://drive.google.com/drive/folders/quran-mat-7'),
            (8, 'المحاضرة 8: الختمة المباركة وتوزيع إجازات الحفظ والتلاوة', 'حفل تكريم حفظة المسار وإجازات التلاوة المعتمدة.', 2, '2026-11-01 18:30', 'https://meet.google.com/quran-lec8', 'scheduled', '', 'https://drive.google.com/drive/folders/quran-mat-8'),
        ],
    }
    
    global_lec_id = 1
    for c_name, lecs in all_courses_lectures.items():
        for l in lecs:
            cursor.execute('''
            INSERT OR REPLACE INTO lectures (
                id, course_name, lecture_number, title, description, block_number, 
                scheduled_time, google_meet_url, status, drive_recording_url, drive_materials_url
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ''', (global_lec_id, c_name, l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7], l[8]))
            
            # Seed attendance logs
            if c_name == 'كتالوج الشباب 2.0' and l[0] in [1, 2]:
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (1, ?, ?, 'present', 60)", (global_lec_id, c_name))
            if c_name == 'مسار القرآن الكريم والتدبر' and l[0] == 1:
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (1, ?, ?, 'present', 60)", (global_lec_id, c_name))
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (4, ?, ?, 'present', 60)", (global_lec_id, c_name))
            if c_name == 'وعي وأمان (للبنات)' and l[0] in [1, 2]:
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (2, ?, ?, 'present', 60)", (global_lec_id, c_name))
            if c_name == 'قصص الأنبياء (سر الحاج إسماعيل)' and l[0] in [1, 2]:
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (2, ?, ?, 'present', 55)", (global_lec_id, c_name))
                cursor.execute("INSERT OR REPLACE INTO attendance (student_id, lecture_id, course_name, status, duration_minutes) VALUES (3, ?, ?, 'present', 60)", (global_lec_id, c_name))

            global_lec_id += 1

    # 8. Seed In-App Quizzes & Questions
    cursor.execute('''
    INSERT OR REPLACE INTO quizzes (id, course_name, block_number, title, description, total_score, time_limit_minutes)
    VALUES (1, 'كتالوج الشباب 2.0', 1, 'اختبار نهاية المرحلة الأولى (المحاضرات 1 إلى 4)', 'تقييم شامل في مهارات إدارة الوقت، القيادة، والتعامل مع الضغوط والمشتتات.', 50, 20)
    ''')
    cursor.execute('''
    INSERT OR REPLACE INTO quizzes (id, course_name, block_number, title, description, total_score, time_limit_minutes)
    VALUES (2, 'مسار القرآن الكريم والتدبر', 1, 'اختبار التجويد والتدبر للمرحلة الأولى', 'تقييم في حفظ وتدبر سورة الفاتحة وجزء عم وتطبيق أحكام التلاوة.', 50, 20)
    ''')

    quiz_questions = [
        # Quiz 1 Questions
        (1, 1, 'ما هي القاعدة الأساسية في إدارة الوقت والتعامل مع الأولويات؟', 'إنجاز المهام غير الهامة أولاً', 'تقسيم المهام وتحديد الأهم فالمهم ومكافحة التسويف', 'الانتظار حتى ليلة الاختبار', 'الاعتماد الكلي على التنبيهات الخارجية', 'B', 10),
        (2, 1, 'كيف يتعامل القائد الصغير مع ضغط الأقران والتنمر؟', 'التراجع والاستسلام', 'الثبات على المبدأ والوضوح واستشارة الوالدين', 'رد الإساءة بإساءة أكبر', 'عزل النفس تماماً عن الأصدقاء', 'B', 10),
        (3, 1, 'ما هي الخطوة الأولى لحماية الخصوصية الرقمية على الإنترنت؟', 'مشاركة كلمات المرور مع الأصدقاء', 'تفعيل التحقق بخطوتين وعدم قبول طلبات مجهولة', 'نشر الموقع الجغرافي لحظياً', 'تحميل التطبيقات من مصادر غير موثوقة', 'B', 10),
        (4, 1, 'الذكاء الوجداني يعني القدرة على:', 'التحكم في الآخرين', 'فهم المشاعر الذاتية وإدارتها والتواصل بإيجابية', 'إخفاء المشاعر وعدم إظهارها أبداً', 'الغضب السريع عند مواجهة الصعوبات', 'B', 10),
        (5, 1, 'عند حدوث خلاف في الرأي مع الوالدين، التصرف الأمثل هو:', 'الصراخ وإغلاق الباب', 'الإنصات باحترام والتعبير عن الرأي بهدوء ولباقة', 'مقاطعة الكلام والانسحاب', 'تجاهل كلام الوالدين تماماً', 'B', 10),
        
        # Quiz 2 Questions (Quran)
        (6, 2, 'ما هو المعنى الإجمالي لقوله تعالى: (إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ)؟', 'إخلاص العبادة وطلب العون من الله وحده', 'الاعتماد على النفس فقط', 'طلب المساعدة من الناس دون الله', 'التردد في اتخاذ القرار', 'A', 10),
        (7, 2, 'كم عدد آيات سورة الفاتحة بالإجماع؟', '5 آيات', '6 آيات', '7 آيات مع البسملة', '8 آيات', 'C', 10),
        (8, 2, 'حكم النون الساكنة في كلمة (مَن يَقُولُ) هو:', 'إظهار حلقي', 'إدغام بغنة', 'إقلاب', 'إخفاء حقيقي', 'B', 10),
        (9, 2, 'الهدف الأساسي من تدبر القرآن الكريم هو:', 'الحفظ السريع فقط دون فهم', 'العمل بأوامر الله وتطبيق الأخلاق في السلوك اليومي', 'القراءة السريعة في المسابقات', 'حفظ معاني الكلمات دون تطبيق', 'B', 10),
        (10, 2, 'سورة الملك تُعرف بـ:', 'المنجية من عذاب القبر', 'سورة الصبر', 'سورة النصر', 'سورة التوبة', 'A', 10),
    ]
    for q in quiz_questions:
        cursor.execute('''
        INSERT OR REPLACE INTO quiz_questions (id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', q)

    # Seed Sample Quiz Submission for Omar
    cursor.execute('''
    INSERT OR REPLACE INTO quiz_submissions (id, quiz_id, student_id, score, max_score, percentage, status, answers_json)
    VALUES (1, 1, 1, 50, 50, 100.0, 'passed', '{"1":"B","2":"B","3":"B","4":"B","5":"B"}')
    ''')

    # 9. Seed Sample Support & Complaints Tickets
    sample_tickets = [
        (1, 1, 'عمر أحمد علي', 'كتالوج الشباب 2.0', 'schedule', 'استفسار عن موعد ورشة العمل الإضافية', 'هل سيتم إضافة حصة إضافية للتدريب على الإلقاء قبل مشروع التخرج؟', 'resolved', 'أهلاً بك يا بطل، نعم تم جدولة ورشة إضافية تفاعلية للتدريب على الإلقاء يوم الخميس القادم الساعة 6 مساءً.'),
        (2, 4, 'عبدالرحمن خالد', 'مسار القرآن الكريم والتدبر', 'teacher', 'طلب مراجعة أحكام التجويد لسورة ق', 'أحتاج مراجعة خاصة على مخارج الحروف مع فضيلة الشيخ أحمد منصور.', 'in_progress', 'تم إبلاغ الشيخ أحمد منصور وسيتم تخصيص أول 15 دقيقة من حصة الأحد القادمة لمراجعة مخارج الحروف.'),
    ]
    for st in sample_tickets:
        cursor.execute('''
        INSERT OR REPLACE INTO support_tickets (id, student_id, student_name, course_name, category, subject, message, status, admin_reply)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', st)

    # 10. Add Notifications
    for s in students:
        cursor.execute('''
        INSERT INTO notifications (student_id, title, message, type, action_url)
        VALUES (?, 'مرحباً بك في المنصة المطورة (v3.0)', 'تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.', 'general', '/student.html')
        ''', (s[0],))
        
    conn.commit()
    conn.close()
    print("Seeded Enterprise Multi-Course System with Teachers, Quran Credits, Quizzes, Tickets & Receipts successfully!")

if __name__ == "__main__":
    seed_all()

