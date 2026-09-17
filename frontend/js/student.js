let currentStudentId = 1;
let selectedCourseName = "";
let enrolledCoursesList = [];
let activeQuizId = null;
let activeQuizQuestions = [];
let activeQuizAnswers = {};
let currentGeneralTrack = 'tajweed';
let cachedGeneralQuizzes = [];
let cachedStudentSubmissions = [];

// Strict Academy LMS Session Enforcement:
const urlParams = new URLSearchParams(window.location.search);
const userStr = localStorage.getItem('monir_current_user');

if (!userStr) {
    window.location.replace('login.html');
}

let activeUser = null;
if (userStr) {
    try {
        activeUser = JSON.parse(userStr);
    } catch(e) {}
}

if (activeUser && activeUser.role === 'student') {
    // If the active logged-in user is a student, ALWAYS bind strictly to their student_code / username
    currentStudentId = activeUser.student_code || activeUser.username || activeUser.student_id || activeUser.related_id || currentStudentId;
} else if (activeUser && (activeUser.role === 'admin' || activeUser.role === 'teacher')) {
    if (urlParams.has('code')) {
        currentStudentId = urlParams.get('code');
    } else if (urlParams.has('id')) {
        const pId = urlParams.get('id');
        currentStudentId = String(pId).startsWith('ST') ? pId : (parseInt(pId) || currentStudentId);
    }
}

function initStudentPage() {
    const sel = document.getElementById('studentSelectDropdown');
    if (sel) sel.value = currentStudentId;

    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            const authBtn = document.getElementById('studentAuthBtn');
            if (authBtn) {
                const name = (u.full_name ? u.full_name.split(' ')[0] : u.username);
                authBtn.innerHTML = `<span class="hidden sm:inline">تسجيل الخروج (${name})</span><span class="sm:hidden text-[11px]">خروج</span>`;
                authBtn.title = 'تسجيل الخروج (' + name + ')';
                authBtn.className = 'text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 sm:px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 shrink-0';
                authBtn.onclick = (e) => {
                    e.preventDefault();
                    if (window.MonirPopup) {
                        window.MonirPopup.confirm('هل ترغب في تسجيل الخروج من حسابك؟', 'تسجيل الخروج', 'question', 'نعم، تسجيل الخروج', 'إلغاء')
                            .then(confirmed => {
                                if (confirmed) {
                                    localStorage.removeItem('monir_current_user');
                                    localStorage.removeItem('monir_auth_token');
                                    window.location.href = 'login.html';
                                }
                            });
                    } else if (confirm('هل ترغب في تسجيل الخروج؟')) {
                        localStorage.removeItem('monir_current_user');
                        localStorage.removeItem('monir_auth_token');
                        window.location.href = 'login.html';
                    }
                };
            }
        } catch(e) {}
    }
    
    if (activeUser && (activeUser.role === 'admin' || activeUser.role === 'teacher')) {
        const bar = document.getElementById('adminStudentSupervisorBar');
        if (bar) bar.classList.remove('hidden');
        initAdminStudentSupervisor(currentStudentId);
    }

    loadStudentProfile();
    loadNotifications();
    loadSupportTickets();
    loadGeneralLectures();
}

let __cachedSupervisorStudents = [];

async function initAdminStudentSupervisor(activeId) {
    const sel = document.getElementById('adminStudentQuickSelect');
    if (!sel) return;
    try {
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            const client = window.MonirDB.getClient();
            const { data } = await client.from('students').select('id, name, student_code, qr_code, age, parent_name').order('name', { ascending: true }).limit(1000);
            if (data && data.length > 0) __cachedSupervisorStudents = data;
        }
        if (__cachedSupervisorStudents.length === 0) {
            const res = await fetch('/api/students');
            __cachedSupervisorStudents = await res.json();
        }
        sel.innerHTML = __cachedSupervisorStudents.map(s => {
            const isSel = (s.id == activeId || s.student_code == activeId) ? 'selected' : '';
            const grp = s.qr_code ? ` [${s.qr_code}]` : '';
            const name = s.name || ('طالب ' + (s.student_code || s.id));
            return `<option value="${s.id}" ${isSel}>${name} (${s.student_code || s.id})${grp}</option>`;
        }).join('');
    } catch(e) {
        console.error('Error populating admin student switcher:', e);
    }
}

function switchAdminStudentView(newStudentId) {
    if (!newStudentId) return;
    window.location.href = 'student.html?id=' + newStudentId;
}

function openStudentSearchModal() {
    const modal = document.getElementById('studentSearchModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('studentModalSearchInput');
    if (input) { input.value = ''; input.focus(); }
    renderModalStudentsList(__cachedSupervisorStudents);
}

function closeStudentSearchModal() {
    const modal = document.getElementById('studentSearchModal');
    if (modal) modal.classList.add('hidden');
}

function filterModalStudents(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        renderModalStudentsList(__cachedSupervisorStudents);
        return;
    }
    const filtered = __cachedSupervisorStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.student_code && s.student_code.toLowerCase().includes(q)) ||
        (s.qr_code && s.qr_code.toLowerCase().includes(q)) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(q)) ||
        (s.id && String(s.id).includes(q))
    );
    renderModalStudentsList(filtered);
}

function renderModalStudentsList(list) {
    const container = document.getElementById('modalStudentsResultsList');
    const countLabel = document.getElementById('studentSearchModalCount');
    if (!container) return;

    if (countLabel) {
        countLabel.innerText = `${Math.min(list.length, 30)} من ${list.length} طالب`;
    }

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-slate-400 font-bold">لا يوجد طلاب مطابقين للبحث</div>';
        return;
    }

    const displayList = list.slice(0, 30);
    container.innerHTML = displayList.map(s => {
        const isCurrent = (s.id == currentStudentId || s.student_code == currentStudentId);
        const sName = s.name || ('طالب ' + (s.student_code || s.id));
        return `
            <div class="p-2.5 rounded-xl border ${isCurrent ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} flex items-center justify-between gap-2 transition">
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <strong class="text-slate-900 text-xs truncate">${sName}</strong>
                        <span class="bg-[#41519C] text-white text-[10px] font-mono px-1.5 py-0.5 rounded">${s.student_code || s.id}</span>
                        ${s.qr_code ? `<span class="bg-[#57BA9E] text-slate-950 text-[10px] font-mono px-1.5 py-0.5 rounded">${s.qr_code}</span>` : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 truncate">${s.parent_name ? 'ولي الأمر: ' + s.parent_name : ''}</div>
                </div>
                <button type="button" onclick="switchAdminStudentView(${s.id})" class="bg-[#41519C] hover:bg-[#2D396E] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer">
                    ${isCurrent ? 'الحالي ✓' : 'اختيار ➔'}
                </button>
            </div>
        `;
    }).join('');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudentPage);
} else {
    initStudentPage();
}

function switchStudent(newId) {
    currentStudentId = parseInt(newId);
    selectedCourseName = "";
    
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + currentStudentId;
    window.history.pushState({path:newUrl},'',newUrl);
    
    loadStudentProfile();
    loadNotifications();
    loadSupportTickets();
}

async function loadStudentProfile() {
    try {
        // Read viewer role
        let viewerRole = 'student';
        const uStr = localStorage.getItem('monir_current_user');
        let initialUser = null;
        if (uStr) {
            try {
                initialUser = JSON.parse(uStr);
                viewerRole = initialUser.role || 'student';
            } catch(e) {}
        }

        // Determine exact unique lookup key (prefer student_code over numeric id)
        const lookupKey = (viewerRole === 'student' && initialUser) 
            ? (initialUser.student_code || initialUser.username || currentStudentId) 
            : currentStudentId;

        const nameEl = document.getElementById('studentName');
        const codeEl = document.getElementById('studentCode');
        const qrImg = document.getElementById('studentQrImg');

        if (initialUser && viewerRole === 'student') {
            const userCode = initialUser.student_code || initialUser.username || (String(lookupKey).startsWith('ST') ? lookupKey : ('ST' + String(lookupKey).padStart(4, '0')));
            if (nameEl) nameEl.innerText = initialUser.full_name || initialUser.username;
            if (codeEl) codeEl.innerText = userCode;
            if (qrImg) qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(userCode);
        } else {
            const fallbackCode = String(lookupKey).startsWith('ST') ? lookupKey : ('ST' + String(lookupKey).padStart(4, '0'));
            if (nameEl && nameEl.innerText.includes('جاري')) nameEl.innerText = 'طالب الأكاديمية';
            if (codeEl && (codeEl.innerText === '---' || !codeEl.innerText)) codeEl.innerText = fallbackCode;
            if (qrImg) qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(fallbackCode);
        }

        let data = {};
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const sbData = await window.MonirDB.getStudentProfile(lookupKey);
                if (sbData && sbData.student) {
                    data = sbData;
                }
            } catch(e) {
                console.warn('[Supabase Cloud Profile]: Fallback to API mock.', e);
            }
        }

        if (!data || !data.student) {
            const res = await fetch('/api/student/' + encodeURIComponent(lookupKey));
            data = await res.json();
        }
        
        const s = data.student || {};
        window.currentStudentData = data;
        let loadedAge = (s.age !== undefined && s.age !== null) ? parseInt(s.age) : 9;
        const pageParams = new URLSearchParams(window.location.search);
        if (pageParams.has('sim_age')) {
            loadedAge = parseInt(pageParams.get('sim_age'), 10);
        }
        window.currentStudentAge = loadedAge;
        if (typeof updateFridayScheduleNoticeByAge === 'function') {
            updateFridayScheduleNoticeByAge(loadedAge);
        }

        // Privacy Shield for Teachers
        if (viewerRole === 'teacher') {
            let shield = document.getElementById('teacherPrivacyShieldBanner');
            if (!shield) {
                shield = document.createElement('div');
                shield.id = 'teacherPrivacyShieldBanner';
                shield.className = 'bg-[#1F274B] border-2 border-[#57BA9E] text-white p-3.5 rounded-2xl mb-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-bold';
                shield.innerHTML = `
                    <div class="flex items-center gap-2.5">
                        <span class="bg-[#57BA9E] text-slate-950 px-2.5 py-1 rounded-lg font-black text-[11px]">درع الخصوصية مفعّل</span>
                        <span>أنت تتصفح كمعلم: تم حجب رقم هاتف واسم ولي الأمر والبيانات المالية لضمان خصوصية عائلة الطالب.</span>
                    </div>
                    <a href="teacher.html" class="bg-[#57BA9E] hover:bg-[#43A68A] text-slate-950 font-black px-3 py-1.5 rounded-xl transition whitespace-nowrap">
                        ← العودة لبوابة المعلمين
                    </a>
                `;
                const mainEl = document.querySelector('main');
                if (mainEl) mainEl.insertBefore(shield, mainEl.firstChild);
            }

            // Hide Paymob renewal banner from teacher
            const renBanner = document.getElementById('renewalBanner');
            if (renBanner) renBanner.classList.add('hidden');

            // Hide switch dropdown container
            const selDropdown = document.getElementById('studentSelectDropdown');
            if (selDropdown) selDropdown.disabled = true;

            const displayName = s.name || (s.student_code ? ('طالب ' + s.student_code) : 'طالب الأكاديمية');
            document.getElementById('studentName').innerText = displayName;
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 9) + ' سنوات';
            document.getElementById('studentCode').innerText = s.student_code || ('ST' + String(s.id || currentStudentId).padStart(4, '0'));
            document.getElementById('parentName').innerText = 'ولي أمر معتمد (محجوب)';
            const parentPhoneEl = document.getElementById('parentPhone');
            if (parentPhoneEl) parentPhoneEl.innerText = 'محجوب للخصوصية';
            document.getElementById('enrolledCoursesCount').innerText = (data.enrolled_courses_count || 1) + ' مسار تدريبي';
        } else if (viewerRole === 'admin') {
            // Admin sees EVERYTHING unmasked - supervisor toolbar is already fixed at top
            const existingBanner = document.getElementById('adminSupervisorBanner');
            if (existingBanner) existingBanner.remove();

            const displayName = s.name || (s.student_code ? ('طالب ' + s.student_code) : 'طالب الأكاديمية');
            document.getElementById('studentName').innerText = displayName;
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 9) + ' سنوات';
            document.getElementById('studentCode').innerText = s.student_code || ('ST' + String(s.id || currentStudentId).padStart(4, '0'));
            document.getElementById('parentName').innerText = s.parent_name || 'ولي أمر الطالب';
            const parentPhoneEl = document.getElementById('parentPhone');
            if (parentPhoneEl) parentPhoneEl.innerText = s.parent_phone || s.phone || 'غير مسجل';
            document.getElementById('enrolledCoursesCount').innerText = (data.enrolled_courses_count || 1) + ' مسار تدريبي';
        } else {
            // Normal Student View
            const selDropdown = document.getElementById('studentSelectDropdown');
            if (selDropdown) selDropdown.classList.add('hidden');

            let fallbackName = 'طالب الأكاديمية';
            if (uStr) {
                try {
                    const u = JSON.parse(uStr);
                    if (u.full_name) fallbackName = u.full_name;
                } catch(e) {}
            }
            const finalName = s.name || fallbackName;

            const safeId = s.id || currentStudentId;
            const firstEnr = (data.enrolled_courses && data.enrolled_courses[0]) ? data.enrolled_courses[0] : {};
            const grpId = s.group_id || firstEnr.group_id || 'G182';
            const phoneVal = s.parent_phone || s.phone || (initialUser && (initialUser.parent_phone || initialUser.phone)) || 'غير مسجل';

            document.getElementById('studentName').innerText = finalName;
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 9) + ' سنوات';
            document.getElementById('studentCode').innerText = s.student_code || ('ST' + String(safeId).padStart(4, '0'));
            
            const groupCodeEl = document.getElementById('groupCode');
            if (groupCodeEl) groupCodeEl.innerText = grpId;

            const accBadgeEl = document.getElementById('accountStatusBadge');
            if (accBadgeEl) accBadgeEl.innerText = 'اشتراك ساري (' + (s.account_status || 'نشط') + ')';

            // Clean Parent Name Extraction for Compound Arabic Names
            let safeParentName = s.parent_name;
            if (!safeParentName || safeParentName.includes('أ. بالله')) {
                const compoundPrefixes = [
                    'معتصم بالله', 'عبد الله', 'عبدالله', 'عبد الرحمن', 'عبدالرحمن', 'عبد الرحيم', 'عبدالرحيم',
                    'عبد القادر', 'عبدالقادر', 'عبد العزيز', 'عبدالعزيز', 'عبد الوهاب', 'عبدالوهاب',
                    'عز الدين', 'سيف الدين', 'نور الدين', 'زين الدين', 'تقى الله', 'حسام الدين'
                ];
                let foundMatch = false;
                for (const prefix of compoundPrefixes) {
                    if (finalName.startsWith(prefix + ' ')) {
                        const father = finalName.substring(prefix.length).trim();
                        if (father) {
                            safeParentName = 'أ. ' + father + ' (ولي الأمر)';
                            foundMatch = true;
                            break;
                        }
                    }
                }
                if (!foundMatch) {
                    const parts = finalName.split(/\s+/);
                    if (parts.length >= 2) {
                        safeParentName = 'أ. ' + parts.slice(1).join(' ') + ' (ولي الأمر)';
                    } else {
                        safeParentName = 'ولي أمر ' + finalName;
                    }
                }
            }

            document.getElementById('parentName').innerText = safeParentName;
            const parentPhoneEl = document.getElementById('parentPhone');
            if (parentPhoneEl) parentPhoneEl.innerText = phoneVal;
            document.getElementById('enrolledCoursesCount').innerText = ((data && data.enrolled_courses_count) || (enrolledCoursesList ? enrolledCoursesList.length : 1)) + ' مسار تدريبي';
        }
        
        const safeId = s.id || currentStudentId;
        const qrCodeData = s.student_code || ('ST' + String(safeId).padStart(4, '0'));
        const qrImgEl = document.getElementById('studentQrImg');
        if (qrImgEl) {
            qrImgEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qrCodeData);
        }
        
        if (data && data.enrolled_courses && data.enrolled_courses.length) {
            enrolledCoursesList = data.enrolled_courses.map(c => {
                const rem = (c.remaining_credits !== undefined) ? c.remaining_credits : (s.remaining_credits || 12);
                return {
                    ...c,
                    remaining_credits: rem,
                    total_lectures_unlocked: Math.max(c.total_lectures_unlocked || 0, rem)
                };
            });
        } else {
            // No enrolled courses found — don't show fake data
            enrolledCoursesList = [];
        }
        
        if (!selectedCourseName && enrolledCoursesList.length > 0) {
            selectedCourseName = enrolledCoursesList[0].course_name;
        }
        
        renderEnrolledCoursesTabs(enrolledCoursesList);
        checkAndRenderQuranWidget(enrolledCoursesList);
        loadSelectedCourseLectures();
        if (typeof syncZoomLiveStatusAll === 'function') {
            syncZoomLiveStatusAll();
        } else if (typeof renderGeneralTrackView === 'function') {
            renderGeneralTrackView();
        }
        
        const badge = document.getElementById('notifBadge');
        if (data.unread_notifications > 0) {
            badge.innerText = data.unread_notifications;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {
        console.error("Error loading student profile:", err);
    }
}

