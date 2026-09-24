let currentStudentId = 1;
let selectedCourseName = "";
let enrolledCoursesList = [];
let activeQuizId = null;
let activeQuizQuestions = [];
let activeQuizAnswers = {};
// Dynamically default track based on day of week (Friday -> tajweed, Sunday -> tafsir, Monday -> hadith)
const initialDay = (new Date()).getDay();
let currentGeneralTrack = (initialDay === 1) ? 'hadith' : ((initialDay === 0) ? 'tafsir' : 'tajweed');
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
        const stCode = s.student_code || ('ST' + s.id);
        const sGender = (typeof window.getStudentGender === 'function')
            ? window.getStudentGender(stCode, sName, s.gender || s.parent_name)
            : 'm';
        const genderBadge = (sGender === 'f')
            ? '<span class="bg-pink-100 text-pink-700 text-[10px] font-bold px-1.5 py-0.5 rounded">بنت</span>'
            : '<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">ولد</span>';

        return `
            <div class="p-2.5 rounded-xl border ${isCurrent ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} flex items-center justify-between gap-2 transition">
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <strong class="text-slate-900 text-xs truncate">${sName}</strong>
                        <span class="bg-[#41519C] text-white text-[10px] font-mono px-1.5 py-0.5 rounded">${stCode}</span>
                        ${genderBadge}
                        ${s.qr_code ? `<span class="bg-[#57BA9E] text-slate-950 text-[10px] font-mono px-1.5 py-0.5 rounded">${s.qr_code}</span>` : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 truncate">${s.parent_name ? 'ولي الأمر: ' + s.parent_name : ''}</div>
                </div>
                <button type="button" onclick="switchAdminStudentView(${s.id})" class="bg-[#41519C] hover:bg-[#2D396E] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer">
                    ${isCurrent ? 'الحالي' : 'اختيار'}
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
            document.getElementById('studentDetails').innerText = (s.age || 9) + ' سنوات';
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
            document.getElementById('studentDetails').innerText = (s.age || 9) + ' سنوات';
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
            document.getElementById('studentDetails').innerText = (s.age || 9) + ' سنوات';
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
                const rem = (c.remaining_credits !== undefined) ? c.remaining_credits : (s.remaining_credits !== undefined ? s.remaining_credits : 0);
                return {
                    ...c,
                    remaining_credits: rem,
                    total_lectures_unlocked: (rem > 0) ? Math.max(c.total_lectures_unlocked || 0, rem) : 0
                };
            });
        } else {
            // No enrolled courses found — don't show fake data
            enrolledCoursesList = [];
        }
        
        if (!selectedCourseName && enrolledCoursesList.length > 0) {
            selectedCourseName = enrolledCoursesList[0].course_name;
        }
        
        const curCourseForBottom = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
        updateBottomMeetButtonState(curCourseForBottom.remaining_credits !== undefined ? curCourseForBottom.remaining_credits : (s.remaining_credits !== undefined ? s.remaining_credits : 0));

        // Update Track counts in UI
        const quranCourses = enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'quran');
        const academicCourses = enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'courses');

        const bQuran = document.getElementById('badgeCountQuranTrack');
        const bCourses = document.getElementById('badgeCountCoursesTrack');
        const bComp = document.getElementById('badgeCountCompetitionTrack');

        if (bQuran) bQuran.innerText = quranCourses.length;
        if (bCourses) bCourses.innerText = academicCourses.length;
        if (bComp) bComp.innerText = 'متاح';

        // Auto-select best track for student
        if (quranCourses.length === 0 && academicCourses.length > 0) {
            currentPortalTrack = 'courses';
        } else {
            currentPortalTrack = 'quran';
        }

        switchPortalTrack(currentPortalTrack);
        checkAndRenderQuranWidget(enrolledCoursesList);
        if (typeof syncZoomLiveStatusAll === 'function') {
            syncZoomLiveStatusAll();
        } else if (typeof renderGeneralTrackView === 'function') {
            renderGeneralTrackView();
        }
        
        const badge = document.getElementById('notifBadge');
        
        // ── Reference Modern EdTech Layout Synchronization ─────────────
        const finalStudentName = (s.name || (initialUser && (initialUser.full_name || initialUser.username)) || 'طالب الأكاديمية').trim();
        const nameTokens = finalStudentName.split(/\s+/);
        const stInitials = nameTokens.length >= 2 ? (nameTokens[0][0] + ' ' + nameTokens[1][0]) : (nameTokens[0] ? nameTokens[0][0] : 'ط');
        
        const avatarInitialsEl = document.getElementById('profileAvatarInitials');
        if (avatarInitialsEl) avatarInitialsEl.innerText = stInitials;
        const topUserInitialsEl = document.getElementById('topUserInitials');
        if (topUserInitialsEl) topUserInitialsEl.innerText = stInitials;
        const topUserNameEl = document.getElementById('topUserName');
        if (topUserNameEl) topUserNameEl.innerText = finalStudentName;

        // Details Panel Fields
        const dName = document.getElementById('detailsStudentName');
        if (dName) dName.innerText = finalStudentName;
        const dCode = document.getElementById('detailsStudentCode');
        if (dCode) dCode.innerText = s.student_code || ('ST' + String(safeId).padStart(4, '0'));
        const dParent = document.getElementById('detailsParentName');
        if (dParent) dParent.innerText = document.getElementById('parentName') ? document.getElementById('parentName').innerText : 'ولي أمر الطالب';
        const dPhone = document.getElementById('detailsParentPhone');
        if (dPhone) dPhone.innerText = (parentPhoneEl && parentPhoneEl.innerText) ? parentPhoneEl.innerText : 'غير مسجل';
        const dStatus = document.getElementById('detailsAccountStatus');
        if (dStatus) dStatus.innerText = 'اشتراك ساري (' + (s.account_status || 'نشط') + ')';
        const dTrack = document.getElementById('detailsTrackName');
        if (dTrack) {
            dTrack.innerText = (quranCourses.length > 0 && academicCourses.length > 0)
                ? 'مسار مشترك (قرآن كريم وبرامج تعليمية)'
                : (quranCourses.length > 0 ? 'مسار تحفيظ القرآن الكريم والعلوم الشرعية' : 'مسار البرامج التعليمية والكورسات');
        }

        // Subtitle under Student Name in Profile Card
        const subTitleEl = document.getElementById('studentTrackSubtitle');
        if (subTitleEl) {
            subTitleEl.innerText = (quranCourses.length > 0 && academicCourses.length > 0)
                ? 'متدرب في المسار المشترك: القرآن الكريم والبرامج التعليمية'
                : (quranCourses.length > 0 ? 'متدرب في مسار القرآن الكريم والحديث الشريف' : 'متدرب في مسار البرامج التعليمية والكورسات');
        }

        // KPI Stats
        const statEnrolledEl = document.getElementById('statEnrolledCourses');
        if (statEnrolledEl) statEnrolledEl.innerText = enrolledCoursesList.length || 1;
        const curRemCredits = (curCourseForBottom.remaining_credits !== undefined) ? curCourseForBottom.remaining_credits : (s.remaining_credits !== undefined ? s.remaining_credits : 0);
        const statRemEl = document.getElementById('statRemainingCredits');
        if (statRemEl) statRemEl.innerText = curRemCredits;
        const goalRemEl = document.getElementById('goalRemainingCreditsDisplay');
        if (goalRemEl) goalRemEl.innerText = curRemCredits;
        const goalBar = document.getElementById('goalProgressBar');
        if (goalBar) {
            const totPkg = Math.max(8, curRemCredits);
            const pct = Math.min(100, Math.round((curRemCredits / totPkg) * 100));
            goalBar.style.width = pct + '%';
        }
    
// ── Render Dynamic Upcoming Schedule, Certificates & Details ──
        renderUpcomingScheduleList();
        renderCertificatesPanel();
        renderDetailsPanel();

        // Proactive Low Balance Notification - managed cleanly inside top notifications center
        const topBanner = document.getElementById('topNotificationBanner');
        if (topBanner) topBanner.classList.add('hidden');

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

// ═════════════════════════════════════════════════════════════════════
// DYNAMIC UPCOMING SCHEDULE & CERTIFICATES & DETAILS LINKAGE (UX / الربط)
// ═════════════════════════════════════════════════════════════════════

function renderUpcomingScheduleList() {
    const container = document.getElementById('upcomingScheduleList');
    if (!container) return;

    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const courses = (enrolledCoursesList && enrolledCoursesList.length > 0)
        ? enrolledCoursesList
        : (curStudent.course_name ? [{
            course_name: curStudent.course_name,
            group_id: curStudent.group_id,
            teacher_name: curStudent.teacher_name,
            lecture_time: curStudent.lecture_time,
            subscription_days: curStudent.subscription_days,
            remaining_credits: curStudent.remaining_credits,
            session_duration: curStudent.session_duration
        }] : []);

    if (courses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                <p class="font-bold">لا توجد محاضرات مجدولة حالياً</p>
                <button type="button" onclick="openPaymobModal()" class="mt-2 text-xs font-black text-indigo-700 underline">
                    اشترك الآن في الباقات المتاحة ←
                </button>
            </div>
        `;
        return;
    }

    let html = '';

    // Render next sessions for enrolled courses
    courses.forEach((c, idx) => {
        const cName = c.course_name || c.name || 'مسار القرآن الكريم والتدبر';
        const teacher = c.teacher_name || 'معلم معتمد';
        const days = c.subscription_days || 'أسبوعياً';
        const timeVal = c.lecture_time || 'محدد مع المعلم';
        const dur = c.session_duration ? (c.session_duration + ' دقيقة') : '30 دقيقة';
        const rc = (c.remaining_credits !== undefined) ? c.remaining_credits : (curStudent.remaining_credits !== undefined ? curStudent.remaining_credits : 0);
        const gid = c.group_id || curStudent.group_id || 'G000';

        const meetUrl = (typeof window !== 'undefined' && window.getGroupMeetUrl)
            ? window.getGroupMeetUrl(gid, c.teacher_id || teacher)
            : (c.google_meet_url || 'https://meet.google.com');

        const upcomingDates = calculateGroupUpcomingDates(days, 1);
        const nextDateStr = (upcomingDates && upcomingDates[0]) ? upcomingDates[0].dateFormatted : days;

        const borderColor = idx === 0 ? '#57BA9E' : '#41519C';
        const tagBg = idx === 0 ? '#e8f8f4' : '#eaf0f8';
        const tagColor = idx === 0 ? '#236E58' : '#2D396E';
        const tagLabel = idx === 0 ? 'المحاضرة القادمة' : 'جلسة متابعة';

        html += `
            <div class="schedule-item" style="border-color:${borderColor}">
                <div class="flex items-center justify-between gap-1 mb-1">
                    <span class="schedule-tag" style="background:${tagBg};color:${tagColor}">${tagLabel} • ${nextDateStr}</span>
                    <span class="font-mono text-[10px] text-slate-400 font-bold">${gid}</span>
                </div>
                <strong class="font-black text-slate-900 block">${cName}</strong>
                <p class="text-slate-500 text-[11px] mt-0.5">المعلم: أ. ${teacher} • مدة الحصة: ${dur}</p>
                <div class="flex items-center justify-between text-[11px] mt-2 pt-1 border-t border-slate-100 flex-wrap gap-2">
                    <span class="font-bold text-slate-700">${timeVal}</span>
                    ${rc <= 0
                        ? `<button type="button" onclick="openPaymobModal()" class="text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer">رصيد 0 • تجديد</button>`
                        : `<a href="${meetUrl}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 hover:text-emerald-800 font-black hover:underline flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>دخول القاعة الذكية ←</span>
                           </a>`
                    }
                </div>
            </div>
        `;
    });

    // Add Friday General Broadcast
    html += `
        <div class="schedule-item" style="border-color:#b68d49">
            <div class="flex items-center justify-between gap-1 mb-1">
                <span class="schedule-tag" style="background:#fff4e4;color:#b68d49">الجمعة الأسبوعي</span>
                <span class="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">بث عام</span>
            </div>
            <strong class="font-black text-slate-900 block">مجلس التجويد والتدبر الأسبوعي</strong>
            <p class="text-slate-500 text-[11px] mt-0.5">محاضرة تفاعلية أسبوعية مفتوحة لجميع الطلاب والأهالي</p>
            <div class="flex items-center justify-between text-[11px] mt-2 pt-1 border-t border-slate-100 flex-wrap gap-2">
                <span class="font-bold text-slate-700">1:50 م للأطفال / 2:20 م للطلاب</span>
                <a href="https://zoom.us/j/98264506630" target="_blank" rel="noopener noreferrer" class="text-indigo-700 hover:text-indigo-900 font-black hover:underline">
                    دخول Zoom ←
                </a>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderCertificatesPanel() {
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    
    const hifzTitleEl = document.getElementById('certHifzTitle');
    const hifzSubtitleEl = document.getElementById('certHifzSubtitle');
    const courseStatusEl = document.getElementById('certCourseStatus');
    const quizzesSummaryEl = document.getElementById('certQuizzesSummary');
    const quizzesScoreEl = document.getElementById('certQuizzesScore');

    const courseTitle = curCourse.course_name || curStudent.course_name || 'مسار القرآن الكريم والتجويد';
    const presentCount = (curCourse.present_count !== undefined) ? curCourse.present_count : (curStudent.present_count || 0);
    const absentCount = (curCourse.absent_count !== undefined) ? curCourse.absent_count : (curStudent.absent_count || 0);
    const totalSessions = presentCount + absentCount;
    const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

    if (hifzTitleEl) hifzTitleEl.innerText = courseTitle;
    if (hifzSubtitleEl) {
        hifzSubtitleEl.innerText = `حضور مؤكد: ${presentCount} حصص • نسبة الالتزام: ${rate}% • المعلم: أ. ${curCourse.teacher_name || curStudent.teacher_name || 'معتمد'}`;
    }
    if (courseStatusEl) {
        courseStatusEl.innerText = 'مقفولة حالياً';
        courseStatusEl.className = 'inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md';
    }

    // Quizzes Performance
    if (cachedStudentSubmissions && cachedStudentSubmissions.length > 0) {
        const total = cachedStudentSubmissions.reduce((acc, sub) => acc + (Number(sub.score) || 0), 0);
        const avg = Math.round(total / cachedStudentSubmissions.length);
        let rank = 'ممتاز مع مرتبة الشرف';
        if (avg < 60) rank = 'يحتاج لمتابعة';
        else if (avg < 75) rank = 'جيد';
        else if (avg < 85) rank = 'جيد جداً';

        if (quizzesSummaryEl) quizzesSummaryEl.innerText = `التقدير التراكمي: ${rank} (المعدل ${avg}%)`;
        if (quizzesScoreEl) quizzesScoreEl.innerText = `المحصل: ${avg}% (${cachedStudentSubmissions.length} اختبارات)`;
    } else {
        if (quizzesSummaryEl) quizzesSummaryEl.innerText = 'التقدير العام: ممتاز ومواظب على الحلقات';
        if (quizzesScoreEl) quizzesScoreEl.innerText = 'المجموع: 100% (تقييم الحفظ والالتزام)';
    }
}

function renderDetailsPanel() {
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};

    const dName = document.getElementById('detailsStudentName');
    if (dName) dName.innerText = (curStudent.name || (window.__PRELOADED_USER__ && (window.__PRELOADED_USER__.full_name || window.__PRELOADED_USER__.username)) || 'طالب الأكاديمية').trim();
    
    const dCode = document.getElementById('detailsStudentCode');
    if (dCode) dCode.innerText = curStudent.student_code || ('ST' + String(curStudent.id || currentStudentId).padStart(4, '0'));
    
    const dParent = document.getElementById('detailsParentName');
    if (dParent) dParent.innerText = curStudent.parent_name || (document.getElementById('parentName') ? document.getElementById('parentName').innerText : 'ولي أمر الطالب');
    
    const dPhone = document.getElementById('detailsParentPhone');
    if (dPhone) dPhone.innerText = curStudent.parent_phone || (document.getElementById('parentPhone') ? document.getElementById('parentPhone').innerText : 'غير مسجل');
    
    const dStatus = document.getElementById('detailsAccountStatus');
    if (dStatus) dStatus.innerText = 'اشتراك ساري (' + (curStudent.account_status || 'نشط') + ')';

    const dTeacher = document.getElementById('detailsTeacherName');
    if (dTeacher) dTeacher.innerText = 'أ. ' + (curCourse.teacher_name || curStudent.teacher_name || 'مصطفى عيد');

    const dGroup = document.getElementById('detailsGroupInfo');
    if (dGroup) {
        const gid = curCourse.group_id || curStudent.group_id || 'G182';
        const time = curCourse.lecture_time || curStudent.lecture_time || '5:30 م';
        const days = curCourse.subscription_days || curStudent.subscription_days || 'أسبوعياً';
        dGroup.innerText = `${gid} • ${days} (${time})`;
    }

    const dCredits = document.getElementById('detailsRemainingCredits');
    if (dCredits) {
        const rc = (curCourse.remaining_credits !== undefined) ? curCourse.remaining_credits : (curStudent.remaining_credits || 0);
        dCredits.innerText = rc + ' حصص متبقية';
    }
}

function populateCertificateModalData() {
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};

    const studentName = (curStudent.name || (window.__PRELOADED_USER__ && (window.__PRELOADED_USER__.full_name || window.__PRELOADED_USER__.username)) || 'طالب الأكاديمية').trim();
    const courseName = curCourse.course_name || curStudent.course_name || 'مسار تحفيظ القرآن الكريم والتدبر';
    const teacherName = curCourse.teacher_name || curStudent.teacher_name || 'مصطفى عيد';
    const studentCode = curStudent.student_code || ('ST' + String(curStudent.id || currentStudentId).padStart(4, '0'));

    const presentCount = (curCourse.present_count !== undefined) ? curCourse.present_count : (curStudent.present_count || 0);
    const absentCount = (curCourse.absent_count !== undefined) ? curCourse.absent_count : (curStudent.absent_count || 0);
    const totalSessions = presentCount + absentCount;
    const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

    let grade = 'امتياز مع مرتبة الشرف';
    if (cachedStudentSubmissions && cachedStudentSubmissions.length > 0) {
        const total = cachedStudentSubmissions.reduce((acc, sub) => acc + (Number(sub.score) || 0), 0);
        const avg = Math.round(total / cachedStudentSubmissions.length);
        if (avg < 60) grade = 'مقبول';
        else if (avg < 75) grade = 'جيد مرتفع';
        else if (avg < 85) grade = 'جيد جداً';
        else grade = 'امتياز مع مرتبة الشرف';
    }

    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const dateFormatted = months[now.getMonth()] + ' ' + now.getFullYear();

    const nameEl = document.getElementById('certModalStudentName');
    if (nameEl) nameEl.innerText = studentName;
    const courseEl = document.getElementById('certModalCourseName');
    if (courseEl) courseEl.innerText = courseName;
    const teacherEl = document.getElementById('certModalTeacherName');
    if (teacherEl) teacherEl.innerText = 'أ. ' + teacherName;
    const attEl = document.getElementById('certModalAttendance');
    if (attEl) attEl.innerText = rate + '%';
    const gradeEl = document.getElementById('certModalGrade');
    if (gradeEl) gradeEl.innerText = grade;
    const dateEl = document.getElementById('certModalDate');
    if (dateEl) dateEl.innerText = dateFormatted;
    const codeEl = document.getElementById('certModalCode');
    if (codeEl) codeEl.innerText = studentCode + '-CERT-' + now.getFullYear();
}

window.renderUpcomingScheduleList = renderUpcomingScheduleList;
window.renderCertificatesPanel = renderCertificatesPanel;
window.renderDetailsPanel = renderDetailsPanel;
window.populateCertificateModalData = populateCertificateModalData;

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

let currentPortalTrack = 'quran'; // 'quran' | 'courses' | 'competition'

function classifyCourseTrack(c) {
    if (!c) return 'quran';
    const cName = (c.course_name || c.name || c.title || '').trim().toLowerCase();
    const tName = (c.track_name || '').trim().toLowerCase();

    if (tName.includes('كورس') || tName.includes('لغات') || tName.includes('علوم') || tName.includes('برمج') || tName.includes('تأسيس') || tName.includes('مهارات') || tName.includes('أكاديم')) {
        return 'courses';
    }
    if (tName.includes('قرآن') || tName.includes('قران') || tName.includes('تجويد') || tName.includes('تفسير') || tName.includes('حديث')) {
        return 'quran';
    }

    const courseKeywords = [
        'كورس', 'course', 'برمج', 'scratch', 'python', 'ai', 'ذكاء اصطناعي', 'روبوت', 'robot',
        'إنجليز', 'انجليز', 'english', 'phonics', 'speakup', 'لغة', 'لغات',
        'تأسيس', 'نور البيان', 'قراءة وكتابة', 'عربي', 'إملاء', 'املاء', 'خط',
        'حاسب', 'كمبيوتر', 'فوتوشوب', 'تصميم', 'جرافيك',
        'سلوك', 'تعديل سلوك', 'تنمية مهارات', 'صعوبات تعلم',
        'عقيدة', 'فقه', 'أخلاق', 'سيرة', 'رياضيات', 'math', 'علوم', 'science'
    ];

    for (const kw of courseKeywords) {
        if (cName.includes(kw)) {
            return 'courses';
        }
    }

    return 'quran';
}
window.classifyCourseTrack = classifyCourseTrack;

function getCourseCategoryMeta(c) {
    const cName = (c.course_name || c.name || c.title || '').trim().toLowerCase();
    const trackType = classifyCourseTrack(c);

    if (cName.includes('حديث')) {
        return {
            type: 'hadith',
            badgeText: 'مسار الحديث الشريف',
            badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
            icon: ''
        };
    }
    if (cName.includes('تجويد')) {
        return {
            type: 'tajweed',
            badgeText: 'مسار أحكام التجويد',
            badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
            icon: ''
        };
    }
    if (cName.includes('تفسير')) {
        return {
            type: 'tafsir',
            badgeText: 'مسار التفسير والتدبر',
            badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
            icon: ''
        };
    }

    if (trackType === 'quran') {
        return {
            type: 'quran',
            badgeText: 'مسار القرآن الكريم والتدبر',
            badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            icon: ''
        };
    }

    if (cName.includes('برمج') || cName.includes('scratch') || cName.includes('python') || cName.includes('ai') || cName.includes('ذكاء')) {
        return {
            type: 'programming',
            badgeText: 'برمجة وذكاء اصطناعي',
            badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
            icon: ''
        };
    }

    if (cName.includes('إنجليز') || cName.includes('انجليز') || cName.includes('english') || cName.includes('phonics') || cName.includes('لغة')) {
        return {
            type: 'languages',
            badgeText: 'محادثة ولغة إنجليزية',
            badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
            icon: ''
        };
    }

    if (cName.includes('تأسيس') || cName.includes('نور البيان') || cName.includes('عربي') || cName.includes('قراءة')) {
        return {
            type: 'foundation',
            badgeText: 'تأسيس ونور البيان',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
            icon: ''
        };
    }

    if (cName.includes('عقيدة') || cName.includes('فقه') || cName.includes('سلوك') || cName.includes('أخلاق')) {
        return {
            type: 'values',
            badgeText: 'علوم شرعية وتعديل سلوك',
            badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
            icon: ''
        };
    }

    return {
        type: 'courses',
        badgeText: 'كورس تدريبي معتمد',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: ''
    };
}
window.getCourseCategoryMeta = getCourseCategoryMeta;

const COMPETITION_COURSES = [
    {
        course_name: 'مسار الحديث الشريف',
        track_name: 'competition',
        teacher_name: 'معلم معتمد',
        group_id: 'CMP-H01',
        remaining_credits: 4,
        total_lectures_unlocked: 4,
        present_count: 2,
        subscription_days: 'الإثنين',
        lecture_time: '6:30 م - 8:30 م',
        session_duration: 'جلسة أسبوعية تفاعلية',
        account_status: 'متاح مجاناً',
        google_meet_url: 'https://zoom.us/j/98264506630'
    },
    {
        course_name: 'مسار أحكام التجويد ومخارج الحروف',
        track_name: 'competition',
        teacher_name: 'معلم معتمد',
        group_id: 'CMP-T01',
        remaining_credits: 4,
        total_lectures_unlocked: 4,
        present_count: 2,
        subscription_days: 'الجمعة',
        lecture_time: '1:50 م - 2:50 م',
        session_duration: 'جلسة أسبوعية تفاعلية',
        account_status: 'متاح مجاناً',
        google_meet_url: 'https://zoom.us/j/98264506630'
    },
    {
        course_name: 'مسار التفسير والتدبر',
        track_name: 'competition',
        teacher_name: 'معلم معتمد',
        group_id: 'CMP-F01',
        remaining_credits: 4,
        total_lectures_unlocked: 4,
        present_count: 2,
        subscription_days: 'الأحد والأربعاء',
        lecture_time: '5:00 م - 8:00 م',
        session_duration: 'جلسة أسبوعية تفاعلية',
        account_status: 'متاح مجاناً',
        google_meet_url: 'https://zoom.us/j/98264506630'
    }
];
window.COMPETITION_COURSES = COMPETITION_COURSES;

function getFilteredCoursesList() {
    if (currentPortalTrack === 'competition') {
        return COMPETITION_COURSES;
    }
    if (!Array.isArray(enrolledCoursesList) || enrolledCoursesList.length === 0) return [];
    if (currentPortalTrack === 'courses') {
        return enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'courses');
    }
    return enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'quran');
}

function switchPortalTrack(track) {
    currentPortalTrack = track || 'quran';

    const tabQuran = document.getElementById('tabBtnQuranTrack');
    const tabCourses = document.getElementById('tabBtnCoursesTrack');
    const tabComp = document.getElementById('tabBtnCompetitionTrack');

    const activeClasses = ['bg-[#1F274B]', 'text-white', 'shadow-xs', 'font-black'];
    const inactiveClasses = ['text-slate-600', 'hover:bg-slate-100', 'font-bold'];

    [tabQuran, tabCourses, tabComp].forEach(t => {
        if (!t) return;
        activeClasses.forEach(c => t.classList.remove(c));
        inactiveClasses.forEach(c => t.classList.remove(c));
    });

    if (currentPortalTrack === 'quran' && tabQuran) {
        activeClasses.forEach(c => tabQuran.classList.add(c));
        if (tabCourses) inactiveClasses.forEach(c => tabCourses.classList.add(c));
        if (tabComp) inactiveClasses.forEach(c => tabComp.classList.add(c));
    } else if (currentPortalTrack === 'courses' && tabCourses) {
        activeClasses.forEach(c => tabCourses.classList.add(c));
        if (tabQuran) inactiveClasses.forEach(c => tabQuran.classList.add(c));
        if (tabComp) inactiveClasses.forEach(c => tabComp.classList.add(c));
    } else if (currentPortalTrack === 'competition' && tabComp) {
        activeClasses.forEach(c => tabComp.classList.add(c));
        if (tabQuran) inactiveClasses.forEach(c => tabQuran.classList.add(c));
        if (tabCourses) inactiveClasses.forEach(c => tabCourses.classList.add(c));
    }

    const filterLabel = document.getElementById('activeTrackFilterLabel');
    const sectionIcon = document.getElementById('enrolledSectionIcon');
    const quranPlanSection = document.getElementById('quranPlanSection');
    const enrolledCoursesSection = document.getElementById('enrolledCoursesMainSection');
    const lecturesSection = document.getElementById('lecturesSection');

    const quranCourses = enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'quran');
    const academicCourses = enrolledCoursesList.filter(c => classifyCourseTrack(c) === 'courses');

    const bQuran = document.getElementById('badgeCountQuranTrack');
    const bCourses = document.getElementById('badgeCountCoursesTrack');
    const bComp = document.getElementById('badgeCountCompetitionTrack');
    if (bQuran) bQuran.innerText = quranCourses.length;
    if (bCourses) bCourses.innerText = academicCourses.length;
    if (bComp) bComp.innerText = COMPETITION_COURSES.length;

    if (sectionIcon) sectionIcon.innerText = '';

    const coursesTabs = document.getElementById('enrolledCoursesTabs');

    if (currentPortalTrack === 'quran') {
        if (filterLabel) filterLabel.innerText = 'مسار القرآن الكريم والتدبر (' + quranCourses.length + ')';
        if (enrolledCoursesSection) enrolledCoursesSection.classList.remove('hidden');
        if (quranPlanSection) quranPlanSection.classList.remove('hidden');
        if (coursesTabs) coursesTabs.className = "flex flex-col gap-3.5";
    } else if (currentPortalTrack === 'courses') {
        if (filterLabel) filterLabel.innerText = 'الكورسات والبرامج التعليمية (' + academicCourses.length + ')';
        if (enrolledCoursesSection) enrolledCoursesSection.classList.remove('hidden');
        if (quranPlanSection) quranPlanSection.classList.add('hidden');
        if (coursesTabs) coursesTabs.className = "grid grid-cols-1 md:grid-cols-2 gap-3.5 col-span-full";
    } else if (currentPortalTrack === 'competition') {
        if (filterLabel) filterLabel.innerText = 'محاضرات المسابقة (' + COMPETITION_COURSES.length + ')';
        if (enrolledCoursesSection) enrolledCoursesSection.classList.remove('hidden');
        if (quranPlanSection) quranPlanSection.classList.add('hidden');
        if (coursesTabs) coursesTabs.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 col-span-full";
    }

    const filtered = getFilteredCoursesList();
    if (filtered.length > 0) {
        const stillSelected = filtered.find(c => c.course_name === selectedCourseName);
        if (!stillSelected) {
            selectedCourseName = filtered[0].course_name;
        }
    }

    renderEnrolledCoursesTabs(filtered);
    loadSelectedCourseLectures();
}
window.switchPortalTrack = switchPortalTrack;

function requestCourseEnrollmentPrompt(courseName) {
    const student = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const sName = student.name || document.getElementById('studentName')?.innerText || 'طالب بالأكاديمية';
    const sCode = student.student_code || document.getElementById('studentCode')?.innerText || 'ST0000';
    
    const msg = `السلام عليكم ورحمة الله وبركاته،\nأرغب في تسجيل الطالب: (${sName}) - كود الطالب: (${sCode})\nفي (${courseName}).\nيرجى تزويدي بالمواعيد المتاحة وأسعار الباقات وتفاصيل الحصص.`;
    const waUrl = 'https://wa.me/201118599442?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
}
window.requestCourseEnrollmentPrompt = requestCourseEnrollmentPrompt;

function scrollToLectures() {
    if (typeof window.setPortalView === 'function') {
        window.setPortalView('schedule');
    }
    const el = document.getElementById('lecturesSection');
    if (el) {
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }
}
window.scrollToLectures = scrollToLectures;

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

    const safeCourses = (Array.isArray(courses)) ? courses : [];

    // Empty state when filtered courses is empty
    if (safeCourses.length === 0) {
        if (currentPortalTrack === 'courses') {
            container.innerHTML = `
                <div class="col-span-full bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border-2 border-indigo-200/90 rounded-2xl sm:rounded-3xl p-6 text-center space-y-3.5 shadow-sm">
                    <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-3xl shadow-xs">
                        
                    </div>
                    <div>
                        <h4 class="text-base sm:text-lg font-black text-slate-900">أنت لست مسجلاً في مسار الكورسات بعد</h4>
                        <p class="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-1 leading-relaxed">
                            حسابك مسجل حالياً في مسار القرآن الكريم والتدبر. للتسجيل في أحد الكورسات التعليمية يرجى التواصل مع إدارة الأكاديمية.
                        </p>
                    </div>
                    <div class="flex items-center justify-center gap-2 pt-1 flex-wrap">
                        <button onclick="switchPortalTrack('quran')" class="bg-[#1F274B] hover:bg-slate-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow transition">
                            ← عرض مسار القرآن الكريم
                        </button>
                    </div>
                </div>
            `;
            return;
        } else {
            container.innerHTML = '<div class="text-center py-8 text-slate-400 col-span-full font-bold text-xs">لا توجد مسارات مسجلة لهذا القسم حالياً.</div>';
            return;
        }
    }

    safeCourses.forEach(c => {
        if (!c) return;
        const cName = c.course_name || c.name || c.title || 'مسار القرآن الكريم والتدبر';
        const isSelected = (selectedCourseName ? (cName === selectedCourseName) : true);
        const card = document.createElement('div');
        
        const meta = getCourseCategoryMeta(c);
        const teacherName = c.teacher_name || 'معلم معتمد';
        const groupId = c.group_id || curStudent.group_id || 'G000';
        const remCredits = (c.remaining_credits !== undefined) ? c.remaining_credits : 0;
        const presentCount = (c.present_count !== undefined) ? c.present_count : 0;
        const totalUnlocked = (c.total_lectures_unlocked !== undefined && c.total_lectures_unlocked >= remCredits) ? c.total_lectures_unlocked : (remCredits + presentCount);
        const totalToShow = Math.max(1, totalUnlocked);
        const progressPercent = Math.min(100, Math.round((presentCount / totalToShow) * 100)) || 0;

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

        const meetUrl = (typeof window !== 'undefined' && window.getGroupMeetUrl)
            ? window.getGroupMeetUrl(groupId, c.teacher_id || teacherName)
            : (c.google_meet_url || 'https://meet.google.com');

        const activeClass = isSelected 
            ? 'border-2 border-indigo-600 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 shadow-md ring-2 ring-indigo-200/80 transform scale-[1.005]' 
            : 'border-2 border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-sm';

        card.className = 'p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition space-y-3 relative h-full flex flex-col justify-between ' + activeClass;
        card.onclick = () => selectCourseTab(cName);

        const teacherInitial = teacherName ? teacherName.trim().charAt(0) : 'م';

        card.innerHTML = `
            <div class="flex justify-between items-start flex-wrap gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span class="bg-slate-900 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">ID: ${groupId}</span>
                        <span class="${statusColor} border font-black px-2 py-0.5 rounded-full text-[10px]">${statusText}</span>
                        ${isSelected ? '<span class="bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">النشط حالياً</span>' : ''}
                    </div>
                    <h4 class="font-black text-base sm:text-lg text-slate-900 leading-tight">
                        ${cName}
                    </h4>
                    <div class="flex items-center gap-2 mt-1.5">
                        <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-900 font-black text-[11px] flex items-center justify-center shrink-0 border border-indigo-200">
                            ${teacherInitial}
                        </div>
                        <div class="text-xs">
                            <span class="font-extrabold text-slate-800">أ. ${teacherName}</span>
                            <span class="text-slate-400 text-[10px] mr-1">• مدرب معتمد بالأكاديمية</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Real-time Progress Bar (EasyT / Yanfaa style) -->
            <div class="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-600 font-bold">نسبة إنجاز المنهج:</span>
                    <span class="font-black text-indigo-900 font-mono">${progressPercent}%</span>
                </div>
                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    <span>حضور مؤكد: <strong class="text-emerald-700 font-bold">${presentCount} حصص</strong></span>
                    <span>المتبقي بالرصيد: <strong class="text-blue-900 font-bold">${remCredits} حصص</strong></span>
                </div>
            </div>

            <!-- Schedule & Timings Grid -->
            <div class="bg-slate-100/70 p-2.5 rounded-xl text-xs border border-slate-200/80">
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-800 font-bold">
                    <div>
                        <span class="text-slate-400 block text-[10px]">الموعد</span>
                        <strong class="text-blue-900 truncate block text-[11px] sm:text-xs">${timeText || 'محدد مع المعلم'}</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px]">مدة السيشن</span>
                        <strong class="text-emerald-800 truncate block text-[11px] sm:text-xs">${durationText}</strong>
                    </div>
                    <div class="col-span-2 sm:col-span-1">
                        <span class="text-slate-400 block text-[10px]">أيام الاشتراك</span>
                        <strong class="text-slate-950 truncate block text-[11px] sm:text-xs">${daysText || 'أسبوعياً'}</strong>
                    </div>
                </div>
            </div>

            <!-- Action Toolbar Buttons (EdTech Level) -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pt-1">
                ${(remCredits <= 0 || statusText === 'موقوف' || statusText === 'inactive')
                    ? `<button type="button" onclick="event.stopPropagation(); openPaymobModal();" class="w-full sm:flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 active:scale-95 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-center cursor-pointer">
                        <svg class="w-3.5 h-3.5"><use href="#clock"/></svg>
                        <span>رصيدك منتهي (0) — تجديد الآن</span>
                       </button>`
                    : `<a href="${meetUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 active:scale-95 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-center">
                        <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        <span>دخول القاعة الذكية</span>
                       </a>`
                }
                <div class="flex items-center gap-1.5 w-full sm:w-auto sm:flex-1">
                    <button type="button" onclick="event.stopPropagation(); selectCourseTab('${cName}'); scrollToLectures();" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-2.5 px-2 rounded-xl transition flex items-center justify-center gap-1 border border-slate-200 text-center">
                        <span>المنهج والمحاضرات</span>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); openQuizzesModal();" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-200 shrink-0" title="اختبارات وتدريبات">
                        <span>اختبارات</span>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function selectCourseTab(cName) {
    selectedCourseName = cName;
    renderEnrolledCoursesTabs(getFilteredCoursesList());
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

const COMPETITION_LECTURES_MAP = {
    'مسار الحديث الشريف': [
        { id: 901, block_number: 1, lecture_number: 1, title: 'مدخل إلى الأربعين النووية ومكانة السنة', scheduled_time: 'الإثنين 6:30 م', status: 'completed', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 902, block_number: 1, lecture_number: 2, title: 'حديث «إنما الأعمال بالنيات» وقواعد الإخلاص', scheduled_time: 'الإثنين 6:30 م', status: 'completed', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 903, block_number: 1, lecture_number: 3, title: 'مجلس الحديث: «لو محدش شايفك… من ستكون؟»', scheduled_time: 'الإثنين 6:30 م', status: 'active', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 904, block_number: 1, lecture_number: 4, title: 'آداب طالب العلم وتطبيق السنة في الحياة اليومية', scheduled_time: 'الإثنين 6:30 م', status: 'pending', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' }
    ],
    'مسار أحكام التجويد ومخارج الحروف': [
        { id: 911, block_number: 1, lecture_number: 1, title: 'مخارج الحروف العامة والخاصة (الحلق واللسان)', scheduled_time: 'الجمعة 1:50 م', status: 'completed', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 912, block_number: 1, lecture_number: 2, title: 'أحكام النون الساكنة والتنوين (الإظهار الحلقي والإدغام)', scheduled_time: 'الجمعة 1:50 م', status: 'completed', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 913, block_number: 1, lecture_number: 3, title: 'أحكام الإقلاب والإخفاء الحقيقي وتطبيقات عملية', scheduled_time: 'الجمعة 1:50 م', status: 'active', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 914, block_number: 1, lecture_number: 4, title: 'أحكام الميم الساكنة وأقسام المدود', scheduled_time: 'الجمعة 1:50 م', status: 'pending', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' }
    ],
    'مسار التفسير والتدبر': [
        { id: 921, block_number: 1, lecture_number: 1, title: 'مقدمة في علوم التفسير وقواعد تدبر آيات القرآن', scheduled_time: 'الأربعاء 5:00 م', status: 'completed', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 922, block_number: 1, lecture_number: 2, title: 'جلسة التفسير: «ماذا يدخل أذني… وإلى أين يأخذ قلبي؟»', scheduled_time: 'الأربعاء 5:00 م', status: 'active', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 923, block_number: 1, lecture_number: 3, title: 'هدايات سورة الفاتحة وتزكية النفس بالإيمان', scheduled_time: 'الأربعاء 5:00 م', status: 'pending', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' },
        { id: 924, block_number: 1, lecture_number: 4, title: 'تدبر قصار السور وأثرها في الصلاة والخشوع', scheduled_time: 'الأربعاء 5:00 م', status: 'pending', is_unlocked: true, meet_url: 'https://zoom.us/j/98264506630' }
    ]
};
window.COMPETITION_LECTURES_MAP = COMPETITION_LECTURES_MAP;

async function loadSelectedCourseLectures() {
    if (!selectedCourseName) return;
    
    try {
        let data = null;
        const currentCourseInfo = enrolledCoursesList.find(c => c.course_name === selectedCourseName) || enrolledCoursesList[0] || {};
        const remainingCredits = (currentCourseInfo.remaining_credits !== undefined) ? currentCourseInfo.remaining_credits : (currentCourseInfo.total_lectures_unlocked || 12);

        if (COMPETITION_LECTURES_MAP && COMPETITION_LECTURES_MAP[selectedCourseName]) {
            data = {
                course_name: selectedCourseName,
                total_lectures_unlocked: 4,
                unlocked_blocks: 1,
                remaining_credits: 4,
                renewal_count: 0,
                lectures: COMPETITION_LECTURES_MAP[selectedCourseName]
            };
        } else if (window.MonirDB && window.MonirDB.isConfigured()) {
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
                            is_unlocked: (remainingCredits > 0 && l.lecture_number <= remainingCredits)
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
        if (typeof renderUpcomingScheduleList === "function") renderUpcomingScheduleList();
        if (typeof renderCertificatesPanel === "function") renderCertificatesPanel();
        if (typeof renderDetailsPanel === "function") renderDetailsPanel();
        
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
                is_unlocked: (rc > 0 && num <= attendedCount + rc),
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
            l.google_meet_url = meetUrl; // Always sync with official teacher/group Google Meet URL

            const isAttended = (num <= attendedCount);
            const isUnlocked = (rc > 0) && (num <= attendedCount + rc);
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

        // Determine today's date in local Cairo/browser time
        const now = new Date();
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const todayDayName = dayNames[now.getDay()];
        const todayDateNum = now.getDate();
        const todayMonthName = monthNames[now.getMonth()];
        const todayDateStr = `${todayDateNum} ${todayMonthName}`; // e.g. "22 سبتمبر"

        // Helper to check if a lecture is scheduled for today
        const isLectureScheduledToday = (l) => {
            if (!l || !l.scheduled_time) return false;
            const st = l.scheduled_time;
            return st.includes(todayDateStr) || (st.includes(todayDayName) && (st.includes(String(todayDateNum)) || st.includes(todayMonthName)));
        };

        // If any unlocked lecture is scheduled for today and not completed, it takes highest priority as due!
        const todayDueLecture = (rc > 0) ? data.lectures.find(l => l.is_unlocked && l.status !== 'completed' && isLectureScheduledToday(l)) : null;

        // Determine which lecture is currently due (today's lecture if matches, otherwise first unlocked lecture not completed)
        const dueLecture = (rc > 0)
            ? (todayDueLecture 
                || data.lectures.find(l => l.is_unlocked && l.status !== 'completed') 
                || data.lectures.find(l => l.is_unlocked) 
                || null)
            : null;
        const dueLectureNumber = dueLecture ? dueLecture.lecture_number : null;

        // Render each block
        for (let blockNum = 1; blockNum <= numBlocks; blockNum++) {
            const blockLectures = data.lectures.filter(l => l.block_number === blockNum);
            if (blockLectures.length === 0) continue;

            const blockStart = (blockNum - 1) * 4 + 1;
            const blockEnd = blockStart + blockLectures.length - 1;
            const allUnlocked = blockLectures.every(l => l.is_unlocked);
            const someUnlocked = blockLectures.some(l => l.is_unlocked);

            // Skip locked future stages if user only wants active/unlocked stages
            if (blockNum > 1 && !someUnlocked) continue;

            // Block header (accordion)
            let badgeText = '';
            let badgeClass = '';
            if (allUnlocked) {
                badgeText = 'مفعلة بالكامل';
                badgeClass = 'bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold';
            } else if (someUnlocked) {
                const unlockedCount = blockLectures.filter(l => l.is_unlocked).length;
                badgeText = unlockedCount + ' مفعلة • الباقي مقفل';
                badgeClass = 'bg-amber-400 text-slate-950 text-[10px] px-2.5 py-0.5 rounded-full font-black';
            } else {
                badgeText = 'مغلقة • تتطلب التجديد';
                badgeClass = 'bg-red-400 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold';
            }

            const arabicOrdinals = {
                1: 'المرحلة الأولى',
                2: 'المرحلة الثانية',
                3: 'المرحلة الثالثة',
                4: 'المرحلة الرابعة',
                5: 'المرحلة الخامسة',
                6: 'المرحلة السادسة'
            };
            const stageTitle = arabicOrdinals[blockNum] || `المرحلة ${blockNum}`;

            // Default: block 1 open, rest closed
            const isOpenByDefault = (blockNum === 1);

            // Accordion wrapper
            const accordionWrapper = document.createElement('div');
            accordionWrapper.className = 'rounded-xl overflow-hidden shadow-sm';

            const blockHeader = document.createElement('div');
            blockHeader.className = 'bg-[#1F274B] text-white px-4 py-3 flex items-center justify-between text-xs font-bold cursor-pointer select-none';
            blockHeader.innerHTML = `
                <div class="flex items-center gap-2.5 flex-wrap">
                    <span class="text-sm font-black">${stageTitle}</span>
                    <span class="${badgeClass}">${badgeText}</span>
                </div>
                <svg class="accordion-chevron w-4 h-4 transition-transform duration-300 flex-shrink-0 ${isOpenByDefault ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            `;

            // Block lectures container
            const blockContainer = document.createElement('div');
            blockContainer.className = 'space-y-3 px-1 pt-2 pb-1 bg-transparent overflow-hidden transition-all duration-300';
            if (!isOpenByDefault) {
                blockContainer.style.maxHeight = '0px';
                blockContainer.style.paddingTop = '0';
                blockContainer.style.paddingBottom = '0';
            } else {
                blockContainer.style.maxHeight = '2000px';
            }

            blockLectures.forEach(l => {
                const isScheduledToday = isLectureScheduledToday(l);
                const isCurrentDue = (rc > 0) && (((l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed')) || (isScheduledToday && l.is_unlocked && l.status !== 'completed'));
                const card = renderLectureCard(l, isCurrentDue, isScheduledToday);
                blockContainer.appendChild(card);
            });

            // Toggle logic
            blockHeader.addEventListener('click', () => {
                const isOpen = blockContainer.style.maxHeight !== '0px';
                const chevron = blockHeader.querySelector('.accordion-chevron');
                if (isOpen) {
                    blockContainer.style.maxHeight = '0px';
                    blockContainer.style.paddingTop = '0';
                    blockContainer.style.paddingBottom = '0';
                    if (chevron) chevron.classList.remove('rotate-180');
                } else {
                    blockContainer.style.maxHeight = '2000px';
                    blockContainer.style.paddingTop = '';
                    blockContainer.style.paddingBottom = '';
                    if (chevron) chevron.classList.add('rotate-180');
                }
            });

            accordionWrapper.appendChild(blockHeader);
            accordionWrapper.appendChild(blockContainer);

            if (renderTarget) {
                renderTarget.appendChild(accordionWrapper);
            } else {
                // Fallback to old containers
                const b1El = document.getElementById('block1Lectures');
                const b2El = document.getElementById('block2Lectures');
                if (blockNum === 1 && b1El) {
                    b1El.before(blockHeader);
                    blockLectures.forEach(l => {
                        const isScheduledToday = isLectureScheduledToday(l);
                        const isCurrentDue = (rc > 0) && (((l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed')) || (isScheduledToday && l.is_unlocked && l.status !== 'completed'));
                        b1El.appendChild(renderLectureCard(l, isCurrentDue, isScheduledToday));
                    });
                } else if (b2El) {
                    b2El.before(blockHeader);
                    blockLectures.forEach(l => {
                        const isScheduledToday = isLectureScheduledToday(l);
                        const isCurrentDue = (rc > 0) && (((l.lecture_number === dueLectureNumber && l.is_unlocked && l.status !== 'completed')) || (isScheduledToday && l.is_unlocked && l.status !== 'completed'));
                        b2El.appendChild(renderLectureCard(l, isCurrentDue, isScheduledToday));
                    });
                }
            }
        }

        // Sync bottom bar action button state (locked vs enter meet)
        updateBottomMeetButtonState(rc);

    } catch (err) {
        console.error("Error loading course lectures:", err);
    }
}





function renderLectureCard(l, isCurrentDue = false, isScheduledToday = false) {
    const div = document.createElement('div');
    
    let statusBadge = '';
    let actionBtn = '';
    let cardClass = 'lecture-card p-4 rounded-xl border transition-all';

    const currentCourseInfo = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const curGid = currentCourseInfo.group_id || curStudent.group_id;
    const rc = (currentCourseInfo.remaining_credits !== undefined) ? currentCourseInfo.remaining_credits : (curStudent.remaining_credits !== undefined ? curStudent.remaining_credits : 0);
    const isStopped = (curStudent.account_status === 'موقوف' || curStudent.account_status === 'inactive' || currentCourseInfo.status === 'inactive');

    const meetLink = (typeof window !== 'undefined' && window.getGroupMeetUrl) 
        ? window.getGroupMeetUrl(curGid, currentCourseInfo.teacher_id || currentCourseInfo.teacher_name) 
        : (currentCourseInfo.google_meet_url || 'https://meet.google.com');

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
                    <span>الورد:</span>
                    <strong>${plan.hifz}</strong>
                </span>` : ''}
                ${plan.madi_qareeb ? `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    <span>الماضي:</span>
                    <span>${plan.madi_qareeb}</span>
                </span>` : ''}
            </div>
        `;
    } else if (isCurrentDue || isScheduledToday || l.status === 'live') {
        quranBadge = `
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                <span>الورد: يُحدد بالحلقة</span>
            </span>
        `;
    }

    // The single video room button - only shown for current due lecture or live
    const meetBtn = `
        <div class="mt-3 pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <button type="button" onclick="joinMeet(${l.id}, '${meetLink}')" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer">
                    <span>دخول الحصة المباشرة (Google Meet)</span>
                </button>
                <button type="button" onclick="copyMeetLink('${meetLink}')" class="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1 shrink-0 cursor-pointer" title="نسخ رابط الحصة">
                    <span class="hidden sm:inline">نسخ الرابط</span>
                </button>
            </div>
            <span class="text-[10px] sm:text-[11px] text-emerald-800 font-semibold bg-emerald-100/70 px-2.5 py-1 rounded-lg text-center sm:text-right">قاعة تفاعلية مباشرة مع المعلم</span>
        </div>
    `;
    
    const isLockedForZeroOrUnl = (!l.is_unlocked || rc <= 0 || isStopped) && (l.status !== 'completed');

    if (isLockedForZeroOrUnl) {
        cardClass += ' locked bg-slate-50/70 border-slate-200 opacity-80';
        statusBadge = (rc <= 0) 
            ? '<span class="badge-status bg-red-100 text-red-800 border border-red-200 text-[11px] font-bold">مغلقة • الرصيد (0) حصص</span>'
            : '<span class="badge-status badge-locked">مغلقة • تتطلب تجديد الاشتراك</span>';
        actionBtn = `
            <button onclick="openPaymobModal()" class="w-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <span>تجديد الاشتراك وشحن الحصص لفتح المحاضرة</span>
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
                attBadge = '<span class="text-emerald-600 font-bold text-xs flex items-center gap-1"><span>تم تسجيل حضورك (' + (l.attendance.duration_minutes || 60) + ' دقيقة)</span></span>';
            } else if (isAbsent) {
                attBadge = '<span class="text-red-600 font-bold text-xs flex items-center gap-1"><span>لم يتم الحضور (غياب مسجل)</span></span>';
            } else {
                attBadge = '<span class="text-slate-600 font-medium text-xs">تمت المحاضرة</span>';
            }
                
            statusBadge = '<span class="badge-status badge-completed">مكتملة</span>';
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
        } else if (isCurrentDue || isScheduledToday || l.status === 'live') {
            cardClass += ' border-2 border-emerald-500 bg-emerald-50/30 shadow-sm ring-2 ring-emerald-400/20';
            const badgeLabel = isScheduledToday ? 'موعدها اليوم • جاهزة للدخول' : 'الحصة الحالية • جاهزة للدخول';
            statusBadge = `
                <span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-300">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ${badgeLabel}
                </span>
            `;

            const quranBox = (plan.hifz || plan.madi_qareeb || plan.madi_baeed) ? `
                <div class="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/90 rounded-2xl p-3 text-xs mb-2.5 shadow-2xs space-y-2">
                    <div class="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-emerald-200/60">
                        <div class="flex items-center gap-1.5">
                            <strong class="text-xs font-black text-emerald-950">خطة الحفظ والمراجعة المقررة لهذه الحصة</strong>
                        </div>
                        <span class="text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-200 px-2 py-0.5 rounded-full">مسار القرآن الكريم</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div class="bg-white/95 p-2 rounded-xl border border-emerald-200 shadow-2xs">
                            <span class="text-[10px] text-emerald-800 font-black block mb-0.5">الحفظ الجديد:</span>
                            <strong class="text-xs text-slate-900 block">${plan.hifz || 'يُحدد بالحلقة'}</strong>
                        </div>
                        <div class="bg-white/95 p-2 rounded-xl border border-blue-200 shadow-2xs">
                            <span class="text-[10px] text-blue-800 font-black block mb-0.5">الماضي القريب:</span>
                            <strong class="text-xs text-slate-800 block">${plan.madi_qareeb || '—'}</strong>
                        </div>
                        <div class="bg-white/95 p-2 rounded-xl border border-purple-200 shadow-2xs">
                            <span class="text-[10px] text-purple-800 font-black block mb-0.5">الماضي البعيد:</span>
                            <strong class="text-xs text-slate-800 block">${plan.madi_baeed || '—'}</strong>
                        </div>
                    </div>
                    ${plan.notes ? `
                        <div class="text-[11px] text-emerald-950 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200 font-medium flex items-start gap-1.5">
                            <div><strong>توجيهات المعلم:</strong> ${plan.notes}</div>
                        </div>
                    ` : ''}
                </div>
            ` : '';

            const subNotice = isScheduledToday 
                ? 'هذه هي المحاضرة المقررة اليوم في جدولك. يمكنك الدخول المباشر للقاعة الآن.'
                : 'هذه هي المحاضرة التي عليها الدور الآن في خطتك. يمكنك الدخول المباشر للقاعة.';

            actionBtn = `
                ${quranBox}
                <div class="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-slate-700">
                    <div class="mb-1 font-bold text-slate-900">موعد الحصة: <strong class="text-emerald-700">${l.scheduled_time || 'حسب جدول المجموعة'}</strong></div>
                    <p class="text-[11px] text-slate-600">${subNotice}</p>
                </div>
                ${meetBtn}
            `;
        } else {
            cardClass += ' bg-white border-slate-200';
            statusBadge = '<span class="badge-status bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">مجدولة • قادمة</span>';
            actionBtn = `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                    <div class="mb-1 font-bold text-slate-800">موعد المحاضرة: <strong class="text-indigo-800">${l.scheduled_time || 'حسب جدول المجموعة'}</strong></div>
                    <div class="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        <span>يُتاح رابط الدخول المباشر عند حلول موعد الحصة</span>
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

function updateBottomMeetButtonState(rc) {
    const btn = document.getElementById('bottomNavMeetBtn');
    const icon = document.getElementById('bottomNavMeetIcon');
    const label = document.getElementById('bottomNavMeetLabel');
    if (!btn) return;
    if (rc <= 0) {
        btn.className = "flex-1 flex flex-col items-center justify-center gap-0.5 text-amber-700 active:scale-95 py-1 px-1 bg-amber-50 border border-amber-300 rounded-xl transition shadow-xs cursor-pointer";
        btn.onclick = () => { if (typeof openPaymobModal === 'function') openPaymobModal(); };
        if (icon) icon.innerHTML = '<svg class="w-4 h-4"><use href="#award"/></svg>';
        if (label) label.innerText = 'رصيد 0 • تجديد';
    } else {
        btn.className = "flex-1 flex flex-col items-center justify-center gap-0.5 text-emerald-700 active:scale-95 py-1 px-1 bg-emerald-50 border border-emerald-300/80 rounded-xl transition shadow-xs cursor-pointer";
        btn.onclick = () => { joinNextDueMeet(); };
        if (icon) icon.innerHTML = '<svg class="w-4 h-4"><use href="#clock"/></svg>';
        if (label) label.innerText = 'دخول الحصة';
    }
}

function joinMeet(lectureId, meetUrl) {
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const rc = (curCourse.remaining_credits !== undefined) ? curCourse.remaining_credits : (curStudent.remaining_credits !== undefined ? curStudent.remaining_credits : 0);
    const isStopped = (curStudent.account_status === 'موقوف' || curStudent.account_status === 'inactive' || curCourse.status === 'inactive');

    if (rc <= 0 || isStopped) {
        if (window.MonirPopup && window.MonirPopup.alert) {
            window.MonirPopup.alert(
                'عفواً، لا يمكن الدخول لقاعة الحصة المباشرة لأن رصيد الحصص المتاح لديك حالياً هو (0) حصص. يرجى تجديد الاشتراك وشحن باقتك لمتابعة الحضور مع المعلم.',
                'تجديد الاشتراك مطلوب',
                () => { if (typeof openPaymobModal === 'function') openPaymobModal(); }
            );
        } else {
            alert('عفواً، لا يمكن الدخول للحصة لأن رصيدك 0 حصص. يرجى تجديد الاشتراك وشحن الباقة.');
            if (typeof openPaymobModal === 'function') openPaymobModal();
        }
        return;
    }

    const curGid = curCourse.group_id || curStudent.group_id;
    const resolvedMeetUrl = (typeof window !== 'undefined' && window.getGroupMeetUrl)
        ? window.getGroupMeetUrl(curGid, curCourse.teacher_id || curCourse.teacher_name)
        : (meetUrl || curCourse.google_meet_url || 'https://meet.google.com');

    const targetUrl = resolvedMeetUrl || meetUrl || 'https://meet.google.com';
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
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const rc = (curCourse.remaining_credits !== undefined) ? curCourse.remaining_credits : (curStudent.remaining_credits !== undefined ? curStudent.remaining_credits : 0);
    const isStopped = (curStudent.account_status === 'موقوف' || curStudent.account_status === 'inactive' || curCourse.status === 'inactive');

    if (rc <= 0 || isStopped) {
        if (window.MonirPopup && window.MonirPopup.alert) {
            window.MonirPopup.alert(
                'عفواً، لا يمكن دخول الحصة المباشرة لأن رصيدك الحالي هو (0) حصص. اضغط على تجديد الاشتراك لشحن باقتك الآن.',
                'تجديد الاشتراك مطلوب',
                () => { if (typeof openPaymobModal === 'function') openPaymobModal(); }
            );
        } else {
            alert('عفواً، لا يمكن الدخول للحصة لأن رصيدك 0 حصص. يرجى تجديد الاشتراك.');
            if (typeof openPaymobModal === 'function') openPaymobModal();
        }
        return;
    }

    const url = getNextDueMeetUrl();
    joinMeet(null, url);
}

function copyNextDueMeet() {
    const curCourse = (enrolledCoursesList && enrolledCoursesList.find(c => c.course_name === selectedCourseName)) || (enrolledCoursesList && enrolledCoursesList[0]) || {};
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const rc = (curCourse.remaining_credits !== undefined) ? curCourse.remaining_credits : (curStudent.remaining_credits !== undefined ? curStudent.remaining_credits : 0);

    if (rc <= 0) {
        if (window.MonirPopup && window.MonirPopup.toast) {
            window.MonirPopup.toast('رصيدك 0 حصص - يرجى تجديد الاشتراك أولاً للحصول على رابط القاعة', 'error');
        } else {
            alert('رصيدك 0 حصص - يرجى تجديد الاشتراك أولاً');
        }
        return;
    }

    const url = getNextDueMeetUrl();
    const btn = document.getElementById('heroCopyMeetBtn');
    if (window.copyMeetLink) {
        window.copyMeetLink(url, btn);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            if (window.MonirPopup) window.MonirPopup.toast('تم نسخ رابط الحصة بنجاح', 'success');
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
                    title: 'إشعار خطة الحفظ والمراجعة القرآنية',
                    message: `الحفظ الجديد: ${plan.hifz || '—'}\nالماضي القريب: ${plan.madi_qareeb || '—'}\nالماضي البعيد: ${plan.madi_baeed || '—'}${plan.notes ? '\nتوجيهات: ' + plan.notes : ''}`,
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
                    title: (studentAgeForNotif < 10) ? 'بث مباشر (Zoom): حلقة الأطفال والناشئة' : 'بث مباشر (Zoom): محاضرة الطلاب والكبار',
                    message: `بدأت الآن المحاضرة التفاعلية المباشرة عبر Zoom (${studentAgeForNotif < 10 ? 'فئة أقل من 10 سنوات • 1:50 م إلى 2:25 م' : 'فئة 10 سنوات فما فوق • 2:20 م إلى 2:50 م'}). انقر على الزر بالأسفل للدخول مباشرة للقاعة والتواصل مع المعلم.`,
                    action_url: 'https://zoom.us/j/98264506630',
                    is_read: 0,
                    created_at: new Date().toISOString()
                });
            }
        }
        if (typeof getSundayTafsirStatus === 'function') {
            const sunStatus = getSundayTafsirStatus(studentAgeForNotif);
            if (sunStatus && sunStatus.isWithinWindow) {
                notifs.unshift({
                    id: 'zoom_sunday_live_pinned',
                    type: 'zoom_live',
                    title: 'بث مباشر مجاني (Zoom): محاضرة التفسير والتدبر',
                    message: 'بدأت الآن محاضرة التفسير والتدبر الأسبوعية المجانية (الأحد من 8:00 م إلى 9:00 م). انقر على الزر للدخول مباشرة للقاعة دون أي خصم من رصيدك.',
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
                                    <span>${n.title}</span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                                </span>
                                <span class="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full">مباشر الآن</span>
                            </div>
                            <p class="font-medium text-[11px] leading-relaxed text-slate-700 mb-2.5">${n.message}</p>
                            <a href="${n.action_url || 'https://zoom.us/j/98264506630'}" target="_blank" rel="noopener noreferrer" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95">
                                <span>انضم للبث المباشر (Zoom)</span>
                            </a>
                        `;
                    } else if (n.type === 'quran_plan') {
                        div.className = 'p-3.5 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 text-xs text-emerald-950 font-bold shadow-2xs';
                        div.innerHTML = `
                            <div class="flex justify-between items-center mb-1.5 pb-1 border-b border-emerald-200/80">
                                <span class="font-black flex items-center gap-1.5 text-emerald-900">
                                    <svg class="w-4 h-4 text-emerald-700 shrink-0"><use href="#book"/></svg>
                                    <span>${n.title}</span>
                                </span>
                                <span class="text-[10px] bg-emerald-200/90 text-emerald-900 font-black px-2 py-0.5 rounded-full">خطة معتمدة</span>
                            </div>
                            <p class="font-normal text-[11px] leading-relaxed whitespace-pre-line text-emerald-950 mt-1">${n.message}</p>
                        `;
                    } else {
                        div.className = 'p-3 rounded-2xl border text-xs transition ' + 
                            (isUnread ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700');
                        div.innerHTML = `
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-extrabold flex items-center gap-1.5">
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

        // 6. Keep top banner hidden - all notifications reside cleanly in the top header notifications bell
        const topBanner = document.getElementById('topNotificationBanner');
        if (topBanner) {
            topBanner.classList.add('hidden');
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
        id: 'private_4_60',
        type: 'private',
        typeName: 'برايفت (فردي خاص)',
        name: 'باقة 4 محاضرات (ساعة كاملة)',
        subtitle: '60 دقيقة للحصة — متابعة فردية 1:1',
        credits: 4,
        duration: '60 دقيقة',
        price: 1000,
        badge: null
    }
];

let selectedRenewalPackageId = 'group_4';

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
    btn.innerHTML = '<span>تم النسخ</span>';
    btn.classList.add('bg-emerald-200', 'text-emerald-950');
    setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.classList.remove('bg-emerald-200', 'text-emerald-950');
    }, 2000);
}

function updateWhatsAppTransferLink() {
    const pkg = RENEWAL_PACKAGES.find(p => p.id === selectedRenewalPackageId) || RENEWAL_PACKAGES[0];
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
    if (btnTxt) btnTxt.innerText = 'تسجيل إشعار سداد (' + pkg.price.toFixed(2) + ' ج.م) - قيد المراجعة';

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

    selectRenewalPackage(selectedRenewalPackageId || 'group_4');
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

    document.getElementById('receiptAmount').innerText = (receipt.amount !== undefined ? Number(receipt.amount).toFixed(2) : '400.00') + ' ج.م';
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

        btn.innerHTML = 'تم تسجيل الطلب بنجاح';
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
// GENERAL ACADEMY LECTURES & QUIZZES SYSTEM
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
    
    let simDay = null;
    if (urlParams.has('sim_day')) {
        simDay = parseInt(urlParams.get('sim_day'), 10);
    }

    // Support simulation for testing via URL: ?sim_time=14:05 (HH:MM in 24h format)
    if (urlParams.has('sim_time')) {
        const parts = urlParams.get('sim_time').split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        let dayOfWeek = (simDay !== null && !isNaN(simDay)) ? simDay : 1;
        if (simDay === null) {
            try {
                const now = new Date();
                const cairoStr = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
                dayOfWeek = new Date(cairoStr).getDay();
            } catch(e) {
                dayOfWeek = new Date().getDay();
            }
        }
        return {
            hours: h,
            minutes: m,
            totalMinutes: h * 60 + m,
            localHours: h,
            localMinutes: m,
            localTotalMinutes: h * 60 + m,
            dayOfWeek: dayOfWeek,
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

        let dayOfWeek = (simDay !== null && !isNaN(simDay)) ? simDay : cairoDate.getDay();

        return {
            hours: ch,
            minutes: cm,
            totalMinutes: ch * 60 + cm,
            localHours: lh,
            localMinutes: lm,
            localTotalMinutes: lh * 60 + lm,
            dayOfWeek: dayOfWeek,
            isSimulated: (simDay !== null)
        };
    } catch(e) {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        let dayOfWeek = (simDay !== null && !isNaN(simDay)) ? simDay : now.getDay();
        return {
            hours: h,
            minutes: m,
            totalMinutes: h * 60 + m,
            localHours: h,
            localMinutes: m,
            localTotalMinutes: h * 60 + m,
            dayOfWeek: dayOfWeek,
            isSimulated: (simDay !== null)
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

const SUNDAY_TAFSIR_CONFIG = {
    url: "https://zoom.us/j/98264506630",
    label: "محاضرة التفسير والتدبر (مجانية)",
    timeLabel: "الأحد 8:00 م - 9:00 م (تفتح 7:50 م)",
    minAge: 10,
    openMins: 1190,  // 19:50 (7:50 PM)
    startMins: 1200, // 20:00 (8:00 PM)
    endMins: 1260    // 21:00 (9:00 PM)
};

function getSundayTafsirStatus(studentAge) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sim_age')) {
        studentAge = parseInt(urlParams.get('sim_age'), 10);
    }
    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;
    
    // Strictly for 10 years and older
    if (age < SUNDAY_TAFSIR_CONFIG.minAge) {
        return {
            isEligible: false,
            isVisible: false,
            isWithinWindow: false,
            zoomUrl: SUNDAY_TAFSIR_CONFIG.url,
            label: SUNDAY_TAFSIR_CONFIG.label,
            timeLabel: SUNDAY_TAFSIR_CONFIG.timeLabel
        };
    }

    // Testing simulation flags
    if (urlParams.has('test_sunday') || urlParams.has('sim_sunday') || urlParams.get('force_live') === 'sunday') {
        return {
            isEligible: true,
            isVisible: true,
            isWithinWindow: true,
            zoomUrl: SUNDAY_TAFSIR_CONFIG.url,
            label: SUNDAY_TAFSIR_CONFIG.label,
            timeLabel: SUNDAY_TAFSIR_CONFIG.timeLabel
        };
    }

    const timeInfo = getCairoTimeInfo();
    const day = timeInfo.dayOfWeek;
    const cairoMins = timeInfo.totalMinutes;
    const localMins = (timeInfo.localTotalMinutes !== undefined) ? timeInfo.localTotalMinutes : cairoMins;

    // Day 0 = Sunday
    const isSunday = (day === 0);
    const inWindowCairo = isSunday && (cairoMins >= SUNDAY_TAFSIR_CONFIG.openMins && cairoMins <= SUNDAY_TAFSIR_CONFIG.endMins);
    const inWindowLocal = isSunday && (localMins >= SUNDAY_TAFSIR_CONFIG.openMins && localMins <= SUNDAY_TAFSIR_CONFIG.endMins);
    const isWithinWindow = inWindowCairo || inWindowLocal;

    return {
        isEligible: true,
        isVisible: true,
        isWithinWindow: isWithinWindow,
        zoomUrl: SUNDAY_TAFSIR_CONFIG.url,
        label: SUNDAY_TAFSIR_CONFIG.label,
        timeLabel: SUNDAY_TAFSIR_CONFIG.timeLabel
    };
}

// ═════════════════════════════════════════════════════════════════════
// Tuesday Girls Tafsir Live Config (جلسة التفسير والتدبر للبنات أقل من 10 سنوات)
// ═════════════════════════════════════════════════════════════════════
const TUESDAY_GIRLS_TAFSIR_CONFIG = {
    url: "https://zoom.us/j/98264506630",
    label: "جلسة التفسير والتدبر — الحلقة 2: ماذا يدخل أذني… وإلى أين يأخذ قلبي؟",
    episodeTitle: "الحلقة الثانية: ماذا يدخل أذني… وإلى أين يأخذ قلبي؟",
    timeLabel: "الثلاثاء 8:30 م - 9:30 م (تفتح 8:20 م)",
    maxAge: 9, // strictly < 10
    openMins: 1220, // 20:20 (8:20 PM)
    startMins: 1230, // 20:30 (8:30 PM)
    endMins: 1295   // 21:35 (9:35 PM)
};

function getTuesdayGirlsTafsirStatus(studentAge, studentGender) {
    const urlParams = new URLSearchParams(window.location.search);
    let age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;
    if (urlParams.has('sim_age')) {
        age = parseInt(urlParams.get('sim_age'), 10);
    }
    let gender = studentGender;
    if (urlParams.has('sim_gender')) {
        gender = urlParams.get('sim_gender');
    }
    if (!gender || (gender !== 'f' && gender !== 'm')) {
        const s = (window.currentStudentData && window.currentStudentData.student) || {};
        const sName = s.name || '';
        const sCode = s.student_code || s.id || currentStudentId;
        const sExplicit = s.gender || s.parent_name;
        gender = guessStudentGender(sName, sExplicit, sCode);
    }

    const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                     (window.currentSessionUser && window.currentSessionUser.role) || 
                     urlParams.get('role');
    const isAdminOrSupervisor = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor') || urlParams.has('all_cohorts'));

    // Strictly for girls under 10
    const isTargetAudience = (gender === 'f' && age < 10);

    if (!isTargetAudience && !isAdminOrSupervisor) {
        return {
            isEligible: false,
            isVisible: false,
            isWithinWindow: false,
            zoomUrl: TUESDAY_GIRLS_TAFSIR_CONFIG.url,
            label: TUESDAY_GIRLS_TAFSIR_CONFIG.label,
            timeLabel: TUESDAY_GIRLS_TAFSIR_CONFIG.timeLabel
        };
    }

    // Testing simulation flags
    if (urlParams.has('test_tuesday') || urlParams.has('sim_tuesday') || urlParams.get('force_live') === 'tuesday') {
        return {
            isEligible: true,
            isVisible: true,
            isWithinWindow: true,
            zoomUrl: TUESDAY_GIRLS_TAFSIR_CONFIG.url,
            label: TUESDAY_GIRLS_TAFSIR_CONFIG.label,
            timeLabel: TUESDAY_GIRLS_TAFSIR_CONFIG.timeLabel
        };
    }

    const timeInfo = getCairoTimeInfo();
    const day = timeInfo.dayOfWeek;
    const cairoMins = timeInfo.totalMinutes;
    const localMins = (timeInfo.localTotalMinutes !== undefined) ? timeInfo.localTotalMinutes : cairoMins;

    // Day 2 = Tuesday
    const isTuesday = (day === 2);
    const inWindowCairo = isTuesday && (cairoMins >= TUESDAY_GIRLS_TAFSIR_CONFIG.openMins && cairoMins <= TUESDAY_GIRLS_TAFSIR_CONFIG.endMins);
    const inWindowLocal = isTuesday && (localMins >= TUESDAY_GIRLS_TAFSIR_CONFIG.openMins && localMins <= TUESDAY_GIRLS_TAFSIR_CONFIG.endMins);
    const isWithinWindow = inWindowCairo || inWindowLocal;

    return {
        isEligible: true,
        isVisible: true,
        isWithinWindow: isWithinWindow,
        isEnded: isTuesday && (cairoMins > TUESDAY_GIRLS_TAFSIR_CONFIG.endMins),
        zoomUrl: TUESDAY_GIRLS_TAFSIR_CONFIG.url,
        label: TUESDAY_GIRLS_TAFSIR_CONFIG.label,
        timeLabel: TUESDAY_GIRLS_TAFSIR_CONFIG.timeLabel
    };
}

// ═════════════════════════════════════════════════════════════════════
// Wednesday Tafsir & Tadabbur Live Config (جلسات الأربعاء - مسار التفسير والتدبر)
// ═════════════════════════════════════════════════════════════════════
const WEDNESDAY_TAFSIR_CONFIG = {
    girls_10_and_up: {
        url: "https://zoom.us/j/98264506630",
        label: "فئة البنات (10 سنوات فيما فوق)",
        episodeTitle: "الحلقة الثانية: «ماذا يدخل أذني… وإلى أين يأخذ قلبي؟»",
        timeLabel: "كل أربعاء الساعة 5:00 م (الرابط مفتوح ومتاح)",
        minAge: 10,
        gender: "f",
        openMins: 0,
        startMins: 1020, // 17:00 (5:00 PM)
        endMins: 1440
    },
    boys_under_10: {
        url: "https://zoom.us/j/98264506630",
        label: "فئة الأولاد (أقل من 10 سنوات)",
        episodeTitle: "الحلقة الثانية: «ماذا يدخل أذني… وإلى أين يأخذ قلبي؟»",
        timeLabel: "كل أربعاء الساعة 6:30 م (الرابط مفتوح ومتاح)",
        maxAge: 9,
        gender: "m",
        openMins: 0,
        startMins: 1110, // 18:30 (6:30 PM)
        endMins: 1440
    }
};

function getWednesdayTafsirStatus(studentAge, studentGender) {
    const urlParams = new URLSearchParams(window.location.search);
    let age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;
    if (urlParams.has('sim_age')) {
        age = parseInt(urlParams.get('sim_age'), 10);
    }
    let gender = studentGender;
    if (urlParams.has('sim_gender')) {
        gender = urlParams.get('sim_gender');
    }
    if (!gender || (gender !== 'f' && gender !== 'm')) {
        const s = (window.currentStudentData && window.currentStudentData.student) || {};
        const sName = s.name || '';
        const sCode = s.student_code || s.id || currentStudentId;
        const sExplicit = s.gender || s.parent_name;
        gender = guessStudentGender(sName, sExplicit, sCode);
    }

    const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                     (window.currentSessionUser && window.currentSessionUser.role) || 
                     urlParams.get('role');
    const isAdminOrSupervisor = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor') || urlParams.has('all_cohorts'));

    let matchedKey = null;
    if (gender === 'f') {
        matchedKey = 'girls_10_and_up';
    } else {
        matchedKey = 'boys_under_10';
    }

    const cfg = WEDNESDAY_TAFSIR_CONFIG[matchedKey];
    const isTargetGirl = (gender === 'f' && age >= 10);
    const isTargetBoy = (gender === 'm' && age < 10);
    const isEligible = isTargetGirl || isTargetBoy || isAdminOrSupervisor;

    return {
        isEligible: isEligible,
        isVisible: true,
        isWithinWindow: true, // Link is always open as requested
        isEnded: false,
        cohortKey: matchedKey,
        cfg: cfg,
        zoomUrl: cfg.url,
        label: cfg.label,
        timeLabel: cfg.timeLabel
    };
}

// ═════════════════════════════════════════════════════════════════════
// Monday Hadith Council Live Config (مجلس الحديث الشريف - الإثنين)
// ═════════════════════════════════════════════════════════════════════
const MONDAY_HADITH_CONFIG = {
    girls_under_10: {
        url: "https://zoom.us/j/98264506630",
        label: "بنات أقل من 10 سنوات",
        timeLabel: "الإثنين 6:30 م - 7:25 م (تفتح 6:20 م)",
        openMins: 1100,  // 18:20 (6:20 PM)
        startMins: 1110, // 18:30 (6:30 PM)
        endMins: 1165,   // 19:25 (7:25 PM)
        platform: "Zoom"
    },
    girls_10_and_up: {
        url: "https://zoom.us/j/99924246069",
        label: "بنات 10 سنوات وأكبر",
        timeLabel: "الإثنين 7:30 م - 8:30 م (تفتح 7:20 م)",
        openMins: 1160,  // 19:20 (7:20 PM)
        startMins: 1170, // 19:30 (7:30 PM)
        endMins: 1230,   // 20:30 (8:30 PM)
        platform: "Zoom"
    },
    boys_under_10: {
        url: "https://meet.google.com/che-nnub-mxf",
        label: "أولاد أقل من 10 سنوات",
        timeLabel: "الإثنين 7:30 م - 8:30 م (تفتح 7:20 م)",
        openMins: 1160,  // 19:20 (7:20 PM)
        startMins: 1170, // 19:30 (7:30 PM)
        endMins: 1230,   // 20:30 (8:30 PM)
        platform: "Google Meet"
    },
    boys_10_and_up: {
        url: "https://zoom.us/j/98264506630",
        label: "أولاد 10 سنوات وأكبر",
        timeLabel: "الإثنين 7:30 م - 8:30 م (تفتح 7:20 م)",
        openMins: 1160,  // 19:20 (7:20 PM)
        startMins: 1170, // 19:30 (7:30 PM)
        endMins: 1230,   // 20:30 (8:30 PM)
        platform: "Zoom"
    }
};

const STUDENT_GENDER_OVERRIDES = {
    'ST1088': 'f',
    '1088': 'f'
};

function guessStudentGender(name, explicitGender, studentCode) {
    const sObj = (window.currentStudentData && window.currentStudentData.student) || {};
    const effectiveCode = studentCode || sObj.student_code || sObj.id || (typeof currentStudentId !== 'undefined' ? currentStudentId : '');
    const effectiveName = name || sObj.name || '';
    const effectiveExplicit = explicitGender || sObj.gender || sObj.parent_name || '';

    // 1. Check central verified registry first (master: العمر.xlsx)
    if (typeof window.getStudentGender === 'function') {
        const resolved = window.getStudentGender(effectiveCode, effectiveName, effectiveExplicit);
        if (resolved) return resolved;
    }

    // 2. Check student code override
    const code = String(effectiveCode).trim().toUpperCase();
    if (code) {
        if (STUDENT_GENDER_OVERRIDES[code] || STUDENT_GENDER_OVERRIDES[code.replace(/\D/g, '')]) {
            return STUDENT_GENDER_OVERRIDES[code] || STUDENT_GENDER_OVERRIDES[code.replace(/\D/g, '')];
        }
        try {
            const stored = JSON.parse(localStorage.getItem('monir_students_gender_overrides') || '{}');
            if (stored[code]) return stored[code];
            if (stored[code.replace(/\D/g, '')]) return stored[code.replace(/\D/g, '')];
        } catch(e) {}
    }

    // 3. Check explicit gender or parent_name keyword
    if (effectiveExplicit) {
        const g = String(effectiveExplicit).toLowerCase().trim();
        if (g === 'f' || g === 'female' || g === 'بنت' || g === 'أنثى' || g === 'انثى' || g.includes('female') || g.includes('أنثى') || g.includes('بنت')) return 'f';
        if (g === 'm' || g === 'male' || g === 'ولد' || g === 'ذكر' || g.includes('male') || g.includes('ذكر') || g.includes('ولد')) return 'm';
    }

    if (!effectiveName) return 'm';
    const trimmed = effectiveName.trim();
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] || '';

    // Exception: common male Arabic names ending with Ta Marbuta
    const maleNamesWithTa = ['حمزة', 'أسامة', 'طلحة', 'قتادة', 'عبيدة', 'معاوية', 'عكرمة', 'حذيفة', 'عتبة', 'قتيبة', 'سلامة', 'جمعة', 'عطية', 'عرفة', 'شحاتة'];
    if (maleNamesWithTa.includes(firstName)) return 'm';

    const femaleNames = [
        'مريم', 'فاطمة', 'عائشة', 'خديجة', 'زينب', 'سارة', 'نور', 'هدى', 'آلاء', 'دنيا', 'تسنيم',
        'ياسمين', 'سهيلة', 'أميرة', 'منة', 'حبيبة', 'جنى', 'ملك', 'روان', 'رودينا', 'فريدة',
        'كارما', 'ليان', 'ريماس', 'سدرة', 'تالية', 'ريتاج', 'جود', 'حلا', 'ريناد', 'مايا',
        'ندى', 'شهد', 'مروة', 'آية', 'إسراء', 'شيماء', 'إيمان', 'أسماء', 'سلمى', 'هند', 'لين', 'دارين',
        'ريمان', 'رغد', 'رهف', 'لينا', 'تيا', 'تاليا', 'صبا', 'لمى', 'ميرال', 'وتين', 'بسملة', 'بسنت'
    ];
    if (femaleNames.includes(firstName)) return 'f';
    if (firstName.endsWith('ة') || firstName.endsWith('اء') || firstName.endsWith('ى')) return 'f';
    return 'm';
}

function updateGenderBadgeUI(gender) {
    const labelEl = document.getElementById('studentGenderLabel');
    if (!labelEl) return;
    if (gender === 'f') {
        labelEl.innerText = 'طالبة (بنت)';
        labelEl.className = 'inline-block bg-pink-50 border border-pink-200 text-pink-800 text-[10px] font-black px-2 py-0.5 rounded-md';
    } else {
        labelEl.innerText = 'طالب (ولد)';
        labelEl.className = 'inline-block bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-md';
    }
}

async function toggleStudentGenderFromPortal() {
    const s = (window.currentStudentData && window.currentStudentData.student) || {};
    const code = String(s.student_code || s.id || (typeof currentStudentId !== 'undefined' ? currentStudentId : '') || 'ST1088').trim().toUpperCase();
    const currentGender = guessStudentGender(s.name, s.gender || s.parent_name, code);
    const newGender = (currentGender === 'f') ? 'm' : 'f';

    // 1. Update in-memory
    STUDENT_GENDER_OVERRIDES[code] = newGender;
    if (window.STUDENT_GENDER_MAP) {
        window.STUDENT_GENDER_MAP[code] = newGender;
        const digits = code.replace(/\D/g, '');
        if (digits) window.STUDENT_GENDER_MAP[digits] = newGender;
    }
    if (s) {
        s.gender = newGender;
        s.parent_name = (newGender === 'f') ? 'female' : 'male';
    }

    // 2. Persist to localStorage
    try {
        const stored = JSON.parse(localStorage.getItem('monir_students_gender_overrides') || '{}');
        stored[code] = newGender;
        localStorage.setItem('monir_students_gender_overrides', JSON.stringify(stored));
    } catch(e) {}

    // 3. Persist to Supabase if available
    if (window.MonirDB && window.MonirDB.isConfigured()) {
        try {
            const client = window.MonirDB.getClient();
            const sid = s.id || null;
            if (sid) {
                await client.from('students').update({ parent_name: (newGender === 'f' ? 'female' : 'male') }).eq('id', sid);
            } else if (code) {
                await client.from('students').update({ parent_name: (newGender === 'f' ? 'female' : 'male') }).eq('student_code', code);
            }
        } catch(e) {
            console.warn('[Supabase Gender Update Error]:', e);
        }
    }

    // 4. Update UI
    updateGenderBadgeUI(newGender);
    if (typeof syncZoomLiveStatusAll === 'function') {
        syncZoomLiveStatusAll();
    }

    // Toast feedback
    const label = (newGender === 'f') ? 'طالبة (بنت)' : 'طالب (ولد)';
    if (window.MonirPopup && window.MonirPopup.toast) {
        window.MonirPopup.toast(`تم تغيير تصنيف الطالب إلى ${label} بنجاح!`, 'success');
    } else {
        alert(`تم تغيير تصنيف الطالب إلى ${label} بنجاح!`);
    }
}
window.toggleStudentGenderFromPortal = toggleStudentGenderFromPortal;
window.updateGenderBadgeUI = updateGenderBadgeUI;

function getMondayHadithStatus(studentAge, studentGender) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sim_age')) {
        studentAge = parseInt(urlParams.get('sim_age'), 10);
    }
    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;

    let gender = studentGender;
    if (urlParams.has('sim_gender')) {
        gender = urlParams.get('sim_gender');
    }
    if (!gender || (gender !== 'f' && gender !== 'm')) {
        const s = (window.currentStudentData && window.currentStudentData.student) || {};
        const sName = s.name || '';
        const sCode = s.student_code || s.id || currentStudentId;
        const sExplicit = s.gender || s.parent_name;
        gender = guessStudentGender(sName, sExplicit, sCode);
    }

    let cohortKey = 'boys_10_and_up';
    if (gender === 'f') {
        cohortKey = (age < 10) ? 'girls_under_10' : 'girls_10_and_up';
    } else {
        cohortKey = (age < 10) ? 'boys_under_10' : 'boys_10_and_up';
    }

    const cfg = MONDAY_HADITH_CONFIG[cohortKey];

    // Testing simulation flags
    if (urlParams.has('test_hadith') || urlParams.has('sim_hadith') || urlParams.get('force_live') === 'hadith') {
        return {
            isEligible: true,
            isVisible: true,
            isWithinWindow: true,
            zoomUrl: cfg.url,
            label: cfg.label,
            timeLabel: cfg.timeLabel,
            cfg: cfg
        };
    }

    const timeInfo = getCairoTimeInfo();
    const day = timeInfo.dayOfWeek;
    const cairoMins = timeInfo.totalMinutes;
    const localMins = (timeInfo.localTotalMinutes !== undefined) ? timeInfo.localTotalMinutes : cairoMins;

    // Day 1 = Monday
    const isMonday = (day === 1);
    const inWindowCairo = isMonday && (cairoMins >= cfg.openMins && cairoMins <= cfg.endMins);
    const inWindowLocal = isMonday && (localMins >= cfg.openMins && localMins <= cfg.endMins);
    const isWithinWindow = inWindowCairo || inWindowLocal;

    return {
        isEligible: true,
        isVisible: true,
        isWithinWindow: isWithinWindow,
        zoomUrl: cfg.url,
        label: cfg.label,
        timeLabel: cfg.timeLabel,
        cfg: cfg
    };
}

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

    if (urlParams.has('test_friday') || urlParams.has('sim_friday') || urlParams.has('test_zoom') || (isAdminOrTeacher && urlParams.get('force_live') === '1') || urlParams.get('force_live') === 'friday') {
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
    const isFriday = (timeInfo.dayOfWeek === 5);
    const cairoMins = timeInfo.totalMinutes;
    const localMins = (timeInfo.localTotalMinutes !== undefined) ? timeInfo.localTotalMinutes : cairoMins;

    // Strictly enforce age-based schedule ONLY on Friday (Day 5):
    // Kids (<10): 1:50 PM (830) to 2:25 PM (865)
    // Older (>=10): 2:20 PM (860) to 2:50 PM (890)
    function isMinsInWindow(m) {
        if (isKid) {
            return (m >= ZOOM_CONFIG.kids.startMins && m <= ZOOM_CONFIG.kids.endMins);
        } else {
            return (m >= ZOOM_CONFIG.adults.startMins && m <= ZOOM_CONFIG.adults.endMins);
        }
    }

    const isWithinWindow = isFriday && (isMinsInWindow(cairoMins) || isMinsInWindow(localMins));

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
            <div class="bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-not-allowed">
                <div>
                    <span class="block text-[11px] text-slate-700 font-black">مقفول — يفتح الجمعة (${timeLabel})</span>
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

    // Show ONLY the matching slot for the student (Kids vs Adults)
    if (age < 10) {
        slotKids.classList.remove('hidden');
        slotAdults.classList.add('hidden');
    } else {
        slotKids.classList.add('hidden');
        slotAdults.classList.remove('hidden');
    }
}

function updateMondayHadithNoticeByStudent(studentAge, studentGender) {
    const slotG1 = document.getElementById('hadithSlotGirlsUnder10');
    const slotG2 = document.getElementById('hadithSlotGirls10AndUp');
    const slotB1 = document.getElementById('hadithSlotBoysUnder10');
    const slotB2 = document.getElementById('hadithSlotBoys10AndUp');

    if (!slotG1 || !slotG2 || !slotB1 || !slotB2) return;

    const urlParams = new URLSearchParams(window.location.search);
    const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                     (window.currentSessionUser && window.currentSessionUser.role) || 
                     urlParams.get('role');
    const isAdminOrTeacher = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor') || urlParams.has('all_cohorts'));

    if (isAdminOrTeacher) {
        slotG1.classList.remove('hidden');
        slotG2.classList.remove('hidden');
        slotB1.classList.remove('hidden');
        slotB2.classList.remove('hidden');
        return;
    }

    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;
    let gender = studentGender;
    if (!gender || (gender !== 'f' && gender !== 'm')) {
        const s = (window.currentStudentData && window.currentStudentData.student) || {};
        const sName = s.name || '';
        const sExplicit = s.gender || s.parent_name || '';
        const sCode = s.student_code || s.id || currentStudentId;
        gender = guessStudentGender(sName, sExplicit, sCode);
    }

    // Hide all cohorts first
    slotG1.classList.add('hidden');
    slotG2.classList.add('hidden');
    slotB1.classList.add('hidden');
    slotB2.classList.add('hidden');

    // Show ONLY the single cohort dedicated to this student
    if (gender === 'f') {
        if (age < 10) {
            slotG1.classList.remove('hidden');
        } else {
            slotG2.classList.remove('hidden');
        }
    } else {
        if (age < 10) {
            slotB1.classList.remove('hidden');
        } else {
            slotB2.classList.remove('hidden');
        }
    }
}

function updateWednesdayTafsirNoticeByStudent(studentAge, studentGender) {
    const slotG = document.getElementById('wednesdaySlotGirls10AndUp');
    const slotB = document.getElementById('wednesdaySlotBoysUnder10');
    const notTargeted = document.getElementById('wednesdaySlotNotTargeted');
    const badgeG = document.getElementById('wednesdayTargetBadgeGirls');
    const badgeB = document.getElementById('wednesdayTargetBadgeBoys');

    if (!slotG || !slotB) return;

    const urlParams = new URLSearchParams(window.location.search);
    const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                     (window.currentSessionUser && window.currentSessionUser.role) || 
                     urlParams.get('role');
    const isAdminOrTeacher = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor') || urlParams.has('all_cohorts'));

    if (isAdminOrTeacher) {
        slotG.classList.remove('hidden');
        slotB.classList.remove('hidden');
        if (badgeG) badgeG.classList.remove('hidden');
        if (badgeB) badgeB.classList.remove('hidden');
        if (notTargeted) notTargeted.classList.add('hidden');
        return;
    }

    const age = (studentAge !== undefined && studentAge !== null && !isNaN(studentAge)) ? parseInt(studentAge, 10) : 9;
    let gender = studentGender;
    if (!gender || (gender !== 'f' && gender !== 'm')) {
        const s = (window.currentStudentData && window.currentStudentData.student) || {};
        const sName = s.name || '';
        const sExplicit = s.gender || s.parent_name || '';
        const sCode = s.student_code || s.id || currentStudentId;
        gender = guessStudentGender(sName, sExplicit, sCode);
    }

    // Hide both slots initially
    slotG.classList.add('hidden');
    slotB.classList.add('hidden');
    if (badgeG) badgeG.classList.add('hidden');
    if (badgeB) badgeB.classList.add('hidden');
    if (notTargeted) notTargeted.classList.add('hidden');

    // Girls NEVER see Boys, and Boys NEVER see Girls!
    if (gender === 'f') {
        if (age >= 10) {
            slotG.classList.remove('hidden');
            slotG.classList.add('ring-2', 'ring-pink-500', 'bg-pink-50/60');
            if (badgeG) badgeG.classList.remove('hidden');
        } else {
            if (notTargeted) {
                notTargeted.classList.remove('hidden');
                notTargeted.innerText = 'هذه الحلقة مخصصة لفئة البنات (10 سنوات فما فوق). موعد حلقتكِ كان أمس الثلاثاء.';
            }
        }
    } else {
        if (age < 10) {
            slotB.classList.remove('hidden');
            slotB.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/60');
            if (badgeB) badgeB.classList.remove('hidden');
        } else {
            if (notTargeted) {
                notTargeted.classList.remove('hidden');
                notTargeted.innerText = 'هذه الحلقة مخصصة لفئة الأولاد (أقل من 10 سنوات). موعد فئتك في جدول المسابقة.';
            }
        }
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

    const s = (window.currentStudentData && window.currentStudentData.student) || {};
    const sName = s.name || '';
    const sExplicitGender = s.gender || s.parent_name || '';
    const sCode = s.student_code || s.id || currentStudentId;
    let sGender = guessStudentGender(sName, sExplicitGender, sCode);
    if (urlParams.has('sim_gender')) {
        sGender = urlParams.get('sim_gender');
    }

    const timeInfo = getCairoTimeInfo();

    // 1. Filter Friday, Monday, and Wednesday notices strictly for the student's cohort
    updateFridayScheduleNoticeByAge(studentAge);
    updateMondayHadithNoticeByStudent(studentAge, sGender);
    updateWednesdayTafsirNoticeByStudent(studentAge, sGender);
    if (typeof updateGenderBadgeUI === 'function') { updateGenderBadgeUI(sGender); }

    const isKid = (studentAge < 10);
    const cfg = isKid ? ZOOM_CONFIG.kids : ZOOM_CONFIG.adults;
    const zoomUrl = cfg.url;
    const status = getZoomLiveLinkStatus(zoomUrl, studentAge);

    // 1.1 Friday Header Live Badge
    const fridayBadge = document.getElementById('fridayLiveBadgeSlot');
    if (fridayBadge) {
        if (status.isWithinWindow) {
            fridayBadge.innerHTML = `
                <a href="${zoomUrl}" target="_blank" rel="noopener noreferrer" class="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center w-full sm:w-auto">
                    <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>دخول البث المباشر (${isKid ? 'الأطفال' : 'الطلاب'})</span>
                </a>
            `;
        } else {
            fridayBadge.innerHTML = `
                <span class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg block text-center whitespace-nowrap shadow-2xs">
                    مقفول — يفتح الجمعة ${isKid ? '1:50 م' : '2:20 م'}
                </span>
            `;
        }
    }

    // 1.2 Friday Cohort Slot Action Buttons
    const slotKidsAction = document.getElementById('slotNoticeKidsAction');
    const slotAdultsAction = document.getElementById('slotNoticeAdultsAction');

    if (slotKidsAction) {
        if (isKid && status.isWithinWindow) {
            slotKidsAction.innerHTML = `
                <a href="${ZOOM_CONFIG.kids.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center">
                    <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>دخول البث المباشر (Zoom)</span>
                </a>
            `;
        } else {
            slotKidsAction.innerHTML = `
                <span class="w-full sm:w-auto bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl block text-center whitespace-nowrap cursor-not-allowed">
                    مقفول — يفتح الجمعة 1:50 م
                </span>
            `;
        }
    }

    if (slotAdultsAction) {
        if (!isKid && status.isWithinWindow) {
            slotAdultsAction.innerHTML = `
                <a href="${ZOOM_CONFIG.adults.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center">
                    <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>دخول البث المباشر (Zoom)</span>
                </a>
            `;
        } else {
            slotAdultsAction.innerHTML = `
                <span class="w-full sm:w-auto bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl block text-center whitespace-nowrap cursor-not-allowed">
                    مقفول — يفتح الجمعة 2:20 م
                </span>
            `;
        }
    }

    // 2. Sunday Tafsir Lecture Notice & Action Handling (الأحد - فئة 10 سنوات فما فوق فقط)
    const sundayCard = document.getElementById('sundayTafsirNoticeCard');
    const sundayAction = document.getElementById('sundayTafsirActionContainer');
    const sundaySlot = document.getElementById('sundayTafsirActionSlot');
    const sundayStatus = getSundayTafsirStatus(studentAge);

    if (sundayCard) {
        if (studentAge >= 10) {
            sundayCard.classList.remove('hidden');
            if (sundayAction) {
                if (sundayStatus.isWithinWindow) {
                    sundayAction.innerHTML = `
                        <a href="${SUNDAY_TAFSIR_CONFIG.url}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center w-full sm:w-auto">
                            <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                            <span>انضم لمحاضرة التفسير الآن (Zoom)</span>
                        </a>
                    `;
                } else {
                    sundayAction.innerHTML = `
                        <span class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg block text-center whitespace-nowrap shadow-2xs">
                            مقفول — يفتح الأحد 7:50 م
                        </span>
                    `;
                }
            }
            if (sundaySlot) {
                if (sundayStatus.isWithinWindow) {
                    sundaySlot.innerHTML = `
                        <a href="${SUNDAY_TAFSIR_CONFIG.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center">
                            <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                            <span>دخول المحاضرة الآن (Zoom)</span>
                        </a>
                    `;
                } else {
                    sundaySlot.innerHTML = `
                        <span class="w-full sm:w-auto bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl block text-center whitespace-nowrap cursor-not-allowed">
                            مقفول — يفتح الأحد 7:50 م
                        </span>
                    `;
                }
            }
        } else {
            sundayCard.classList.add('hidden');
        }
    }

    // 2.1 Tuesday Girls Tafsir Lecture (جلسة التفسير والتدبر للبنات أقل من 10 سنوات - الثلاثاء)
    const tuesdayCard = document.getElementById('tuesdayGirlsTafsirNoticeCard');
    const tuesdayAction = document.getElementById('tuesdayGirlsTafsirActionContainer');
    const tuesdaySlot = document.getElementById('tuesdayGirlsTafsirActionSlot');
    const tuesdayStatus = getTuesdayGirlsTafsirStatus(studentAge, sGender);

    if (tuesdayCard) {
        if (tuesdayStatus.isVisible) {
            tuesdayCard.classList.remove('hidden');
            if (tuesdayStatus.isWithinWindow) {
                const activeBtnHtml = `
                    <a href="${TUESDAY_GIRLS_TAFSIR_CONFIG.url}" target="_blank" rel="noopener noreferrer" class="bg-pink-600 hover:bg-pink-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center w-full sm:w-auto">
                        <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                        <span>دخول الحلقة 2 الآن (Zoom)</span>
                    </a>
                `;
                if (tuesdayAction) tuesdayAction.innerHTML = activeBtnHtml;
                if (tuesdaySlot) tuesdaySlot.innerHTML = activeBtnHtml;
            } else if (tuesdayStatus.isEnded) {
                const endedHtml = `
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg block text-center whitespace-nowrap">
                        انتهت جلسة اليوم
                    </span>
                `;
                if (tuesdayAction) tuesdayAction.innerHTML = endedHtml;
                if (tuesdaySlot) tuesdaySlot.innerHTML = endedHtml;
            } else {
                const dayPrefix = (timeInfo.dayOfWeek === 2) ? 'اليوم ' : 'الثلاثاء ';
                const lockedHtml = `
                    <span class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg block text-center whitespace-nowrap">
                        مقفول — يفتح ${dayPrefix}8:20 م
                    </span>
                `;
                if (tuesdayAction) tuesdayAction.innerHTML = lockedHtml;
                if (tuesdaySlot) tuesdaySlot.innerHTML = lockedHtml;
            }
        } else {
            tuesdayCard.classList.add('hidden');
        }
    }

    // 2.2 Wednesday Tafsir Lecture Notice & Action Handling (جلسة التفسير والتدبر - الأربعاء)
    const wednesdayCard = document.getElementById('wednesdayTafsirNoticeCard');
    const wednesdayAction = document.getElementById('wednesdayTafsirActionContainer');
    const wednesdayActionGirls = document.getElementById('wednesdayActionSlotGirls10AndUp');
    const wednesdayActionBoys = document.getElementById('wednesdayActionSlotBoysUnder10');
    const wednesdayBadgeGirls = document.getElementById('wednesdayTargetBadgeGirls');
    const wednesdayBadgeBoys = document.getElementById('wednesdayTargetBadgeBoys');
    const wednesdaySlotGirls = document.getElementById('wednesdaySlotGirls10AndUp');
    const wednesdaySlotBoys = document.getElementById('wednesdaySlotBoysUnder10');

    const wednesdayStatus = getWednesdayTafsirStatus(studentAge, sGender);
    const isTargetGirl = (sGender === 'f' && studentAge >= 10);
    const isTargetBoy = (sGender === 'm' && studentAge < 10);

    if (wednesdayCard) {
        // Active Zoom button for Girls (always open)
        if (wednesdayActionGirls) {
            wednesdayActionGirls.innerHTML = `
                <a href="${WEDNESDAY_TAFSIR_CONFIG.girls_10_and_up.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 text-center">
                    <span>دخول حلقة البنات الآن (Zoom)</span>
                </a>
            `;
        }

        // Active Zoom button for Boys (always open)
        if (wednesdayActionBoys) {
            wednesdayActionBoys.innerHTML = `
                <a href="${WEDNESDAY_TAFSIR_CONFIG.boys_under_10.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 text-center">
                    <span>دخول حلقة الأولاد الآن (Zoom)</span>
                </a>
            `;
        }

        // Header Action for Wednesday card (always active link for the student's cohort)
        if (wednesdayAction) {
            const isGirl = (sGender === 'f');
            const targetUrl = (isGirl && studentAge >= 10) ? WEDNESDAY_TAFSIR_CONFIG.girls_10_and_up.url : WEDNESDAY_TAFSIR_CONFIG.boys_under_10.url;
            const targetLabel = (isGirl && studentAge >= 10) ? 'دخول حلقة البنات (Zoom)' : ((!isGirl && studentAge < 10) ? 'دخول حلقة الأولاد (Zoom)' : 'دخول حلقة التفسير (Zoom)');
            wednesdayAction.innerHTML = `
                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 text-center w-full sm:w-auto">
                    <span>${targetLabel}</span>
                </a>
            `;
        }
    }

    // 3. Monday Hadith Lecture Notice & Action Handling (مجلس الحديث - الإثنين)
    const hadithCard = document.getElementById('mondayHadithNoticeCard');
    const hadithAction = document.getElementById('mondayHadithActionContainer');
    const hadithStatus = getMondayHadithStatus(studentAge, sGender);

    if (hadithCard) {
        hadithCard.classList.remove('hidden');
        const openTimeLabel = (hadithStatus && hadithStatus.cfg && hadithStatus.cfg.openMins === 1100) ? '6:20 م' : '7:20 م';
        const dayPrefix = (timeInfo.dayOfWeek === 1) ? 'اليوم ' : 'الإثنين ';

        if (hadithAction && hadithStatus) {
            if (hadithStatus.isWithinWindow) {
                hadithAction.innerHTML = `
                    <a href="${hadithStatus.zoomUrl}" target="_blank" rel="noopener noreferrer" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center w-full sm:w-auto">
                        <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                        <span>دخول المجلس الآن (${hadithStatus.label})</span>
                    </a>
                `;
            } else {
                hadithAction.innerHTML = `
                    <span class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg block text-center whitespace-nowrap shadow-2xs">
                        مقفول — يفتح ${dayPrefix}${openTimeLabel}
                    </span>
                `;
            }
        }

        // Cohort slots
        const cohortActions = [
            { id: 'hadithActionSlotGirlsUnder10', key: 'girls_under_10', time: '6:20 م' },
            { id: 'hadithActionSlotGirls10AndUp', key: 'girls_10_and_up', time: '7:20 م' },
            { id: 'hadithActionSlotBoysUnder10', key: 'boys_under_10', time: '7:20 م' },
            { id: 'hadithActionSlotBoys10AndUp', key: 'boys_10_and_up', time: '7:20 م' }
        ];

        cohortActions.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;
            const cfg = MONDAY_HADITH_CONFIG[item.key];
            const userRole = (window.currentLoggedInUser && window.currentLoggedInUser.role) || 
                             (window.currentSessionUser && window.currentSessionUser.role) || 
                             urlParams.get('role');
            const isSupervisor = (userRole === 'admin' || userRole === 'teacher' || urlParams.has('supervisor') || urlParams.has('test') || urlParams.has('preview'));
            const isThisCohortActive = (hadithStatus && hadithStatus.isWithinWindow && (hadithStatus.cfg === cfg || (urlParams.has('all_cohorts') || urlParams.has('supervisor'))));

            if (isThisCohortActive || isSupervisor) {
                el.innerHTML = `
                    <a href="${cfg.url}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition flex items-center justify-center gap-1.5 animate-pulse text-center">
                        <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                        <span>دخول المجلس الآن (${cfg.platform})</span>
                    </a>
                `;
            } else {
                el.innerHTML = `
                    <span class="w-full sm:w-auto bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl block text-center whitespace-nowrap cursor-not-allowed">
                        مقفول — يفتح ${dayPrefix}${item.time}
                    </span>
                `;
            }
        });
    }

    // 4. Top Real-time Zoom Live Notification Banner
    const banner = document.getElementById('liveZoomBroadcastBanner');
    const titleEl = document.getElementById('liveZoomBannerTitle');
    const subEl = document.getElementById('liveZoomBannerSubtitle');
    const bannerLink = banner ? banner.querySelector('a') : null;

    if (banner) {
        if (wednesdayStatus && wednesdayStatus.isWithinWindow) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (bannerLink) bannerLink.href = wednesdayStatus.zoomUrl;
            const isGirls = (wednesdayStatus.cohortKey === 'girls_10_and_up' || (sGender === 'f' && studentAge >= 10));
            if (titleEl) {
                titleEl.innerText = isGirls 
                    ? 'جلسة التفسير والتدبر (الحلقة الثانية) متاحة الآن للبنات (10 سنوات فما فوق)!' 
                    : 'جلسة التفسير والتدبر (الحلقة الثانية) متاحة الآن للأولاد (أقل من 10 سنوات)!';
            }
            if (subEl) {
                subEl.innerText = '"ماذا يدخل أذني… وإلى أين يأخذ قلبي؟" • انضم الآن للقاعة عبر Zoom';
            }
        } else if (tuesdayStatus && tuesdayStatus.isWithinWindow && tuesdayStatus.isVisible) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (bannerLink) bannerLink.href = TUESDAY_GIRLS_TAFSIR_CONFIG.url;
            if (titleEl) {
                titleEl.innerText = 'جلسة التفسير والتدبر (الحلقة الثانية) متاحة الآن للبنات!';
            }
            if (subEl) {
                subEl.innerText = '"ماذا يدخل أذني… وإلى أين يأخذ قلبي؟" • انضمي الآن للقاعة مع المعلمة عبر Zoom';
            }
        } else if (hadithStatus && hadithStatus.isWithinWindow) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (bannerLink) bannerLink.href = hadithStatus.zoomUrl;
            if (titleEl) {
                titleEl.innerText = `مجلس الحديث الشريف المباشر (${hadithStatus.label}) متاح الآن!`;
            }
            if (subEl) {
                subEl.innerText = `حلقة الحديث النبوية بدأت الآن • انضم للقاعة مع المعلم والمشرفين عبر (${hadithStatus.cfg.platform})`;
            }
        } else if (sundayStatus && sundayStatus.isWithinWindow && studentAge >= 10) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (bannerLink) bannerLink.href = SUNDAY_TAFSIR_CONFIG.url;
            if (titleEl) {
                titleEl.innerText = 'محاضرة التفسير والتدبر (Zoom) مفتوحة ومتاحة الآن!';
            }
            if (subEl) {
                subEl.innerText = 'المحاضرة العامة المجانية للطلاب (10 سنوات فما فوق) بدأت الآن • انضم الآن للقاعة مجاناً دون خصم أي رصيد';
            }
        } else if (status.isWithinWindow) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            if (bannerLink) bannerLink.href = zoomUrl;
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

    // 4.1 Schedule Notices Dropdown Active Badge & Today's Indicator
    const schedBadge = document.getElementById('schedActiveBadge');
    const isLiveActive = (status && status.isWithinWindow) || 
                         (sundayStatus && sundayStatus.isWithinWindow && studentAge >= 10) || 
                         (hadithStatus && hadithStatus.isWithinWindow) ||
                         (tuesdayStatus && tuesdayStatus.isWithinWindow && tuesdayStatus.isVisible) ||
                         (wednesdayStatus && wednesdayStatus.isWithinWindow);
    if (schedBadge) {
        if (isLiveActive) {
            schedBadge.classList.remove('hidden');
            if (typeof toggleScheduleNoticesDropdown === 'function') {
                toggleScheduleNoticesDropdown(true);
            }
        } else {
            schedBadge.classList.add('hidden');
        }
    }

    const todayBadge = document.getElementById('todayLectureBadge');
    if (todayBadge) {
        const isTodayTarget = (timeInfo.dayOfWeek === 3 && (isTargetGirl || isTargetBoy)) ||
                              (timeInfo.dayOfWeek === 2 && tuesdayStatus && tuesdayStatus.isVisible) ||
                              (timeInfo.dayOfWeek === 1) ||
                              (timeInfo.dayOfWeek === 0 && studentAge >= 10) ||
                              (timeInfo.dayOfWeek === 5);
        if (isTodayTarget) {
            todayBadge.classList.remove('hidden');
        } else {
            todayBadge.classList.add('hidden');
        }
    }

    // 5. Refresh General Track Card
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
    let matchingQuizzes = (cachedGeneralQuizzes || []).filter(q => {
        const meta = parseQuizMeta(q);
        if (meta.track) return meta.track === currentGeneralTrack;
        if (currentGeneralTrack === 'tajweed') return q.title && q.title.includes('تجويد');
        if (currentGeneralTrack === 'tafsir') return q.title && q.title.includes('تفسير');
        if (currentGeneralTrack === 'hadith') return q.title && q.title.includes('حديث');
        return false;
    });

    // High quality built-in fallback so the card is never blank or stuck on loading
    let quiz;
    if (matchingQuizzes.length > 0) {
        quiz = matchingQuizzes[0];
    } else {
        if (currentGeneralTrack === 'hadith') {
            quiz = {
                id: 104,
                title: "مجلس الحديث — الحلقة الثانية: «لو محدش شايفك… من ستكون؟»",
                course: "الحديث الشريف والسنة النبوية",
                block: 2,
                total_points: 15,
                description: JSON.stringify({
                    track: "hadith",
                    week_number: 2,
                    summary_text: "مجلس الحديث النبوي الشريف — الحلقة الثانية بعنوان: «لو محدش شايفك… من ستكون؟» في مدارسة أحاديث المراقبة والإخلاص وتزكية النفس.",
                    records_unlocked: false
                })
            };
        } else if (currentGeneralTrack === 'tafsir') {
            quiz = {
                id: 102,
                title: "مسار التفسير والتدبر — الحلقة الثانية: «ماذا يدخل أذني… وإلى أين يأخذ قلبي؟»",
                course: "التفسير والتدبر",
                block: 2,
                total_points: 15,
                description: JSON.stringify({
                    track: "tafsir",
                    week_number: 2,
                    summary_text: "مسار التفسير والتدبر — الحلقة الثانية: «ماذا يدخل أذني… وإلى أين يأخذ قلبي؟» في تدبر آيات القرآن وتزكية السمع والقلب.",
                    records_unlocked: false
                })
            };
        } else {
            quiz = {
                id: 101,
                title: "محاضرة التجويد ومخارج الحروف — الأسبوع الثاني",
                course: "أحكام التجويد",
                block: 2,
                total_points: 15,
                description: JSON.stringify({
                    track: "tajweed",
                    week_number: 2,
                    summary_text: "محاضرة التجويد الأسبوعية يوم الجمعة مع تطبيق عملي للأحكام.",
                    records_unlocked: false
                })
            };
        }
    }

    const meta = parseQuizMeta(quiz);
    const sub = (cachedStudentSubmissions || []).find(s => s.quiz_id === quiz.id);

    const studentAge = (window.currentStudentAge !== undefined) ? window.currentStudentAge : 
                       ((window.currentStudentData && window.currentStudentData.student && window.currentStudentData.student.age) ? parseInt(window.currentStudentData.student.age) : 9);
    const s = (window.currentStudentData && window.currentStudentData.student) || {};
    const sName = s.name || '';
    const sCode = s.student_code || s.id || currentStudentId;
    const sExplicit = s.gender || s.parent_name || '';
    const sGender = guessStudentGender(sName, sExplicit, sCode);

    const zoomStatus = getZoomLiveLinkStatus(meta.live_url, studentAge);
    const sundayStatus = getSundayTafsirStatus(studentAge);
    const hadithStatus = getMondayHadithStatus(studentAge, sGender);
    const wednesdayStatus = (typeof getWednesdayTafsirStatus === 'function') ? getWednesdayTafsirStatus(studentAge, sGender) : null;

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
                <button onclick="openQuizModalForId(${quiz.id})" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition text-[11px] shrink-0 cursor-pointer">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Dynamic Live Button Header based on track
    let headerLiveActionHtml = '';
    if (currentGeneralTrack === 'hadith') {
        if (hadithStatus && hadithStatus.isWithinWindow) {
            headerLiveActionHtml = `
                <a href="${hadithStatus.zoomUrl}" target="_blank" rel="noopener noreferrer" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow flex items-center justify-center gap-1.5 animate-pulse">
                    <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>دخول المجلس الآن (${hadithStatus.label}) ↗</span>
                </a>
            `;
        } else {
            const openTimeLabel = (hadithStatus && hadithStatus.cfg && hadithStatus.cfg.openMins === 1100) ? '6:20 م' : '7:20 م';
            const dayPrefix = (timeInfo.dayOfWeek === 1) ? 'اليوم ' : 'الإثنين ';
            headerLiveActionHtml = `
                <span class="bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-not-allowed">
                    مقفول — يفتح ${dayPrefix}${openTimeLabel}
                </span>
            `;
        }
    } else if (currentGeneralTrack === 'tafsir') {
        const isBoyTarget = (sGender === 'm' && studentAge < 10);
        const isGirlTarget = (sGender === 'f' && studentAge >= 10);
        const tafsirUrl = (wednesdayStatus && wednesdayStatus.zoomUrl) ? wednesdayStatus.zoomUrl : (isBoyTarget ? WEDNESDAY_TAFSIR_CONFIG.boys_under_10.url : WEDNESDAY_TAFSIR_CONFIG.girls_10_and_up.url);
        const btnLabel = isBoyTarget ? 'دخول حلقة الأولاد (Zoom)' : (isGirlTarget ? 'دخول حلقة البنات (Zoom)' : 'دخول حلقة التفسير (Zoom)');
        headerLiveActionHtml = `
            <a href="${tafsirUrl}" target="_blank" rel="noopener noreferrer" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow flex items-center justify-center gap-1.5">
                <span>${btnLabel} ↗</span>
            </a>
        `;
    } else {
        headerLiveActionHtml = zoomStatus.html || '';
    }

    // Schedule Row based on track
    let scheduleRowHtml = '';
    if (currentGeneralTrack === 'hadith') {
        scheduleRowHtml = `
            <div class="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <span class="text-[10px] font-bold text-indigo-800 block">موعد مجلس الحديث لفئتك (${hadithStatus.label}):</span>
                    <strong class="text-indigo-950 font-black text-xs sm:text-sm">${hadithStatus.cfg.timeLabel}</strong>
                </div>
                <div class="text-[11px] font-bold text-indigo-700">
                    المنصة: <span class="font-extrabold underline">${hadithStatus.cfg.platform}</span>
                </div>
            </div>
        `;
    } else if (currentGeneralTrack === 'tafsir') {
        const isGirl10Plus = (sGender === 'f' && studentAge >= 10);
        const isBoyUnder10 = (sGender === 'm' && studentAge < 10);
        let wedText = isGirl10Plus 
            ? 'كل أربعاء الساعة 5:00 م (بنات 10 سنوات فما فوق)' 
            : (isBoyUnder10 ? 'كل أربعاء الساعة 6:30 م (أولاد أقل من 10 سنوات)' : 'الأربعاء (5:00 م للبنات 10+ | 6:30 م للأولاد < 10)');
        scheduleRowHtml = `
            <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <span class="text-[10px] font-bold text-emerald-800 block">موعد مسار التفسير والتدبر — الحلقة الثانية:</span>
                    <strong class="text-emerald-950 font-black text-xs sm:text-sm">${wedText}</strong>
                </div>
                <div class="text-[11px] font-bold text-emerald-700">
                    المنصة: <span class="font-extrabold underline">Zoom</span>
                </div>
            </div>
        `;
    } else {
        scheduleRowHtml = `
            <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                ${(studentAge < 10) ? `
                    <span class="text-[10px] font-bold text-slate-400 block">موعد فئة الأطفال (أقل من 10 سنوات):</span>
                    <strong class="text-slate-800 font-extrabold text-[11px]">الجمعة 1:50 م - 2:25 م</strong>
                ` : `
                    <span class="text-[10px] font-bold text-slate-400 block">موعد فئة الطلاب (10 سنوات فما فوق):</span>
                    <strong class="text-slate-800 font-extrabold text-[11px]">الجمعة 2:20 م - 2:50 م</strong>
                `}
            </div>
        `;
    }

    // Voice note lock text
    let voiceNoteLockText = 'موعد المحاضرة كل جمعة.. التسجيلات الصوتية (الريكوردات) مقفولة وتفتح فور انتهاء المحاضرة وإضافتها.';
    if (currentGeneralTrack === 'hadith') {
        voiceNoteLockText = 'موعد مجلس الحديث اليوم الإثنين.. التسجيلات الصوتية (الريكوردات) مقفولة حالياً وتفتح فور انتهاء المجلس وإضافتها بواسطة المشرفين.';
    } else if (currentGeneralTrack === 'tafsir') {
        voiceNoteLockText = 'موعد المحاضرة كل أحد.. التسجيلات الصوتية (الريكوردات) مقفولة وتفتح فور انتهاء المحاضرة وإضافتها.';
    }

    container.innerHTML = `
        <div class="bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <!-- Header Row -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-100/60 pb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[11px] font-black text-indigo-900 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">${trackBadge}</span>
                        <span class="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">الأسبوع ${meta.week_number || 2}</span>
                    </div>
                    <h4 class="text-sm sm:text-base font-black text-slate-900">${quiz.title}</h4>
                </div>
                ${headerLiveActionHtml}
            </div>

            <!-- Schedules Info -->
            <div class="text-xs">
                ${scheduleRowHtml}
            </div>

            <!-- Voice Summary & Player -->
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
                        ${voiceNoteLockText}
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
                ` : `
                    <button type="button" onclick="openQuizModalForId(${quiz.id})" class="bg-indigo-900 hover:bg-indigo-800 text-white font-black text-xs p-3.5 rounded-2xl transition shadow flex items-center justify-center gap-2 cursor-pointer">
                        <div class="text-right">
                            <div class="font-black text-white text-xs">بدء الاختبار الأسبوعي (15 درجة)</div>
                            <div class="text-[10px] text-indigo-200 font-normal">انقر للإجابة وحساب النقاط الفورية</div>
                        </div>
                    </button>
                `}
            </div>

            <!-- Existing Submission Status (if solved) -->
            ${submissionBadgeHtml}
        </div>
    `;
}

// ==========================================
// INTERACTIVE QUIZ MODAL CONTROLLER
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
                    ${sub ? 'إعادة الاختبار' : 'بدء الاختبار'}
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
                        ${isSelected ? '•' : ''}
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
            resIcon.innerHTML = isSuccess ? 'ناجح' : 'غير مجتاز';
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
// CUMULATIVE GRADEBOOK TRANSCRIPT MODAL
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
        { key: 'tajweed', title: 'مسار أحكام التجويد', icon: '' },
        { key: 'tafsir', title: 'مسار التفسير وتدبر القرآن', icon: '' },
        { key: 'hadith', title: 'مسار الحديث الشريف والسنة', icon: '' }
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
                            <strong class="text-emerald-700 font-black text-xs block mt-1">${w1Score} / 15</strong>
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
            rankEl.textContent = 'ممتاز مع مرتبة الشرف';
            rankEl.className = 'text-xs font-black text-amber-600 block mt-0.5';
        } else if (grandPercentage >= 75) {
            rankEl.textContent = 'جيد جداً مرتفع';
            rankEl.className = 'text-xs font-black text-emerald-600 block mt-0.5';
        } else if (grandPercentage > 0) {
            rankEl.textContent = 'جاري التحصيل';
            rankEl.className = 'text-xs font-black text-blue-600 block mt-0.5';
        } else {
            rankEl.textContent = 'في انتظار بدء الاختبارات';
            rankEl.className = 'text-xs font-bold text-slate-500 block mt-0.5';
        }
    }
}
