(function () {
    const cairoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const recordSuffix = /\s+\[(?:رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$/;

    function courseName(value) {
        return String(value || '').replace(recordSuffix, '').trim();
    }

    function key(studentId, course) {
        return JSON.stringify([String(studentId), courseName(course)]);
    }

    function date(value = new Date()) {
        const instant = new Date(value);
        return Number.isNaN(instant.getTime()) ? '' : cairoDate.format(instant);
    }

    function storageKey(studentId, course, day) {
        return 'monir_course_attendance_' + key(studentId, course) + '_' + day;
    }

    function matches(record, course, day) {
        return Boolean(course && courseName(record.course_name) === courseName(course) && date(record.joined_at) === day);
    }

    function read(studentId, course, day) {
        try {
            return JSON.parse(localStorage.getItem(storageKey(studentId, course, day)) || 'null');
        } catch {
            return null;
        }
    }

    function save(studentId, course, day, record) {
        if (record) localStorage.setItem(storageKey(studentId, course, day), JSON.stringify(record));
        else localStorage.removeItem(storageKey(studentId, course, day));
    }

    window.MonirAttendance = { courseName, key, date, matches, read, save };
})();