function extractQuranPlan(rawSurah, rawAya, studentId, studentCode) {
    let plan = {
        hifz: '',
        madi_qareeb: '',
        madi_baeed: '',
        notes: '',
        updated_at: ''
    };

    if (rawSurah && typeof rawSurah === 'string') {
        const trimmed = rawSurah.trim();
        if (trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                plan.hifz = parsed.hifz || parsed.surah || '';
                plan.madi_qareeb = parsed.madi_qareeb || parsed.madiQareeb || '';
                plan.madi_baeed = parsed.madi_baeed || parsed.madiBaeed || '';
                plan.notes = parsed.notes || '';
                plan.updated_at = parsed.updated_at || '';
            } catch(e) {
                plan.hifz = trimmed;
            }
        } else {
            plan.hifz = trimmed;
            if (rawAya && rawAya > 1 && !plan.hifz.includes('آية') && !plan.hifz.includes('اية')) {
                plan.hifz += ` (الآية ${rawAya})`;
            }
        }
    }

    // Check localStorage cache if any fields are empty
    const cacheKeys = [
        studentId ? ('monir_quran_plan_' + studentId) : null,
        studentCode ? ('monir_quran_plan_' + studentCode) : null,
        studentId ? ('monir_surah_progress_' + studentId) : null,
        studentCode ? ('monir_surah_progress_' + studentCode) : null
    ].filter(Boolean);

    for (const k of cacheKeys) {
        try {
            const raw = localStorage.getItem(k);
            if (raw) {
                const p = JSON.parse(raw);
                if (!plan.hifz && (p.hifz || p.surah)) plan.hifz = p.hifz || p.surah;
                if (!plan.madi_qareeb && (p.madi_qareeb || p.madiQareeb)) plan.madi_qareeb = p.madi_qareeb || p.madiQareeb;
                if (!plan.madi_baeed && (p.madi_baeed || p.madiBaeed)) plan.madi_baeed = p.madi_baeed || p.madiBaeed;
                if (!plan.notes && p.notes) plan.notes = p.notes;
                if (!plan.updated_at && p.updated_at) plan.updated_at = p.updated_at;
            }
        } catch(e) {}
    }

    return plan;
}

function checkAndRenderQuranWidget(courses) {
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const sId = curStudent.id || currentStudentId;
    const sCode = curStudent.student_code;

    let rawSurah = '';
    let rawAya = 1;

    if (Array.isArray(courses) && courses.length > 0) {
        const c = courses.find(x => x.course_name === selectedCourseName) || courses[0];
        if (c && c.current_surah) {
            rawSurah = c.current_surah;
            rawAya = c.current_aya;
        }
    }
    if (!rawSurah && curStudent && curStudent.current_surah) {
        rawSurah = curStudent.current_surah;
        rawAya = curStudent.current_aya;
    }

    const plan = extractQuranPlan(rawSurah, rawAya, sId, sCode);

    const hifzEl = document.getElementById('planHifzDisplay');
    const qareebEl = document.getElementById('planMadiQareebDisplay');
    const baeedEl = document.getElementById('planMadiBaeedDisplay');
    const notesEl = document.getElementById('planNotesDisplay');
    const notesContainer = document.getElementById('planNotesContainer');
    const badgeEl = document.getElementById('quranPlanUpdatedBadge');

    if (hifzEl) {
        hifzEl.innerText = plan.hifz || 'يُحدد بالحلقة القادمة مع المعلم';
    }
    if (qareebEl) {
        qareebEl.innerText = plan.madi_qareeb || 'لا يوجد ماضي قريب مسجل';
    }
    if (baeedEl) {
        baeedEl.innerText = plan.madi_baeed || 'لا يوجد ماضي بعيد مسجل';
    }
    if (notesEl && notesContainer) {
        if (plan.notes) {
            notesEl.innerText = plan.notes;
            notesContainer.classList.remove('hidden');
        } else {
            notesContainer.classList.add('hidden');
        }
    }
    if (badgeEl) {
        if (plan.updated_at) {
            try {
                const d = new Date(plan.updated_at);
                badgeEl.innerText = 'آخر اعتماد: ' + d.toLocaleDateString('ar-EG');
            } catch(e) {
                badgeEl.innerText = 'معتمد من المعلم';
            }
        } else {
            badgeEl.innerText = 'معتمد من المعلم';
        }
    }

    // Pass latest plan to notifications
    loadNotifications(sId, sCode, plan);
}

function renderEnrolledCoursesTabs(courses) {
    const container = document.getElementById('enrolledCoursesTabs');
    if (!container) return;
    container.innerHTML = '';
    
    let activeSessUser = null;
    const uStr = localStorage.getItem('monir_current_user');
    if (uStr) {
        try { activeSessUser = JSON.parse(uStr); } catch(e) {}
    }

    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const parentPhoneNum = curStudent.parent_phone || curStudent.phone || (activeSessUser && (activeSessUser.parent_phone || activeSessUser.phone)) || 'غير مسجل';

    const safeCourses = (Array.isArray(courses) && courses.length > 0) ? courses : [];

    if (safeCourses.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400"><p class="font-bold">جاري تحميل بيانات الكورسات...</p></div>';
        return;
    }

    safeCourses.forEach(c => {
        if (!c) return;
        const cName = c.course_name || c.name || c.title || 'مسار القرآن الكريم والتدبر';
        const isSelected = (selectedCourseName ? (cName === selectedCourseName) : true);
        const card = document.createElement('div');
        
        const activeClass = isSelected 
            ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-md transform scale-[1.01]' 
            : 'border border-slate-200 bg-white hover:border-slate-300 shadow-sm';
            
        card.className = 'p-4 rounded-2xl cursor-pointer transition space-y-3 ' + activeClass;
        card.onclick = () => selectCourseTab(cName);
        
        const teacherName = c.teacher_name || '';
        const groupId = c.group_id || curStudent.group_id || '';
        const remCredits = (c.remaining_credits !== undefined) ? c.remaining_credits : 0;
        const totalUnlocked = (c.total_lectures_unlocked !== undefined && c.total_lectures_unlocked >= remCredits) ? c.total_lectures_unlocked : remCredits;
        const daysText = c.subscription_days || '';
        let rawTimeVal = c.lecture_time || '';
        let timeText = rawTimeVal.replace(/\(ساعة\s*\d+(\.\d+)?\)/g, '').replace(/\(ساعة\s*كاملة\)/g, '').trim();

        
        const statusText = c.account_status || curStudent.account_status || 'نشط';
        const statusColor = (statusText === 'نشط' || statusText.includes('ساري')) ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300';

        let durationText = c.session_duration || c.duration;
        if (!durationText) {
            if (groupId === "G182" || (curStudent && curStudent.student_code === "ST0419") || (cName && cName.includes("20"))) {
                durationText = "20 دقيقة (جلسة فردية)";
            } else if (cName) {
                if (cName.includes("30") || cName.includes("نصف") || cName.includes("30د")) {
                    durationText = "30 دقيقة (جلسة فردية)";
                } else if (cName.includes("40") || cName.includes("40د")) {
                    durationText = "40 دقيقة (جلسة فردية)";
                } else if (cName.includes("45") || cName.includes("45د")) {
                    durationText = "45 دقيقة (جلسة فردية)";
                } else if (cName.includes("برايفت") || cName.includes("خاص")) {
                    durationText = "30 - 45 دقيقة (جلسة فردية)";
                } else {
                    durationText = "20 - 60 دقيقة";
                }
            } else {
                durationText = "20 دقيقة (جلسة فردية)";
            }
        }

        card.innerHTML = `
            <div class="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span class="bg-slate-900 text-amber-300 font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-slate-700">معرف الجروب: ${groupId}</span>
                        <span class="${statusColor} border font-black px-2.5 py-0.5 rounded-full text-[10px]">🟢 حالة الحساب: ${statusText}</span>
                    </div>
                    <h4 class="font-black text-lg text-slate-900 flex items-center gap-2">
                        <span>${cName}</span>
                    </h4>
                    <p class="text-xs font-black text-blue-900 mt-1 flex items-center gap-1">
                        <span>👨‍🏫 المعلم المشرف:</span>
                        <span class="underline decoration-blue-400">أ. ${teacherName}</span>
                    </p>
                </div>
            </div>

            <div class="bg-slate-100/90 p-3 rounded-xl text-xs border border-slate-200/80 space-y-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-bold">
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-500">⏰ موعد المحاضرة:</span>
                        <strong class="text-blue-900 font-extrabold">${timeText}</strong>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-500">⏱️ مدة السيشن:</span>
                        <strong class="text-emerald-800 font-extrabold">${durationText}</strong>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-500">📅 أيام الاشتراك:</span>
                        <strong class="text-slate-950 font-extrabold">${daysText}</strong>
                    </div>

                </div>
            </div>

            <div class="flex justify-between items-center text-xs pt-1 text-slate-600 font-semibold">
                <span>المحاضرات المفعلة بالسيستم: <strong class="text-blue-900">${totalUnlocked} / ${totalUnlocked}</strong></span>
                <span>حالة الحضور والمتابعة: <strong class="text-emerald-700">100% منتظم</strong></span>
            </div>
        `;
        container.appendChild(card);
    });
}

function selectCourseTab(cName) {
    selectedCourseName = cName;
    renderEnrolledCoursesTabs(enrolledCoursesList);
    loadSelectedCourseLectures();
}

