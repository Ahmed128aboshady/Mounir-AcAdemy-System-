import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


RATES = {15: 25, 20: 33, 30: 50, 45: 0, 60: 100}
CAIRO = ZoneInfo('Africa/Cairo')
ATTENDANCE_SUFFIX = re.compile(r'\s+\[(?:رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$')


def summarize_teacher_earnings(cursor, teacher_id=None):
    """Price one attendance per student, course and Cairo date."""
    enrollments = cursor.execute('SELECT student_id, course_name, teacher_id FROM enrollments').fetchall()
    owners = defaultdict(list)
    for student, course, teacher in enrollments:
        owners[(student, course.strip())].append(teacher)

    sessions = defaultdict(set)
    attendance = cursor.execute('''
        SELECT student_id, course_name, joined_at, duration_minutes
        FROM attendance WHERE status IN ('present', 'attended', 'late') AND joined_at IS NOT NULL
    ''')
    for student, course, joined_at, minutes in attendance:
        scope = (student, ATTENDANCE_SUFFIX.sub('', course).strip())
        assigned = owners.get(scope, [])
        try:
            instant = datetime.fromisoformat(joined_at)
        except (ValueError, TypeError):
            continue
        if instant.tzinfo is None:
            instant = instant.replace(tzinfo=timezone.utc)
        day = instant.astimezone(CAIRO).date()
        eligible = len(assigned) == 1 and '[بديل:' not in course and minutes in RATES
        for owner in set(assigned):
            if owner is not None and (teacher_id is None or teacher_id == owner):
                sessions[(owner, scope, day)].add(minutes if eligible else None)

    totals = defaultdict(Counter)
    for (owner, _, _), durations in sessions.items():
        if len(durations) != 1 or None in durations:
            totals[owner]['needs_review'] += 1
            continue
        (minutes,) = durations
        totals[owner][f'sessions_{minutes}'] += 1
        totals[owner]['completed_sessions'] += 1
        totals[owner]['total_earned'] += RATES[minutes]
    return totals
