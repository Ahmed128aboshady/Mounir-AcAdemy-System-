// Mounir Academy — Central Live Video & Meet Group Manager
(function() {
    const STORAGE_KEY = 'monir_group_meet_links';

    // Auto-clean any Google Meet links or corrupted links from localStorage so all rooms use official Jitsi
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            let modified = false;
            for (const gid in parsed) {
                // If it's a google meet link or G346, remove it to revert to standard Jitsi room
                if (gid === 'G346' || (parsed[gid] && parsed[gid].includes('meet.google.com'))) {
                    delete parsed[gid];
                    modified = true;
                }
            }
            if (modified) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                console.log('[MeetManager] Reset overridden rooms to official academy rooms');
            }
        }
    } catch(e) {}

    // Built-in group meet mapping (can be extended or overridden)
    window.GROUP_MEET_LINKS = window.GROUP_MEET_LINKS || {};

    // Get all overrides from localStorage
    function getStoredLinks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch(e) {
            return {};
        }
    }

    // Standardized Group Live Room generator (Jitsi Meet / Google Meet / Zoom)
    window.getGroupMeetUrl = function(groupId) {
        if (!groupId || groupId === '—' || groupId === 'G000' || groupId === 'G') {
            return 'https://meet.jit.si/MounirAcademy_GeneralRoom';
        }
        
        const cleanGid = String(groupId).trim();
        const stored = getStoredLinks();

        // 1. User/Teacher/Admin override (must not be Google Meet to prevent permission locks)
        if (stored[cleanGid] && !stored[cleanGid].includes('meet.google.com') && cleanGid !== 'G346') {
            return stored[cleanGid];
        }

        // 2. Pre-configured in global map
        if (window.GROUP_MEET_LINKS[cleanGid] && !window.GROUP_MEET_LINKS[cleanGid].includes('meet.google.com') && cleanGid !== 'G346') {
            return window.GROUP_MEET_LINKS[cleanGid];
        }

        // 3. Instant working live interactive video room (No login required)
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
            if (window.GROUP_MEET_LINKS) delete window.GROUP_MEET_LINKS[cleanGid];
        } catch(e) {}
        const codeSuffix = cleanGid.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const defaultUrl = 'https://meet.jit.si/MounirAcademy_Group_' + codeSuffix;
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
            // Revert to default Jitsi room
            finalUrl = 'https://meet.jit.si/MounirAcademy_Group_' + cleanGid.toUpperCase().replace(/[^A-Z0-9]/g, '');
        } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            const stored = getStoredLinks();
            stored[cleanGid] = finalUrl;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
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
                btnElement.innerHTML = '<span>✅</span> <span>تم النسخ!</span>';
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