function calculateGroupUpcomingDates(dayName, count) {
    const dates = [];
    const today = new Date(2026, 8, 11);
    
    if (!dayName) dayName = 'الاثنين';
    
    const dayMap = [
        { name: 'الأحد', regex: /أحد|احد/, day: 0 },
        { name: 'الإثنين', regex: /اثنين|إثنين|اتنين/, day: 1 },
        { name: 'الثلاثاء', regex: /ثلاثاء|تلات/, day: 2 },
        { name: 'الأربعاء', regex: /أربعاء|اربعاء|اربع/, day: 3 },
        { name: 'الخميس', regex: /خميس/, day: 4 },
        { name: 'الجمعة', regex: /جمعة|جمعه/, day: 5 },
        { name: 'السبت', regex: /سبت/, day: 6 }
    ];

    const targetDays = [];
    dayMap.forEach(item => {
        if (item.regex.test(dayName)) {
            targetDays.push(item.day);
        }
    });

    if (targetDays.length === 0) {
        targetDays.push(1); // default Monday
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    let current = new Date(today);
    current.setDate(current.getDate() + 1);

    while (dates.length < count) {
        const d = current.getDay();
        if (targetDays.includes(d)) {
            const dFormatted = dayNames[d] + ' ' + current.getDate() + ' ' + monthNames[current.getMonth()] + ' ' + current.getFullYear();
            dates.push({
                dayName: dayNames[d],
                dateFormatted: dFormatted,
                shortDate: current.getDate() + '/' + (current.getMonth() + 1) + '/' + current.getFullYear()
            });
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

async function loadSelectedCourseLectures() {
    if (!selectedCourseName) return;
    
    try {
        let data = null;
        const currentCourseInfo = enrolledCoursesList.find(c => c.course_name === selectedCourseName) || enrolledCoursesList[0] || {};
        const remainingCredits = (currentCourseInfo.remaining_credits !== undefined) ? currentCourseInfo.remaining_credits : (currentCourseInfo.total_lectures_unlocked || 12);

        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const sbLecs = await window.MonirDB.getCourseLectures(selectedCourseName);
                if (sbLecs && sbLecs.length > 0) {
                    data = {
                        course_name: selectedCourseName,
                        total_lectures_unlocked: remainingCredits,
                        unlocked_blocks: Math.ceil(remainingCredits / 4),
                        renewal_count: currentCourseInfo.renewal_count || 0,
                        remaining_credits: remainingCredits,
                        lectures: sbLecs.map(l => ({
                            ...l,
                            is_unlocked: (l.lecture_number <= remainingCredits)
                        }))
                    };
                }
            } catch(e) {
                console.warn('[Supabase] Failed to fetch lectures directly, falling back:', e);
            }
        }

        if (!data) {
            try {
                const res = await fetch('/api/student/' + currentStudentId + '/courses/' + encodeURIComponent(selectedCourseName) + '/lectures');
                if (res.ok) data = await res.json();
            } catch(e) {}
        }

        if (!data) {
            data = {
                course_name: selectedCourseName,
                total_lectures_unlocked: remainingCredits,
                unlocked_blocks: Math.ceil(remainingCredits / 4),
                remaining_credits: remainingCredits,
                lectures: []
            };
        }
        
        document.getElementById('selectedCourseTitle').innerText = 'جدول محاضرات: ' + (data.course_name || selectedCourseName);
        
        if (currentCourseInfo) {
            document.getElementById('presentCount').innerText = (currentCourseInfo.present_count !== undefined) ? currentCourseInfo.present_count : 0;
            document.getElementById('absentCount').innerText = currentCourseInfo.absent_count || 0;
            document.getElementById('renewalCountBadge').innerText = currentCourseInfo.renewal_count > 0 
                ? currentCourseInfo.renewal_count + ' مرة' 
                : 'المرحلة الأولى';
        }
        
        const cBadge = document.getElementById('paymobCourseNameBadge');
        if (cBadge) cBadge.innerText = data.course_name || selectedCourseName;
        const sInfo = document.getElementById('paymobStudentInfo');
        if (sInfo && document.getElementById('studentName')) {
            sInfo.innerText = document.getElementById('studentName').innerText + ' (' + (document.getElementById('studentCode') ? document.getElementById('studentCode').innerText : '') + ')';
        }

        // ════════════════════════════════════════════════
        // DYNAMIC BLOCK & ATTENDANCE CALCULATION
        // Total package = total_lectures_unlocked or (attendedCount + remaining_credits)
        // Attended lectures (1 .. attendedCount) are marked COMPLETED
        // Remaining lectures are scheduled & unlocked
        const rc = (currentCourseInfo.remaining_credits !== undefined) ? currentCourseInfo.remaining_credits : 0;
        const presentCount = (currentCourseInfo.present_count !== undefined) ? currentCourseInfo.present_count : 0;
        const absentCount = (currentCourseInfo.absent_count !== undefined) ? currentCourseInfo.absent_count : 0;
        const attendedCount = presentCount + absentCount;

        // Total package lectures to display in the block (e.g. 4 for monthly plan)
        let totalToShow = currentCourseInfo.total_lectures_unlocked || (attendedCount + rc);
        if (totalToShow < (attendedCount + rc)) {
            totalToShow = attendedCount + rc;
        }
        if (totalToShow < 1) totalToShow = Math.max(1, rc);
        const numBlocks = Math.ceil(totalToShow / 4);
        
        const durVal = currentCourseInfo.session_duration || '20';
        let durLabel = '20 دقيقة';
        const durNum = parseInt(durVal) || 20;
        durLabel = durNum + ' دقيقة';
        
        const subDays = currentCourseInfo.subscription_days || currentCourseInfo.days || 'الاثنين';
        const upcomingDates = calculateGroupUpcomingDates(subDays, totalToShow + 2);
        const timeText = currentCourseInfo.lecture_time || '8:00 مساءً';
        const curGid = currentCourseInfo.group_id || (window.currentStudentData && window.currentStudentData.student && window.currentStudentData.student.group_id);
        const meetUrl = (typeof window !== 'undefined' && window.getGroupMeetUrl)
            ? window.getGroupMeetUrl(curGid, currentCourseInfo.teacher_id || currentCourseInfo.teacher_name)
            : (currentCourseInfo.google_meet_url || 'https://meet.google.com');

        // Build the full list of lectures (existing + generated)
        if (!data.lectures || !Array.isArray(data.lectures)) {
            data.lectures = [];
        }
        while (data.lectures.length < totalToShow) {
            const num = data.lectures.length + 1;
            data.lectures.push({
                id: 100 + num,
                lecture_number: num,
                block_number: Math.ceil(num / 4),
                title: 'المحاضرة ' + num,
                scheduled_time: '',
                is_unlocked: (num <= attendedCount + rc),
                status: (num <= attendedCount) ? 'completed' : 'scheduled',
                google_meet_url: meetUrl
            });
        }

        // Assign dates, attendance status, and properties
        data.lectures.forEach((l, idx) => {
            const num = idx + 1;
            l.lecture_number = num;
            l.block_number = Math.ceil(num / 4);
            l.title = 'المحاضرة ' + num;
            l.google_meet_url = l.google_meet_url || meetUrl;

            const isAttended = (num <= attendedCount);
            const isUnlocked = (num <= attendedCount + rc);
            l.is_unlocked = isUnlocked;

            if (isAttended) {
                l.status = 'completed';
                l.attendance = {
                    status: (num <= presentCount ? 'present' : 'absent'),
                    duration_minutes: durNum
                };
            } else if (isUnlocked) {
                l.status = 'scheduled';
            } else {
                l.status = 'locked';
            }

            if (idx < upcomingDates.length) {
                let slotTime = timeText;
                if (timeText && timeText.includes('|')) {
                    const parts = timeText.split('|').map(p => p.trim());
                    const match = parts.find(p => p.includes(upcomingDates[idx].dayName) || (upcomingDates[idx].dayName === 'الإثنين' && p.includes('الاثنين')));
                    if (match) {
                        slotTime = match.replace(/^(السبت|الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة)\s*/, '').trim();
                    }
                }
                l.scheduled_time = upcomingDates[idx].dateFormatted + ' • ' + slotTime + ' (' + durLabel + ')';
            } else {
                l.scheduled_time = timeText + ' (' + durLabel + ')';
            }
        });

        // Subtitle removed per user request
        const subtitleEl = document.getElementById('selectedCourseSubtitle');
        if (subtitleEl) {
            subtitleEl.innerText = '';
            subtitleEl.classList.add('hidden');
        }

        // Show/hide renewal banner
        const renBannerEl = document.getElementById('renewalBanner');
        if (renBannerEl) {
            if (rc <= 1) renBannerEl.classList.remove('hidden');
            else renBannerEl.classList.add('hidden');
        }

        // Clear old static blocks and render new dynamic blocks
        const lecSection = document.getElementById('block1Lectures') ? 
            document.getElementById('block1Lectures').parentElement : null;
        
        // Find the lectures section container
        const lecturesSection = document.querySelector('#lectureBlocksContainer') || 
            (() => {
                // Create new container if not found
                const b1 = document.getElementById('block1Lectures');
                if (b1) {
                    // Replace the old section with our new container
                    const newContainer = document.createElement('div');
                    newContainer.id = 'lectureBlocksContainer';
                    newContainer.className = 'space-y-5';
                    // Find the entire section and replace its dynamic content
                    const sectionEl = document.querySelector('section.space-y-4') || b1.closest('section');
                    if (sectionEl) {
                        // Keep the header, replace the dynamic content
                        const header = sectionEl.querySelector('div.flex.justify-between');
                        const renBanner = document.getElementById('renewalBanner');
                        sectionEl.innerHTML = '';
                        if (header) sectionEl.appendChild(header);
                        if (renBanner) sectionEl.appendChild(renBanner);
                        sectionEl.appendChild(newContainer);
                        return newContainer;
                    }
                }
                return null;
            })();

        // Find the best container to render into
        let renderTarget = document.getElementById('lectureBlocksContainer');
        if (!renderTarget) {
            // Fallback: clear and repurpose block1Lectures
            const b1El = document.getElementById('block1Lectures');
            const b2El = document.getElementById('block2Lectures');
            if (b1El) b1El.innerHTML = '';
            if (b2El) b2El.innerHTML = '';
        }

        if (renderTarget) {
            renderTarget.innerHTML = '';
        }

        // Determine which lecture is currently due (first unlocked lecture that is not completed)
        const dueLecture = data.lectures.find(l => l.is_unlocked && l.status !== 'completed') 
            || data.lectures.find(l => l.is_unlocked) 
            || data.lectures[0];
        const dueLectureNumber = dueLecture ? dueLecture.lecture_number : 1;

        // Render each block
        for (let blockNum = 1; blockNum <= numBlocks; blockNum++) {
            const blockLectures = data.lectures.filter(l => l.block_number === blockNum);
            if (blockLectures.length === 0) continue;

            const blockStart = (blockNum - 1) * 4 + 1;
            const blockEnd = blockStart + blockLectures.length - 1;
            const allUnlocked = blockLectures.every(l => l.is_unlocked);
            const someUnlocked = blockLectures.some(l => l.is_unlocked);

            // Block header
            const blockHeader = document.createElement('div');
            blockHeader.className = 'bg-[#1F274B] text-white px-4 py-3 rounded-xl flex justify-between items-center text-xs font-bold shadow-sm';
            
            let badgeText = '';
            let badgeClass = '';
            if (allUnlocked) {
                badgeText = 'مفعلة بالكامل ✓';
                badgeClass = 'bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold';
            } else if (someUnlocked) {
                const unlockedCount = blockLectures.filter(l => l.is_unlocked).length;
                badgeText = unlockedCount + ' مفعلة • الباقي مقفل';
                badgeClass = 'bg-amber-400 text-slate-950 text-[10px] px-2.5 py-0.5 rounded-full font-black';
            } else {
                badgeText = 'مغلقة • تتطلب التجديد';
                badgeClass = 'bg-red-400 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold';
            }

            blockHeader.innerHTML = `
                <span class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-black">المرحلة ${blockNum}: المحاضرات (${blockStart} إلى ${blockEnd})</span>
                    <span class="${badgeClass}">${badgeText}</span>
                </span>
                <span class="text-blue-200 text-xs font-mono">${subDays}</span>
            `;

            // Block lectures container
            const blockContainer = document.createElement('div');
            blockContainer.className = 'space-y-3';

            blockLectures.forEach(l => {
                const isCurrentDue = (l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed');
                const card = renderLectureCard(l, isCurrentDue);
                blockContainer.appendChild(card);
            });

            if (renderTarget) {
                renderTarget.appendChild(blockHeader);
                renderTarget.appendChild(blockContainer);
            } else {
                // Fallback to old containers
                const b1El = document.getElementById('block1Lectures');
                const b2El = document.getElementById('block2Lectures');
                if (blockNum === 1 && b1El) {
                    b1El.before(blockHeader);
                    blockLectures.forEach(l => {
                        const isCurrentDue = (l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed');
                        b1El.appendChild(renderLectureCard(l, isCurrentDue));
                    });
                } else if (b2El) {
                    b2El.before(blockHeader);
                    blockLectures.forEach(l => {
                        const isCurrentDue = (l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed');
                        b2El.appendChild(renderLectureCard(l, isCurrentDue));
                    });
                }
            }
        }

    } catch (err) {
        console.error("Error loading course lectures:", err);
    }
}





function renderLectureCard(l, isCurrentDue = false) {
    const div = document.createElement('div');
    
    let statusBadge = '';
    let actionBtn = '';
    let cardClass = 'lecture-card p-4 rounded-xl border transition-all';

    const currentCourseInfo = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curGid = currentCourseInfo.group_id || curStudent.group_id;
    const meetLink = (typeof window !== 'undefined' && window.getGroupMeetUrl) 
        ? window.getGroupMeetUrl(curGid, currentCourseInfo.teacher_id || currentCourseInfo.teacher_name) 
        : (l.google_meet_url || currentCourseInfo.google_meet_url || 'https://meet.google.com');

    // Extract Quran Progress (الورد وموضع التلاوة والحفظ والماضي)
    let rawLectureSurah = (l.current_surah || currentCourseInfo.current_surah || curStudent.current_surah || '').trim();
    let rawLectureAya = l.current_aya || currentCourseInfo.current_aya || curStudent.current_aya || null;
    const sId = curStudent.id || currentStudentId;
    const sCode = curStudent.student_code;

    const plan = extractQuranPlan(rawLectureSurah, rawLectureAya, sId, sCode);

    let quranBadge = '';
    if (plan.hifz || plan.madi_qareeb) {
        quranBadge = `
            <div class="flex items-center gap-1.5 flex-wrap">
                ${plan.hifz ? `
                <span class="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md shadow-2xs">
                    <span>🟢 الورد:</span>
                    <strong>${plan.hifz}</strong>
                </span>` : ''}
                ${plan.madi_qareeb ? `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    <span>🔵 الماضي:</span>
                    <span>${plan.madi_qareeb}</span>
                </span>` : ''}
            </div>
        `;
    } else if (isCurrentDue || l.status === 'live') {
        quranBadge = `
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                <span>📖 الورد: يُحدد بالحلقة</span>
            </span>
        `;
    }

    // The single video room button - only shown for current due lecture or live
    const meetBtn = `
        <div class="mt-3 pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <button type="button" onclick="joinMeet(${l.id}, '${meetLink}')" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer">
                    <span>🎥</span>
                    <span>دخول الحصة المباشرة (Google Meet)</span>
                </button>
                <button type="button" onclick="copyMeetLink('${meetLink}')" class="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1 shrink-0 cursor-pointer" title="نسخ رابط الحصة">
                    <span>📋</span>
                    <span class="hidden sm:inline">نسخ الرابط</span>
                </button>
            </div>
            <span class="text-[10px] sm:text-[11px] text-emerald-800 font-semibold bg-emerald-100/70 px-2.5 py-1 rounded-lg text-center sm:text-right">قاعة تفاعلية مباشرة مع المعلم</span>
        </div>
    `;
    
    if (!l.is_unlocked) {
        cardClass += ' locked bg-slate-50/70 border-slate-200 opacity-80';
        statusBadge = '<span class="badge-status badge-locked">مغلقة • تتطلب تجديد المرحلة</span>';
        actionBtn = `
            <button onclick="openPaymobModal()" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
                <span>تجديد الاشتراك واختيار الباقة لفتح المحاضرة</span>
            </button>
        `;
    } else {
        cardClass += ' unlocked';
        
        if (l.status === 'completed') {
            cardClass += ' bg-white border-slate-200';
            const isPresent = (l.attendance && l.attendance.status === 'present');
            const isAbsent = (l.attendance && l.attendance.status === 'absent');
            
            let attBadge = '';
            if (isPresent) {
                attBadge = '<span class="text-emerald-600 font-bold text-xs flex items-center gap-1"><span>✓</span> <span>تم تسجيل حضورك (' + (l.attendance.duration_minutes || 60) + ' دقيقة)</span></span>';
            } else if (isAbsent) {
                attBadge = '<span class="text-red-600 font-bold text-xs flex items-center gap-1"><span>✕</span> <span>لم يتم الحضور (غياب مسجل)</span></span>';
            } else {
                attBadge = '<span class="text-slate-600 font-medium text-xs">تمت المحاضرة</span>';
            }
                
            statusBadge = '<span class="badge-status badge-completed">مكتملة ✓</span>';
            actionBtn = `
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div>${attBadge}</div>
                    ${(plan.hifz || plan.madi_qareeb) ? `
                        <div class="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 text-[11px] text-emerald-950">
                            <strong>الورد المنجز:</strong> ${plan.hifz || '—'} ${plan.madi_qareeb ? ` | <strong>مراجعة:</strong> ${plan.madi_qareeb}` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (l.status === 'postponed') {
            cardClass += ' bg-amber-50/40 border-amber-200';
            statusBadge = '<span class="badge-status badge-postponed">تم التأجيل لموعد جديد</span>';
            actionBtn = `
                <div class="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <strong>الموعد الجديد:</strong> ${l.rescheduled_to || l.scheduled_time} <br>
                    <span class="text-[11px] text-amber-700">السبب: ${l.postpone_reason || 'تنسيق المواعيد'} • لا يتم احتساب أي غياب.</span>
                </div>
            `;
        } else if (isCurrentDue || l.status === 'live') {
            cardClass += ' border-2 border-emerald-500 bg-emerald-50/30 shadow-sm ring-2 ring-emerald-400/20';
            statusBadge = `
                <span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-300">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    الحصة الحالية • جاهزة للدخول
                </span>
            `;

            const quranBox = (plan.hifz || plan.madi_qareeb || plan.madi_baeed) ? `
                <div class="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/90 rounded-2xl p-3 text-xs mb-2.5 shadow-2xs space-y-2">
                    <div class="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-emerald-200/60">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base">📖</span>
                            <strong class="text-xs font-black text-emerald-950">خطة الحفظ والمراجعة المقررة لهذه الحصة</strong>
                        </div>
                        <span class="text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-200 px-2 py-0.5 rounded-full">مسار القرآن الكريم</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div class="bg-white/95 p-2 rounded-xl border border-emerald-200 shadow-2xs">
                            <span class="text-[10px] text-emerald-800 font-black block mb-0.5">🟢 الحفظ الجديد:</span>
                            <strong class="text-xs text-slate-900 block">${plan.hifz || 'يُحدد بالحلقة'}</strong>
                        </div>
                        <div class="bg-white/95 p-2 rounded-xl border border-blue-200 shadow-2xs">
                            <span class="text-[10px] text-blue-800 font-black block mb-0.5">🔵 الماضي القريب:</span>
                            <strong class="text-xs text-slate-800 block">${plan.madi_qareeb || '—'}</strong>
                        </div>
                        <div class="bg-white/95 p-2 rounded-xl border border-purple-200 shadow-2xs">
                            <span class="text-[10px] text-purple-800 font-black block mb-0.5">🟣 الماضي البعيد:</span>
                            <strong class="text-xs text-slate-800 block">${plan.madi_baeed || '—'}</strong>
                        </div>
                    </div>
                    ${plan.notes ? `
                        <div class="text-[11px] text-emerald-950 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200 font-medium flex items-start gap-1.5">
                            <span>💡</span>
                            <div><strong>توجيهات المعلم:</strong> ${plan.notes}</div>
                        </div>
                    ` : ''}
                </div>
            ` : '';

            actionBtn = `
                ${quranBox}
                <div class="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-slate-700">
                    <div class="mb-1 font-bold text-slate-900">موعد الحصة: <strong class="text-emerald-700">${l.scheduled_time || 'حسب جدول المجموعة'}</strong></div>
                    <p class="text-[11px] text-slate-600">هذه هي المحاضرة التي عليها الدور الآن في خطتك. يمكنك الدخول المباشر للقاعة.</p>
                </div>
                ${meetBtn}
            `;
        } else {
            cardClass += ' bg-white border-slate-200';
            statusBadge = '<span class="badge-status bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">مجدولة • لم يحن دورها بعد</span>';
            actionBtn = `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                    <div class="mb-1">موعد المحاضرة: <strong>${l.scheduled_time || 'حسب جدول المجموعة'}</strong></div>
                    <div class="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        <span>يُتاح رابط الدخول عند حلول موعد هذه الحصة وبعد إتمام المحاضرة السابقة</span>
                    </div>
                </div>
            `;
        }
    }
    
    div.className = cardClass;
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2 gap-2">
            <div>
                <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">حصة #${l.lecture_number}</span>
                    ${quranBadge}
                </div>
                <h4 class="font-extrabold text-sm text-slate-900 mt-0.5">${l.title}</h4>
            </div>
            <div>${statusBadge}</div>
        </div>
        <div class="mt-2">
            ${actionBtn}
        </div>
    `;
    return div;
}

function joinMeet(lectureId, meetUrl) {
    const targetUrl = meetUrl || 'https://meet.google.com';
    window.open(targetUrl, '_blank');
    try {
        if (lectureId) {
            fetch('/api/lectures/' + lectureId + '/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: currentStudentId, duration_minutes: 60 })
            }).catch(() => {});
        }
    } catch (err) {
        console.warn("Error joining meet:", err);
    }
}

function getNextDueMeetUrl() {
    const currentCourseInfo = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curGid = currentCourseInfo.group_id || curStudent.group_id;
    return (typeof window !== 'undefined' && window.getGroupMeetUrl) 
        ? window.getGroupMeetUrl(curGid, currentCourseInfo.teacher_id || currentCourseInfo.teacher_name) 
        : (currentCourseInfo.google_meet_url || 'https://meet.google.com');
}

function joinNextDueMeet() {
    const url = getNextDueMeetUrl();
    joinMeet(null, url);
}

function copyNextDueMeet() {
    const url = getNextDueMeetUrl();
    const btn = document.getElementById('heroCopyMeetBtn');
    if (window.copyMeetLink) {
        window.copyMeetLink(url, btn);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            if (window.MonirPopup) window.MonirPopup.toast('✅ تم نسخ رابط الحصة بنجاح!', 'success');
            else alert('تم نسخ رابط الحصة بنجاح!');
        }).catch(() => {
            prompt('رابط الحصة المباشر:', url);
        });
    } else {
        prompt('رابط الحصة المباشر:', url);
    }
}

// ---------------- Quizzes System ----------------
async function openQuizzesModal() {
    document.getElementById('quizzesModal').classList.remove('hidden');
    document.getElementById('quizSelectionView').classList.remove('hidden');
    document.getElementById('quizActiveView').classList.add('hidden');
    document.getElementById('quizResultView').classList.add('hidden');
    document.getElementById('quizModalTitle').innerText = 'الاختبارات والتقييمات: ' + selectedCourseName;

    try {
        const res = await fetch('/api/courses/' + encodeURIComponent(selectedCourseName) + '/quizzes');
        const quizzes = await res.json();
        
        const container = document.getElementById('quizzesListContainer');
        container.innerHTML = '';
        
        if (quizzes.length === 0) {
            container.innerHTML = '<p class="text-center py-6 text-xs text-slate-400">لا توجد اختبارات معلنة لهذا المسار حالياً.</p>';
            return;
        }

        quizzes.forEach(q => {
            const div = document.createElement('div');
            div.className = 'bg-slate-50 border border-slate-200 hover:border-blue-500 p-4 rounded-2xl flex justify-between items-center transition';
            div.innerHTML = `
                <div>
                    <span class="bg-blue-100 text-blue-900 font-bold text-[10px] px-2 py-0.5 rounded">بلوك رقم #${q.block_number}</span>
                    <h4 class="font-extrabold text-sm text-slate-900 mt-1">${q.title}</h4>
                    <p class="text-[11px] text-slate-500">${q.description || ''}</p>
                </div>
                <button onclick="startQuiz(${q.id})" class="bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition">
                    بدء الاختبار
                </button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading quizzes:", err);
    }
}

function closeQuizzesModal() {
    document.getElementById('quizzesModal').classList.add('hidden');
}

async function startQuiz(quizId) {
    try {
        const res = await fetch('/api/quizzes/' + quizId);
        const data = await res.json();
        
        activeQuizId = data.id;
        activeQuizQuestions = data.questions;
        
        document.getElementById('quizSelectionView').classList.add('hidden');
        document.getElementById('quizActiveView').classList.remove('hidden');
        document.getElementById('quizResultView').classList.add('hidden');
        
        document.getElementById('activeQuizTitle').innerText = data.title;
        document.getElementById('activeQuizMeta').innerText = 'عدد الأسئلة: ' + data.questions.length + ' • درجة النجاح: ' + data.passing_score + '%';
        
        const container = document.getElementById('quizQuestionsContainer');
        container.innerHTML = '';
        
        data.questions.forEach((q, idx) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'bg-white p-4 rounded-xl border border-slate-200 space-y-2';
            
            let optionsHtml = '';
            q.options.forEach((opt, optIdx) => {
                optionsHtml += `
                    <label class="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input type="radio" name="q_${q.id}" value="${optIdx}" class="text-blue-900 focus:ring-blue-900">
                        <span class="text-xs text-slate-800 font-medium">${opt}</span>
                    </label>
                `;
            });
            
            qDiv.innerHTML = `
                <div class="font-bold text-xs text-slate-900">
                    <span class="text-blue-900">سؤال ${idx + 1}:</span> ${q.question_text}
                </div>
                <div class="space-y-1.5 pt-1">
                    ${optionsHtml}
                </div>
            `;
            container.appendChild(qDiv);
        });
    } catch (err) {
        console.error("Error starting quiz:", err);
    }
}

async function submitActiveQuiz() {
    const answers = {};
    activeQuizQuestions.forEach(q => {
        const sel = document.querySelector('input[name="q_' + q.id + '"]:checked');
        answers[q.id] = sel ? parseInt(sel.value) : -1;
    });
    
    try {
        const res = await fetch('/api/quizzes/' + activeQuizId + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudentId,
                answers: answers
            })
        });
        const result = await res.json();
        
        document.getElementById('quizActiveView').classList.add('hidden');
        document.getElementById('quizResultView').classList.remove('hidden');
        
        document.getElementById('quizResultIcon').innerText = result.percentage + '%';
        if (result.passed) {
            document.getElementById('quizResultTitle').innerText = 'أحسنت! تم اجتياز الاختبار بنجاح';
            document.getElementById('quizResultIcon').className = 'w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-xl font-black';
        } else {
            document.getElementById('quizResultTitle').innerText = 'لم يتم اجتياز الاختبار (حاول مرة أخرى)';
            document.getElementById('quizResultIcon').className = 'w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xl font-black';
        }
        
        document.getElementById('quizResultScore').innerText = 'الدرجة المحققة: ' + result.score + ' من ' + result.total_questions + ' (' + result.percentage + '%)';
    } catch (err) {
        console.error("Error submitting quiz:", err);
    }
}

function backToQuizList() {
    openQuizzesModal();
}

// ---------------- Support & Tickets System ----------------
function openSupportModal() {
    document.getElementById('supportModal').classList.remove('hidden');
    loadSupportTickets();
}

function closeSupportModal() {
    document.getElementById('supportModal').classList.add('hidden');
}

function switchSupportTab(tab) {
    const btnNew = document.getElementById('tabSupportNew');
    const btnList = document.getElementById('tabSupportList');
    const formTab = document.getElementById('supportFormTab');
    const listTab = document.getElementById('supportListTab');
    
    if (tab === 'new') {
        btnNew.className = 'py-2 px-4 border-b-2 border-blue-900 text-blue-900 font-bold';
        btnList.className = 'py-2 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-bold';
        formTab.classList.remove('hidden');
        listTab.classList.add('hidden');
    } else {
        btnList.className = 'py-2 px-4 border-b-2 border-blue-900 text-blue-900 font-bold';
        btnNew.className = 'py-2 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-bold';
        formTab.classList.add('hidden');
        listTab.classList.remove('hidden');
        loadSupportTickets();
    }
}

async function submitSupportTicket() {
    const category = document.getElementById('ticketCategory').value;
    const subject = document.getElementById('ticketSubject').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    
    if (!subject || !message) {
        alert("يرجى ملء الموضوع وتفاصيل الرسالة.");
        return;
    }
    
    const btn = document.getElementById('btnSubmitTicket');
    btn.disabled = true;
    btn.innerText = 'جاري الإرسال...';
    
    try {
        const res = await fetch('/api/support/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudentId,
                category: category,
                subject: subject,
                message: message
            })
        });
        const data = await res.json();
        
        alert("تم إرسال تذكرتك بنجاح! سيقوم فريق الأكاديمية بالرد والمتابعة معك.");
        document.getElementById('ticketSubject').value = '';
        document.getElementById('ticketMessage').value = '';
        btn.disabled = false;
        btn.innerText = 'إرسال التذكرة الآن';
        
        switchSupportTab('list');
    } catch (err) {
        console.error("Error submitting ticket:", err);
        btn.disabled = false;
        btn.innerText = 'إرسال التذكرة الآن';
    }
}

