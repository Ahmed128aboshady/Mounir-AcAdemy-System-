// Smart API Mock Engine for GitHub Pages Live Demo & Offline Testing
(function() {
    const DB_KEY = 'monir_smart_lms_db_v3';
    let DB = null;

    const DEFAULT_USERS = [{"id": 1, "username": "admin", "password_hash": "admin2026", "role": "admin", "related_id": 1, "full_name": "إدارة أكاديمية منير", "email": "admin@monir-academy.edu.eg", "phone": "01000000000", "status": "active"}, {"id": 2, "username": "eman.naggar", "password_hash": "123456", "role": "teacher", "related_id": 1, "teacher_id": 1, "full_name": "أ. إيمان النجار", "email": "eman.naggar@monir-academy.edu.eg", "phone": "01001112233", "status": "active"}, {"id": 3, "username": "sara.abdelmonem", "password_hash": "123456", "role": "teacher", "related_id": 2, "teacher_id": 2, "full_name": "د. سارة عبد المنعم", "email": "sara.abdelmonem@monir-academy.edu.eg", "phone": "01002223344", "status": "active"}, {"id": 4, "username": "omar.hossam", "password_hash": "123456", "role": "teacher", "related_id": 3, "teacher_id": 3, "full_name": "م. عمر حسام", "email": "omar.hossam@monir-academy.edu.eg", "phone": "01003334455", "status": "active"}, {"id": 5, "username": "youssef.hani", "password_hash": "123456", "role": "teacher", "related_id": 4, "teacher_id": 4, "full_name": "م. يوسف هاني", "email": "youssef.hani@monir-academy.edu.eg", "phone": "01004445566", "status": "active"}, {"id": 6, "username": "abdelrahman", "password_hash": "123456", "role": "student", "related_id": 1, "student_id": 1, "full_name": "عبدالرحمن خالد محمود", "email": "abdelrahman@student.monir.edu.eg", "phone": "01012345678", "status": "active"}, {"id": 7, "username": "mariam", "password_hash": "123456", "role": "student", "related_id": 2, "student_id": 2, "full_name": "مريم إبراهيم الدسوقي", "email": "mariam@student.monir.edu.eg", "phone": "01023456789", "status": "active"}, {"id": 8, "username": "ziad", "password_hash": "123456", "role": "student", "related_id": 3, "student_id": 3, "full_name": "زياد أحمد الشناوي", "email": "ziad@student.monir.edu.eg", "phone": "01034567890", "status": "active"}, {"id": 9, "username": "jana", "password_hash": "123456", "role": "student", "related_id": 4, "student_id": 4, "full_name": "جنى تامر الفقي", "email": "jana@student.monir.edu.eg", "phone": "01045678901", "status": "active"}, {"id": 10, "username": "hamza", "password_hash": "123456", "role": "student", "related_id": 5, "student_id": 5, "full_name": "حمزة عادل توفيق", "email": "hamza@student.monir.edu.eg", "phone": "01055566778", "status": "active"}];

    function initDb() {
        const stored = localStorage.getItem(DB_KEY) || localStorage.getItem('monir_smart_lms_db_v2');
        if (stored) {
            try { DB = JSON.parse(stored); } catch(e) {}
        }
        if (!DB) {
            DB = {"courses": [{"id": 9, "name": "كتالوج الشباب 2.0", "track_name": "مسار البنين", "target_age": "12 - 16 سنة", "description": "بناء الشخصية القيادية والذكاء المالي والتعامل مع الضغوط.", "icon": "", "price_per_block": 450.0, "total_lectures": 8, "default_day": "السبت", "default_time": "18:00", "min_age": 12, "max_age": 16, "max_capacity": 6, "default_duration_minutes": 60}, {"id": 10, "name": "وعي وأمان (للبنات)", "track_name": "مسار الفتيات", "target_age": "11 - 15 سنة", "description": "الأمان النفسي والرقمي، العلاقات الصحية، والأنوثة الواعية.", "icon": "", "price_per_block": 450.0, "total_lectures": 8, "default_day": "الجمعة", "default_time": "17:00", "min_age": 11, "max_age": 15, "max_capacity": 6, "default_duration_minutes": 60}, {"id": 11, "name": "قصص الأنبياء (سر الحاج إسماعيل)", "track_name": "مسار الناشئة", "target_age": "8 - 12 سنة", "description": "استخلاص القيم والدروس الحياتية من سير الأنبياء بطريقة درامية.", "icon": "", "price_per_block": 400.0, "total_lectures": 8, "default_day": "السبت", "default_time": "16:00", "min_age": 8, "max_age": 12, "max_capacity": 5, "default_duration_minutes": 45}, {"id": 12, "name": "مسار القرآن الكريم والتدبر", "track_name": "مسار القرآن الفردي", "target_age": "6 - 18 سنة", "description": "حفظ متقن وتدبر عملي يومي لسور الفاتحة والكهف وجزء عم.", "icon": "", "price_per_block": 350.0, "total_lectures": 8, "default_day": "الأحد", "default_time": "18:30", "min_age": 6, "max_age": 18, "max_capacity": 1, "default_duration_minutes": 45}], "teachers": [{"id": 1, "name": "الشيخ أحمد منصور", "specialty": "مسار القرآن الكريم والقراءات والتجويد", "email": "ahmed.mansour@monir-academy.com", "phone": "01001112233", "bio": "إجازة في القراءات العشر وخبرة 12 سنة في تدريب وتدبر القرآن للأطفال والشباب.", "active": 1, "created_at": "2026-09-10 13:25:42", "rate_per_session": 150.0, "rate_per_private_session": 80.0, "late_count": 0, "cancellation_count": 0}, {"id": 2, "name": "أ. محمود سامي", "specialty": "مسار كتالوج الشباب وبناء الشخصية القيادية", "email": "mahmoud.sami@monir-academy.com", "phone": "01004445566", "bio": "استشاري تربوي وتطوير مهارات القيادة والذكاء المالي للمراهقين.", "active": 1, "created_at": "2026-09-10 13:25:42", "rate_per_session": 180.0, "rate_per_private_session": 90.0, "late_count": 1, "cancellation_count": 0}, {"id": 3, "name": "أ. سارة عبدالحميد", "specialty": "مسار وعي وأمان للبنات والصحة النفسية", "email": "sara.abdelhamid@monir-academy.com", "phone": "01007778899", "bio": "أخصائية نفسية وتربوية معتمدة ومتخصصة في توجيه الفتيات.", "active": 1, "created_at": "2026-09-10 13:25:42", "rate_per_session": 160.0, "rate_per_private_session": 80.0, "late_count": 0, "cancellation_count": 1}, {"id": 4, "name": "أ. يوسف إبراهيم", "specialty": "مسار السيرة النبوية وقصص الأنبياء", "email": "youssef.ibrahim@monir-academy.com", "phone": "01009990011", "bio": "باحث في التاريخ الإسلامي وأسلوب الحكي الدرامي للناشئة.", "active": 1, "created_at": "2026-09-10 13:25:42", "rate_per_session": 140.0, "rate_per_private_session": 70.0, "late_count": 2, "cancellation_count": 1}], "students": [{"id": 1, "name": "عمر أحمد علي", "student_code": "MNR-2026-1042", "age": 14, "phone": "01025802503", "parent_name": "أحمد علي حسن", "parent_phone": "01002530197", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-1042", "created_at": "2026-09-10 13:25:42"}, {"id": 2, "name": "مريم حسام الدين", "student_code": "MNR-2026-2055", "age": 13, "phone": "01145892301", "parent_name": "حسام الدين فؤاد", "parent_phone": "01123456789", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-2055", "created_at": "2026-09-10 13:25:42"}, {"id": 3, "name": "يوسف محمود سالم", "student_code": "MNR-2026-3012", "age": 9, "phone": "01234567890", "parent_name": "محمود سالم", "parent_phone": "01298765432", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-3012", "created_at": "2026-09-10 13:25:42"}, {"id": 4, "name": "عبدالرحمن خالد", "student_code": "MNR-2026-4088", "age": 11, "phone": "01099887766", "parent_name": "خالد عبدالرحيم", "parent_phone": "01011223344", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-4088", "created_at": "2026-09-10 13:25:42"}, {"id": 5, "name": "حمزة عادل توفيق", "student_code": "MNR-2026-5120", "age": 15, "phone": "01055566778", "parent_name": "عادل توفيق النجار", "parent_phone": "01055566778", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-5120", "created_at": "2026-09-10 13:25:42"}, {"id": 6, "name": "ياسين أحمد منصور", "student_code": "MNR-2026-DD1A", "age": 12, "phone": "01099887766", "parent_name": "أحمد منصور", "parent_phone": "01099887755", "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MNR-2026-DD1A", "created_at": "2026-09-10 13:26:20"}], "enrollments": [{"id": 14, "student_id": 1, "course_name": "كتالوج الشباب 2.0", "teacher_id": 2, "unlocked_blocks": 2, "total_lectures_unlocked": 8, "renewal_count": 1, "remaining_credits": 4, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "المرحلة الثانية - القيادة", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 15, "student_id": 1, "course_name": "مسار القرآن الكريم والتدبر", "teacher_id": 1, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 2, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "سورة الرحمن - المرحلة الأولى", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 16, "student_id": 2, "course_name": "وعي وأمان (للبنات)", "teacher_id": 3, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 4, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "المرحلة الأولى - الوعي الذاتي", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 17, "student_id": 2, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "teacher_id": 4, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 4, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "المرحلة الأولى - قصص البدايات", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 18, "student_id": 3, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "teacher_id": 4, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 4, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "المرحلة الأولى - قصص البدايات", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 19, "student_id": 4, "course_name": "مسار القرآن الكريم والتدبر", "teacher_id": 1, "unlocked_blocks": 2, "total_lectures_unlocked": 8, "renewal_count": 1, "remaining_credits": 1, "excuse_count": 1, "max_allowed_excuses": 1, "current_surah": "سورة ق - المرحلة الثانية", "status": "active", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 20, "student_id": 5, "course_name": "كتالوج الشباب 2.0", "teacher_id": 2, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 0, "excuse_count": 2, "max_allowed_excuses": 1, "current_surah": "المرحلة الأولى", "status": "expired", "enrolled_at": "2026-09-10 13:25:42"}, {"id": 21, "student_id": 6, "course_name": "كتالوج الشباب 2.0", "teacher_id": 1, "unlocked_blocks": 1, "total_lectures_unlocked": 4, "renewal_count": 0, "remaining_credits": 4, "excuse_count": 0, "max_allowed_excuses": 1, "current_surah": "سورة الرحمن - المرحلة الأولى", "status": "active", "enrolled_at": "2026-09-10 13:26:20"}], "lectures": [{"id": 1, "course_name": "كتالوج الشباب 2.0", "lecture_number": 1, "title": "المحاضرة 1: لغز الانطلاق وبناء الشخصية القيادية", "description": "فهم التغيرات النفسية والجسدية وطريقة التفكير الإيجابي.", "block_number": 1, "scheduled_time": "2026-09-10 18:00", "google_meet_url": "https://meet.google.com/katalog-lec1", "drive_recording_url": "https://drive.google.com/drive/folders/katalog-rec-1", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-1", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 2, "course_name": "كتالوج الشباب 2.0", "lecture_number": 2, "title": "المحاضرة 2: بوصلة المراهق والتعامل مع الضغوط", "description": "كيف تضبط مشاعرك وتتغلب على التشتت وضغط الأقران.", "block_number": 1, "scheduled_time": "2026-09-17 18:00", "google_meet_url": "https://meet.google.com/katalog-lec2", "drive_recording_url": "https://drive.google.com/drive/folders/katalog-rec-2", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-2", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 3, "course_name": "كتالوج الشباب 2.0", "lecture_number": 3, "title": "المحاضرة 3: فن إدارة الوقت والمذاكرة الذكية", "description": "استراتيجيات تنظيم اليوم والتحصيل الدراسي بأقل مجهود.", "block_number": 1, "scheduled_time": "2026-09-24 18:00", "google_meet_url": "https://meet.google.com/katalog-lec3", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-3", "calendar_title": "", "status": "live", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 4, "course_name": "كتالوج الشباب 2.0", "lecture_number": 4, "title": "المحاضرة 4: الحصن الرقمي والأمان الإلكتروني", "description": "حماية نفسك من مخاطر السوشيال ميديا والألعاب الإلكترونية.", "block_number": 1, "scheduled_time": "2026-10-01 18:00", "google_meet_url": "https://meet.google.com/katalog-lec4", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-4", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 5, "course_name": "كتالوج الشباب 2.0", "lecture_number": 5, "title": "المحاضرة 5: الثقة بالنفس والتحدث أمام الجمهور", "description": "كسر حاجز الخوف والتعبير عن الأفكار بقوة وثبات.", "block_number": 2, "scheduled_time": "2026-10-08 18:00", "google_meet_url": "https://meet.google.com/katalog-lec5", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-5", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 6, "course_name": "كتالوج الشباب 2.0", "lecture_number": 6, "title": "المحاضرة 6: الذكاء المالي وتأسيس المشاريع الصغيرة", "description": "مفاهيم الادخار والاستثمار والتفكير الريادي للشباب.", "block_number": 2, "scheduled_time": "2026-10-15 18:00", "google_meet_url": "https://meet.google.com/katalog-lec6", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-6", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 7, "course_name": "كتالوج الشباب 2.0", "lecture_number": 7, "title": "المحاضرة 7: فن الحوار وبناء علاقة قوية مع الأهل", "description": "كيف تفهم والديك وتكسب ثقتهم وتحل الخلافات بهدوء.", "block_number": 2, "scheduled_time": "2026-10-22 18:00", "google_meet_url": "https://meet.google.com/katalog-lec7", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-7", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 8, "course_name": "كتالوج الشباب 2.0", "lecture_number": 8, "title": "المحاضرة 8: مشروع التخرج وحفل الختام والتكريم", "description": "تقديم خطة الحياة الشخصية واستلام شهادة إتمام المسار.", "block_number": 2, "scheduled_time": "2026-10-29 18:00", "google_meet_url": "https://meet.google.com/katalog-lec8", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/katalog-mat-8", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 9, "course_name": "وعي وأمان (للبنات)", "lecture_number": 1, "title": "المحاضرة 1: لغز اختفاء فريدة واكتشاف القوة الذاتية", "description": "بناء التقدير الذاتي، حماية المشاعر، والاعتزاز بالهوية.", "block_number": 1, "scheduled_time": "2026-09-11 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec1", "drive_recording_url": "https://drive.google.com/drive/folders/wa3y-rec-1", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-1", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 10, "course_name": "وعي وأمان (للبنات)", "lecture_number": 2, "title": "المحاضرة 2: الأمان العاطفي ودوائر العلاقات الصحية", "description": "كيف تختارين صديقاتك وتضعين حدوداً آمنة في التعامل.", "block_number": 1, "scheduled_time": "2026-09-18 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec2", "drive_recording_url": "https://drive.google.com/drive/folders/wa3y-rec-2", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-2", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 11, "course_name": "وعي وأمان (للبنات)", "lecture_number": 3, "title": "المحاضرة 3: الخصوصية الرقمية والأمان في الفضاء الإلكتروني", "description": "قواعد الأمان على تطبيقات التواصل والتعامل مع الابتزاز الرقمي.", "block_number": 1, "scheduled_time": "2026-09-25 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec3", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-3", "calendar_title": "", "status": "live", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 12, "course_name": "وعي وأمان (للبنات)", "lecture_number": 4, "title": "المحاضرة 4: الذكاء الوجداني وإدارة الضغوط المدرسية", "description": "تقنيات التوازن النفسي وتفريغ التوتر وبناء الهدوء الداخلي.", "block_number": 1, "scheduled_time": "2026-10-02 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec4", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-4", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 13, "course_name": "وعي وأمان (للبنات)", "lecture_number": 5, "title": "المحاضرة 5: مهارات التواصل والإقناع ولغة الجسد", "description": "التعبير عن الرأي بلباقة وثقة في المدرسة ومع الأسرة.", "block_number": 2, "scheduled_time": "2026-10-09 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec5", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-5", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 14, "course_name": "وعي وأمان (للبنات)", "lecture_number": 6, "title": "المحاضرة 6: التخطيط المستقبلي واكتشاف الشغف والمواهب", "description": "تحديد الأهداف وصناعة رؤية شخصية للمستقبل.", "block_number": 2, "scheduled_time": "2026-10-16 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec6", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-6", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 15, "course_name": "وعي وأمان (للبنات)", "lecture_number": 7, "title": "المحاضرة 7: الأنوثة الواعية والجمال الحقيقي", "description": "فهم مفاهيم الأناقة الحقيقية، الصحة النفسية، والاعتزاز بالحجاب.", "block_number": 2, "scheduled_time": "2026-10-23 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec7", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-7", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 16, "course_name": "وعي وأمان (للبنات)", "lecture_number": 8, "title": "المحاضرة 8: مشروع سفيرات الوعي وحفل التكريم والشهادات", "description": "عرض مبادرات الفتيات وحفل التخرج الرسمي.", "block_number": 2, "scheduled_time": "2026-10-30 17:00", "google_meet_url": "https://meet.google.com/wa3y-lec8", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/wa3y-mat-8", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 17, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 1, "title": "المحاضرة 1: لغز البداية وسر شجرة آدم عليه السلام", "description": "درس التوبة والمسؤولية والصدق مع النفس.", "block_number": 1, "scheduled_time": "2026-09-12 16:00", "google_meet_url": "https://meet.google.com/ismail-lec1", "drive_recording_url": "https://drive.google.com/drive/folders/ismail-rec-1", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-1", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 18, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 2, "title": "المحاضرة 2: سفينة نوح عليه السلام والتحدي الأكبر", "description": "الصبر، الثبات على المبدأ، وبناء الأمل في الأزمات.", "block_number": 1, "scheduled_time": "2026-09-19 16:00", "google_meet_url": "https://meet.google.com/ismail-lec2", "drive_recording_url": "https://drive.google.com/drive/folders/ismail-rec-2", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-2", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 19, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 3, "title": "المحاضرة 3: خليل الله إبراهيم عليه السلام واليقين العظيم", "description": "استخدام العقل في البحث عن الحقيقة، والتضحية والشجاعة.", "block_number": 1, "scheduled_time": "2026-09-26 16:00", "google_meet_url": "https://meet.google.com/ismail-lec3", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-3", "calendar_title": "", "status": "live", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 20, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 4, "title": "المحاضرة 4: يوسف الصديق عليه السلام من الجب إلى القصر", "description": "إدارة المشاعر، العفو عند المقدرة، والأمانة والإتقان.", "block_number": 1, "scheduled_time": "2026-10-03 16:00", "google_meet_url": "https://meet.google.com/ismail-lec4", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-4", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 21, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 5, "title": "المحاضرة 5: موسى كليم الله عليه السلام ومواجهة فرعون", "description": "الشجاعة في قول الحق والثقة المطلقة في نصر الله.", "block_number": 2, "scheduled_time": "2026-10-10 16:00", "google_meet_url": "https://meet.google.com/ismail-lec5", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-5", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 22, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 6, "title": "المحاضرة 6: سليمان وداود عليهما السلام وسر القوة والشكر", "description": "تسخير النعم، العدالة، والحكمة في الحكم والقيادة.", "block_number": 2, "scheduled_time": "2026-10-17 16:00", "google_meet_url": "https://meet.google.com/ismail-lec6", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-6", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 23, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 7, "title": "المحاضرة 7: يونس وأيوب عليهما السلام في بطن الحوت والصبر", "description": "قوة الدعاء والتسبيح والتفاؤل في أصعب اللحظات.", "block_number": 2, "scheduled_time": "2026-10-24 16:00", "google_meet_url": "https://meet.google.com/ismail-lec7", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-7", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 24, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "lecture_number": 8, "title": "المحاضرة 8: الحبيب محمد ﷺ وسر رسالة النور والختام", "description": "الرحمة، الخلق العظيم، وعهد العمل بسنة الحبيب.", "block_number": 2, "scheduled_time": "2026-10-31 16:00", "google_meet_url": "https://meet.google.com/ismail-lec8", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/ismail-mat-8", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 25, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 1, "title": "المحاضرة 1: مفاتيح تدبر الفاتحة وسر أم الكتاب", "description": "تطبيق عملي لأسرار الحمد والرحمة والاستعانة اليومية.", "block_number": 1, "scheduled_time": "2026-09-13 18:30", "google_meet_url": "https://meet.google.com/quran-lec1", "drive_recording_url": "https://drive.google.com/drive/folders/quran-rec-1", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-1", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 26, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 2, "title": "المحاضرة 2: قصص سورة الكهف والفتن الأربعة", "description": "تثبيت وحفظ وتدبر سورة الكهف وأسرار النجاة.", "block_number": 1, "scheduled_time": "2026-09-20 18:30", "google_meet_url": "https://meet.google.com/quran-lec2", "drive_recording_url": "https://drive.google.com/drive/folders/quran-rec-2", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-2", "calendar_title": "", "status": "completed", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 27, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 3, "title": "المحاضرة 3: سورة الملك وحصن المسلم اليومي", "description": "ضبط التجويد ومخارج الحروف مع فهم الآيات المنجية.", "block_number": 1, "scheduled_time": "2026-09-27 18:30", "google_meet_url": "https://meet.google.com/quran-lec3", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-3", "calendar_title": "", "status": "live", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 28, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 4, "title": "المحاضرة 4: رحلة مع جزء عم والآيات الكونية", "description": "تثبيت الحفظ مع ربط الآيات بالكون والإيمان العملي.", "block_number": 1, "scheduled_time": "2026-10-04 18:30", "google_meet_url": "https://meet.google.com/quran-lec4", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-4", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 29, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 5, "title": "المحاضرة 5: روائع سورة يس وقلب القرآن", "description": "قواعد التلاوة المتقنة وأسرار البعث واليقين.", "block_number": 2, "scheduled_time": "2026-10-11 18:30", "google_meet_url": "https://meet.google.com/quran-lec5", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-rec-5", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 30, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 6, "title": "المحاضرة 6: سورة الرحمن وأسرار نعم الله المتجددة", "description": "تدبر جمالي وصوتي مع تصحيح الأحكام والتلاوة الخاشعة.", "block_number": 2, "scheduled_time": "2026-10-18 18:30", "google_meet_url": "https://meet.google.com/quran-lec6", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-6", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 31, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 7, "title": "المحاضرة 7: أخلاق أهل القرآن وتطبيقاتها في الحياة", "description": "كيف تجعل القرآن يمشي على الأرض في سلوكك اليومي.", "block_number": 2, "scheduled_time": "2026-10-25 18:30", "google_meet_url": "https://meet.google.com/quran-lec7", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-7", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}, {"id": 32, "course_name": "مسار القرآن الكريم والتدبر", "lecture_number": 8, "title": "المحاضرة 8: الختمة المباركة وتوزيع إجازات الحفظ والتلاوة", "description": "حفل تكريم حفظة المسار وإجازات التلاوة المعتمدة.", "block_number": 2, "scheduled_time": "2026-11-01 18:30", "google_meet_url": "https://meet.google.com/quran-lec8", "drive_recording_url": "", "drive_materials_url": "https://drive.google.com/drive/folders/quran-mat-8", "calendar_title": "", "status": "scheduled", "postpone_reason": null, "rescheduled_to": null, "created_at": "2026-09-10 13:25:42", "duration_minutes": 60}], "attendance": [{"id": 21, "student_id": 1, "lecture_id": 1, "course_name": "كتالوج الشباب 2.0", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 22, "student_id": 1, "lecture_id": 2, "course_name": "كتالوج الشباب 2.0", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 23, "student_id": 2, "lecture_id": 9, "course_name": "وعي وأمان (للبنات)", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 24, "student_id": 2, "lecture_id": 10, "course_name": "وعي وأمان (للبنات)", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 25, "student_id": 2, "lecture_id": 17, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "status": "present", "joined_at": null, "duration_minutes": 55}, {"id": 26, "student_id": 3, "lecture_id": 17, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 27, "student_id": 2, "lecture_id": 18, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "status": "present", "joined_at": null, "duration_minutes": 55}, {"id": 28, "student_id": 3, "lecture_id": 18, "course_name": "قصص الأنبياء (سر الحاج إسماعيل)", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 29, "student_id": 1, "lecture_id": 25, "course_name": "مسار القرآن الكريم والتدبر", "status": "present", "joined_at": null, "duration_minutes": 60}, {"id": 30, "student_id": 4, "lecture_id": 25, "course_name": "مسار القرآن الكريم والتدبر", "status": "present", "joined_at": null, "duration_minutes": 60}], "quizzes": [{"id": 1, "course_name": "كتالوج الشباب 2.0", "block_number": 1, "title": "اختبار نهاية المرحلة الأولى (المحاضرات 1 إلى 4)", "description": "تقييم شامل في مهارات إدارة الوقت، القيادة، والتعامل مع الضغوط والمشتتات.", "total_score": 50, "time_limit_minutes": 20, "created_at": "2026-09-10 13:25:42"}, {"id": 2, "course_name": "مسار القرآن الكريم والتدبر", "block_number": 1, "title": "اختبار التجويد والتدبر للمرحلة الأولى", "description": "تقييم في حفظ وتدبر سورة الفاتحة وجزء عم وتطبيق أحكام التلاوة.", "total_score": 50, "time_limit_minutes": 20, "created_at": "2026-09-10 13:25:42"}], "quiz_questions": [{"id": 1, "quiz_id": 1, "question_text": "ما هي القاعدة الأساسية في إدارة الوقت والتعامل مع الأولويات؟", "option_a": "إنجاز المهام غير الهامة أولاً", "option_b": "تقسيم المهام وتحديد الأهم فالمهم ومكافحة التسويف", "option_c": "الانتظار حتى ليلة الاختبار", "option_d": "الاعتماد الكلي على التنبيهات الخارجية", "correct_option": "B", "points": 10}, {"id": 2, "quiz_id": 1, "question_text": "كيف يتعامل القائد الصغير مع ضغط الأقران والتنمر؟", "option_a": "التراجع والاستسلام", "option_b": "الثبات على المبدأ والوضوح واستشارة الوالدين", "option_c": "رد الإساءة بإساءة أكبر", "option_d": "عزل النفس تماماً عن الأصدقاء", "correct_option": "B", "points": 10}, {"id": 3, "quiz_id": 1, "question_text": "ما هي الخطوة الأولى لحماية الخصوصية الرقمية على الإنترنت؟", "option_a": "مشاركة كلمات المرور مع الأصدقاء", "option_b": "تفعيل التحقق بخطوتين وعدم قبول طلبات مجهولة", "option_c": "نشر الموقع الجغرافي لحظياً", "option_d": "تحميل التطبيقات من مصادر غير موثوقة", "correct_option": "B", "points": 10}, {"id": 4, "quiz_id": 1, "question_text": "الذكاء الوجداني يعني القدرة على:", "option_a": "التحكم في الآخرين", "option_b": "فهم المشاعر الذاتية وإدارتها والتواصل بإيجابية", "option_c": "إخفاء المشاعر وعدم إظهارها أبداً", "option_d": "الغضب السريع عند مواجهة الصعوبات", "correct_option": "B", "points": 10}, {"id": 5, "quiz_id": 1, "question_text": "عند حدوث خلاف في الرأي مع الوالدين، التصرف الأمثل هو:", "option_a": "الصراخ وإغلاق الباب", "option_b": "الإنصات باحترام والتعبير عن الرأي بهدوء ولباقة", "option_c": "مقاطعة الكلام والانسحاب", "option_d": "تجاهل كلام الوالدين تماماً", "correct_option": "B", "points": 10}, {"id": 6, "quiz_id": 2, "question_text": "ما هو المعنى الإجمالي لقوله تعالى: (إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ)؟", "option_a": "إخلاص العبادة وطلب العون من الله وحده", "option_b": "الاعتماد على النفس فقط", "option_c": "طلب المساعدة من الناس دون الله", "option_d": "التردد في اتخاذ القرار", "correct_option": "A", "points": 10}, {"id": 7, "quiz_id": 2, "question_text": "كم عدد آيات سورة الفاتحة بالإجماع؟", "option_a": "5 آيات", "option_b": "6 آيات", "option_c": "7 آيات مع البسملة", "option_d": "8 آيات", "correct_option": "C", "points": 10}, {"id": 8, "quiz_id": 2, "question_text": "حكم النون الساكنة في كلمة (مَن يَقُولُ) هو:", "option_a": "إظهار حلقي", "option_b": "إدغام بغنة", "option_c": "إقلاب", "option_d": "إخفاء حقيقي", "correct_option": "B", "points": 10}, {"id": 9, "quiz_id": 2, "question_text": "الهدف الأساسي من تدبر القرآن الكريم هو:", "option_a": "الحفظ السريع فقط دون فهم", "option_b": "العمل بأوامر الله وتطبيق الأخلاق في السلوك اليومي", "option_c": "القراءة السريعة في المسابقات", "option_d": "حفظ معاني الكلمات دون تطبيق", "correct_option": "B", "points": 10}, {"id": 10, "quiz_id": 2, "question_text": "سورة الملك تُعرف بـ:", "option_a": "المنجية من عذاب القبر", "option_b": "سورة الصبر", "option_c": "سورة النصر", "option_d": "سورة التوبة", "correct_option": "A", "points": 10}], "quiz_submissions": [{"id": 1, "quiz_id": 1, "student_id": 1, "score": 50, "max_score": 50, "percentage": 100.0, "status": "passed", "answers_json": "{\"1\":\"B\",\"2\":\"B\",\"3\":\"B\",\"4\":\"B\",\"5\":\"B\"}", "submitted_at": "2026-09-10 13:25:42"}], "support_tickets": [{"id": 1, "student_id": 1, "student_name": "عمر أحمد علي", "course_name": "كتالوج الشباب 2.0", "category": "schedule", "subject": "استفسار عن موعد ورشة العمل الإضافية", "message": "هل سيتم إضافة حصة إضافية للتدريب على الإلقاء قبل مشروع التخرج؟", "status": "resolved", "admin_reply": "أهلاً بك يا بطل، نعم تم جدولة ورشة إضافية تفاعلية للتدريب على الإلقاء يوم الخميس القادم الساعة 6 مساءً.", "created_at": "2026-09-10 13:25:42", "updated_at": "2026-09-10 13:25:42"}, {"id": 2, "student_id": 4, "student_name": "عبدالرحمن خالد", "course_name": "مسار القرآن الكريم والتدبر", "category": "teacher", "subject": "طلب مراجعة أحكام التجويد لسورة ق", "message": "أحتاج مراجعة خاصة على مخارج الحروف مع فضيلة الشيخ أحمد منصور.", "status": "in_progress", "admin_reply": "تم إبلاغ الشيخ أحمد منصور وسيتم تخصيص أول 15 دقيقة من حصة الأحد القادمة لمراجعة مخارج الحروف.", "created_at": "2026-09-10 13:25:42", "updated_at": "2026-09-10 13:25:42"}], "notifications": [{"id": 17, "student_id": 1, "course_name": null, "title": "مرحباً بك في المنصة المطورة (v3.0)", "message": "تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.", "type": "general", "action_url": "/student.html", "is_read": 0, "created_at": "2026-09-10 13:25:42"}, {"id": 18, "student_id": 2, "course_name": null, "title": "مرحباً بك في المنصة المطورة (v3.0)", "message": "تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.", "type": "general", "action_url": "/student.html", "is_read": 0, "created_at": "2026-09-10 13:25:42"}, {"id": 19, "student_id": 3, "course_name": null, "title": "مرحباً بك في المنصة المطورة (v3.0)", "message": "تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.", "type": "general", "action_url": "/student.html", "is_read": 0, "created_at": "2026-09-10 13:25:42"}, {"id": 20, "student_id": 4, "course_name": null, "title": "مرحباً بك في المنصة المطورة (v3.0)", "message": "تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.", "type": "general", "action_url": "/student.html", "is_read": 0, "created_at": "2026-09-10 13:25:42"}, {"id": 21, "student_id": 5, "course_name": null, "title": "مرحباً بك في المنصة المطورة (v3.0)", "message": "تم تفعيل مساراتك التدريبية، وبوابات المعلمين، والاختبارات التفاعلية، وإيصالات الدفع الرقمية بنجاح.", "type": "general", "action_url": "/student.html", "is_read": 0, "created_at": "2026-09-10 13:25:42"}, {"id": 22, "student_id": 6, "course_name": "كتالوج الشباب 2.0", "title": "أهلاً بك في أكاديمية منير الذكية", "message": "تم تفعيل مسارك التعليمي بنجاح! كودك التعليمي هو: MNR-2026-DD1A", "type": "general", "action_url": "student.html", "is_read": 0, "created_at": "2026-09-10 13:26:20"}], "payments": [{"id": 5, "student_id": 1, "course_name": "كتالوج الشباب 2.0", "amount": 450.0, "currency": "EGP", "block_unlocked": 2, "transaction_id": "PAYMOB-KTG-9941", "receipt_number": "REC-2026-0814", "payment_method": "card", "status": "completed", "whatsapp_message": "تم استلام مبلغ 450 ج.م بنجاح لتجديد مسار كتالوج الشباب 2.0 (المرحلة الثانية) للطالب عمر أحمد علي.", "created_at": "2026-09-10 13:25:42"}, {"id": 6, "student_id": 4, "course_name": "مسار القرآن الكريم والتدبر", "amount": 350.0, "currency": "EGP", "block_unlocked": 2, "transaction_id": "PAYMOB-QRN-7712", "receipt_number": "REC-2026-0822", "payment_method": "vodafone_cash", "status": "completed", "whatsapp_message": "تم استلام مبلغ 350 ج.م بنجاح لتجديد مسار القرآن الكريم (المرحلة الثانية) للطالب عبدالرحمن خالد.", "created_at": "2026-09-10 13:25:42"}], "teacher_payouts": [{"id": 1, "teacher_id": 1, "amount": 1200.0, "sessions_count": 8, "period_month": "2026-08", "status": "paid", "payment_method": "instapay", "reference_number": "TXN-PAYOUT-202608-01", "notes": "مستحقات شهر أغسطس 2026 (8 حصص منفذة)", "created_at": "2026-09-10 13:25:42"}, {"id": 2, "teacher_id": 2, "amount": 1440.0, "sessions_count": 8, "period_month": "2026-08", "status": "paid", "payment_method": "vodafone_cash", "reference_number": "TXN-PAYOUT-202608-02", "notes": "مستحقات شهر أغسطس 2026 (8 حصص منفذة)", "created_at": "2026-09-10 13:25:42"}], "users": [{"id": 1, "username": "admin", "password_hash": "admin2026", "role": "admin", "related_id": 1, "full_name": "إدارة أكاديمية منير", "email": "admin@monir-academy.edu.eg", "phone": "01000000000", "status": "active"}, {"id": 2, "username": "eman.naggar", "password_hash": "123456", "role": "teacher", "related_id": 1, "teacher_id": 1, "full_name": "أ. إيمان النجار", "email": "eman.naggar@monir-academy.edu.eg", "phone": "01001112233", "status": "active"}, {"id": 3, "username": "sara.abdelmonem", "password_hash": "123456", "role": "teacher", "related_id": 2, "teacher_id": 2, "full_name": "د. سارة عبد المنعم", "email": "sara.abdelmonem@monir-academy.edu.eg", "phone": "01002223344", "status": "active"}, {"id": 4, "username": "omar.hossam", "password_hash": "123456", "role": "teacher", "related_id": 3, "teacher_id": 3, "full_name": "م. عمر حسام", "email": "omar.hossam@monir-academy.edu.eg", "phone": "01003334455", "status": "active"}, {"id": 5, "username": "youssef.hani", "password_hash": "123456", "role": "teacher", "related_id": 4, "teacher_id": 4, "full_name": "م. يوسف هاني", "email": "youssef.hani@monir-academy.edu.eg", "phone": "01004445566", "status": "active"}, {"id": 6, "username": "abdelrahman", "password_hash": "123456", "role": "student", "related_id": 1, "student_id": 1, "full_name": "عبدالرحمن خالد محمود", "email": "abdelrahman@student.monir.edu.eg", "phone": "01012345678", "status": "active"}, {"id": 7, "username": "mariam", "password_hash": "123456", "role": "student", "related_id": 2, "student_id": 2, "full_name": "مريم إبراهيم الدسوقي", "email": "mariam@student.monir.edu.eg", "phone": "01023456789", "status": "active"}, {"id": 8, "username": "ziad", "password_hash": "123456", "role": "student", "related_id": 3, "student_id": 3, "full_name": "زياد أحمد الشناوي", "email": "ziad@student.monir.edu.eg", "phone": "01034567890", "status": "active"}, {"id": 9, "username": "jana", "password_hash": "123456", "role": "student", "related_id": 4, "student_id": 4, "full_name": "جنى تامر الفقي", "email": "jana@student.monir.edu.eg", "phone": "01045678901", "status": "active"}, {"id": 10, "username": "hamza", "password_hash": "123456", "role": "student", "related_id": 5, "student_id": 5, "full_name": "حمزة عادل توفيق", "email": "hamza@student.monir.edu.eg", "phone": "01055566778", "status": "active"}]};
        }
        if (!DB.users || !Array.isArray(DB.users) || DB.users.length === 0) {
            DB.users = DEFAULT_USERS.slice();
        } else {
            DEFAULT_USERS.forEach(defU => {
                if (!DB.users.some(u => (u.username||'').toLowerCase() === defU.username.toLowerCase())) {
                    DB.users.push(defU);
                }
            });
        }
        saveDb();
    }

    function saveDb() {
        try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch(e) {}
    }

    initDb();

    function jsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status: status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function handleMock(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        let body = {};
        if (options.body) {
            try {
                body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch(e) { body = {}; }
        }
        
        // Universal path normalizer: strips domain, query string, and preserves /api/...
        let path = url;
        const apiIdx = path.indexOf('/api/');
        if (apiIdx !== -1) {
            path = path.substring(apiIdx).split('?')[0];
        } else {
            path = path.split('?')[0];
        }

        // 0. AUTH: Login
        if (path === '/api/auth/login' && method === 'POST') {
            let uInput = (body.username || '').trim().toLowerCase();
            let pInput = (body.password || '').trim();
            const expRole = body.expected_role || 'student';

            // Auto-default if empty
            if (!uInput) {
                uInput = (expRole === 'teacher') ? 'eman.naggar' : 'abdelrahman';
            }
            if (!pInput) {
                pInput = '123456';
            }

            // 1. Check in DB.users
            let user = (DB.users || []).find(u => 
                (u.username && u.username.toLowerCase() === uInput) || 
                (u.email && u.email.toLowerCase() === uInput) ||
                (u.phone && u.phone === uInput) ||
                (u.full_name && (u.full_name.toLowerCase().includes(uInput) || uInput.includes(u.full_name.toLowerCase())))
            );

            // 2. Fallback check in students
            if (!user) {
                const s = (DB.students || []).find(st => 
                    (st.student_code && st.student_code.toLowerCase() === uInput) ||
                    (st.phone && st.phone === uInput) ||
                    (st.name && (st.name.includes(uInput) || uInput.includes(st.name)))
                );
                if (s) {
                    user = {
                        id: s.id,
                        username: s.student_code,
                        password_hash: '123456',
                        role: 'student',
                        related_id: s.id,
                        student_id: s.id,
                        full_name: s.name,
                        email: s.student_code + '@student.monir.edu.eg',
                        phone: s.phone
                    };
                }
            }

            // 3. Fallback check in teachers
            if (!user) {
                const t = (DB.teachers || []).find(tch => 
                    (tch.phone && tch.phone === uInput) ||
                    (tch.email && tch.email.toLowerCase() === uInput) ||
                    (tch.name && (tch.name.includes(uInput) || uInput.includes(tch.name)))
                );
                if (t) {
                    user = {
                        id: t.id,
                        username: t.email ? t.email.split('@')[0] : 'teacher_' + t.id,
                        password_hash: '123456',
                        role: 'teacher',
                        related_id: t.id,
                        teacher_id: t.id,
                        full_name: t.name,
                        email: t.email,
                        phone: t.phone
                    };
                }
            }

            // 4. Fallback default user if still missing
            if (!user) {
                if (expRole === 'teacher') {
                    user = (DB.users || []).find(u => u.role === 'teacher') || DEFAULT_USERS[1];
                } else if (expRole === 'admin') {
                    user = (DB.users || []).find(u => u.role === 'admin') || DEFAULT_USERS[0];
                } else {
                    user = (DB.users || []).find(u => u.role === 'student') || DEFAULT_USERS[5];
                }
            }

            const token = 'token_' + user.role + '_' + user.id + '_' + Math.random().toString(36).substring(2, 10);
            return jsonResponse({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name || user.username,
                    role: user.role || expRole,
                    related_id: user.related_id || 1,
                    student_id: user.student_id || (user.role === 'student' ? (user.related_id || user.id) : null),
                    teacher_id: user.teacher_id || (user.role === 'teacher' ? (user.related_id || user.id) : null),
                    email: user.email || '',
                    phone: user.phone || ''
                }
            });
        }

        // 0. AUTH: Register Student
        if (path === '/api/auth/register-student' && method === 'POST') {
            const uInput = (body.username || '').trim().toLowerCase();
            if ((DB.users || []).some(u => u.username.toLowerCase() === uInput)) {
                return jsonResponse({ detail: 'اسم المستخدم مسجل مسبقاً، اختر اسماً آخر.' }, 400);
            }

            const studentCode = 'MNR-2026-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const newStudent = {
                id: DB.students.length + 1,
                name: body.name,
                student_code: studentCode,
                age: body.age || 12,
                phone: body.phone,
                parent_name: body.parent_name,
                parent_phone: body.parent_phone,
                qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + studentCode,
                created_at: new Date().toISOString()
            };
            DB.students.push(newStudent);

            const newUser = {
                id: DB.users.length + 1,
                username: body.username,
                password_hash: body.password,
                role: 'student',
                related_id: newStudent.id,
                full_name: body.name,
                email: body.username + '@student.monir.edu.eg',
                phone: body.phone,
                status: 'active',
                created_at: new Date().toISOString()
            };
            DB.users.push(newUser);

            const newEnr = {
                id: DB.enrollments.length + 1,
                student_id: newStudent.id,
                course_name: body.course_name || 'كتالوج الشباب 2.0',
                teacher_id: 1,
                unlocked_blocks: 1,
                total_lectures_unlocked: 4,
                renewal_count: 0,
                remaining_credits: 4,
                excuse_count: 0,
                max_allowed_excuses: 1,
                current_surah: 'سورة الملك - البداية',
                status: 'active',
                enrolled_at: new Date().toISOString()
            };
            DB.enrollments.push(newEnr);

            saveDb();

            const token = 'token_student_' + newUser.id + '_' + Math.random().toString(36).substring(2, 10);
            return jsonResponse({
                success: true,
                message: 'تم إنشاء حسابك وتسجيلك بنجاح!',
                token: token,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    full_name: newUser.full_name,
                    role: 'student',
                    related_id: newStudent.id,
                    student_id: newStudent.id,
                    student_code: studentCode
                }
            });
        }

        // 0. AUTH: Database Export / Backup
        if (path === '/api/admin/db/export') {
            return jsonResponse({
                success: true,
                database: DB
            });
        }

        // 0. AUTH: Database Restore
        if (path === '/api/admin/db/restore' && method === 'POST') {
            if (body && body.database) {
                DB = Object.assign(DB, body.database);
                saveDb();
                return jsonResponse({
                    success: true,
                    message: 'تمت استعادة قاعدة البيانات بنجاح وتحديث كافة السجلات!'
                });
            }
            return jsonResponse({ success: false, detail: 'بيانات غير صالحة' }, 400);
        }

        // 1. Admin Overview
        if (path === '/api/admin/overview') {
            return jsonResponse({
                available_courses: DB.courses.map(c => c.name),
                courses_list: DB.courses,
                selected_course: 'all',
                total_students: DB.students.length,
                total_active_lectures: DB.lectures.length,
                teachers: DB.teachers,
                open_tickets_count: DB.support_tickets.filter(t => t.status === 'open').length,
                students: DB.students,
                lectures: DB.lectures,
                attendance_logs: DB.attendance.map(a => {
                    const s = DB.students.find(st => st.id === a.student_id);
                    const l = DB.lectures.find(lec => lec.id === a.lecture_id);
                    return { ...a, student_name: s ? s.name : '', lecture_title: l ? l.title : '' };
                }),
                payments: DB.payments.map(p => {
                    const s = DB.students.find(st => st.id === p.student_id);
                    return { ...p, student_name: s ? s.name : '' };
                })
            });
        }

        // 2. Courses Analytics
        if (path === '/api/courses/analytics') {
            const res = DB.courses.map(c => {
                const enrs = DB.enrollments.filter(e => e.course_name === c.name);
                const stList = enrs.map(e => {
                    const s = DB.students.find(st => st.id === e.student_id);
                    return s ? { id: s.id, name: s.name, age: s.age, status: e.status || s.status } : null;
                }).filter(Boolean);
                const ages = stList.map(s => s.age).filter(Boolean);
                const avgAge = ages.length ? Math.round((ages.reduce((a,b)=>a+b,0) / ages.length) * 10) / 10 : 0;
                const cap = c.max_capacity || 6;
                const vac = Math.max(0, cap - stList.length);
                return {
                    course_name: c.name,
                    track_name: c.track_name,
                    target_age: c.target_age,
                    min_age: c.min_age || 10,
                    max_age: c.max_age || 18,
                    max_capacity: cap,
                    default_duration_minutes: c.default_duration_minutes || 60,
                    enrolled_count: stList.length,
                    enrolled_ages: ages,
                    average_age: avgAge,
                    vacant_seats: vac,
                    is_incomplete: vac > 0,
                    students: stList
                };
            });
            return jsonResponse(res);
        }

        // 3. Teachers Payroll
        if (path === '/api/admin/teachers/payroll') {
            const list = DB.teachers.map(t => {
                const rate = t.rate_per_session || 150;
                const courses = DB.courses.filter(c => c.teacher_id === t.id).map(c => c.name);
                const compCount = 2;
                const totalEarned = compCount * rate;
                const payouts = DB.teacher_payouts.filter(p => p.teacher_id === t.id);
                const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
                const due = Math.max(0, totalEarned - totalPaid);
                return {
                    teacher_id: t.id,
                    name: t.name,
                    specialty: t.specialty,
                    phone: t.phone,
                    rate_per_session: rate,
                    rate_per_private_session: t.rate_per_private_session || 80,
                    completed_sessions: compCount,
                    total_earned: totalEarned,
                    total_paid: totalPaid,
                    balance_due: due,
                    courses_supervised: courses,
                    payouts_history: payouts
                };
            });
            return jsonResponse({
                teachers_payroll: list,
                summary: {
                    total_earned_all: list.reduce((a,b)=>a+b.total_earned,0),
                    total_paid_all: list.reduce((a,b)=>a+b.total_paid,0),
                    total_balance_due: list.reduce((a,b)=>a+b.balance_due,0),
                    total_sessions_completed: list.reduce((a,b)=>a+b.completed_sessions,0)
                }
            });
        }

        // 4. Performance Report
        if (path === '/api/admin/teachers/performance-report') {
            const res = DB.teachers.map(t => {
                const courses = DB.courses.filter(c => c.teacher_id === t.id).map(c => c.name);
                const enrs = DB.enrollments.filter(e => courses.includes(e.course_name));
                const dropouts = enrs.filter(e => e.status === 'expired' || e.remaining_credits === 0).length;
                const late = t.late_count || (t.id === 2 ? 1 : 0);
                const canc = t.cancellation_count || (t.id === 3 ? 1 : 0);
                const score = Math.max(50, 100 - (canc * 10 + late * 5 + dropouts * 10));
                return {
                    teacher_id: t.id,
                    name: t.name,
                    specialty: t.specialty,
                    phone: t.phone,
                    total_assigned_students: enrs.length,
                    dropouts_count: dropouts,
                    dropout_rate_pct: enrs.length ? Math.round((dropouts/enrs.length)*100) : 0,
                    late_starts_count: late,
                    cancellations_count: canc,
                    postponed_lectures_count: 0,
                    commitment_score: score,
                    supervised_courses: courses
                };
            });
            return jsonResponse(res);
        }

        // 5. Students Status Summary
        if (path === '/api/admin/students/status-summary') {
            const list = DB.students.map(s => {
                const enrs = DB.enrollments.filter(e => e.student_id === s.id);
                const isExpired = s.status === 'expired' || enrs.some(e => e.status === 'expired' || e.remaining_credits === 0);
                const wa = 'https://wa.me/2' + s.parent_phone + '?text=' + encodeURIComponent('السلام عليكم ورحمة الله أستاذ ' + s.parent_name + '. نود الاطمئنان على الطالب البطل ' + s.name + ' في أكاديمية منير الذكية، وحرصاً على استمرار تميزه يسعدنا تيسير تجديد الاشتراك ومتابعة الحصص القادمة.');
                return {
                    id: s.id,
                    name: s.name,
                    student_code: s.student_code,
                    age: s.age,
                    parent_name: s.parent_name,
                    parent_phone: s.parent_phone,
                    status: isExpired ? 'expired' : 'active',
                    enrollments: enrs,
                    courses_str: enrs.map(e => e.course_name).join(', '),
                    whatsapp_reactivation_url: wa
                };
            });
            const expired = list.filter(s => s.status !== 'active');
            return jsonResponse({
                summary: {
                    total_students: list.length,
                    active_count: list.length - expired.length,
                    expired_count: expired.length,
                    dropout_count: 0,
                    total_paused: expired.length,
                    retention_rate: Math.round(((list.length - expired.length)/list.length)*100)
                },
                students: list
            });
        }

        // 6. Teacher Dashboard
        const teacherMatch = path.match(/\/api\/teacher\/(\d+)\/dashboard/);
        if (teacherMatch) {
            const tid = parseInt(teacherMatch[1]);
            const teacher = DB.teachers.find(t => t.id === tid) || DB.teachers[0];
            const assignedCourses = DB.courses.filter(c => c.teacher_id === teacher.id).map(c => c.name);
            const enrs = DB.enrollments.filter(e => e.teacher_id === teacher.id || assignedCourses.includes(e.course_name));
            const stList = enrs.map(e => {
                const s = DB.students.find(st => st.id === e.student_id);
                if (!s) return null;
                return {
                    student_id: s.id,
                    name: s.name,
                    student_code: s.student_code,
                    age: s.age,
                    course_name: e.course_name,
                    current_surah: e.current_surah,
                    current_aya: e.current_aya || 1,
                    remaining_credits: e.remaining_credits,
                    total_credits_purchased: 4,
                    excuse_count: e.excuse_count || 0
                };
            }).filter(Boolean);

            const rate = teacher.rate_per_session || 150;
            const payouts = DB.teacher_payouts.filter(p => p.teacher_id === teacher.id);
            const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
            const compCount = 2;
            const earned = compCount * rate;
            const due = Math.max(0, earned - totalPaid);

            return jsonResponse({
                teacher_id: teacher.id,
                teacher_name: teacher.name,
                email: teacher.email,
                phone: teacher.phone,
                specialty: teacher.specialty,
                assigned_courses: assignedCourses.length ? assignedCourses : ['كتالوج الشباب 2.0'],
                total_students: stList.length,
                students: stList,
                financials: {
                    rate_per_session: rate,
                    completed_sessions: compCount,
                    total_earned: earned,
                    total_paid: totalPaid,
                    balance_due: due,
                    recent_payouts: payouts
                },
                payroll: {
                    rate_per_session: rate,
                    completed_sessions: compCount,
                    total_earned: earned,
                    total_paid: totalPaid,
                    balance_due: due,
                    payouts_history: payouts
                }
            });
        }

        // 7. Student Dashboard
        const studentMatch = path.match(/\/api\/student\/(\d+)\/dashboard/);
        if (studentMatch) {
            const sid = parseInt(studentMatch[1]);
            const student = DB.students.find(s => s.id === sid) || DB.students[0];
            const enr = DB.enrollments.find(e => e.student_id === student.id) || DB.enrollments[0];
            const course = DB.courses.find(c => c.name === enr.course_name) || DB.courses[0];
            const teacher = DB.teachers.find(t => t.id === enr.teacher_id) || DB.teachers[0];
            const lecs = DB.lectures.filter(l => l.course_name === enr.course_name);

            return jsonResponse({
                student: student,
                enrollment: enr,
                course: course,
                teacher: { name: teacher.name, specialty: teacher.specialty, email: teacher.email },
                lectures: lecs,
                attendance_stats: { total_attended: 2, total_lectures: 4, attendance_rate: 100 }
            });
        }

                // 7c. Student Course Lectures (/api/student/<id>/courses/<name>/lectures)
        const studentCourseLecMatch = path.match(/\/api\/student\/(\d+)\/courses\/([^\/]+)\/lectures/);
        if (studentCourseLecMatch) {
            const sid = parseInt(studentCourseLecMatch[1]);
            const cName = decodeURIComponent(studentCourseLecMatch[2]);
            const enr = DB.enrollments.find(e => e.student_id === sid && e.course_name === cName) 
                     || DB.enrollments.find(e => e.student_id === sid)
                     || { unlocked_blocks: 1, total_lectures_unlocked: 4, remaining_credits: 4, renewal_count: 0, current_surah: '' };
            const lecs = DB.lectures.filter(l => l.course_name === cName);
            return jsonResponse({
                course_name: cName,
                total_lectures_unlocked: enr.total_lectures_unlocked || 4,
                unlocked_blocks: enr.unlocked_blocks || 1,
                renewal_count: enr.renewal_count || 0,
                remaining_credits: enr.remaining_credits || 4,
                current_surah: enr.current_surah || '',
                excuse_count: enr.excuse_count || 0,
                needs_renewal: ((enr.total_lectures_unlocked || 4) <= 4 && (enr.remaining_credits || 4) <= 1),
                lectures: lecs.map(l => ({
                    ...l,
                    is_unlocked: (l.lecture_number <= (enr.total_lectures_unlocked || 4)),
                    attendance: { status: (l.lecture_number <= 2 ? 'present' : 'not_recorded'), duration_minutes: 60 }
                }))
            });
        }

        // 7d. Admin Save Lecture / Drive Links (/api/admin/lectures/save)
        if (path === '/api/admin/lectures/save' && method === 'POST') {
            const lecData = body ? JSON.parse(body) : {};
            if (lecData.id) {
                const idx = DB.lectures.findIndex(l => l.id === lecData.id);
                if (idx >= 0) {
                    DB.lectures[idx] = { ...DB.lectures[idx], ...lecData };
                } else {
                    DB.lectures.push(lecData);
                }
            } else {
                const newId = Math.max(...DB.lectures.map(l => l.id || 0), 0) + 1;
                lecData.id = newId;
                DB.lectures.push(lecData);
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم حفظ المحاضرة بنجاح', lecture: lecData });
        }

        // 7b. Single Student Info (/api/student/<built-in function id>)
        const studentInfoMatch = path.match(/\/api\/student\/(\d+)$/);
        if (studentInfoMatch) {
            const sid = parseInt(studentInfoMatch[1]);
            const student = DB.students.find(s => s.id === sid) || DB.students[0];
            const enrs = DB.enrollments.filter(e => e.student_id === student.id);
            return jsonResponse({
                student: student,
                enrolled_courses: enrs,
                enrolled_courses_count: enrs.length,
                unread_notifications: 1
            });
        }

        // 8. Support Tickets
        if (path === '/api/admin/support/tickets' || (path.startsWith('/api/student/') && path.endsWith('/support/tickets'))) {
            return jsonResponse(DB.support_tickets);
        }

        // 9. Quizzes
        if (path.startsWith('/api/student/') && path.endsWith('/quizzes')) {
            return jsonResponse(DB.quiz_submissions);
        }

        // 10. Notifications
        if (path.startsWith('/api/student/') && path.endsWith('/notifications')) {
            return jsonResponse(DB.notifications);
        }

        // Actions: Settle Teacher Payout
        if (method === 'POST' && path.includes('/settle')) {
            const tid = parseInt(path.split('/')[4]);
            const newPayout = {
                id: DB.teacher_payouts.length + 1,
                teacher_id: tid,
                amount: body.amount || 500,
                sessions_count: body.sessions_count || 3,
                period_month: body.period_month || '2026-09',
                status: 'paid',
                payment_method: body.payment_method || 'instapay',
                reference_number: body.reference_number || ('TXN-' + Math.random().toString(36).substring(2,8).toUpperCase()),
                payment_date: new Date().toISOString().split('T')[0],
                notes: body.notes || 'تسوية معتمدة'
            };
            DB.teacher_payouts.unshift(newPayout);
            saveDb();
            return jsonResponse({ success: true, message: 'تم تسجيل وصرف مستحقات المعلم بنجاح!', payout: newPayout });
        }

        // Action: Update limits
        if (method === 'POST' && path.includes('/update-limits')) {
            return jsonResponse({ success: true, message: 'تم تحديث سعة ومحددات المجموعة بنجاح في النظام!' });
        }

        // Action: Lecture duration
        if (method === 'POST' && path.includes('/duration')) {
            return jsonResponse({ success: true, message: 'تم تحديث مدة المحاضرة بنجاح!' });
        }

        // Action: Quran record session
        if (method === 'POST' && path === '/api/quran/record-session') {
            const enr = DB.enrollments.find(e => e.student_id === body.student_id);
            if (enr && body.session_status === 'present') {
                enr.remaining_credits = Math.max(0, (enr.remaining_credits || 4) - 1);
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم تسجيل الجلسة بنجاح!', remaining_credits: enr ? enr.remaining_credits : 3 });
        }

        // Action: Quran update surah
        if (method === 'POST' && path === '/api/quran/update-surah') {
            const enr = DB.enrollments.find(e => e.student_id === body.student_id);
            if (enr) {
                enr.current_surah = body.surah_name;
                enr.current_aya = body.aya_number;
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم تحديث موضع التلاوة والحفظ بنجاح!' });
        }

        // Action: Support ticket submit
        if (method === 'POST' && path === '/api/support/tickets') {
            const newT = {
                id: DB.support_tickets.length + 1,
                student_id: body.student_id,
                student_name: 'طالب الأكاديمية',
                course_name: body.course_name || 'كتالوج الشباب 2.0',
                category: body.category || 'استفسار',
                subject: body.subject,
                message: body.message,
                status: 'open',
                created_at: new Date().toISOString()
            };
            DB.support_tickets.unshift(newT);
            saveDb();
            return jsonResponse({ success: true, message: 'تم إرسال تذكرتك بنجاح وسيتم الرد خلال ساعات.', ticket_id: newT.id });
        }

        return jsonResponse({ success: true, message: 'Mock OK' });
    }

    // Global fetch interceptor
    const isLocalhost = (typeof window !== 'undefined' && window.location) ? 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') : false;
    const realFetch = (typeof window !== 'undefined') ? window.fetch : null;

    if (typeof window !== 'undefined' && realFetch) {
        window.fetch = async function(resource, init) {
            const url = (typeof resource === 'string') ? resource : (resource && resource.url ? resource.url : '');
            
            if (url.includes('/api/')) {
                // If on GitHub Pages or static host, NEVER send to realFetch because it returns 405 Method Not Allowed
                if (!isLocalhost) {
                    return handleMock(url, init);
                }
                try {
                    const resp = await realFetch(resource, init);
                    if (resp && resp.ok) return resp;
                    return handleMock(url, init);
                } catch(e) {
                    return handleMock(url, init);
                }
            }
            return realFetch(resource, init);
        };
    }

})();
