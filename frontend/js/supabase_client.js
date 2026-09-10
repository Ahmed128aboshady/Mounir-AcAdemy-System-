// Mounir Smart LMS — Supabase PostgreSQL Cloud Client (v1.0)
(function() {
    // Config storage key
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
                console.log('[Supabase] Connected successfully to:', cfg.url);
            } catch(e) {
                console.error('[Supabase] Init error:', e);
            }
        }
    }

    window.MonirDB = {
        isConfigured: function() {
            return !!(getCfg() && supabaseClient);
        },

        saveConfig: function(url, anonKey) {
            const cleanUrl = (url || '').trim().replace(/\/+$/, '');
            const cleanKey = (anonKey || '').trim();
            localStorage.setItem(CFG_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
            initClient();
            return !!supabaseClient;
        },

        getClient: function() {
            if (!supabaseClient) initClient();
            return supabaseClient;
        },

        // --- AUTH: Login ---
        login: async function(username, password, expectedRole) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase client not initialized' };

            const u = (username || '').trim().toLowerCase();
            const p = (password || '').trim();

            // Query users table
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

            const token = 'sb_token_' + user.role + '_' + user.id + '_' + Date.now();
            return { success: true, token: token, user: user };
        },

        // --- AUTH: Register Student ---
        registerStudent: async function(payload) {
            const client = this.getClient();
            if (!client) return { error: 'Supabase client not initialized' };

            const u = (payload.username || '').trim().toLowerCase();

            // Check if username already exists
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

            // 1. Insert into students table
            const { data: studentData, error: stErr } = await client
                .from('students')
                .insert([{
                    name: payload.name.trim(),
                    student_code: code,
                    age: parseInt(payload.age) || 12,
                    phone: payload.phone || payload.parent_phone,
                    parent_name: payload.parent_name,
                    parent_phone: payload.parent_phone,
                    qr_code: qr,
                    status: 'active'
                }])
                .select()
                .single();

            if (stErr || !studentData) {
                console.error('[Supabase Insert Student Error]:', stErr);
                return { error: 'تعذر إنشاء سجل الطالب في قاعدة البيانات السحابية' };
            }

            // 2. Insert into users table
            const { data: userData, error: uErr } = await client
                .from('users')
                .insert([{
                    username: u,
                    password_hash: payload.password.trim(),
                    role: 'student',
                    related_id: studentData.id,
                    student_id: studentData.id,
                    full_name: payload.name.trim(),
                    email: u + '@student.monir.edu.eg',
                    phone: payload.phone || payload.parent_phone,
                    status: 'active'
                }])
                .select()
                .single();

            if (uErr) {
                console.error('[Supabase Insert User Error]:', uErr);
            }

            // 3. Insert into enrollments
            await client.from('enrollments').insert([{
                student_id: studentData.id,
                course_name: payload.course_name || 'مسار القرآن الكريم والتدبر',
                teacher_id: 1,
                unlocked_blocks: 1,
                total_lectures_unlocked: 4,
                remaining_credits: 4,
                status: 'active'
            }]);

            const token = 'sb_token_student_' + (userData ? userData.id : studentData.id);
            return {
                success: true,
                student_code: code,
                student: studentData,
                user: userData || {
                    id: studentData.id,
                    username: u,
                    role: 'student',
                    full_name: payload.name,
                    student_id: studentData.id
                },
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