async function loadSupportTickets() {
    try {
        const res = await fetch('/api/student/' + currentStudentId + '/support/tickets');
        const tickets = await res.json();
        
        document.getElementById('ticketCountBadge').innerText = tickets.length;
        const list = document.getElementById('supportListTab');
        list.innerHTML = '';
        
        if (tickets.length === 0) {
            list.innerHTML = '<p class="text-center py-6 text-slate-400">لم تقم بإرسال أي تذاكر دعم سابقة.</p>';
            return;
        }
        
        tickets.forEach(t => {
            const div = document.createElement('div');
            const isReplied = (t.status === 'replied');
            div.className = 'bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2';
            
            let replyBlock = '';
            if (isReplied) {
                replyBlock = `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-950 mt-2">
                        <strong class="block text-blue-900 font-bold mb-0.5">رد إدارة الأكاديمية:</strong>
                        <p>${t.admin_reply}</p>
                    </div>
                `;
            } else {
                replyBlock = `<span class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">قيد المراجعة والرد</span>`;
            }
            
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <span class="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">${t.category}</span>
                        <h5 class="font-extrabold text-xs text-slate-900 mt-1">${t.subject}</h5>
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono">${t.created_at.slice(0, 10)}</span>
                </div>
                <p class="text-slate-600 text-[11px]">${t.message}</p>
                ${replyBlock}
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading tickets:", err);
    }
}

// ---------------- Notifications ----------------
async function loadNotifications(overrideId = null, overrideCode = null, preloadedPlan = null) {
    try {
        const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
        const sId = overrideId || curStudent.id || currentStudentId;
        const sCode = overrideCode || curStudent.student_code;

        let notifs = [];

        // 1. Try Supabase notifications table
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const client = window.MonirDB.getClient();
                const { data } = await client.from('notifications')
                    .select('*')
                    .eq('student_id', sId)
                    .order('created_at', { ascending: false })
                    .limit(15);
                if (data && data.length > 0) notifs = data;
            } catch(e) {
                console.warn('[Notifications] Supabase fetch error:', e);
            }
        }

        // 2. Load from local storage cache
        const notifKeys = [
            sId ? ('monir_student_notifs_' + sId) : null,
            sCode ? ('monir_student_notifs_' + sCode) : null
        ].filter(Boolean);

        for (const nk of notifKeys) {
            try {
                const raw = localStorage.getItem(nk);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(pn => {
                            if (!notifs.some(n => n.id === pn.id || (n.title === pn.title && n.created_at === pn.created_at))) {
                                notifs.push(pn);
                            }
                        });
                    }
                }
            } catch(e) {}
        }

        // 3. Fallback to API mock if notifs still empty
        if (notifs.length === 0) {
            try {
                const res = await fetch('/api/student/' + sId + '/notifications');
                if (res.ok) {
                    const apiNotifs = await res.json();
                    if (Array.isArray(apiNotifs)) notifs.push(...apiNotifs);
                }
            } catch(e) {}
        }

        // 4. Ensure the active Quran plan has a top-priority notification
        const plan = preloadedPlan || extractQuranPlan(
            curStudent.current_surah,
            curStudent.current_aya,
            sId,
            sCode
        );

        if (plan && (plan.hifz || plan.madi_qareeb || plan.madi_baeed)) {
            const hasPlanNotif = notifs.some(n => n.type === 'quran_plan');
            if (!hasPlanNotif) {
                notifs.unshift({
                    id: 'quran_plan_pinned',
                    type: 'quran_plan',
                    title: '📖 إشعار خطة الحفظ والمراجعة القرآنية',
                    message: `🟢 الحفظ الجديد: ${plan.hifz || '—'}\n🔵 الماضي القريب: ${plan.madi_qareeb || '—'}\n🟣 الماضي البعيد: ${plan.madi_baeed || '—'}${plan.notes ? '\n📝 توجيهات: ' + plan.notes : ''}`,
                    is_read: 0,
                    created_at: plan.updated_at || new Date().toISOString()
                });
            }
        }

        // 4.1 Ensure active Zoom live broadcast has the HIGHEST priority notification during the student's scheduled window
        const studentAgeForNotif = (window.currentStudentAge !== undefined) ? window.currentStudentAge : 
                                   ((curStudent && curStudent.age !== undefined && curStudent.age !== null) ? parseInt(curStudent.age) : 9);
        if (typeof getZoomLiveLinkStatus === 'function') {
            const zStatus = getZoomLiveLinkStatus("https://zoom.us/j/98264506630", studentAgeForNotif);
            if (zStatus && zStatus.isWithinWindow) {
                notifs.unshift({
                    id: 'zoom_live_pinned',
                    type: 'zoom_live',
                    title: (studentAgeForNotif < 10) ? '🔴 بث مباشر (Zoom): حلقة الأطفال والناشئة' : '🔴 بث مباشر (Zoom): محاضرة الطلاب والكبار',
                    message: `بدأت الآن المحاضرة التفاعلية المباشرة عبر Zoom (${studentAgeForNotif < 10 ? 'فئة أقل من 10 سنوات • 1:50 م إلى 2:25 م' : 'فئة 10 سنوات فما فوق • 2:20 م إلى 2:50 م'}). انقر على الزر بالأسفل للدخول مباشرة للقاعة والتواصل مع المعلم.`,
                    action_url: 'https://zoom.us/j/98264506630',
                    is_read: 0,
                    created_at: new Date().toISOString()
                });
            }
        }

        // 5. Render to UI
        const list = document.getElementById('notificationsList');
        const badge = document.getElementById('notifBadge');
        
        const unreadCount = notifs.filter(n => !n.is_read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (list) {
            list.innerHTML = '';
            if (notifs.length === 0) {
                list.innerHTML = '<p class="text-center text-xs text-slate-400 py-6">لا توجد إشعارات حالياً.</p>';
            } else {
                notifs.forEach(n => {
                    const div = document.createElement('div');
                    const isUnread = !n.is_read;
                    if (n.type === 'zoom_live') {
                        div.className = 'p-3.5 rounded-2xl border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 text-xs text-blue-950 font-bold shadow-md';
                        div.innerHTML = `
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="font-black flex items-center gap-1.5 text-blue-900">
                                    <span class="text-base">📹</span>
                                    <span>${n.title}</span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                                </span>
                                <span class="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full">مباشر الآن</span>
                            </div>
                            <p class="font-medium text-[11px] leading-relaxed text-slate-700 mb-2.5">${n.message}</p>
                            <a href="${n.action_url || 'https://zoom.us/j/98264506630'}" target="_blank" rel="noopener noreferrer" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95">
                                <span>انضم للبث المباشر (Zoom) 🚀</span>
                            </a>
                        `;
                    } else {
                        div.className = 'p-3 rounded-2xl border text-xs transition ' + 
                            (isUnread ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700');
                        div.innerHTML = `
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-extrabold flex items-center gap-1.5">
                                    <span>${n.type === 'quran_plan' ? '📖' : '🔔'}</span>
                                    <span>${n.title}</span>
                                    ${isUnread ? '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>' : ''}
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">${(n.created_at || '').slice(0, 10)}</span>
                            </div>
                            <p class="font-normal text-[11px] leading-relaxed whitespace-pre-line text-slate-700 mt-1">${n.message}</p>
                        `;
                    }
                    list.appendChild(div);
                });
            }
        }

        // 6. Top banner on student page
        const topBanner = document.getElementById('topNotificationBanner');
        if (topBanner && notifs.length > 0) {
            const topN = notifs[0];
            const titleEl = document.getElementById('topNotifTitle');
            const msgEl = document.getElementById('topNotifMsg');
            if (titleEl && msgEl) {
                titleEl.innerText = topN.title;
                msgEl.innerText = topN.message.replace(/\n/g, ' • ');
                topBanner.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Error loading notifications:", err);
    }
}

function toggleNotifications() {
    const modal = document.getElementById('notificationsModal');
    modal.classList.toggle('hidden');
}

function closeTopBanner() {
    document.getElementById('topNotificationBanner').classList.add('hidden');
}

// ---------------- Paymob & Renewal Packages ----------------
const RENEWAL_PACKAGES = [
    {
        id: 'group_4',
        type: 'group',
        typeName: 'جروب (مجموعة)',
        name: 'باقة الـ 4 محاضرات شهرياً',
        subtitle: 'شهرياً (حصة أسبوعياً)',
        credits: 4,
        duration: '45-60 دقيقة',
        price: 400,
        badge: null
    },
    {
        id: 'group_8',
        type: 'group',
        typeName: 'جروب (مجموعة)',
        name: 'باقة الـ 8 محاضرات شهرياً',
        subtitle: 'شهرياً (حصتان أسبوعياً)',
        credits: 8,
        duration: '45-60 دقيقة',
        price: 500,
        badge: 'الأكثر طلباً ⭐'
    },
    {
        id: 'private_4_60',
        type: 'private',
        typeName: 'برايفت (فردي خاص)',
        name: 'باقة 4 محاضرات (ساعة كاملة)',
        subtitle: '60 دقيقة للحصة — متابعة فردية 1:1',
        credits: 4,
        duration: '60 دقيقة',
        price: 1000,
        badge: null
    },
    {
        id: 'private_4_30',
        type: 'private',
        typeName: 'برايفت (فردي خاص)',
        name: 'باقة 4 محاضرات (نصف ساعة)',
        subtitle: '30 دقيقة للحصة — متابعة فردية 1:1',
        credits: 4,
        duration: '30 دقيقة',
        price: 666,
        badge: null
    }
];

let selectedRenewalPackageId = 'group_8';

function copyTransferText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(btn);
        }).catch(() => {
            fallbackCopyText(text, btn);
        });
    } else {
        fallbackCopyText(text, btn);
    }
}

