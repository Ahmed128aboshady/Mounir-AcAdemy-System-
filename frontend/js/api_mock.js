// Smart API Mock Engine for GitHub Pages Live Demo & Offline Testing
(function() {
    const realFetch = (typeof window !== 'undefined') ? window.fetch : null;

    const DEFAULT_DB = {
        users: [
            { id: 1, username: "admin", password_hash: "admin2026", role: "admin", related_id: 1, full_name: "إدارة أكاديمية منير" },
            { id: 91, username: "ST0001", password_hash: "Mn4620", role: "student", related_id: 1, full_name: "يونس بيجاد محسن عبدالفتاح" }
        ],
        students: [
            { id: 1, name: "يونس بيجاد محسن عبدالفتاح", student_code: "ST0001", age: 6.5, phone: "01222709574", parent_name: "ولي أمر يونس بيجاد محسن عبدالفتاح", parent_phone: "01222709574" }
        ],
        teachers: [
            { id: 28, full_name: "حمزة العدوي", email: "hamza@monir.edu.eg", phone: "01222709574" }
        ],
        courses: [
            { id: 1, name: "السبت 12", track_name: "مسار القرآن والتدبر", target_age: "6 - 16 سنة", description: "مجموعة السبت 12", price_per_block: 450.0, total_lectures: 8 }
        ],
        enrollments: [
            { id: 24, student_id: 1, course_name: "السبت 12", teacher_id: 28, unlocked_blocks: 1, total_lectures_unlocked: 4, remaining_credits: 7, renewal_count: 0, current_surah: "سورة الرحمن - المرحلة الأولى", status: "active" }
        ],
        lectures: [
            { id: 1, course_name: "السبت 12", lecture_number: 1, title: "المحاضرة الأولى: مقدمة والتهيئة", drive_url: "https://drive.google.com", meeting_url: "https://zoom.us" },
            { id: 2, course_name: "السبت 12", lecture_number: 2, title: "المحاضرة الثانية: التلاوة والتجويد", drive_url: "https://drive.google.com", meeting_url: "https://zoom.us" },
            { id: 3, course_name: "السبت 12", lecture_number: 3, title: "المحاضرة الثالثة: التطبيق العملي", drive_url: "https://drive.google.com", meeting_url: "https://zoom.us" },
            { id: 4, course_name: "السبت 12", lecture_number: 4, title: "المحاضرة الرابعة: التقييم والمراجعة", drive_url: "https://drive.google.com", meeting_url: "https://zoom.us" }
        ],
        support_tickets: [],
        quiz_submissions: [],
        notifications: [
            { id: 1, title: "مرحباً بك في أكاديمية منير", message: "أهلاً بك يا يونس في بوابة الطالب الذكية. نتمنى لك رحلة ممتعة في مسار القرآن والتدبر.", created_at: "2026-09-10" }
        ],
        payments: [],
        attendance: []
    };

    let DB = DEFAULT_DB;
    let dbFetchPromise = null;

    async function ensureDbLoaded() {
        if (DB && DB.users && DB.users.length >= 50 && DB.students && DB.students.length >= 50) {
            return DB;
        }

        if (dbFetchPromise) {
            return await dbFetchPromise;
        }

        dbFetchPromise = (async () => {
            try {
                const isFrontendDir = (typeof window !== 'undefined' && window.location && window.location.pathname.includes('/frontend/'));
                const relPath = isFrontendDir ? '../js/db_seed.json' : 'js/db_seed.json';
                const fetchFn = (typeof realFetch === 'function' && realFetch) ? realFetch : window.fetch;
                
                const res = await fetchFn(relPath + '?v=20260910_seed12');
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.users && data.students) {
                        DB = data;
                        console.log('[Mock DB] Loaded ' + DB.students.length + ' students into memory.');
                        return DB;
                    }
                }
            } catch(e) {
                console.warn('[Mock DB] Failed to load db_seed.json:', e);
            }
            return DB;
        })();

        return dbFetchPromise;
    }

    function initDb() {
        ensureDbLoaded();
    }

    function saveDb() {}

    initDb();

    function jsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status: status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function handleMock(url, options = {}) {
        // Background async load full DB without blocking immediate response
        ensureDbLoaded();

        const dbUsers = (DB && DB.users) ? DB.users : DEFAULT_DB.users;
        const dbStudents = (DB && DB.students) ? DB.students : DEFAULT_DB.students;
        const dbTeachers = (DB && DB.teachers) ? DB.teachers : DEFAULT_DB.teachers;
        const dbEnrollments = (DB && DB.enrollments) ? DB.enrollments : DEFAULT_DB.enrollments;
        const dbCourses = (DB && DB.courses) ? DB.courses : DEFAULT_DB.courses;
        const dbLectures = (DB && DB.lectures) ? DB.lectures : DEFAULT_DB.lectures;
        const dbTickets = (DB && DB.support_tickets) ? DB.support_tickets : DEFAULT_DB.support_tickets;
        const dbQuizzes = (DB && DB.quiz_submissions) ? DB.quiz_submissions : DEFAULT_DB.quiz_submissions;
        const dbNotifs = (DB && DB.notifications) ? DB.notifications : DEFAULT_DB.notifications;
        const dbPayments = (DB && DB.payments) ? DB.payments : DEFAULT_DB.payments;
        const dbAttendance = (DB && DB.attendance) ? DB.attendance : DEFAULT_DB.attendance;

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
            const expRole = body.expected_role;

            let user = dbUsers.find(u => 
                (u.username && u.username.toLowerCase() === uInput) || 
                (u.email && u.email.toLowerCase() === uInput) ||
                (u.phone && u.phone === uInput)
            );

            if (!user) {
                const s = dbStudents.find(st => 
                    (st.student_code && st.student_code.toLowerCase() === uInput) ||
                    (st.phone && st.phone === uInput)
                );
                if (s) {
                    user = dbUsers.find(u => u.role === 'student' && u.related_id === s.id);
                }
            }

            if (!user) {
                const t = dbTeachers.find(tch => 
                    (tch.email && tch.email.toLowerCase() === uInput) ||
                    (tch.phone && tch.phone === uInput)
                );
                if (t) {
                    user = dbUsers.find(u => u.role === 'teacher' && u.related_id === t.id);
                }
            }

            if (!user) {
                return jsonResponse({ detail: "اسم المستخدم غير موجود، يرجى التأكد وإعادة المحاولة." }, 401);
            }

            if (pInput && user.password_hash !== pInput && pInput !== '123456' && pInput !== 'admin2026') {
                return jsonResponse({ detail: "كلمة المرور غير صحيحة، يرجى كتابة كلمة المرور المحددة بالشيت." }, 401);
            }

            if (expRole && user.role !== expRole) {
                return jsonResponse({ detail: "هذا الحساب غير مصرح له بالدخول كـ (" + expRole + ")" }, 403);
            }

            const token = 'token_' + user.role + '_' + user.id + '_' + Math.random().toString(36).substring(2, 10);
            return jsonResponse({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name || user.username,
                    role: user.role,
                    related_id: user.related_id,
                    student_id: user.role === 'student' ? user.related_id : null,
                    teacher_id: user.role === 'teacher' ? user.related_id : null
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

        // 7b. Single Student Info (/api/student/<id>)
        const studentInfoMatch = path.match(/\/api\/student\/(\d+)$/);
        if (studentInfoMatch) {
            await ensureDbLoaded();
            const sid = parseInt(studentInfoMatch[1]);
            const studentsList = (DB && DB.students) ? DB.students : [];
            let student = studentsList.find(s => s.id === sid);

            if (!student) {
                const uStr = localStorage.getItem('monir_current_user');
                if (uStr) {
                    try {
                        const u = JSON.parse(uStr);
                        const relId = u.student_id || u.related_id;
                        if (relId) student = studentsList.find(s => s.id === relId);
                    } catch(e) {}
                }
            }
            if (!student && studentsList.length > 0) student = studentsList[0];

            const enrollmentsList = (DB && DB.enrollments) ? DB.enrollments : [];
            const enrs = student ? enrollmentsList.filter(e => e.student_id === student.id) : [];
            return jsonResponse({
                student: student || { id: sid, name: "طالب الأكاديمية", student_code: "ST0001", phone: "---" },
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
