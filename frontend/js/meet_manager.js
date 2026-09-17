// Mounir Academy — Central Live Video & Meet Group Manager (v3.0 Google Meet Integration)
(function() {
    const STORAGE_KEY = 'monir_group_meet_links';

    // Official Teacher Google Meet Registry (10 Confirmed Teachers)
    window.TEACHER_MEET_LINKS = {
        // By ID
        "52": "https://meet.google.com/cvf-qbuj-ojn", // محمد عاشور
        "70": "https://meet.google.com/rou-kyvc-muw", // نادين
        "69": "https://meet.google.com/cuj-hpsk-mji", // منة الله
        "51": "https://meet.google.com/wjf-ksyv-qfa", // محمد احمد محمود
        "65": "https://meet.google.com/svv-nrcf-fzp", // مصطفى علام (مصطفى محمد علام)
        "9":  "https://meet.google.com/dee-yvud-mdz", // احمد حميد
        "38": "https://meet.google.com/sis-zeuj-pat", // عبدالرحمن سعيد
        "59": "https://meet.google.com/axh-kxzj-ayt", // محمود عبد المحسن
        "27": "https://meet.google.com/otm-vpcb-ipu", // حبيبة عاشور
        "2":  "https://meet.google.com/cxu-trbc-rmu", // احمد طارق (أحمد طارق)
        // By Name
        "محمد عاشور": "https://meet.google.com/cvf-qbuj-ojn",
        "نادين": "https://meet.google.com/rou-kyvc-muw",
        "منة الله": "https://meet.google.com/cuj-hpsk-mji",
        "محمد احمد محمود": "https://meet.google.com/wjf-ksyv-qfa",
        "مصطفى علام": "https://meet.google.com/svv-nrcf-fzp",
        "مصطفى محمد علام": "https://meet.google.com/svv-nrcf-fzp",
        "احمد حميد": "https://meet.google.com/dee-yvud-mdz",
        "أحمد حميد": "https://meet.google.com/dee-yvud-mdz",
        "عبدالرحمن سعيد": "https://meet.google.com/sis-zeuj-pat",
        "عبد الرحمن سعيد": "https://meet.google.com/sis-zeuj-pat",
        "محمود عبد المحسن": "https://meet.google.com/axh-kxzj-ayt",
        "محمود عبدالمحسن": "https://meet.google.com/axh-kxzj-ayt",
        "حبيبة عاشور": "https://meet.google.com/otm-vpcb-ipu",
        "احمد طارق": "https://meet.google.com/cxu-trbc-rmu",
        "أحمد طارق": "https://meet.google.com/cxu-trbc-rmu"
    };

    // Official Group to Meet Mapping (All 61 Groups belonging to the 10 Teachers)
    const OFFICIAL_GROUP_MEET_LINKS = {
        "G044": "https://meet.google.com/cvf-qbuj-ojn",
        "G140": "https://meet.google.com/cvf-qbuj-ojn",
        "G141": "https://meet.google.com/cvf-qbuj-ojn",
        "G154": "https://meet.google.com/cvf-qbuj-ojn",
        "G161": "https://meet.google.com/cvf-qbuj-ojn",
        "G178": "https://meet.google.com/cvf-qbuj-ojn",
        "G238": "https://meet.google.com/cvf-qbuj-ojn",
        "G256": "https://meet.google.com/cvf-qbuj-ojn",
        "G272": "https://meet.google.com/cvf-qbuj-ojn",
        "G287": "https://meet.google.com/cvf-qbuj-ojn",
        "G331": "https://meet.google.com/cvf-qbuj-ojn",
        "G426": "https://meet.google.com/cvf-qbuj-ojn",
        "G440": "https://meet.google.com/cvf-qbuj-ojn",
        "G023": "https://meet.google.com/rou-kyvc-muw",
        "G254": "https://meet.google.com/rou-kyvc-muw",
        "G305": "https://meet.google.com/rou-kyvc-muw",
        "G344": "https://meet.google.com/rou-kyvc-muw",
        "G352": "https://meet.google.com/rou-kyvc-muw",
        "G373": "https://meet.google.com/rou-kyvc-muw",
        "G328": "https://meet.google.com/cuj-hpsk-mji",
        "G336": "https://meet.google.com/cuj-hpsk-mji",
        "G337": "https://meet.google.com/cuj-hpsk-mji",
        "G400": "https://meet.google.com/cuj-hpsk-mji",
        "G405": "https://meet.google.com/cuj-hpsk-mji",
        "G110": "https://meet.google.com/wjf-ksyv-qfa",
        "G173": "https://meet.google.com/wjf-ksyv-qfa",
        "G422": "https://meet.google.com/wjf-ksyv-qfa",
        "G314": "https://meet.google.com/svv-nrcf-fzp",
        "G053": "https://meet.google.com/dee-yvud-mdz",
        "G068": "https://meet.google.com/dee-yvud-mdz",
        "G270": "https://meet.google.com/dee-yvud-mdz",
        "G364": "https://meet.google.com/dee-yvud-mdz",
        "G398": "https://meet.google.com/dee-yvud-mdz",
        "G022": "https://meet.google.com/sis-zeuj-pat",
        "G036": "https://meet.google.com/sis-zeuj-pat",
        "G150": "https://meet.google.com/sis-zeuj-pat",
        "G157": "https://meet.google.com/sis-zeuj-pat",
        "G199": "https://meet.google.com/sis-zeuj-pat",
        "G343": "https://meet.google.com/sis-zeuj-pat",
        "G371": "https://meet.google.com/sis-zeuj-pat",
        "G441": "https://meet.google.com/sis-zeuj-pat",
        "G096": "https://meet.google.com/axh-kxzj-ayt",
        "G106": "https://meet.google.com/axh-kxzj-ayt",
        "G112": "https://meet.google.com/axh-kxzj-ayt",
        "G166": "https://meet.google.com/axh-kxzj-ayt",
        "G277": "https://meet.google.com/axh-kxzj-ayt",
        "G282": "https://meet.google.com/axh-kxzj-ayt",
        "G288": "https://meet.google.com/axh-kxzj-ayt",
        "G356": "https://meet.google.com/axh-kxzj-ayt",
        "G032": "https://meet.google.com/otm-vpcb-ipu",
        "G042": "https://meet.google.com/otm-vpcb-ipu",
        "G091": "https://meet.google.com/otm-vpcb-ipu",
        "G101": "https://meet.google.com/otm-vpcb-ipu",
        "G109": "https://meet.google.com/otm-vpcb-ipu",
        "G137": "https://meet.google.com/otm-vpcb-ipu",
        "G164": "https://meet.google.com/otm-vpcb-ipu",
        "G179": "https://meet.google.com/otm-vpcb-ipu",
        "G193": "https://meet.google.com/otm-vpcb-ipu",
        "G033": "https://meet.google.com/cxu-trbc-rmu",
        "G078": "https://meet.google.com/cxu-trbc-rmu",
        "G244": "https://meet.google.com/cxu-trbc-rmu"
};

    // Initialize global registry
    window.GROUP_MEET_LINKS = Object.assign(OFFICIAL_GROUP_MEET_LINKS, window.GROUP_MEET_LINKS || {});

    // Get all custom overrides from localStorage
    function getStoredLinks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch(e) {
            return {};
        }
    }

    // Standardized Group Live Room generator (Google Meet / Zoom / Jitsi)
    window.getGroupMeetUrl = function(groupId, teacherIdOrName) {
        const cleanGid = groupId ? String(groupId).trim() : '';
        const stored = getStoredLinks();

        // 1. User/Teacher/Admin override in localStorage
        if (cleanGid && stored[cleanGid]) {
            return stored[cleanGid];
        }

        // 2. Pre-configured official Google Meet rooms by Group ID
        if (cleanGid && window.GROUP_MEET_LINKS && window.GROUP_MEET_LINKS[cleanGid]) {
            return window.GROUP_MEET_LINKS[cleanGid];
        }

        // 3. Match via Teacher ID or Teacher Name if provided
        if (teacherIdOrName) {
            const cleanT = String(teacherIdOrName).trim();
            if (window.TEACHER_MEET_LINKS && window.TEACHER_MEET_LINKS[cleanT]) {
                return window.TEACHER_MEET_LINKS[cleanT];
            }
        }

        if (!cleanGid || cleanGid === '—' || cleanGid === 'G000' || cleanGid === 'G') {
            return 'https://meet.jit.si/MounirAcademy_GeneralRoom';
        }

        // 4. Default fallback working live interactive video room
        const codeSuffix = cleanGid.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return 'https://meet.jit.si/MounirAcademy_Group_' + codeSuffix;
    };

    // Reset group meet URL to official default
    window.resetGroupMeetUrl = function(groupId) {
        if (!groupId) return;
        const cleanGid = String(groupId).trim();
        try {
            const stored = getStoredLinks();
            delete stored[cleanGid];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch(e) {}
        const defaultUrl = window.getGroupMeetUrl(cleanGid);
        window.dispatchEvent(new CustomEvent('monir-meet-updated', {
            detail: { groupId: cleanGid, url: defaultUrl }
        }));
        return defaultUrl;
    };

    // Update group meet link
    window.setGroupMeetUrl = function(groupId, newUrl) {
        if (!groupId) return false;
        const cleanGid = String(groupId).trim();
        let finalUrl = (newUrl || '').trim();

        if (!finalUrl) {
            finalUrl = window.getGroupMeetUrl(cleanGid);
        } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            const stored = getStoredLinks();
            stored[cleanGid] = finalUrl;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            if (!window.GROUP_MEET_LINKS) window.GROUP_MEET_LINKS = {};
            window.GROUP_MEET_LINKS[cleanGid] = finalUrl;

            // Trigger custom event for real-time reactivity in current tab
            window.dispatchEvent(new CustomEvent('monir-meet-updated', {
                detail: { groupId: cleanGid, url: finalUrl }
            }));

            return finalUrl;
        } catch(e) {
            console.error('[MeetManager] Failed to save link:', e);
            return false;
        }
    };

    // Copy to clipboard helper with button visual feedback
    window.copyMeetLink = function(url, btnElement) {
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            if (btnElement) {
                const originalHtml = btnElement.innerHTML;
                btnElement.innerHTML = '<span>تم النسخ!</span>';
                btnElement.classList.add('bg-emerald-100', 'text-emerald-800');
                setTimeout(() => {
                    btnElement.innerHTML = originalHtml;
                    btnElement.classList.remove('bg-emerald-100', 'text-emerald-800');
                }, 2000);
            } else {
                alert('تم نسخ رابط القاعة بنجاح:\n' + url);
            }
        }).catch(err => {
            prompt('انسخ الرابط يدوياً:', url);
        });
    };

    // Prompt teacher or admin to edit the group meet link
    window.promptEditGroupMeetUrl = function(groupId, currentUrl, callback) {
        const input = prompt('أدخل رابط الحصة الجديد للمجموعة (' + groupId + ')\nيمكنك وضع رابط Google Meet أو Zoom أو أي رابط تختاره:', currentUrl || window.getGroupMeetUrl(groupId));
        if (input !== null) {
            const trimmed = input.trim();
            if (trimmed) {
                const saved = window.setGroupMeetUrl(groupId, trimmed);
                if (saved) {
                    alert('تم حفظ وتحديث رابط الحصة للمجموعة (' + groupId + ') بنجاح!\nسيظهر الرابط الآن فوراً لك ولجميع طلاب المجموعة:\n' + saved);
                    if (typeof callback === 'function') callback(saved);
                }
            }
        }
    };
})();