function fallbackCopyText(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showCopySuccess(btn);
    } catch(e) {
        prompt('انسخ الرقم:', text);
    }
    document.body.removeChild(ta);
}

function showCopySuccess(btn) {
    if (!btn) return;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<span>تم النسخ ✔</span>';
    btn.classList.add('bg-emerald-200', 'text-emerald-950');
    setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.classList.remove('bg-emerald-200', 'text-emerald-950');
    }, 2000);
}

function updateWhatsAppTransferLink() {
    const pkg = RENEWAL_PACKAGES.find(p => p.id === selectedRenewalPackageId) || RENEWAL_PACKAGES[1];
    const sNameElem = document.getElementById('studentName');
    const sCodeElem = document.getElementById('studentCode');
    const sName = sNameElem ? sNameElem.innerText.trim() : 'طالب الأكاديمية';
    const sCode = sCodeElem ? sCodeElem.innerText.trim() : 'MNR';
    
    const payMethodRadio = document.querySelector('input[name="payMethod"]:checked');
    const methodVal = payMethodRadio ? payMethodRadio.value : 'instapay';
    const methodTitle = (methodVal === 'vodafone_cash') 
        ? 'فودافون كاش (01002530197)' 
        : 'إنستا باي (009348060001 - First Abu Dhabi Bank Misr - TRAINER X FOR TRAINING)';
    
    const msg = 
        'السلام عليكم، تم تحويل رسوم تجديد الاشتراك بأكاديمية منير:\n' +
        '• اسم الطالب: ' + sName + ' (' + sCode + ')\n' +
        '• المسار التدريبي: ' + (selectedCourseName || 'مسار القرآن الكريم والتدبر') + '\n' +
        '• الباقة المختارة: ' + pkg.name + ' (' + pkg.typeName + ')\n' +
        '• الرصيد المطلوب إضافته: +' + pkg.credits + ' حصص (' + pkg.duration + ')\n' +
        '• المبلغ المحول: ' + pkg.price + ' ج.م\n' +
        '• طريقة التحويل: ' + methodTitle + '\n' +
        'مرفق لسيادتكم صورة إشعار التحويل (سكرين شوت) لتأكيد وتفعيل الحصص فوراً.';
        
    const waBtn = document.getElementById('btnSendWhatsAppTransfer');
    if (waBtn) {
        waBtn.href = 'https://wa.me/201025969295?text=' + encodeURIComponent(msg);
    }
}

function selectRenewalPackage(pkgId) {
    const pkg = RENEWAL_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;
    selectedRenewalPackageId = pkgId;

    // Update Visual State on Cards
    RENEWAL_PACKAGES.forEach(p => {
        const card = document.getElementById('pkgCard_' + p.id);
        if (!card) return;
        const ind = card.querySelector('.pkg-indicator');
        const isSelected = (p.id === pkgId);

        if (isSelected) {
            if (p.type === 'group') {
                card.className = 'pkg-card cursor-pointer border-2 border-blue-600 bg-blue-50/50 rounded-2xl p-3.5 transition relative flex flex-col justify-between shadow-sm';
                if (ind) {
                    ind.className = 'pkg-indicator font-black text-blue-700';
                    ind.innerText = 'مُحدد ◉';
                }
            } else {
                card.className = 'pkg-card cursor-pointer border-2 border-emerald-600 bg-emerald-50/50 rounded-2xl p-3.5 transition relative flex flex-col justify-between shadow-sm';
                if (ind) {
                    ind.className = 'pkg-indicator font-black text-emerald-700';
                    ind.innerText = 'مُحدد ◉';
                }
            }
        } else {
            card.className = 'pkg-card cursor-pointer border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 transition bg-white relative flex flex-col justify-between';
            if (ind) {
                ind.className = 'pkg-indicator font-bold text-slate-400';
                ind.innerText = 'اختيار ◯';
            }
        }
    });

    // Update Summary Details
    const sName = document.getElementById('paymobServiceName');
    if (sName) sName.innerText = pkg.name + ' (' + pkg.typeName + ')';
    
    const credAdd = document.getElementById('paymobCreditsToAdd');
    if (credAdd) credAdd.innerText = '+' + pkg.credits + ' حصص جديدة (' + pkg.duration + ')';

    const amt = document.getElementById('paymobAmountText');
    if (amt) amt.innerText = pkg.price.toFixed(2) + ' ج.م';

    const howTo = document.getElementById('howToAmount');
    if (howTo) howTo.innerText = pkg.price.toFixed(2) + ' ج.م';

    const instapayAmt = document.getElementById('instapayAmountDisplay');
    if (instapayAmt) instapayAmt.innerText = pkg.price.toFixed(2) + ' ج.م';

    const vodafoneAmt = document.getElementById('vodafoneAmountDisplay');
    if (vodafoneAmt) vodafoneAmt.innerText = pkg.price.toFixed(2) + ' ج.م';

    const btnTxt = document.getElementById('btnPaymobSubmitText');
    if (btnTxt) btnTxt.innerText = '📋 تسجيل إشعار سداد (' + pkg.price.toFixed(2) + ' ج.م) - قيد المراجعة';

    updateWhatsAppTransferLink();
}

