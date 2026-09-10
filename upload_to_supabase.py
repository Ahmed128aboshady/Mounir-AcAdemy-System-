import urllib.request, json, sys

apikey = 'sb_publishable_EEpE3k9qqqWSpACYFD0wLw_77C-fYYP'

headers = {
    'apikey': apikey,
    'Authorization': 'Bearer ' + apikey,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def upload_table(table_name, items):
    url = f'https://chwhrxquvaiskdsthips.supabase.co/rest/v1/{table_name}'
    batch_size = 100
    for i in range(0, len(items), batch_size):
        chunk = items[i:i+batch_size]
        req = urllib.request.Request(url, data=json.dumps(chunk, ensure_ascii=False).encode('utf-8'), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                pass
        except Exception as e:
            print(f'Error uploading {table_name} chunk {i}:', e)
            if hasattr(e, 'read'):
                print(e.read().decode('utf-8'))
    print(f'Finished uploading {len(items)} records to {table_name}')

with open('js/db_seed.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# 1. Teachers
clean_teachers = []
for t in db.get('teachers', []):
    clean_teachers.append({
        'id': t['id'],
        'name': t['name'],
        'specialty': 'معلم أكاديمية منير',
        'email': t.get('email', f"teacher{t['id']}@monir.edu.eg")
    })

upload_table('teachers', clean_teachers)

# 2. Enrollments
clean_enrollments = []
for e in db.get('enrollments', []):
    clean_enrollments.append({
        'id': e['id'],
        'student_id': e['student_id'],
        'course_name': e['course_name'],
        'teacher_id': e.get('teacher_id', 1),
        'unlocked_blocks': 1,
        'total_lectures_unlocked': 4,
        'renewal_count': 1,
        'remaining_credits': e.get('remaining_credits', 4),
        'status': 'active'
    })

upload_table('enrollments', clean_enrollments)
