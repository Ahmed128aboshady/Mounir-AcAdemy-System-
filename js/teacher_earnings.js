(function () {
    const rates = new Map([[15, 25], [20, 33], [30, 50], [45, 0], [60, 100]]);
    const attendedStatuses = new Set(['present', 'attended', 'late']);

    function rateForMinutes(minutes) {
        return rates.get(Number(minutes)) ?? null;
    }

    function summarize(enrollments, attendance) {
        const scopes = new Set(enrollments.map(row => MonirAttendance.key(row.student_id, row.course_name)));
        const sessions = new Map();

        for (const record of attendance) {
            const scope = MonirAttendance.key(record.student_id, record.course_name);
            const date = record.joined_at && MonirAttendance.date(record.joined_at);
            if (!scopes.has(scope) || !date || !attendedStatuses.has(record.status)) continue;

            const sessionKey = JSON.stringify([scope, date]);
            const amounts = sessions.get(sessionKey) || new Set();
            const courseTag = String(record.course_name || '');
            const amount = courseTag.includes('[بديل:') ? null : rateForMinutes(record.duration_minutes);
            amounts.add(amount);
            sessions.set(sessionKey, amounts);
        }

        let counted = 0;
        let total = 0;
        for (const amounts of sessions.values()) {
            const amount = amounts.values().next().value;
            if (amounts.size !== 1 || amount === null) continue;
            total += amount;
            counted++;
        }
        return { counted, total, needsReview: sessions.size - counted };
    }

    window.MonirTeacherEarnings = { summarize, rateForMinutes };
})();
