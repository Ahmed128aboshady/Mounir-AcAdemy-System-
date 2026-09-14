// Mounir Academy — Central Google Meet Group Manager
(function() {
    const STORAGE_KEY = 'monir_group_meet_links';

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

    // Standardized Google Meet link generator
    window.getGroupMeetUrl = function(groupId) {
        if (!groupId || groupId === '—' || groupId === 'G000') {
            return 'https://meet.google.com';
        }
        
        const cleanGid = String(groupId).trim();
        const stored = getStoredLinks();

        // 1. User/Teacher/Admin local override
        if (stored[cleanGid]) {
            return stored[cleanGid];
        }

        // 2. Pre-configured in global map
        if (window.GROUP_MEET_LINKS[cleanGid]) {
            return window.GROUP_MEET_LINKS[cleanGid];
        }

        // 3. Normalized standard Google Meet link
        const codeSuffix = cleanGid.toLowerCase().replace(/[^a-z0-9]/g, '');
        return 'https://meet.google.com/mnr-' + codeSuffix;
    };

    // Update group meet link
    window.setGroupMeetUrl = function(groupId, newUrl) {
        if (!groupId) return false;
        const cleanGid = String(groupId).trim();
        let finalUrl = (newUrl || '').trim();

        if (!finalUrl) {
            // Revert to default
            finalUrl = 'https://meet.google.com/mnr-' + cleanGid.toLowerCase().replace(/[^a-z0-9]/g, '');
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
                alert('تم نسخ رابط Google Meet بنجاح:\n' + url);
            }
        }).catch(err => {
            prompt('انسخ الرابط يدوياً:', url);
        });
    };

    // Prompt teacher or admin to edit the group meet link
    window.promptEditGroupMeetUrl = function(groupId, currentUrl, callback) {
        const input = prompt('أدخل رابط Google Meet الجديد للمجموعة (' + groupId + '):', currentUrl || window.getGroupMeetUrl(groupId));
        if (input !== null) {
            const trimmed = input.trim();
            if (trimmed) {
                const saved = window.setGroupMeetUrl(groupId, trimmed);
                if (saved) {
                    alert('تم حفظ وتحديث رابط Google Meet للمجموعة (' + groupId + ') بنجاح!\nسيظهر الرابط الآن فوراً لك ولجميع طلاب المجموعة:\n' + saved);
                    if (typeof callback === 'function') callback(saved);
                }
            }
        }
    };
})();
