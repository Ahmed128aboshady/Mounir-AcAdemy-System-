let currentStudentId = 1;
let selectedCourseName = "";
let enrolledCoursesList = [];
let activeQuizId = null;
let activeQuizQuestions = [];

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
    currentStudentId = activeUser.student_id || activeUser.related_id || currentStudentId;
} else if (activeUser && (activeUser.role === 'admin' || activeUser.role === 'teacher')) {
    if (urlParams.has('id')) {
        currentStudentId = parseInt(urlParams.get('id')) || currentStudentId;
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
                authBtn.innerText = 'تسجيل الخروج (' + (u.full_name ? u.full_name.split(' ')[0] : u.username) + ')';
                authBtn.className = 'text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer';
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
    
    loadStudentProfile();
    loadNotifications();
    loadSupportTickets();
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

        // Fast immediate UI population from active session or URL ID
        const nameEl = document.getElementById('studentName');
        const codeEl = document.getElementById('studentCode');
        const qrImg = document.getElementById('studentQrImg');

        if (initialUser && viewerRole === 'student') {
            if (nameEl) nameEl.innerText = initialUser.full_name || initialUser.username;
            if (codeEl) codeEl.innerText = initialUser.username || ('ST' + String(currentStudentId).padStart(4, '0'));
            if (qrImg) qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(initialUser.username || ('ST' + String(currentStudentId).padStart(4, '0')));
        } else {
            const fallbackCode = 'ST' + String(currentStudentId).padStart(4, '0');
            if (nameEl && nameEl.innerText.includes('جاري')) nameEl.innerText = 'طالب الأكاديمية';
            if (codeEl && (codeEl.innerText === '---' || !codeEl.innerText)) codeEl.innerText = fallbackCode;
            if (qrImg) qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(fallbackCode);
        }

        let data = {};
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const sbData = await window.MonirDB.getStudentProfile(currentStudentId);
                if (sbData && sbData.student) {
                    data = sbData;
                }
            } catch(e) {
                console.warn('[Supabase Cloud Profile]: Fallback to API mock.', e);
            }
        }

        if (!data || !data.student) {
            const res = await fetch('/api/student/' + currentStudentId);
            data = await res.json();
        }
        
        const s = data.student || {};
        window.currentStudentData = data;

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

            document.getElementById('studentName').innerText = s.name || 'طالب الأكاديمية';
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 9) + ' سنوات';
            document.getElementById('studentCode').innerText = s.student_code || 'MNR-2026';
            document.getElementById('parentName').innerText = 'ولي أمر معتمد (محجوب)';
            const parentPhoneEl = document.getElementById('parentPhone');
            if (parentPhoneEl) parentPhoneEl.innerText = 'محجوب للخصوصية';
            document.getElementById('enrolledCoursesCount').innerText = (data.enrolled_courses_count || 1) + ' مسار تدريبي';
        } else if (viewerRole === 'admin') {
            // Admin sees EVERYTHING unmasked + supervisor badge
            let admBanner = document.getElementById('adminSupervisorBanner');
            if (!admBanner) {
                admBanner = document.createElement('div');
                admBanner.id = 'adminSupervisorBanner';
                admBanner.className = 'bg-slate-900 border border-amber-500/50 text-amber-300 p-3 rounded-2xl mb-5 shadow flex justify-between items-center text-xs font-bold';
                admBanner.innerHTML = `
                    <span>👑 وضع المشرف العام (إدارة كاملة): يحق لك فحص كافة بيانات الطالب وأولياء الأمور والمحاضرات والرسوم.</span>
                    <a href="admin.html" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl transition">العودة للوحة الإدارة</a>
                `;
                const mainEl = document.querySelector('main');
                if (mainEl) mainEl.insertBefore(admBanner, mainEl.firstChild);
            }

            document.getElementById('studentName').innerText = s.name || '';
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 9) + ' سنوات';
            document.getElementById('studentCode').innerText = s.student_code || 'MNR-2026';
            document.getElementById('parentName').innerText = s.parent_name || 'ولي أمر الطالب';
            const parentPhoneEl = document.getElementById('parentPhone');
            if (parentPhoneEl) parentPhoneEl.innerText = s.parent_phone || s.phone || '0100000000';
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

