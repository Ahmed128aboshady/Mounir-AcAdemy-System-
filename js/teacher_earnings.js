(function () {
    const rates = new Map([[15, 25], [20, 33], [30, 50], [45, 0], [60, 100]]);
    const attendedStatuses = new Set(['present', 'attended', 'late']);

    function rateForMinutes(minutes) {
        return rates.get(Number(minutes)) ?? null;
    }

    function summarize(enrollments, attendance, options = {}) {
        const scopes = new Map();
        for (const row of enrollments) {
            const key = MonirAttendance.key(row.student_id, row.course_name);
            scopes.set(key, (scopes.get(key) || 0) + 1);
        }
        const sessions = new Map();

        for (const record of attendance) {
            const scope = MonirAttendance.key(record.student_id, record.course_name);
            const date = record.joined_at && MonirAttendance.date(record.joined_at);
            if (!scopes.has(scope) || !date || !attendedStatuses.has(record.status)) continue;

            const sessionKey = JSON.stringify([scope, date]);
            const amounts = sessions.get(sessionKey) || new Set();
            const courseTag = String(record.course_name || '');
            const minutes = Number(record.duration_minutes);
            const ambiguous = scopes.get(scope) !== 1 || options.ambiguousScopes?.has(scope) || courseTag.includes('[بديل:');
            amounts.add(ambiguous || rateForMinutes(minutes) === null ? null : minutes);
            sessions.set(sessionKey, amounts);
        }

        let counted = 0;
        let total = 0;
        const byDuration = {};
        for (const amounts of sessions.values()) {
            const minutes = amounts.values().next().value;
            if (amounts.size !== 1 || minutes === null) continue;
            total += rateForMinutes(minutes);
            byDuration[minutes] = (byDuration[minutes] || 0) + 1;
            counted++;
        }
        return { counted, total, needsReview: sessions.size - counted, ...(options.includeDuration ? { byDuration } : {}) };
    }

    window.MonirTeacherEarnings = { summarize, rateForMinutes };
})();
