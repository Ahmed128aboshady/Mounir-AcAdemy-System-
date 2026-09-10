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
            document.getElementById('studentDetails').innerText = (s.age || 14) + ' سنة • تليفون ولي الأمر: محجوب عن المعلم لحماية الخصوصية';
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
            document.getElementById('studentDetails').innerText = (s.age || 14) + ' سنة • تليفون ولي الأمر: ' + (s.parent_phone || '0100000000');
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
            document.getElementById('studentDetails').innerText = 'السن: ' + (s.age || 12) + ' سنة • رقم التواصل / ولي الأمر: ' + phoneVal;
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
        const qrImg = document.getElementById('studentQrImg');
        if (qrImg) {
            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qrCodeData);
        }
        
        enrolledCoursesList = (data && data.enrolled_courses && data.enrolled_courses.length) ? data.enrolled_courses : [{
            course_name: "الاثنين 8",
            group_id: s.group_id || "G182",
            teacher_name: "محمود حمادة",
            unlocked_blocks: 1,
            total_lectures_unlocked: 4,
            remaining_credits: 4,
            renewal_count: 1,
            subscription_days: "الاثنين",
            lecture_time: "8:00 مساءً (ساعة 20)",
            account_status: s.account_status || "نشط",
            status: "active"
        }];
        
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
    const quranCourse = (courses && courses.find(c => c.course_name.includes("القرآن"))) || (courses && courses[0] ? courses[0] : null);
    const sec = document.getElementById('quranCreditSection');
    if (!sec) return;
    
    if (quranCourse) {
        sec.classList.remove('hidden');
        const rem = (quranCourse.remaining_credits !== undefined) ? quranCourse.remaining_credits : 4;
        document.getElementById('quranRemainingCredits').innerText = rem + ' حصص متبقية (من الشيت)';
        document.getElementById('quranExcusesNote').innerText = 'الأعذار المسجلة: ' + (quranCourse.excuse_count || 0) + ' (الأول مجاني)';
        document.getElementById('quranCurrentSurah').innerText = quranCourse.current_surah || 'مسار القرآن الكريم والتدبر';
        document.getElementById('quranCurrentAya').innerText = 'المعلم المشرف: أ. ' + (quranCourse.teacher_name || 'حمزه العدوي');
        
        const renewalAlert = document.getElementById('quranRenewalAlertBadge');
        if (renewalAlert) {
            if (rem <= 1) {
                renewalAlert.classList.remove('hidden');
            } else {
                renewalAlert.classList.add('hidden');
            }
        }
    } else {
        sec.classList.add('hidden');
    }
}