function checkAndRenderQuranWidget(courses) {
    const sec = document.getElementById('quranCreditSection');
    if (sec) sec.remove();
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
    let targetDay = 1;
    
    if (!dayName) dayName = 'الاثنين';
    if (dayName.includes('السبت')) targetDay = 6;
    else if (dayName.includes('الأحد') || dayName.includes('الاحد')) targetDay = 0;
    else if (dayName.includes('الاثنين') || dayName.includes('الإثنين') || dayName.includes('اتنين')) targetDay = 1;
    else if (dayName.includes('الثلاثاء')) targetDay = 2;
    else if (dayName.includes('الأربعاء') || dayName.includes('الاربعاء')) targetDay = 3;
    else if (dayName.includes('الخميس')) targetDay = 4;
    else if (dayName.includes('الجمعة') || dayName.includes('الجمعه')) targetDay = 5;

    let current = new Date(today);
    let daysUntilTarget = (targetDay - current.getDay() + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7;
    current.setDate(current.getDate() + daysUntilTarget);

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    for (let i = 0; i < count; i++) {
        const dFormatted = dayNames[current.getDay()] + ' ' + current.getDate() + ' ' + monthNames[current.getMonth()] + ' ' + current.getFullYear();
        dates.push({
            dateFormatted: dFormatted,
            shortDate: current.getDate() + '/' + (current.getMonth() + 1) + '/' + current.getFullYear()
        });
        current.setDate(current.getDate() + 7);
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
        // DYNAMIC BLOCK CALCULATION
        // Algorithm:
        //   remaining_credits = N
        //   Show N unlocked lectures + 1 locked lecture (next)
        //   Group into blocks of 4
        //   Example: N=15 → 4 blocks: [1-4][5-8][9-12][13-15, 16🔒]
        //   Example: N=3  → 1 block: [1-3, 4🔒]
        //   Example: N=4  → 2 blocks: [1-4][5🔒]
        // ════════════════════════════════════════════════
        const rc = remainingCredits;
        const totalToShow = rc + 1; // always show one locked lecture beyond unlocked
        const numBlocks = Math.ceil(totalToShow / 4);
        
        const durVal = currentCourseInfo.session_duration || '20';
        let durLabel = '20 دقيقة';
        const durNum = parseInt(durVal) || 20;
        durLabel = durNum + ' دقيقة';
        
        const subDays = currentCourseInfo.subscription_days || currentCourseInfo.days || 'الاثنين';
        const upcomingDates = calculateGroupUpcomingDates(subDays, totalToShow + 2);
        const timeText = currentCourseInfo.lecture_time || '8:00 مساءً';
        const meetUrl = (currentCourseInfo.google_meet_url || 'https://meet.google.com') ;

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
                is_unlocked: (num <= rc),
                status: 'scheduled',
                google_meet_url: meetUrl
            });
        }

        // Assign dates
        data.lectures.forEach((l, idx) => {
            l.lecture_number = l.lecture_number || (idx + 1);
            l.is_unlocked = (l.lecture_number <= rc);
            l.block_number = Math.ceil(l.lecture_number / 4);
            if (idx < upcomingDates.length) {
                l.scheduled_time = upcomingDates[idx].dateFormatted + ' • ' + timeText + ' (' + durLabel + ')';
            } else {
                l.scheduled_time = timeText + ' (' + durLabel + ')';
            }
            l.title = 'المحاضرة ' + l.lecture_number;
            l.google_meet_url = l.google_meet_url || meetUrl;
        });
        
        // Update the subtitle
        const subtitleEl = document.getElementById('selectedCourseSubtitle');
        if (subtitleEl) {
            subtitleEl.innerText = 'نظام البلوك الرباعي (رصيد متبقي: ' + rc + ' حصص • ' + numBlocks + ' مرحلة)';
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
                const card = renderLectureCard(l);
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
                    blockLectures.forEach(l => b1El.appendChild(renderLectureCard(l)));
                } else if (b2El) {
                    b2El.before(blockHeader);
                    blockLectures.forEach(l => b2El.appendChild(renderLectureCard(l)));
                }
            }
        }

    } catch (err) {
        console.error("Error loading course lectures:", err);
    }
}