function updatePayMethodVisual(radioInput) {
    const val = radioInput ? radioInput.value : 'instapay';
    const instapayTab = document.getElementById('payMethodTab_instapay');
    const vodafoneTab = document.getElementById('payMethodTab_vodafone_cash');
    const instapayBox = document.getElementById('instapayDetailsBox');
    const vodafoneBox = document.getElementById('vodafoneDetailsBox');

    if (val === 'vodafone_cash') {
        if (vodafoneTab) {
            vodafoneTab.className = 'pay-method-opt border-2 border-rose-600 bg-rose-50/70 p-3 rounded-2xl text-center cursor-pointer flex flex-col items-center gap-1 font-bold text-rose-950 transition shadow-xs';
        }
        if (instapayTab) {
            instapayTab.className = 'pay-method-opt border-2 border-slate-200 hover:border-slate-300 p-3 rounded-2xl text-center cursor-pointer flex flex-col items-center gap-1 font-semibold text-slate-700 transition';
        }
        if (instapayBox) instapayBox.classList.add('hidden');
        if (vodafoneBox) vodafoneBox.classList.remove('hidden');
    } else {
        if (instapayTab) {
            instapayTab.className = 'pay-method-opt border-2 border-indigo-600 bg-indigo-50/70 p-3 rounded-2xl text-center cursor-pointer flex flex-col items-center gap-1 font-bold text-indigo-950 transition shadow-xs';
        }
        if (vodafoneTab) {
            vodafoneTab.className = 'pay-method-opt border-2 border-slate-200 hover:border-slate-300 p-3 rounded-2xl text-center cursor-pointer flex flex-col items-center gap-1 font-semibold text-slate-700 transition';
        }
        if (instapayBox) instapayBox.classList.remove('hidden');
        if (vodafoneBox) vodafoneBox.classList.add('hidden');
    }

    updateWhatsAppTransferLink();
}

function openPaymobModal() {
    const cBadge = document.getElementById('paymobCourseNameBadge');
    if (cBadge) cBadge.innerText = selectedCourseName || 'مسار القرآن الكريم والتدبر';
    
    const sInfo = document.getElementById('paymobStudentInfo');
    const sNameElem = document.getElementById('studentName');
    const sCodeElem = document.getElementById('studentCode');
    if (sInfo && sNameElem) {
        sInfo.innerText = sNameElem.innerText + (sCodeElem ? ' (' + sCodeElem.innerText + ')' : '');
    }

    selectRenewalPackage(selectedRenewalPackageId || 'group_8');
    updateWhatsAppTransferLink();
    document.getElementById('paymobModal').classList.remove('hidden');
}

function closePaymobModal() {
    document.getElementById('paymobModal').classList.add('hidden');
}

function openReceiptModal(receipt) {
    if (!receipt) return;
    document.getElementById('receiptNumber').innerText = receipt.receipt_number || ('REQ-' + Date.now());
    document.getElementById('receiptStudentName').innerText = receipt.student_name || (document.getElementById('studentName') ? document.getElementById('studentName').innerText : 'طالب الأكاديمية');
    document.getElementById('receiptStudentCode').innerText = receipt.student_code || (document.getElementById('studentCode') ? document.getElementById('studentCode').innerText : 'MNR');
    document.getElementById('receiptCourseName').innerText = receipt.course_name || selectedCourseName;
    
    const rPkg = document.getElementById('receiptPackageName');
    if (rPkg) rPkg.innerText = receipt.package_name || 'باقة تجديد الاشتراك';
    
    const rCred = document.getElementById('receiptCreditsAdded');
    if (rCred) rCred.innerText = '+' + (receipt.credits_added || 4) + ' حصص';

    document.getElementById('receiptAmount').innerText = (receipt.amount !== undefined ? Number(receipt.amount).toFixed(2) : '500.00') + ' ج.م';
    document.getElementById('receiptDate').innerText = (receipt.created_at || new Date().toISOString()).slice(0, 10);
    
    const waText = encodeURIComponent(
        'طلب تجديد اشتراك — أكاديمية منير\n' +
        'رقم الطلب: ' + (receipt.receipt_number || '') + '\n' +
        'اسم الطالب: ' + (receipt.student_name || '') + ' (' + (receipt.student_code || '') + ')\n' +
        'المسار: ' + (receipt.course_name || selectedCourseName) + '\n' +
        'الباقة المطلوبة: ' + (receipt.package_name || '') + '\n' +
        'الحصص المطلوب شحنها: +' + (receipt.credits_added || 4) + ' حصص\n' +
        'المبلغ المحول: ' + (receipt.amount || '') + ' ج.م\n' +
        'طريقة التحويل: ' + (receipt.pay_method_title || 'تحويل بنكي / محفظة') + '\n' +
        'حالة الطلب: قيد المراجعة والاعتماد\n' +
        '------------------------------------\n' +
        'مرفق لسيادتكم صورة إشعار التحويل من التطبيق للاعتماد والشحن فوراً.'
    );
    document.getElementById('btnWhatsAppReceipt').href = 'https://wa.me/201025969295?text=' + waText;
    
    document.getElementById('receiptModal').classList.remove('hidden');
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.add('hidden');
}

async function submitPaymobPayment() {
    const pkg = RENEWAL_PACKAGES.find(p => p.id === selectedRenewalPackageId) || RENEWAL_PACKAGES[1];
    const btn = document.getElementById('btnPaymobSubmit');
    const oldTxt = btn.innerHTML;
    btn.innerHTML = '<span>جاري تسجيل الطلب...</span>';
    btn.disabled = true;

    const sName = document.getElementById('studentName') ? document.getElementById('studentName').innerText.trim() : 'طالب الأكاديمية';
    const sCode = document.getElementById('studentCode') ? document.getElementById('studentCode').innerText.trim() : 'MNR';
    const payMethodRadio = document.querySelector('input[name="payMethod"]:checked');
    const payMethod = payMethodRadio ? payMethodRadio.value : 'instapay';
    const methodTitle = (payMethod === 'vodafone_cash') ? 'فودافون كاش (01002530197)' : 'إنستا باي (009348060001)';

    try {
        const reqNum = 'REQ-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const receipt = {
            receipt_number: reqNum,
            student_name: sName,
            student_code: sCode,
            course_name: selectedCourseName,
            package_name: pkg.name + ' (' + pkg.typeName + ')',
            credits_added: pkg.credits,
            amount: pkg.price,
            pay_method_title: methodTitle,
            created_at: new Date().toISOString()
        };

        // Notify in Supabase without modifying remaining_credits directly
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const client = window.MonirDB.getClient();
                if (client && currentStudentId) {
                    await client.from('notifications').insert([{
                        student_id: currentStudentId,
                        course_name: selectedCourseName,
                        title: 'طلب تجديد اشتراك قيد المراجعة (' + pkg.name + ')',
                        message: 'تم تسجيل طلب التجديد بقيمة ' + pkg.price + ' ج.م برقم #' + receipt.receipt_number + '. يرجى إرسال صورة إشعار التحويل عبر واتساب ليتم تفعيل الحصص.',
                        type: 'renewal_pending',
                        action_url: '/student.html'
                    }]);
                }
            } catch(err) {
                console.warn('[Supabase] Notification insert error:', err);
            }
        }

        btn.innerHTML = 'تم تسجيل الطلب بنجاح ✔';
        btn.className = 'w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl';

        setTimeout(() => {
            closePaymobModal();
            btn.innerHTML = oldTxt;
            btn.disabled = false;
            btn.className = 'w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition flex items-center justify-center gap-2';
            
            // Show request receipt modal
            openReceiptModal(receipt);
            
            // Refresh notifications
            loadNotifications();
        }, 800);

    } catch (err) {
        console.error("Paymob Error:", err);
        btn.innerHTML = oldTxt;
        btn.disabled = false;
        alert("حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة مرة أخرى أو التواصل مباشرة عبر الواتساب.");
    }
}

function refreshData() {
    loadStudentProfile();
    loadNotifications();
    loadGeneralLectures();
}

// ==========================================
// 🎙️ GENERAL ACADEMY LECTURES & QUIZZES SYSTEM
// ==========================================

async function loadGeneralLectures() {
    try {
        let quizzes = [];
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const res = await window.MonirDB.getQuizzes();
                if (res.data && res.data.length > 0) quizzes = res.data;
            } catch(e) {
                console.warn('[Supabase load quizzes failed]', e);
            }
        }
        if (!quizzes || quizzes.length === 0) {
            try {
                const res = await fetch('/api/quizzes');
                if (res.ok) {
                    quizzes = await res.json();
                }
            } catch(e) {}
        }
        if (!quizzes || quizzes.length === 0) {
            if (window.MOCK_DEFAULT_QUIZZES && window.MOCK_DEFAULT_QUIZZES.length > 0) {
                quizzes = window.MOCK_DEFAULT_QUIZZES;
            } else if (window.MOCK_DATA && window.MOCK_DATA.quizzes && window.MOCK_DATA.quizzes.length > 0) {
                quizzes = window.MOCK_DATA.quizzes;
            }
        }
        cachedGeneralQuizzes = quizzes || [];

        // Load student submissions
        let subs = [];
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const subRes = await window.MonirDB.getStudentQuizSubmissions(currentStudentId);
                if (subRes.data) subs = subRes.data;
            } catch(e) {}
        }
        if (!subs || subs.length === 0) {
            try {
                const subRes = await fetch('/api/student/' + currentStudentId + '/quizzes');
                if (subRes.ok) subs = await subRes.json();
            } catch(e) {}
        }
        cachedStudentSubmissions = subs || [];

        renderGeneralTrackView();
        renderGradebookTranscript();
        if (typeof syncZoomLiveStatusAll === 'function') {
            syncZoomLiveStatusAll();
        }
    } catch(err) {
        console.error('[General Lectures Load Error]:', err);
    }
}

function selectGeneralTrack(trackKey) {
    currentGeneralTrack = trackKey;
    
    // Sync dropdown menu if present
    const sel = document.getElementById('selectStudentGeneralTrack');
    if (sel && sel.value !== trackKey) {
        sel.value = trackKey;
    }

    renderGeneralTrackView();
}

function parseQuizMeta(quiz) {
    if (!quiz) return {};
    try {
        return typeof quiz.description === 'string' ? JSON.parse(quiz.description) : (quiz.description || {});
    } catch(e) {
        return { summary_text: quiz.description || '' };
    }
}

// ==========================================
// Zoom Live Link & Age/Time Gating Engine
// ==========================================

function getCairoTimeInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Support simulation for testing via URL: ?sim_time=14:05 (HH:MM in 24h format)
    if (urlParams.has('sim_time')) {
        const parts = urlParams.get('sim_time').split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        return {
            hours: h,
            minutes: m,
            totalMinutes: h * 60 + m,
            localTotalMinutes: h * 60 + m,
            isSimulated: true
        };
    }

    try {
        const now = new Date();
        const cairoStr = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
        const cairoDate = new Date(cairoStr);
        const ch = cairoDate.getHours();
        const cm = cairoDate.getMinutes();

        const lh = now.getHours();
        const lm = now.getMinutes();

        return {
            hours: ch,
            minutes: cm,
            totalMinutes: ch * 60 + cm,
            localHours: lh,
            localMinutes: lm,
            localTotalMinutes: lh * 60 + lm,
            dayOfWeek: cairoDate.getDay(),
            isSimulated: false
        };
    } catch(e) {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        return {
            hours: h,
            minutes: m,
            totalMinutes: h * 60 + m,
            localHours: h,
            localMinutes: m,
            localTotalMinutes: h * 60 + m,
            dayOfWeek: now.getDay(),
            isSimulated: false
        };
    }
}

const ZOOM_CONFIG = {
    kids: {
        url: "https://zoom.us/j/98264506630",
        label: "فئة الأطفال (أقل من 10 سنوات)",
        timeLabel: "الجمعة 1:50 م - 2:25 م",
        startMins: 830, // 13:50
        endMins: 865    // 14:25
    },
    adults: {
        url: "https://zoom.us/j/99924246069",
        label: "فئة الطلاب (10 سنوات فما فوق)",
        timeLabel: "الجمعة 2:20 م - 2:50 م",
        startMins: 860, // 14:20
        endMins: 890    // 14:50
    }
};

function getZoomLiveLinkStatus(liveUrl, studentAge) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Age override for testing: ?sim_age=8 or ?sim_age=14
    if (urlParams.has('sim_age')) {
        studentAge = parseInt(urlParams.get('sim_age'), 10);
    }
    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;

    const isKid = (age < 10);
    const cfg = isKid ? ZOOM_CONFIG.kids : ZOOM_CONFIG.adults;
    const targetZoomUrl = cfg.url;
    const groupLabel = cfg.label;
    const timeLabel = cfg.timeLabel;

    // Supervisor check
    const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                     (window.currentSessionUser && window.currentSessionUser.role) || 
                     urlParams.get('role');
    const isAdminOrTeacher = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor'));

    if (urlParams.has('test_zoom') || (isAdminOrTeacher && urlParams.get('force_live') === '1') || urlParams.has('force_live')) {
        return {
            isVisible: true,
            isWithinWindow: true,
            zoomUrl: targetZoomUrl,
            groupLabel: groupLabel,
            timeLabel: timeLabel,
            html: `
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span class="bg-indigo-900 text-indigo-100 text-[10px] font-black px-2.5 py-1 rounded-lg text-center">وضع المعاينة الفورية (تجريبي)</span>
                    <a href="${targetZoomUrl}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 shrink-0">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>دخول البث المباشر (${isKid ? 'قاعة الأطفال' : 'قاعة الطلاب'})</span>
                    </a>
                </div>
            `
        };
    }

    const timeInfo = getCairoTimeInfo();
    const cairoMins = timeInfo.totalMinutes;
    const localMins = (timeInfo.localTotalMinutes !== undefined) ? timeInfo.localTotalMinutes : cairoMins;

    // Strictly enforce age-based schedule:
    // Kids (<10): 1:50 PM (830) to 2:25 PM (865)
    // Older (>=10): 2:20 PM (860) to 2:50 PM (890)
    function isMinsInWindow(m) {
        if (isKid) {
            return (m >= ZOOM_CONFIG.kids.startMins && m <= ZOOM_CONFIG.kids.endMins);
        } else {
            return (m >= ZOOM_CONFIG.adults.startMins && m <= ZOOM_CONFIG.adults.endMins);
        }
    }

    const isWithinWindow = isMinsInWindow(cairoMins) || isMinsInWindow(localMins);

    if (isWithinWindow) {
        return {
            isVisible: true,
            isWithinWindow: true,
            zoomUrl: targetZoomUrl,
            groupLabel: groupLabel,
            timeLabel: timeLabel,
            html: `
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div class="text-right sm:text-left">
                        <span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-300">
                            <span class="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                            <span>البث المباشر متاح الآن لـ ${isKid ? 'الأطفال' : 'الطلاب'} (${timeLabel})</span>
                        </span>
                    </div>
                    <a href="${targetZoomUrl}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0 active:scale-95">
                        <span>دخول محاضرة الزووم المباشرة (${isKid ? 'قاعة الأطفال' : 'قاعة الطلاب'})</span>
                    </a>
                </div>
            `
        };
    }

    if (isAdminOrTeacher) {
        return {
            isVisible: false,
            isWithinWindow: false,
            isSupervisor: true,
            zoomUrl: targetZoomUrl,
            groupLabel: groupLabel,
            timeLabel: timeLabel,
            html: `
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div class="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-[11px] font-bold">
                        <span>مقفل للطلاب (${groupLabel} | الموعد: ${timeLabel})</span>
                    </div>
                    <a href="${targetZoomUrl}" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-black px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5">
                        <span>دخول كمعلم/مشرف (Zoom)</span>
                    </a>
                </div>
            `
        };
    }

    return {
        isVisible: false,
        isWithinWindow: false,
        zoomUrl: targetZoomUrl,
        groupLabel: groupLabel,
        timeLabel: timeLabel,
        html: `
            <div class="bg-slate-100/90 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <div>
                    <span class="block text-[11px] text-slate-800 font-black">رابط Zoom سيفتح تلقائياً في موعد فئتك (${timeLabel})</span>
                    <span class="text-[10px] text-indigo-700 font-extrabold">${groupLabel}</span>
                </div>
            </div>
        `
    };
}

