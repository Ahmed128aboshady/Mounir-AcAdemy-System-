// Mounir Smart LMS — Supabase PostgreSQL Cloud Client (v2.0 Production)
(function() {
    // Official Live Supabase Project Config for Mounir Academy
    window.MONIR_SUPABASE_CONFIG = window.MONIR_SUPABASE_CONFIG || {
        url: 'https://chwhrxquvaiskdsthips.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod2hyeHF1dmFpc2tkc3RoaXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDM2NzgsImV4cCI6MjEwNDYxOTY3OH0.k_t-GUAT01c6ko-8QcF5L4FYnZQPV6HIu4JSnH1zbO4'
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

                if (stRes.data && stRes.data.length > 0) {
                    this.updateLocalCache(db => {
                        db.students = stRes.data;
                        if (enrRes.data) db.enrollments = enrRes.data;
                        if (uRes.data) db.users = uRes.data;
                        if (tcRes.data) db.teachers = tcRes.data;
                    });
                }
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

            // Query users table for matching username or email
            const { data, error } = await client
                .from('users')
                .select('*')
                .or(`username.ilike.${u},email.ilike.${u}`)
                .eq('password_hash', p)
                .limit(1);

            if (error) {
                console.error('[Supabase Login Error]:', error);
                return { error: 'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية' };
            }

            if (!data || data.length === 0) {
                return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
            }

            const user = data[0];
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