function generateGoogleCalendarUrl(lecture) {
    const title = encodeURIComponent('محاضرة ' + lecture.lecture_number + ': ' + lecture.title + ' — أكاديمية منير');
    const details = encodeURIComponent('محاضرة مسار ' + selectedCourseName + '\nرابط Google Meet الموحد للمجموعة: ' + (lecture.google_meet_url || 'https://meet.google.com/mnr-g182-mon'));
    const location = encodeURIComponent(lecture.google_meet_url || 'https://meet.google.com/mnr-g182-mon');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&details=' + details + '&location=' + location;
}

function renderLectureCard(l) {
    const div = document.createElement('div');
    
    let statusBadge = '';
    let actionBtn = '';
    let cardClass = 'lecture-card';
    const calUrl = generateGoogleCalendarUrl(l);

    // Google Drive Links elements
    const recLink = l.drive_recording_url || l.google_drive_url || '';
    const matLink = l.drive_materials_url || '';
    const meetLink = l.google_meet_url || 'https://meet.google.com/mnr-g182-mon';

    const driveLinksBar = `
        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            ${meetLink ? `
                <button onclick="joinMeet(${l.id}, '${meetLink}')" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs shadow-sm transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <span>دخول البث المباشر (Google Meet)</span>
                </button>
            ` : ''}

            ${recLink ? `
                <a href="${recLink}" target="_blank" class="inline-flex items-center gap-1.5 bg-[#41519C] hover:bg-[#2D396E] text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>🎥 تسجيل الحصة (Drive)</span>
                </a>
            ` : `
                <span class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-400 font-medium px-2.5 py-1 rounded-xl text-[11px]">
                    <span>🎥 بانتظار رفع التسجيل</span>
                </span>
            `}

            ${matLink ? `
                <a href="${matLink}" target="_blank" class="inline-flex items-center gap-1.5 bg-[#57BA9E] hover:bg-[#43A68A] text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    <span>📁 ملازم وكشكول الحصة</span>
                </a>
            ` : `
                <span class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-400 font-medium px-2.5 py-1 rounded-xl text-[11px]">
                    <span>📁 بانتظار الملازم</span>
                </span>
            `}
        </div>
    `;
    
    if (!l.is_unlocked) {
        cardClass += ' locked';
        statusBadge = '<span class="badge-status badge-locked">مغلقة • تتطلب تجديد المرحلة</span>';
        actionBtn = `
            <button onclick="openPaymobModal()" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
                <span>تجديد الاشتراك واختيار الباقة لفتح المحاضرة</span>
            </button>
        `;
    } else {
        cardClass += ' unlocked';
        
        if (l.status === 'live') {
            cardClass += ' live-now';
            statusBadge = '<span class="badge-status badge-live">جارية الآن • Google Meet</span>';
            actionBtn = `
                <div class="space-y-2">
                    <button onclick="joinMeet(${l.id}, '${l.google_meet_url}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.01]">
                        <span>الانضمام الآن للمحاضرة عبر Google Meet (تسجيل حضور تلقائي)</span>
                    </button>
                    <a href="${calUrl}" target="_blank" class="block text-center text-xs font-bold text-blue-800 hover:underline">
                        إضافة المحاضرة إلى تقويم Google
                    </a>
                </div>
            `;
        } else if (l.status === 'completed') {
            const isPresent = (l.attendance && l.attendance.status === 'present');
            const attBadge = isPresent 
                ? '<span class="text-emerald-600 font-bold text-xs">تم تسجيل حضورك (' + (l.attendance.duration_minutes || 60) + ' دقيقة)</span>' 
                : '<span class="text-red-600 font-bold text-xs">لم يتم الحضور (غياب)</span>';
                
            statusBadge = '<span class="badge-status badge-completed">مكتملة</span>';
            actionBtn = `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div>${attBadge}</div>
                </div>
                ${driveLinksBar}
            `;
        } else if (l.status === 'postponed') {
            statusBadge = '<span class="badge-status badge-postponed">تم التأجيل لموعد جديد</span>';
            actionBtn = `
                <div class="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 flex justify-between items-center">
                    <div>
                        <strong>الموعد الجديد:</strong> ${l.rescheduled_to || l.scheduled_time} <br>
                        <span class="text-[11px] text-amber-700">السبب: ${l.postpone_reason || 'تنسيق المواعيد'} • لا يتم احتساب أي غياب.</span>
                    </div>
                    <a href="${calUrl}" target="_blank" class="bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                        تحديث التقويم
                    </a>
                </div>
            `;
        } else {
            statusBadge = '<span class="badge-status bg-blue-100 text-blue-800">مجدولة</span>';
            actionBtn = `
                <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span class="text-slate-600">موعد المحاضرة: <strong>${l.scheduled_time}</strong></span>
                    <a href="${calUrl}" target="_blank" class="text-blue-800 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        إضافة لتقويم Google
                    </a>
                </div>
                ${driveLinksBar}
            `;
        }
    }
    
    div.className = cardClass;
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2 gap-2">
            <div>
                <span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">حصة #${l.lecture_number}</span>
                <h4 class="font-extrabold text-sm text-slate-900 mt-1">${l.title}</h4>
                <p class="text-xs text-slate-500 mt-0.5">${l.description || ''}</p>
            </div>
            <div>${statusBadge}</div>
        </div>
        <div class="mt-3">
            ${actionBtn}
        </div>
    `;
    return div;
}

async function joinMeet(lectureId, meetUrl) {
    try {
        const res = await fetch('/api/lectures/' + lectureId + '/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: currentStudentId, duration_minutes: 60 })
        });
        const data = await res.json();
        
        alert("تم تسجيل حضورك الرسمي في المحاضرة بنجاح! سيتم نقلك الآن إلى غرفة Google Meet.");
        window.open(meetUrl, '_blank');
        
        loadStudentProfile();
    } catch (err) {
        console.error("Error joining meet:", err);
        window.open(meetUrl, '_blank');
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
async function loadNotifications() {
    try {
        const res = await fetch('/api/student/' + currentStudentId + '/notifications');
        const notifs = await res.json();
        
        const list = document.getElementById('notificationsList');
        list.innerHTML = '';
        
        if (notifs.length === 0) {
            list.innerHTML = '<p class="text-center text-xs text-slate-400 py-4">لا توجد إشعارات جديدة حالياً.</p>';
            return;
        }
        
        const postponeNotif = notifs.find(n => n.type === 'postpone' && n.is_read === 0);
        if (postponeNotif) {
            document.getElementById('topNotifTitle').innerText = postponeNotif.title;
            document.getElementById('topNotifMsg').innerText = postponeNotif.message;
            document.getElementById('topNotificationBanner').classList.remove('hidden');
        } else {
            document.getElementById('topNotificationBanner').classList.add('hidden');
        }
        
        notifs.forEach(n => {
            const div = document.createElement('div');
            div.className = 'p-3 rounded-xl border text-xs ' + (n.is_read ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-blue-50 border-blue-200 text-blue-950 font-bold');
            div.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-extrabold">${n.title}</span>
                    <span class="text-[10px] text-slate-400">${n.created_at.slice(0, 10)}</span>
                </div>
                <p class="font-normal text-[11px] leading-relaxed">${n.message}</p>
            `;
            list.appendChild(div);
        });
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

    const instapayAmt = document.getElementById('instapayAmountDisplay');
    if (instapayAmt) instapayAmt.innerText = pkg.price.toFixed(2) + ' ج.م';

    const vodafoneAmt = document.getElementById('vodafoneAmountDisplay');
    if (vodafoneAmt) vodafoneAmt.innerText = pkg.price.toFixed(2) + ' ج.م';

    const btnTxt = document.getElementById('btnPaymobSubmitText');
    if (btnTxt) btnTxt.innerText = 'تأكيد السداد (' + pkg.price.toFixed(2) + ' ج.م) وإصدار الإيصال الرسمي';

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
    document.getElementById('receiptNumber').innerText = receipt.receipt_number || ('RCT-' + Date.now());
    document.getElementById('receiptStudentName').innerText = receipt.student_name || (document.getElementById('studentName') ? document.getElementById('studentName').innerText : 'طالب الأكاديمية');
    document.getElementById('receiptStudentCode').innerText = receipt.student_code || (document.getElementById('studentCode') ? document.getElementById('studentCode').innerText : 'MNR');
    document.getElementById('receiptCourseName').innerText = receipt.course_name || selectedCourseName;
    
    const rPkg = document.getElementById('receiptPackageName');
    if (rPkg) rPkg.innerText = receipt.package_name || 'باقة تجديد الاشتراك';
    
    const rCred = document.getElementById('receiptCreditsAdded');
    if (rCred) rCred.innerText = '+' + (receipt.credits_added || 4) + ' حصص معتمدة';

    document.getElementById('receiptAmount').innerText = (receipt.amount !== undefined ? receipt.amount : 500) + '.00 ج.م';
    document.getElementById('receiptDate').innerText = (receipt.created_at || new Date().toISOString()).slice(0, 10);
    
    const waText = encodeURIComponent(
        'إيصال سداد رسمي — أكاديمية منير الذكية\n' +
        'رقم الإيصال: ' + (receipt.receipt_number || '') + '\n' +
        'اسم الطالب: ' + (receipt.student_name || '') + ' (' + (receipt.student_code || '') + ')\n' +
        'المسار: ' + (receipt.course_name || selectedCourseName) + '\n' +
        'الباقة المختارة: ' + (receipt.package_name || '') + '\n' +
        'الرصيد المضاف: +' + (receipt.credits_added || 4) + ' حصص\n' +
        'المبلغ المسدد: ' + (receipt.amount || '') + ' ج.م\n' +
        'حالة العملية: تم السداد بنجاح وشحن الرصيد المباشر.'
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
    btn.innerHTML = '<span>جاري تسجيل السداد وتحديث الرصيد...</span>';
    btn.disabled = true;

    const sName = document.getElementById('studentName') ? document.getElementById('studentName').innerText : 'طالب الأكاديمية';
    const sCode = document.getElementById('studentCode') ? document.getElementById('studentCode').innerText : 'MNR-STUDENT';
    const payMethodRadio = document.querySelector('input[name="payMethod"]:checked');
    const payMethod = payMethodRadio ? payMethodRadio.value : 'card';

    try {
        let checkData = null;
        try {
            const checkRes = await fetch('/api/paymob/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    student_id: currentStudentId, 
                    course_name: selectedCourseName,
                    package_id: pkg.id,
                    package_name: pkg.name + ' (' + pkg.typeName + ')',
                    package_type: pkg.type,
                    credits_to_add: pkg.credits,
                    amount: pkg.price,
                    payment_method: payMethod 
                })
            });
            if (checkRes.ok) {
                checkData = await checkRes.json();
            }
        } catch(e) {
            console.warn('[Paymob] Checkout endpoint fallback:', e);
        }

        const txId = (checkData && checkData.transaction_id) ? checkData.transaction_id : ('PAYMOB-' + Math.random().toString(36).substring(2, 10).toUpperCase());

        setTimeout(async () => {
            let webData = null;
            try {
                const webRes = await fetch('/api/paymob/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        transaction_id: txId,
                        student_id: currentStudentId,
                        student_name: sName,
                        student_code: sCode,
                        course_name: selectedCourseName,
                        package_name: pkg.name + ' (' + pkg.typeName + ')',
                        credits_to_add: pkg.credits,
                        amount: pkg.price
                    })
                });
                if (webRes.ok) {
                    webData = await webRes.json();
                }
            } catch(e) {
                console.warn('[Paymob] Webhook fallback:', e);
            }

            const receipt = (webData && webData.receipt) ? webData.receipt : {
                receipt_number: 'REC-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                student_name: sName,
                student_code: sCode,
                course_name: selectedCourseName,
                package_name: pkg.name + ' (' + pkg.typeName + ')',
                credits_added: pkg.credits,
                amount: pkg.price,
                created_at: new Date().toISOString()
            };

            // Update local memory and cache
            const targetCourse = enrolledCoursesList.find(c => c.course_name === selectedCourseName);
            if (targetCourse) {
                targetCourse.remaining_credits = (targetCourse.remaining_credits || 0) + pkg.credits;
                targetCourse.total_lectures_unlocked = (targetCourse.total_lectures_unlocked || 0) + pkg.credits;
                targetCourse.renewal_count = (targetCourse.renewal_count || 0) + 1;
            }

            // Sync with Supabase if configured
            if (window.MonirDB && window.MonirDB.isConfigured()) {
                try {
                    const client = window.MonirDB.getClient();
                    if (client) {
                        const { data: enrs } = await client.from('enrollments')
                            .select('*')
                            .eq('student_id', currentStudentId)
                            .eq('course_name', selectedCourseName);
                        
                        if (enrs && enrs.length > 0) {
                            const curEnr = enrs[0];
                            const newCredits = (curEnr.remaining_credits || 0) + pkg.credits;
                            const newTotal = (curEnr.total_lectures_unlocked || 0) + pkg.credits;
                            const newRenewals = (curEnr.renewal_count || 0) + 1;
                            await client.from('enrollments').update({
                                remaining_credits: newCredits,
                                total_lectures_unlocked: newTotal,
                                renewal_count: newRenewals,
                                excuse_count: 0
                            }).eq('id', curEnr.id);
                        }

                        await client.from('notifications').insert([{
                            student_id: currentStudentId,
                            course_name: selectedCourseName,
                            title: 'تم تجديد الاشتراك بنجاح (' + pkg.name + ')',
                            message: 'شكراً لك! تم استلام رسوم التجديد (' + pkg.price + ' ج.م) وإضافة +' + pkg.credits + ' حصص لرصيدك بموجب إيصال #' + receipt.receipt_number + '.',
                            type: 'renewal',
                            action_url: '/student.html'
                        }]);
                    }
                } catch(err) {
                    console.warn('[Supabase] Renewal sync error:', err);
                }
            }

            // Also update local mock DB cache if exists
            if (window.MonirDB && typeof window.MonirDB.updateLocalCache === 'function') {
                window.MonirDB.updateLocalCache(db => {
                    if (db && db.enrollments) {
                        const mEnr = db.enrollments.find(e => e.student_id === currentStudentId && e.course_name === selectedCourseName);
                        if (mEnr) {
                            mEnr.remaining_credits = (mEnr.remaining_credits || 0) + pkg.credits;
                            mEnr.total_lectures_unlocked = (mEnr.total_lectures_unlocked || 0) + pkg.credits;
                            mEnr.renewal_count = (mEnr.renewal_count || 0) + 1;
                        }
                    }
                });
            }

            btn.innerHTML = 'تم الدفع وشحن (' + pkg.credits + ' حصص) بنجاح!';
            btn.className = 'w-full bg-emerald-600 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg';

            setTimeout(() => {
                closePaymobModal();
                btn.innerHTML = oldTxt;
                btn.disabled = false;
                btn.className = 'w-full bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg';
                
                // Show official receipt modal
                openReceiptModal(receipt);
                
                // Refresh UI immediately
                loadStudentProfile();
                loadNotifications();
            }, 1000);
        }, 1200);

    } catch (err) {
        console.error("Paymob Error:", err);
        btn.innerHTML = oldTxt;
        btn.disabled = false;
        alert("حدث خطأ أثناء معالجة الدفع، يرجى المحاولة مرة أخرى.");
    }
}

function refreshData() {
    loadStudentProfile();
    loadNotifications();
}