function updateFridayScheduleNoticeByAge(studentAge) {
    const slotKids = document.getElementById('slotNoticeKids');
    const slotAdults = document.getElementById('slotNoticeAdults');
    if (!slotKids || !slotAdults) return;

    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;

    if (age < 10) {
        slotKids.classList.remove('hidden');
        slotAdults.classList.add('hidden');
    } else {
        slotKids.classList.add('hidden');
        slotAdults.classList.remove('hidden');
    }
}

function syncZoomLiveStatusAll() {
    let studentAge = (window.currentStudentAge !== undefined) ? window.currentStudentAge : 
                       ((window.currentStudentData && window.currentStudentData.student && window.currentStudentData.student.age) ? parseInt(window.currentStudentData.student.age) : 9);
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sim_age')) {
        studentAge = parseInt(urlParams.get('sim_age'), 10);
        window.currentStudentAge = studentAge;
    }
    updateFridayScheduleNoticeByAge(studentAge);

    const isKid = (studentAge < 10);
    const cfg = isKid ? ZOOM_CONFIG.kids : ZOOM_CONFIG.adults;
    const zoomUrl = cfg.url;
    const status = getZoomLiveLinkStatus(zoomUrl, studentAge);

    // 1. In-Slot Direct Action Buttons (داخل كل صف عمر محدد)
    const kidsAction = document.getElementById('slotNoticeKidsAction');
    const adultsAction = document.getElementById('slotNoticeAdultsAction');

    if (kidsAction) {
        if (studentAge < 10) {
            if (status.isWithinWindow) {
                kidsAction.innerHTML = `
                    <a href="${ZOOM_CONFIG.kids.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse cursor-pointer whitespace-nowrap">
                        <span>دخول زووم الأطفال الآن (Zoom)</span>
                    </a>
                `;
            } else {
                kidsAction.innerHTML = `
                    <span class="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300/60 px-2.5 py-1 rounded-lg block text-center">يفتح الجمعة 1:50 م</span>
                `;
            }
        } else {
            kidsAction.innerHTML = '';
        }
    }

    if (adultsAction) {
        if (studentAge >= 10) {
            if (status.isWithinWindow) {
                adultsAction.innerHTML = `
                    <a href="${ZOOM_CONFIG.adults.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse cursor-pointer whitespace-nowrap">
                        <span>دخول زووم الطلاب الآن (Zoom)</span>
                    </a>
                `;
            } else {
                adultsAction.innerHTML = `
                    <span class="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300/60 px-2.5 py-1 rounded-lg block text-center">يفتح الجمعة 2:20 م</span>
                `;
            }
        } else {
            adultsAction.innerHTML = '';
        }
    }

    // 2. Dedicated Live Banner inside Friday Card Container
    const actionContainer = document.getElementById('fridayScheduleZoomActionContainer');
    if (actionContainer) {
        if (status.isWithinWindow) {
            actionContainer.innerHTML = `
                <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fade-in border border-emerald-400/50">
                    <div class="flex items-center gap-2.5">
                        <span class="w-3 h-3 rounded-full bg-white animate-ping shrink-0"></span>
                        <div>
                            <div class="font-black text-xs sm:text-sm">حلقة البث المباشر (${isKid ? 'قاعة الأطفال والناشئة' : 'قاعة الطلاب'}) مفتوحة الآن!</div>
                            <div class="text-[11px] text-emerald-100 font-bold">بدأ موعد المحاضرة لمجموعتك (${status.groupLabel}). انضم الآن للقاعة مع المعلم:</div>
                        </div>
                    </div>
                    <a href="${zoomUrl}" target="_blank" rel="noopener noreferrer" class="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-lg transition text-center whitespace-nowrap cursor-pointer">
                        دخول محاضرة الزووم الآن (Zoom)
                    </a>
                </div>
            `;
            actionContainer.classList.remove('hidden');
        } else {
            actionContainer.innerHTML = '';
            actionContainer.classList.add('hidden');
        }
    }

    // 3. Top Real-time Zoom Live Notification Banner (شريط الإشعار والتنبيه العلوي)
    const banner = document.getElementById('liveZoomBroadcastBanner');
    const titleEl = document.getElementById('liveZoomBannerTitle');
    const subEl = document.getElementById('liveZoomBannerSubtitle');
    const bannerLink = banner ? banner.querySelector('a') : null;
    if (bannerLink) bannerLink.href = zoomUrl;

    if (banner) {
        if (status.isWithinWindow) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (titleEl) {
                titleEl.innerText = (studentAge < 10) 
                    ? 'حلقة البث المباشر (Zoom) للأطفال والناشئة بدأت الآن!' 
                    : 'محاضرة البث المباشر (Zoom) للطلاب بدأت الآن!';
            }
            if (subEl) {
                subEl.innerText = (studentAge < 10)
                    ? 'الموعد المخصص لفئتك (أقل من 10 سنوات): الجمعة من 1:50 م إلى 2:25 م • انضم الآن للقاعة مع المعلم'
                    : 'الموعد المخصص لفئتك (10 سنوات فأكثر): الجمعة من 2:20 م إلى 2:50 م • انضم الآن للقاعة مع المعلم';
            }
        } else {
            banner.classList.add('hidden');
            banner.classList.remove('flex');
        }
    }

    // 4. Refresh General Track Card
    if (typeof renderGeneralTrackView === 'function') {
        const c = document.getElementById('generalTrackCardContainer');
        if (c) renderGeneralTrackView();
    }
}

if (!window.__zoomLiveTimerStarted) {
    window.__zoomLiveTimerStarted = true;
    setTimeout(() => {
        if (typeof syncZoomLiveStatusAll === 'function') {
            syncZoomLiveStatusAll();
        }
    }, 100);
    setInterval(() => {
        if (typeof syncZoomLiveStatusAll === 'function') {
            syncZoomLiveStatusAll();
        }
    }, 5000);
}

function renderGeneralTrackView() {
    const container = document.getElementById('generalTrackCardContainer');
    if (!container) return;

    // Find quiz matching trackKey
    const matchingQuizzes = cachedGeneralQuizzes.filter(q => {
        const meta = parseQuizMeta(q);
        if (meta.track) return meta.track === currentGeneralTrack;
        if (currentGeneralTrack === 'tajweed') return q.title.includes('تجويد');
        if (currentGeneralTrack === 'tafsir') return q.title.includes('تفسير');
        if (currentGeneralTrack === 'hadith') return q.title.includes('حديث');
        return false;
    });

    if (matchingQuizzes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-200">
                جاري إعداد محاضرات هذا المسار للأسبوع الحالي...
            </div>
        `;
        return;
    }

    const quiz = matchingQuizzes[0];
    const meta = parseQuizMeta(quiz);
    const sub = cachedStudentSubmissions.find(s => s.quiz_id === quiz.id);

    const studentAge = (window.currentStudentAge !== undefined) ? window.currentStudentAge : 
                       ((window.currentStudentData && window.currentStudentData.student && window.currentStudentData.student.age) ? parseInt(window.currentStudentData.student.age) : 9);
    const zoomStatus = getZoomLiveLinkStatus(meta.live_url, studentAge);

    const trackTitles = {
        'tajweed': 'مسار أحكام التجويد ومخارج الحروف',
        'tafsir': 'مسار التفسير وتدبر آيات القرآن الكريم',
        'hadith': 'مسار الحديث الشريف والسنة النبوية'
    };

    const trackBadge = trackTitles[currentGeneralTrack] || quiz.title;

    let submissionBadgeHtml = '';
    if (sub) {
        const isPerfect = (sub.score >= (sub.total_points || 15));
        submissionBadgeHtml = `
            <div class="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2.5">
                    <span class="w-9 h-9 rounded-xl ${isPerfect ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'} flex items-center justify-center font-black text-xs shrink-0">
                        ${isPerfect ? 'امتياز' : 'ناجح'}
                    </span>
                    <div>
                        <strong class="font-black text-slate-900 block">تم حل الاختبار الأسبوعي بنجاح!</strong>
                        <span class="text-slate-600 text-[11px]">الدرجة المحققة: <strong class="text-emerald-700 font-black">${sub.score} من ${sub.total_points || 15} درجة</strong> (${sub.percentage}%)</span>
                    </div>
                </div>
                <button onclick="openQuizModalForId(${quiz.id})" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition text-[11px] shrink-0">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <!-- Header Row -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-100/60 pb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[11px] font-black text-indigo-900 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">${trackBadge}</span>
                        <span class="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">الأسبوع ${meta.week_number || 1}</span>
                    </div>
                    <h4 class="text-sm sm:text-base font-black text-slate-900">${quiz.title}</h4>
                </div>
                ${zoomStatus.html || ''}
            </div>

            <!-- Schedules Info (Only the student's age group) -->
            <div class="text-xs">
                ${(studentAge < 10) ? `
                    <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 block">موعد فئة الأطفال (أقل من 10 سنوات):</span>
                        <strong class="text-slate-800 font-extrabold text-[11px]">الجمعة 1:50 م - 2:25 م</strong>
                    </div>
                ` : `
                    <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 block">موعد فئة الطلاب (10 سنوات فما فوق):</span>
                        <strong class="text-slate-800 font-extrabold text-[11px]">الجمعة 2:20 م - 2:50 م</strong>
                    </div>
                `}
            </div>

            <!-- Voice Summary & Player (Locked state until supervisors upload and publish) -->
            ${(meta.records_unlocked && meta.audio_url) ? `
                <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <strong class="text-xs sm:text-sm font-extrabold text-slate-900">الملخص الصوتي للمحاضرة (Voice Note)</strong>
                        </div>
                        <span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">مشغل مدمج</span>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed">${meta.summary_text || 'استمع إلى تلخيص المعلم المباشر لأهم نقاط المحاضرة وتطبيقاتها العملية.'}</p>
                    <div class="pt-1">
                        <audio controls class="w-full h-10 rounded-xl" style="accent-color: #1F274B;">
                            <source src="${meta.audio_url}" type="audio/mpeg">
                            متصفحك لا يدعم مشغل الصوت المدمج.
                        </audio>
                    </div>
                </div>
            ` : `
                <div class="bg-slate-50/90 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                    <div class="flex items-center justify-center gap-2 text-slate-700 font-black text-xs sm:text-sm">
                        <span>التسجيل الصوتي للمحاضرة (الريكورد) مقفول حالياً</span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-bold leading-relaxed max-w-lg mx-auto">
                        موعد المحاضرة غداً الجمعة.. الريكوردات مقفولة وسيتم فتحها ورفعها بواسطة المشرفين والمعلم فور انتهاء الحصة المباشرة وإضافتها.
                    </p>
                </div>
            `}

            <!-- Download PDF Summary & Launch Quiz Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <!-- PDF Section -->
                ${(meta.records_unlocked && meta.pdf_url) ? `
                    <a href="${meta.pdf_url}" target="_blank" class="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs p-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-xs group">
                        <div class="text-right">
                            <div class="font-black text-slate-900 text-xs">تحميل ملخص المحاضرة (PDF)</div>
                            <div class="text-[10px] text-slate-500 font-normal">جاهز للقراءة والطباعة والمراجعة</div>
                        </div>
                    </a>
                ` : `
                    <div class="bg-slate-50 border-2 border-dashed border-slate-200 p-3.5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 text-xs font-black shadow-2xs">
                        <span>ملف التلخيص (PDF) مقفول (سيفتحه المشرفون قريباً)</span>
                    </div>
                `}

                <!-- Quiz Launcher Button -->
                ${sub ? `
                    <button type="button" onclick="openQuizModalForId(${quiz.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs p-3.5 rounded-2xl transition shadow flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]">
                        <div class="text-right">
                            <div class="font-black text-white text-xs">مراجعة درجات الاختبار الأسبوعي</div>
                            <div class="text-[10px] text-emerald-100 font-normal">تم الحل بنجاح (${sub.score} من ${sub.total_points || 15} درجة)</div>
                        </div>
                    </button>
                ` : ((viewerRole === 'admin' || viewerRole === 'teacher') ? `
                    <button type="button" onclick="openQuizModalForId(${quiz.id})" class="bg-indigo-900 hover:bg-indigo-800 text-white font-black text-xs p-3.5 rounded-2xl transition shadow flex items-center justify-center gap-2 cursor-pointer">
                        <div class="text-right">
                            <div class="font-black text-white text-xs">معاينة وتجربة الاختبار (صلاحية مشرف)</div>
                            <div class="text-[10px] text-indigo-200 font-normal">متاح للإشراف والمعلمين للمعاينة</div>
                        </div>
                    </button>
                ` : `
                    <div class="bg-slate-50 border-2 border-dashed border-slate-200 p-3.5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 text-xs font-black shadow-2xs">
                        <span>الاختبار الأسبوعي سيفتح فور انتهاء المحاضرة المباشرة غداً</span>
                    </div>
                `)}
            </div>

            <!-- Existing Submission Status (if solved) -->
            ${submissionBadgeHtml}
        </div>
    `;
}

// ==========================================
// ✍️ INTERACTIVE QUIZ MODAL CONTROLLER
// ==========================================

function openQuizzesModal() {
    const modal = document.getElementById('quizzesModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    loadQuizzesList();
}

function openQuizModalForId(quizId) {
    const modal = document.getElementById('quizzesModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    startQuiz(quizId);
}

function closeQuizzesModal() {
    const modal = document.getElementById('quizzesModal');
    if (modal) modal.classList.add('hidden');
}

function loadQuizzesList() {
    const selView = document.getElementById('quizSelectionView');
    const actView = document.getElementById('quizActiveView');
    const resView = document.getElementById('quizResultView');
    if (selView) selView.classList.remove('hidden');
    if (actView) actView.classList.add('hidden');
    if (resView) resView.classList.add('hidden');

    const container = document.getElementById('quizzesListContainer');
    if (!container) return;

    if (cachedGeneralQuizzes.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 font-bold text-xs">جاري تحميل الاختبارات المتاحة...</div>`;
        return;
    }

    container.innerHTML = cachedGeneralQuizzes.map(q => {
        const meta = parseQuizMeta(q);
        const sub = cachedStudentSubmissions.find(s => s.quiz_id === q.id);
        return `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-indigo-300 transition">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-black text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">الأسبوع ${meta.week_number || 1}</span>
                        ${sub ? `<span class="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">مكتمل (${sub.score}/${sub.total_points || 15})</span>` : '<span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">متاح للحل</span>'}
                    </div>
                    <strong class="text-xs font-black text-slate-900 block">${q.title}</strong>
                    <span class="text-[11px] text-slate-500 font-medium">3 أسئلة تفاعلية • 15 درجة</span>
                </div>
                <button onclick="startQuiz(${q.id})" class="w-full sm:w-auto bg-[#1F274B] hover:bg-[#2D396E] text-white text-xs font-black px-4 py-2 rounded-xl transition shrink-0 cursor-pointer">
                    ${sub ? 'إعادة الاختبار 🔄' : 'بدء الاختبار ✍️'}
                </button>
            </div>
        `;
    }).join('');
}

async function startQuiz(quizId) {
    activeQuizId = quizId;
    activeQuizAnswers = {};

    const selView = document.getElementById('quizSelectionView');
    const actView = document.getElementById('quizActiveView');
    const resView = document.getElementById('quizResultView');
    if (selView) selView.classList.add('hidden');
    if (resView) resView.classList.add('hidden');
    if (actView) actView.classList.remove('hidden');

    const quiz = cachedGeneralQuizzes.find(q => q.id === quizId) || { id: quizId, title: 'اختبار الأسبوع' };
    const qTitleEl = document.getElementById('activeQuizTitle');
    const qMetaEl = document.getElementById('activeQuizMeta');
    if (qTitleEl) qTitleEl.textContent = quiz.title;
    if (qMetaEl) qMetaEl.textContent = '3 أسئلة • 15 درجة إجمالية (5 درجات لكل سؤال)';

    const container = document.getElementById('quizQuestionsContainer');
    if (container) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 font-bold text-xs"><div class="animate-spin text-2xl mb-2">⏳</div>جاري تحميل أسئلة الاختبار...</div>`;
    }

    try {
        let questions = [];
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            const qRes = await window.MonirDB.getQuizQuestions(quizId);
            if (qRes.data && qRes.data.length > 0) questions = qRes.data;
        }
        if (questions.length === 0) {
            const qRes = await fetch('/api/quizzes/' + quizId);
            const d = await qRes.json();
            questions = d.questions || [];
        }
        activeQuizQuestions = questions;
        renderActiveQuestions();
    } catch(err) {
        console.error('[Load Quiz Questions Error]:', err);
    }
}

