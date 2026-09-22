// Mounir Smart LMS — Supabase PostgreSQL Cloud Client (v2.0 Production)
(function() {
    // Official Live Supabase Project Config for Mounir Academy
    window.MONIR_SUPABASE_CONFIG = window.MONIR_SUPABASE_CONFIG || {
        url: 'https://chwhrxquvaiskdsthips.supabase.co',
        anonKey: 'sb_publishable_EEpE3k9qqqWSpACYFD0wLw_77C-fYYP'
    };

    const CFG_KEY = 'monir_supabase_cfg';

    function getCfg() {
        if (window.MONIR_SUPABASE_CONFIG && window.MONIR_SUPABASE_CONFIG.url) {
            return window.MONIR_SUPABASE_CONFIG;
        }
        try {
            const stored = localStorage.getItem(CFG_KEY);
            if (stored) return JSON.parse(stored);
        } catch(e) {}
        return null;
    }

    let supabaseClient = null;

    function initClient() {
        const cfg = getCfg();
        if (cfg && cfg.url && cfg.anonKey && window.supabase) {
            try {
                supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
                console.log('[Supabase Cloud] Connected successfully to:', cfg.url);
                // Trigger background silent sync of database
                setTimeout(() => {
                    if (window.MonirDB && window.MonirDB.syncFromCloud) {
                        window.MonirDB.syncFromCloud();
                    }
                }, 500);
            } catch(e) {
                console.error('[Supabase Cloud] Init error:', e);
            }
        }
    }

    window.MonirDB = {
        isConfigured: function() {
            return !!(getCfg() && (supabaseClient || window.supabase));
        },

        saveConfig: function(url, anonKey) {
            const cleanUrl = (url || '').trim().replace(/\/+$/, '');
            const cleanKey = (anonKey || '').trim();
            localStorage.setItem(CFG_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
            window.MONIR_SUPABASE_CONFIG = { url: cleanUrl, anonKey: cleanKey };
            initClient();
            return !!supabaseClient;
        },

        getClient: function() {
            if (!supabaseClient) initClient();
            return supabaseClient;
        },

        // Helper to update local storage mock DB cache
        updateLocalCache: function(modifierFn) {
            try {
                const DB_KEY = 'monir_smart_lms_db_v3';
                let raw = localStorage.getItem(DB_KEY) || localStorage.getItem('monir_smart_lms_db_v2');
                let db = raw ? JSON.parse(raw) : {};
                modifierFn(db);
                localStorage.setItem(DB_KEY, JSON.stringify(db));
            } catch(e) {
                console.warn('[Supabase] Local cache sync warning:', e);
            }
        },

        // Silent background sync from Supabase into client memory
        syncFromCloud: async function() {
            const client = this.getClient();
            if (!client) return;
            try {
                const [stRes, enrRes, uRes, tcRes] = await Promise.all([
                    client.from('students').select('*'),
                    client.from('enrollments').select('*'),
                    client.from('users').select('*'),
                    client.from('teachers').select('*')
                ]);

                this.updateLocalCache(db => {
                    db.students = stRes.data || [];
                    db.enrollments = enrRes.data || [];
                    if (uRes.data) db.users = uRes.data;
                    if (tcRes.data) db.teachers = tcRes.data;
                });
            } catch(e) {
                console.log('[Supabase Sync]:', e);
            }
        },

        // --- AUTH: Cloud Login ---
        login: async function(username, password, expectedRole) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase client not initialized' };

            const u = (username || '').trim().toLowerCase();
            const p = (password || '').trim();
            const cleanDigits = u.replace(/\D/g, '');

            // Query users table for matching username, email, or phone
            let orCond = `username.ilike.${u},email.ilike.${u}`;
            if (cleanDigits.length >= 8) {
                orCond += `,phone.ilike.%${cleanDigits.slice(-9)}%`;
            }

            let query = client
                .from('users')
                .select('*')
                .or(orCond);

            // For admin, strictly enforce exact password check (no universal bypass allowed)
            if (expectedRole === 'admin' || u === 'admin') {
                if (!p) return { error: 'يرجى إدخال كلمة المرور' };
                query = query.eq('password_hash', p);
            } else if (p !== '123456' && p !== '') {
                // If student/teacher did not enter universal default, match exact password
                query = query.eq('password_hash', p);
            }

            const { data, error } = await query.limit(1);

            if (error) {
                console.error('[Supabase Login Error]:', error);
                return { error: 'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية' };
            }

            let user = (data && data.length > 0) ? data[0] : null;

            // Fallback: If not found in users table, search directly in students table by code or phone!
            if (!user && (expectedRole === 'student' || !expectedRole)) {
                let stOrCond = `student_code.ilike.${u}`;
                if (cleanDigits.length >= 8) {
                    stOrCond += `,phone.ilike.%${cleanDigits.slice(-9)}%,parent_phone.ilike.%${cleanDigits.slice(-9)}%`;
                }
                const { data: stFound } = await client.from('students').select('*').or(stOrCond).limit(1);
                if (stFound && stFound.length > 0) {
                    const st = stFound[0];
                    user = {
                        id: 9000 + st.id,
                        username: st.student_code || ('ST' + st.id),
                        password_hash: p || '123456',
                        role: 'student',
                        student_id: st.id,
                        related_id: st.id,
                        full_name: st.name,
                        email: (st.student_code ? st.student_code.toLowerCase() : 'student') + '@monir-academy.edu.eg',
                        phone: st.phone || st.parent_phone,
                        status: st.status || 'active'
                    };
                }
            }

            if (!user) {
                return { notFound: true, fallback: true, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
            }

            if (expectedRole && user.role !== expectedRole) {
                return { error: `هذا الحساب مسجل كـ (${user.role}) وغير مصرح له بدخول بوابة (${expectedRole})` };
            }

            let studentData = null;
            if (user.role === 'student') {
                const sid = user.student_id || user.related_id;
                if (sid) {
                    const { data: st } = await client.from('students').select('*').eq('id', sid).limit(1);
                    if (st && st.length > 0) {
                        studentData = st[0];
                        // Cache student into local db
                        this.updateLocalCache(db => {
                            if (!db.students) db.students = [];
                            const idx = db.students.findIndex(x => x.id === studentData.id);
                            if (idx >= 0) db.students[idx] = studentData;
                            else db.students.push(studentData);

                            if (!db.users) db.users = [];
                            const uIdx = db.users.findIndex(x => x.id === user.id);
                            if (uIdx >= 0) db.users[uIdx] = user;
                            else db.users.push(user);
                        });
                    }
                }
            }

            const token = 'sb_token_' + user.role + '_' + user.id + '_' + Date.now();
            return { success: true, token: token, user: user, student: studentData };
        },

        // --- STUDENT: Get single student profile from cloud ---
        getStudentProfile: async function(studentId) {
            const client = this.getClient();
            try {
                const idStr = String(studentId || '').trim();
                if (!idStr) return null;

                const isPureNumber = /^\d+$/.test(idStr);
                const numId = isPureNumber ? parseInt(idStr, 10) : null;
                
                let localSt = null;
                let localEnrs = [];
                
                // 1. Resolve local record if available
                if (window.DEFAULT_DB && window.DEFAULT_DB.students) {
                    localSt = window.DEFAULT_DB.students.find(s => 
                        (s.student_code && s.student_code.toLowerCase() === idStr.toLowerCase()) ||
                        (numId !== null && s.id === numId)
                    );
                }

                // If not found in local DB yet, check active session
                if (!localSt) {
                    try {
                        const uStr = localStorage.getItem('monir_current_user');
                        if (uStr) {
                            const u = JSON.parse(uStr);
                            const uCode = u.student_code || u.username;
                            if (uCode && uCode.toLowerCase() === idStr.toLowerCase() && window.DEFAULT_DB && window.DEFAULT_DB.students) {
                                localSt = window.DEFAULT_DB.students.find(s => s.student_code && s.student_code.toLowerCase() === uCode.toLowerCase());
                            }
                        }
                    } catch(e) {}
                }
                
                let stData = null;
                let enrData = null;

                if (client) {
                    // Try student_code (case-insensitive)
                    try {
                        const { data: byCode, error: cErr } = await client
                            .from('students')
                            .select('*')
                            .ilike('student_code', idStr)
                            .limit(1);
                        if (!cErr && byCode && byCode.length > 0) {
                            stData = byCode[0];
                        }
                    } catch(e) {}

                    // If not found and it's a numeric ID, try searching by numeric id
                    if (!stData && numId !== null) {
                        try {
                            const { data: byId, error: idErr } = await client
                                .from('students')
                                .select('*')
                                .eq('id', numId)
                                .limit(1);
                            if (!idErr && byId && byId.length > 0) {
                                stData = byId[0];
                            }
                        } catch(e) {}
                    }

                    // If still not found, check users table for matching username to retrieve student_id
                    if (!stData) {
                        try {
                            const { data: uData } = await client
                                .from('users')
                                .select('student_id, related_id')
                                .ilike('username', idStr)
                                .limit(1);
                            if (uData && uData.length > 0) {
                                const relId = uData[0].student_id || uData[0].related_id;
                                if (relId) {
                                    const { data: stRel } = await client
                                        .from('students')
                                        .select('*')
                                        .eq('id', relId)
                                        .limit(1);
                                    if (stRel && stRel.length > 0) {
                                        stData = stRel[0];
                                    }
                                }
                            }
                        } catch(e) {}
                    }

                    // Load enrollments ONLY if student was found
                    if (stData && stData.id) {
                        const { data: enr } = await client
                            .from('enrollments')
                            .select('*, teachers(id, name, bio)')
                            .eq('student_id', stData.id);
                        if (enr) enrData = enr;
                    }
                }

                if (!stData && localSt) {
                    stData = { ...localSt };
                }

                // If student was NOT found anywhere, NEVER return a random student!
                if (!stData) return null;

                // Sync local enrollments for fallback
                const resolvedLocalId = localSt ? localSt.id : null;
                if (window.DEFAULT_DB && window.DEFAULT_DB.enrollments && resolvedLocalId) {
                    localEnrs = window.DEFAULT_DB.enrollments.filter(e => e.student_id === resolvedLocalId);
                }

                // group_id is stored in qr_code field of students table
                const groupIdFromDB = stData.qr_code || localSt?.group_id || 'G000';

                if (localSt) {
                    stData.group_id = groupIdFromDB;
                    stData.age = stData.age || localSt.age || 12;
                    stData.phone = stData.phone || localSt.phone;
                    stData.parent_phone = stData.parent_phone || localSt.parent_phone || stData.phone;
                    stData.parent_name = localSt.parent_name || stData.parent_name;
                    stData.account_status = stData.status === 'active' ? 'نشط' : (stData.status === 'inactive' ? 'موقوف' : (stData.account_status || 'نشط'));
                } else {
                    stData.group_id = groupIdFromDB;
                    stData.account_status = stData.status === 'active' ? 'نشط' : (stData.status === 'inactive' ? 'موقوف' : 'نشط');
                }

                let enrichedEnr = [];
                if (enrData && enrData.length > 0) {
                    enrichedEnr = enrData.map(e => {
                        const locE = localEnrs.find(le => le.course_name === e.course_name) || localEnrs[0] || {};
                        // Teacher name: from DB JOIN only — no hardcoded fallback
                        const teacherName = (e.teachers && e.teachers.name) ? e.teachers.name : (locE.teacher_name || '');
                        const teacherBio = (e.teachers && e.teachers.bio && e.teachers.bio.startsWith('http')) ? e.teachers.bio : '';
                        if (teacherBio) {
                            if (!window.TEACHER_MEET_LINKS) window.TEACHER_MEET_LINKS = {};
                            if (e.teacher_id) window.TEACHER_MEET_LINKS[String(e.teacher_id)] = teacherBio;
                            if (teacherName) window.TEACHER_MEET_LINKS[teacherName] = teacherBio;
                        }
                        const rc = (e.remaining_credits !== undefined) ? e.remaining_credits : (locE.remaining_credits !== undefined ? locE.remaining_credits : 0);
                        const enrGid = e.group_id || groupIdFromDB;
                        return {
                            ...locE,
                            ...e,
                            group_id: enrGid,
                            teacher_name: teacherName,
                            teacher_id: e.teacher_id,
                            // Days/time from DB columns (set by upload script), fallback to empty
                            subscription_days: e.subscription_days || locE.subscription_days || '',
                            lecture_time: e.lecture_time || locE.lecture_time || '',
                            session_duration: e.session_duration || locE.session_duration || '',
                            google_meet_url: (typeof window !== 'undefined' && window.getGroupMeetUrl) ? window.getGroupMeetUrl(enrGid, e.teacher_id || teacherName) : (teacherBio || e.google_meet_url || locE.google_meet_url || 'https://meet.google.com'),
                            account_status: stData.account_status,
                            remaining_credits: rc,
                            total_lectures_unlocked: Math.max(e.total_lectures_unlocked || 0, rc),
                            excuse_count: e.excuse_count || 0,
                            present_count: e.present_count || 0,
                            absent_count: e.absent_count || 0,
                            status: e.status || 'active',
                        };
                    });
                    const enrWithSurah = enrData.find(e => e.current_surah) || enrData[0];
                    if (enrWithSurah) {
                        stData.current_surah = enrWithSurah.current_surah;
                        stData.current_aya = enrWithSurah.current_aya;
                    }
                } else if (localEnrs.length > 0) {
                    enrichedEnr = localEnrs.map(le => ({
                        ...le,
                        google_meet_url: (typeof window !== 'undefined' && window.getGroupMeetUrl) ? window.getGroupMeetUrl(le.group_id || groupIdFromDB, le.teacher_id || le.teacher_name) : (le.google_meet_url || 'https://meet.google.com')
                    }));
                }

                return {
                    student: stData,
                    enrolled_courses: enrichedEnr,
                    enrolled_courses_count: enrichedEnr.length,
                    unread_notifications: 0
                };
            } catch(e) {
                console.warn('[Supabase] Error fetching student profile:', e);
                return null;
            }
        },

        // --- LECTURES: Get course lectures from cloud ---
        getCourseLectures: async function(courseName) {
            const client = this.getClient();
            if (!client) return null;
            try {
                const { data, error } = await client
                    .from('lectures')
                    .select('*')
                    .eq('course_name', courseName)
                    .order('lecture_number', { ascending: true });
                if (error) throw error;
                return data;
            } catch(e) {
                console.warn('[Supabase] Error fetching course lectures:', e);
                return null;
            }
        },

        // --- LECTURES: Save or update lecture in cloud ---
        saveLecture: async function(lecData) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase not initialized' };
            try {
                let savedRecord = null;
                if (lecData.id) {
                    const { data, error } = await client
                        .from('lectures')
                        .update(lecData)
                        .eq('id', lecData.id)
                        .select()
                        .single();
                    if (error) throw error;
                    savedRecord = data || lecData;
                } else {
                    const { data: maxLec } = await client
                        .from('lectures')
                        .select('id')
                        .order('id', { ascending: false })
                        .limit(1);
                    const nextId = (maxLec && maxLec[0] ? maxLec[0].id : 0) + 1;
                    const recordWithId = { ...lecData, id: nextId };
                    const { data, error } = await client
                        .from('lectures')
                        .insert([recordWithId])
                        .select()
                        .single();
                    if (error) throw error;
                    savedRecord = data || recordWithId;
                }

                // Update local storage cache
                this.updateLocalCache(db => {
                    if (!db.lectures) db.lectures = [];
                    const idx = db.lectures.findIndex(l => l.id === savedRecord.id);
                    if (idx >= 0) db.lectures[idx] = savedRecord;
                    else db.lectures.push(savedRecord);
                });

                return { success: true, lecture: savedRecord };
            } catch(e) {
                console.error('[Supabase Save Lecture Error]:', e);
                return { error: e.message || 'تعذر حفظ المحاضرة سحابياً' };
            }
        },

        // --- LECTURES: Save batch of lectures for a course ---
        saveCourseLecturesBatch: async function(courseName, lecturesList) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase not initialized' };
            try {
                const results = [];
                for (const lec of lecturesList) {
                    const res = await this.saveLecture(lec);
                    if (res.error) throw new Error(res.error);
                    results.push(res.lecture);
                }
                return { success: true, lectures: results };
            } catch(e) {
                console.error('[Supabase Batch Save Error]:', e);
                return { error: e.message || 'حدث خطأ أثناء حفظ المحاضرات' };
            }
        },

        // --- AUTH: Cloud Register Student ---
        registerStudent: async function(payload) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase client not initialized' };

            const u = (payload.username || '').trim().toLowerCase();

            // Check if username already exists in Supabase users table
            const { data: existing } = await client
                .from('users')
                .select('id')
                .eq('username', u)
                .limit(1);

            if (existing && existing.length > 0) {
                return { error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' };
            }

            // Generate unique student code
            const code = 'MNR-2026-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + code;

            // Fetch max IDs to prevent PostgreSQL identity conflicts
            const [{ data: maxSt }, { data: maxUsr }, { data: maxEnr }] = await Promise.all([
                client.from('students').select('id').order('id', { ascending: false }).limit(1),
                client.from('users').select('id').order('id', { ascending: false }).limit(1),
                client.from('enrollments').select('id').order('id', { ascending: false }).limit(1)
            ]);

            const nextStudentId = ((maxSt && maxSt[0]) ? maxSt[0].id : 0) + 1;
            const nextUserId = ((maxUsr && maxUsr[0]) ? maxUsr[0].id : 0) + 1;
            const nextEnrollmentId = ((maxEnr && maxEnr[0]) ? maxEnr[0].id : 0) + 1;

            const studentRecord = {
                id: nextStudentId,
                name: payload.name.trim(),
                student_code: code,
                age: parseInt(payload.age) || 12,
                phone: payload.phone || payload.parent_phone,
                parent_name: payload.parent_name,
                parent_phone: payload.parent_phone,
                qr_code: qr,
                status: 'active'
            };

            // 1. Insert into students table
            const { data: stData, error: stErr } = await client
                .from('students')
                .insert([studentRecord])
                .select()
                .single();

            if (stErr) {
                console.error('[Supabase Insert Student Error]:', stErr);
                return { error: 'تعذر إنشاء سجل الطالب في قاعدة البيانات السحابية: ' + (stErr.message || '') };
            }

            const activeStudent = stData || studentRecord;

            // 2. Insert into users table
            const userRecord = {
                id: nextUserId,
                username: u,
                password_hash: payload.password.trim(),
                role: 'student',
                related_id: activeStudent.id,
                student_id: activeStudent.id,
                full_name: payload.name.trim(),
                email: u + '@student.monir.edu.eg',
                phone: payload.phone || payload.parent_phone,
                status: 'active'
            };

            const { data: uData, error: uErr } = await client
                .from('users')
                .insert([userRecord])
                .select()
                .single();

            if (uErr) {
                console.error('[Supabase Insert User Error]:', uErr);
            }

            const activeUser = uData || userRecord;

            // 3. Insert into enrollments table
            const enrollmentRecord = {
                id: nextEnrollmentId,
                student_id: activeStudent.id,
                course_name: payload.course_name || 'مسار القرآن الكريم والتدبر',
                teacher_id: 1,
                unlocked_blocks: 1,
                total_lectures_unlocked: 4,
                remaining_credits: 4,
                status: 'active'
            };

            await client.from('enrollments').insert([enrollmentRecord]);

            // 4. Update local cache immediately
            this.updateLocalCache(db => {
                if (!db.students) db.students = [];
                db.students.push(activeStudent);

                if (!db.users) db.users = [];
                db.users.push(activeUser);

                if (!db.enrollments) db.enrollments = [];
                db.enrollments.push(enrollmentRecord);
            });

            const token = 'sb_token_student_' + activeUser.id + '_' + Date.now();
            return {
                success: true,
                student_code: code,
                student: activeStudent,
                user: activeUser,
                token: token
            };
        },

        // --- GENERAL LECTURES & QUIZZES CLOUD METHODS ---
        getQuizzes: async function() {
            const client = this.getClient();
            if (!client) return { data: [], error: 'Supabase client not initialized' };
            try {
                const { data, error } = await client.from('quizzes').select('*').order('id', { ascending: true });
                return { data: data || [], error };
            } catch(e) {
                return { data: [], error: e.message };
            }
        },

        getQuizQuestions: async function(quizId) {
            const client = this.getClient();
            if (!client) return { data: [], error: 'Supabase client not initialized' };
            try {
                const { data, error } = await client.from('quiz_questions').select('*').eq('quiz_id', quizId).order('id', { ascending: true });
                return { data: data || [], error };
            } catch(e) {
                return { data: [], error: e.message };
            }
        },

        submitQuizResult: async function(submission) {
            const client = this.getClient();
            if (!client) return { data: null, error: 'Supabase client not initialized' };
            try {
                // Ensure id if needed
                const record = {
                    quiz_id: submission.quiz_id,
                    student_id: submission.student_id,
                    student_code: submission.student_code || '',
                    student_name: submission.student_name || '',
                    track_name: submission.track_name || '',
                    quiz_title: submission.quiz_title || '',
                    score: submission.score,
                    total_points: submission.total_points || 15,
                    percentage: submission.percentage,
                    answers: submission.answers || {},
                    submitted_at: new Date().toISOString()
                };
                const { data, error } = await client.from('quiz_submissions').insert([record]).select().single();
                return { data, error };
            } catch(e) {
                return { data: null, error: e.message };
            }
        },

        getStudentQuizSubmissions: async function(studentIdentifier) {
            const client = this.getClient();
            if (!client) return { data: [], error: 'Supabase client not initialized' };
            try {
                let query = client.from('quiz_submissions').select('*');
                if (typeof studentIdentifier === 'number') {
                    query = query.or(`student_id.eq.${studentIdentifier},student_code.eq.${studentIdentifier}`);
                } else {
                    query = query.or(`student_code.eq.${studentIdentifier},student_id.eq.${studentIdentifier}`);
                }
                const { data, error } = await query.order('submitted_at', { ascending: false });
                return { data: data || [], error };
            } catch(e) {
                return { data: [], error: e.message };
            }
        },

        getAllQuizSubmissions: async function() {
            const client = this.getClient();
            if (!client) return { data: [], error: 'Supabase client not initialized' };
            try {
                const { data, error } = await client.from('quiz_submissions').select('*').order('submitted_at', { ascending: false });
                return { data: data || [], error };
            } catch(e) {
                return { data: [], error: e.message };
            }
        },

        createQuizWithQuestions: async function(quizData, questionsList) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase client not initialized' };
            try {
                const { data: qData, error: qErr } = await client.from('quizzes').insert([quizData]).select().single();
                if (qErr) return { error: qErr.message };

                if (questionsList && questionsList.length > 0) {
                    const qFormatted = questionsList.map((q, idx) => ({
                        quiz_id: qData.id,
                        question_text: q.question_text,
                        question_type: q.question_type || 'mcq',
                        points: q.points || 5,
                        options: q.options || [],
                        correct_option_index: q.correct_option_index !== undefined ? q.correct_option_index : 0
                    }));
                    await client.from('quiz_questions').insert(qFormatted);
                }
                return { success: true, quiz: qData };
            } catch(e) {
                return { error: e.message };
            }
        }
    };

    // Load Supabase JS library dynamically if not present
    if (typeof window !== 'undefined') {
        if (!window.supabase) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                initClient();
            };
            document.head.appendChild(script);
        } else {
            initClient();
        }
    }
})();