function renderEnrolledCoursesTabs(courses) {
    const container = document.getElementById('enrolledCoursesTabs');
    if (!container) return;
    container.innerHTML = '';
    
    const curStudent = (window.currentStudentData && window.currentStudentData.student) ? window.currentStudentData.student : {};
    const parentPhoneNum = curStudent.parent_phone || curStudent.phone || (initialUser && (initialUser.parent_phone || initialUser.phone)) || 'غير مسجل';

    const safeCourses = (Array.isArray(courses) && courses.length > 0) ? courses : [{
        course_name: "الاثنين 8",
        group_id: curStudent.group_id || "G182",
        teacher_name: "محمود حمادة",
        unlocked_blocks: 1,
        total_lectures_unlocked: 4,
        remaining_credits: 4,
        renewal_count: 1,
        subscription_days: "الاثنين",
        lecture_time: "8:00 مساءً (ساعة 20)",
        account_status: curStudent.account_status || "نشط",
        status: "active"
    }];

    safeCourses.forEach(c => {
        if (!c) return;
        const cName = c.course_name || c.name || c.title || "الاثنين 8";
        const isSelected = (selectedCourseName ? (cName === selectedCourseName) : true);
        const card = document.createElement('div');
        
        const activeClass = isSelected 
            ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-md transform scale-[1.01]' 
            : 'border border-slate-200 bg-white hover:border-slate-300 shadow-sm';
            
        card.className = 'p-4 rounded-2xl cursor-pointer transition space-y-3 ' + activeClass;
        card.onclick = () => selectCourseTab(cName);
        
        const teacherName = c.teacher_name || 'محمود حمادة';
        const groupId = c.group_id || curStudent.group_id || 'G182';
        const remCredits = (c.remaining_credits !== undefined) ? c.remaining_credits : 4;
        const daysText = c.subscription_days || 'الاثنين';
        const timeText = c.lecture_time || (c.raw_time ? ('ساعة ' + c.raw_time) : '8:00 مساءً (ساعة 20)');
        const statusText = c.account_status || curStudent.account_status || 'نشط';
        const statusColor = (statusText === 'نشط' || statusText.includes('ساري')) ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300';

        let durationText = "60 دقيقة (ساعة كاملة)";
        if (cName && (cName.includes("برايفت") || cName.includes("نصف") || cName.includes("30"))) {
            durationText = "30-45 دقيقة (جلسة فردية برايفت)";
        }

        card.innerHTML = `
            <div class="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span class="bg-slate-900 text-amber-300 font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-slate-700">معرف الجروب: ${groupId}</span>
                        <span class="${statusColor} border font-black px-2.5 py-0.5 rounded-full text-[10px]">🟢 حالة الحساب: ${statusText}</span>
                        <span class="bg-emerald-800 text-emerald-100 font-bold px-2.5 py-0.5 rounded-full text-[10px]">📖 مسار القرآن الكريم والتدبر</span>
                    </div>
                    <h4 class="font-black text-lg text-slate-900 flex items-center gap-2">
                        <span>${cName}</span>
                    </h4>
                    <p class="text-xs font-black text-blue-900 mt-1 flex items-center gap-1">
                        <span>👨‍🏫 المعلم المشرف:</span>
                        <span class="underline decoration-blue-400">أ. ${teacherName}</span>
                    </p>
                </div>
                <div class="text-right">
                    <span class="bg-amber-400 border border-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs block whitespace-nowrap shadow-md">
                        📊 المتبقي من الشيت: ${remCredits} حصة
                    </span>
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
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-500">📞 تليفون ولي الأمر:</span>
                        <strong class="text-slate-900 font-mono font-extrabold">${parentPhoneNum}</strong>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center text-xs pt-1 text-slate-600 font-semibold">
                <span>المحاضرات المفعلة بالسيستم: <strong class="text-blue-900">${c.total_lectures_unlocked || 4} / 8</strong></span>
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
        if (window.MonirDB && window.MonirDB.isConfigured()) {
            try {
                const sbLecs = await window.MonirDB.getCourseLectures(selectedCourseName);
                if (sbLecs && sbLecs.length > 0) {
                    const curEnr = enrolledCoursesList.find(c => c.course_name === selectedCourseName) || {};
                    const totalUnl = curEnr.total_lectures_unlocked || 4;
                    data = {
                        course_name: selectedCourseName,
                        total_lectures_unlocked: totalUnl,
                        unlocked_blocks: curEnr.unlocked_blocks || 1,
                        renewal_count: curEnr.renewal_count || 0,
                        remaining_credits: curEnr.remaining_credits || 4,
                        lectures: sbLecs.map(l => ({
                            ...l,
                            is_unlocked: (l.lecture_number <= totalUnl)
                        }))
                    };
                }
            } catch(e) {
                console.warn('[Supabase] Failed to fetch lectures directly, falling back:', e);
            }
        }

        if (!data) {
            const res = await fetch('/api/student/' + currentStudentId + '/courses/' + encodeURIComponent(selectedCourseName) + '/lectures');
            data = await res.json();
        }
        
        document.getElementById('selectedCourseTitle').innerText = 'جدول محاضرات: ' + (data.course_name || selectedCourseName);
        
        const currentCourseInfo = enrolledCoursesList.find(c => c.course_name === selectedCourseName) || enrolledCoursesList[0] || {};
        if (currentCourseInfo) {
            document.getElementById('presentCount').innerText = currentCourseInfo.present_count || 2;
            document.getElementById('absentCount').innerText = currentCourseInfo.absent_count || 0;
            document.getElementById('renewalCountBadge').innerText = currentCourseInfo.renewal_count > 0 
                ? currentCourseInfo.renewal_count + ' مرة' 
                : 'المرحلة الأولى';
        }
        
        document.getElementById('paymobServiceName').innerText = 'تجديد مسار ' + data.course_name + ' (المحاضرات 5-8)';
        document.getElementById('paymobStudentInfo').innerText = document.getElementById('studentName').innerText + ' (' + document.getElementById('studentCode').innerText + ')';
        document.getElementById('paymobAmountText').innerText = (currentCourseInfo ? (currentCourseInfo.price_per_block || 450.0) : 450.0) + ' ج.م';
        
        const b1Container = document.getElementById('block1Lectures');
        const b2Container = document.getElementById('block2Lectures');
        
        b1Container.innerHTML = '';
        b2Container.innerHTML = '';
        
        const unlockedBlocks = data.unlocked_blocks || 1;
        
        if (unlockedBlocks >= 2) {
            document.getElementById('block2Title').innerText = 'المرحلة الثانية: المحاضرات (5 إلى 8)';
            document.getElementById('block2Badge').innerText = 'مفعلة بالكامل';
            document.getElementById('block2Badge').className = 'bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold';
            document.getElementById('renewalBanner').classList.add('hidden');
        } else {
            document.getElementById('block2Title').innerText = 'المرحلة الثانية: المحاضرات (5 إلى 8)';
            document.getElementById('block2Badge').innerText = 'مغلقة • تتطلب التجديد';
            document.getElementById('block2Badge').className = 'bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black';
            document.getElementById('renewalBanner').classList.remove('hidden');
        }
        
        const subDays = currentCourseInfo.subscription_days || 'الاثنين';
        const upcomingDates = calculateGroupUpcomingDates(subDays, 4);

        if (!data.lectures || data.lectures.length === 0) {
            data.lectures = [
                { id: 101, lecture_number: 1, block_number: 1, title: 'المحاضرة 1: التلاوة ومراجعة سورة المطففين', scheduled_time: upcomingDates[0].dateFormatted + ' • 8:00 مساءً (ساعة كاملة)', is_unlocked: true, status: 'scheduled', google_meet_url: 'https://meet.google.com/mnr-g182-mon' },
                { id: 102, lecture_number: 2, block_number: 1, title: 'المحاضرة 2: التلاوة ومراجعة سورة الانشقاق', scheduled_time: upcomingDates[1].dateFormatted + ' • 8:00 مساءً (ساعة كاملة)', is_unlocked: true, status: 'scheduled', google_meet_url: 'https://meet.google.com/mnr-g182-mon' },
                { id: 103, lecture_number: 3, block_number: 1, title: 'المحاضرة 3: التلاوة ومراجعة سورة البروج', scheduled_time: upcomingDates[2].dateFormatted + ' • 8:00 مساءً (ساعة كاملة)', is_unlocked: true, status: 'scheduled', google_meet_url: 'https://meet.google.com/mnr-g182-mon' },
                { id: 104, lecture_number: 4, block_number: 1, title: 'المحاضرة 4: التلاوة والاختبار التقييمي للمرحلة', scheduled_time: upcomingDates[3].dateFormatted + ' • 8:00 مساءً (ساعة كاملة)', is_unlocked: true, status: 'scheduled', google_meet_url: 'https://meet.google.com/mnr-g182-mon' }
            ];
        } else {
            let p1Idx = 0;
            data.lectures.forEach(l => {
                if (l.block_number === 1 && p1Idx < upcomingDates.length) {
                    l.scheduled_time = upcomingDates[p1Idx].dateFormatted + ' • 8:00 مساءً (ساعة كاملة)';
                    l.google_meet_url = l.google_meet_url || 'https://meet.google.com/mnr-g182-mon';
                    p1Idx++;
                }
            });
        }

        data.lectures.forEach(l => {
            const card = renderLectureCard(l);
            if (l.block_number === 1) {
                b1Container.appendChild(card);
            } else {
                b2Container.appendChild(card);
            }
        });
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
                <span>تجديد مسار ${selectedCourseName} لفتح المحاضرة</span>
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

// ---------------- Paymob & Receipt Sharing ----------------
function openPaymobModal() {
    document.getElementById('paymobModal').classList.remove('hidden');
}

function closePaymobModal() {
    document.getElementById('paymobModal').classList.add('hidden');
}

function openReceiptModal(receipt) {
    document.getElementById('receiptNumber').innerText = receipt.receipt_number;
    document.getElementById('receiptStudentName').innerText = receipt.student_name;
    document.getElementById('receiptStudentCode').innerText = receipt.student_code;
    document.getElementById('receiptCourseName').innerText = receipt.course_name;
    document.getElementById('receiptAmount').innerText = receipt.amount + ' ج.م';
    document.getElementById('receiptDate').innerText = (receipt.created_at || new Date().toISOString()).slice(0, 10);
    
    const waText = encodeURIComponent(
        'إيصال سداد رسمي — أكاديمية منير الذكية\n' +
        'رقم الإيصال: ' + receipt.receipt_number + '\n' +
        'اسم الطالب: ' + receipt.student_name + ' (' + receipt.student_code + ')\n' +
        'المسار: ' + receipt.course_name + '\n' +
        'المبلغ المسدد: ' + receipt.amount + ' ج.م\n' +
        'تم تأكيد السداد وفتح المحاضرات بنجاح.'
    );
    document.getElementById('btnWhatsAppReceipt').href = 'https://wa.me/?text=' + waText;
    
    document.getElementById('receiptModal').classList.remove('hidden');
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.add('hidden');
}

async function submitPaymobPayment() {
    const btn = document.getElementById('btnPaymobSubmit');
    const oldTxt = btn.innerHTML;
    btn.innerHTML = '<span>جاري معالجة الدفع عبر Paymob...</span>';
    btn.disabled = true;
    
    try {
        const checkRes = await fetch('/api/paymob/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                student_id: currentStudentId, 
                course_name: selectedCourseName,
                block_to_unlock: 2, 
                payment_method: 'card' 
            })
        });
        const checkData = await checkRes.json();
        
        setTimeout(async () => {
            const webRes = await fetch('/api/paymob/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: checkData.transaction_id })
            });
            const webData = await webRes.json();
            
            btn.innerHTML = 'تم الدفع والتجديد بنجاح!';
            btn.className = 'w-full bg-emerald-600 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg';
            
            setTimeout(() => {
                closePaymobModal();
                btn.innerHTML = oldTxt;
                btn.disabled = false;
                btn.className = 'w-full bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg';
                
                // Show official receipt modal
                openReceiptModal(webData.receipt);
                
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