function renderActiveQuestions() {
    const container = document.getElementById('quizQuestionsContainer');
    if (!container) return;

    if (activeQuizQuestions.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-500 font-bold text-xs">لا توجد أسئلة مضافة لهذا الاختبار حالياً.</div>`;
        return;
    }

    container.innerHTML = activeQuizQuestions.map((q, qIdx) => {
        const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
        const selectedIdx = activeQuizAnswers[q.id];

        const optionsHtml = options.map((opt, optIdx) => {
            const isSelected = (selectedIdx === optIdx);
            return `
                <label onclick="selectQuizOption(${q.id}, ${optIdx})" class="flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${isSelected ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-bold' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700'}">
                    <input type="radio" name="question_${q.id}" value="${optIdx}" ${isSelected ? 'checked' : ''} class="hidden">
                    <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white font-black text-xs' : 'border-slate-300 bg-white'}">
                        ${isSelected ? '✔' : ''}
                    </span>
                    <span class="text-xs leading-relaxed">${opt}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span class="text-[11px] font-black text-[#1F274B] bg-slate-100 px-2.5 py-0.5 rounded-lg">السؤال ${qIdx + 1} من ${activeQuizQuestions.length}</span>
                    <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">5 درجات</span>
                </div>
                <h5 class="text-xs sm:text-sm font-black text-slate-900 leading-relaxed">${q.question_text}</h5>
                <div class="space-y-2 pt-1">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

function selectQuizOption(questionId, optionIndex) {
    activeQuizAnswers[questionId] = optionIndex;
    renderActiveQuestions();
}

async function submitActiveQuiz() {
    if (!activeQuizId) return;

    // Verify all answered
    const unanswered = activeQuizQuestions.filter(q => activeQuizAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
        if (!confirm(`يوجد ${unanswered.length} سؤال لم تقم بالإجابة عليه بعد، هل ترغب في تسليم الإجابات الآن؟`)) {
            return;
        }
    }

    const btn = document.getElementById('btnSubmitQuiz');
    const oldTxt = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'جاري التصحيح واعتماد النتيجة... ⏳';
    }

    try {
        const quiz = cachedGeneralQuizzes.find(q => q.id === activeQuizId) || {};
        const meta = parseQuizMeta(quiz);

        let earnedScore = 0;
        let totalScore = 0;
        activeQuizQuestions.forEach(q => {
            const pts = q.points || 5;
            totalScore += pts;
            if (activeQuizAnswers[q.id] !== undefined && parseInt(activeQuizAnswers[q.id]) === q.correct_option_index) {
                earnedScore += pts;
            }
        });
        if (totalScore === 0) totalScore = 15;
        const percentage = Math.round((earnedScore / totalScore) * 100);

        // Get student info
        let stName = 'طالب الأكاديمية';
        let stCode = String(currentStudentId);
        const u = activeUser;
        if (u) {
            stName = u.full_name || u.username || stName;
            stCode = u.student_code || u.username || stCode;
        }

        const submissionData = {
            quiz_id: activeQuizId,
            student_id: currentStudentId,
            student_code: stCode,
            student_name: stName,
            track_name: meta.track || currentGeneralTrack,
            quiz_title: quiz.title || 'اختبار الأسبوع',
            score: earnedScore,
            total_points: totalScore,
            percentage: percentage,
            answers: activeQuizAnswers,
            submitted_at: new Date().toISOString()
        };

        // 1. Submit to Supabase Cloud
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            await window.MonirDB.submitQuizResult(submissionData);
        }

        // 2. Submit to Mock/API fallback
        try {
            await fetch('/api/quizzes/' + activeQuizId + '/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });
        } catch(e) {}

        // 3. Update local state
        const existingIdx = cachedStudentSubmissions.findIndex(s => s.quiz_id === activeQuizId);
        if (existingIdx !== -1) {
            cachedStudentSubmissions[existingIdx] = submissionData;
        } else {
            cachedStudentSubmissions.unshift(submissionData);
        }

        // 4. Render Results View
        const actView = document.getElementById('quizActiveView');
        const resView = document.getElementById('quizResultView');
        if (actView) actView.classList.add('hidden');
        if (resView) resView.classList.remove('hidden');

        const resIcon = document.getElementById('quizResultIcon');
        const resTitle = document.getElementById('quizResultTitle');
        const resScore = document.getElementById('quizResultScore');

        const isSuccess = percentage >= (quiz.passing_score || 70);
        if (resIcon) {
            resIcon.innerHTML = isSuccess ? '🏆' : '📚';
            resIcon.className = `w-16 h-16 ${isSuccess ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'} rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-inner`;
        }
        if (resTitle) {
            resTitle.textContent = isSuccess ? 'ما شاء الله! أحسنت وأبدعت يا بطل' : 'محاولة جيدة، يمكنك مراجعة الدرس والإعادة للتحسين';
        }
        if (resScore) {
            resScore.innerHTML = `حصلت على <strong class="text-emerald-700 font-black text-sm">${earnedScore} من ${totalScore} درجات</strong> (${percentage}%) وتم تسجيل نتيجتك في كشف الأوائل فوراً.`;
        }

        // Refresh views
        renderGeneralTrackView();
        renderGradebookTranscript();

    } catch(err) {
        console.error('[Quiz Submit Error]:', err);
        alert('حدث خطأ أثناء حفظ الإجابات، يرجى إعادة المحاولة.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldTxt;
        }
    }
}

function backToQuizList() {
    loadQuizzesList();
}

// ==========================================
// 📜 CUMULATIVE GRADEBOOK TRANSCRIPT MODAL
// ==========================================

function toggleGradebookModal() {
    const modal = document.getElementById('gradebookModal');
    if (!modal) return;
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderGradebookTranscript();
    }
}

function renderGradebookTranscript() {
    const totalScoreEl = document.getElementById('gradebookTotalScore');
    const percentageEl = document.getElementById('gradebookPercentage');
    const rankEl = document.getElementById('gradebookRankBadge');
    const detailsEl = document.getElementById('gradebookDetailsContainer');
    if (!detailsEl) return;

    let totalEarned = 0;
    let totalMax = 0;

    const tracksConfig = [
        { key: 'tajweed', title: 'مسار أحكام التجويد', icon: '🌟' },
        { key: 'tafsir', title: 'مسار التفسير وتدبر القرآن', icon: '📖' },
        { key: 'hadith', title: 'مسار الحديث الشريف والسنة', icon: '📜' }
    ];

    let html = '';

    tracksConfig.forEach(track => {
        // Find submissions for this track
        const trackSubs = cachedStudentSubmissions.filter(s => {
            if (s.track_name) return s.track_name === track.key;
            if (track.key === 'tajweed') return (s.quiz_title || '').includes('تجويد');
            if (track.key === 'tafsir') return (s.quiz_title || '').includes('تفسير');
            if (track.key === 'hadith') return (s.quiz_title || '').includes('حديث');
            return false;
        });

        const subWeek1 = trackSubs.find(s => (s.quiz_title || '').includes('الأول') || s.quiz_id === 101);
        const w1Score = subWeek1 ? subWeek1.score : null;

        totalEarned += (w1Score || 0);
        totalMax += 15;

        html += `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div class="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-base">${track.icon}</span>
                        <strong class="font-black text-slate-900 text-xs sm:text-sm">${track.title}</strong>
                    </div>
                    <span class="text-[11px] font-black text-indigo-950 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                        المحصل: ${w1Score !== null ? w1Score : 0} / 100
                    </span>
                </div>

                <!-- 4 Weeks Breakdown Table -->
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                    <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span class="text-[10px] text-slate-400 block font-bold">الأسبوع 1 (15د)</span>
                        ${w1Score !== null ? `
                            <strong class="text-emerald-700 font-black text-xs block mt-1">${w1Score} / 15 ✔</strong>
                        ` : `
                            <span class="text-amber-700 font-bold block mt-1">قيد الحل</span>
                        `}
                    </div>

                    <div class="bg-white p-2.5 rounded-xl border border-slate-200 opacity-80">
                        <span class="text-[10px] text-slate-400 block font-bold">الأسبوع 2 (15د)</span>
                        <span class="text-slate-400 block mt-1 font-mono">قريباً</span>
                    </div>

                    <div class="bg-white p-2.5 rounded-xl border border-slate-200 opacity-80">
                        <span class="text-[10px] text-slate-400 block font-bold">الأسبوع 3 (15د)</span>
                        <span class="text-slate-400 block mt-1 font-mono">قريباً</span>
                    </div>

                    <div class="bg-white p-2.5 rounded-xl border border-slate-200 opacity-80">
                        <span class="text-[10px] text-slate-400 block font-bold">الأسبوع 4 (15د)</span>
                        <span class="text-slate-400 block mt-1 font-mono">قريباً</span>
                    </div>

                    <div class="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200 col-span-2 sm:col-span-1">
                        <span class="text-[10px] text-indigo-900 block font-bold">الامتحان الشهري (40د)</span>
                        <span class="text-indigo-600 block mt-1 font-mono">نهاية الشهر</span>
                    </div>
                </div>
            </div>
        `;
    });

    detailsEl.innerHTML = html;

    const grandPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    if (totalScoreEl) totalScoreEl.textContent = `${totalEarned} / 100`;
    if (percentageEl) percentageEl.textContent = `${grandPercentage}%`;
    if (rankEl) {
        if (grandPercentage >= 90) {
            rankEl.textContent = 'ممتاز مع مرتبة الشرف 🏆';
            rankEl.className = 'text-xs font-black text-amber-600 block mt-0.5';
        } else if (grandPercentage >= 75) {
            rankEl.textContent = 'جيد جداً مرتفع 🌟';
            rankEl.className = 'text-xs font-black text-emerald-600 block mt-0.5';
        } else if (grandPercentage > 0) {
            rankEl.textContent = 'جاري التحصيل 👍';
            rankEl.className = 'text-xs font-black text-blue-600 block mt-0.5';
        } else {
            rankEl.textContent = 'في انتظار بدء الاختبارات';
            rankEl.className = 'text-xs font-bold text-slate-500 block mt-0.5';
        }
    }
}
