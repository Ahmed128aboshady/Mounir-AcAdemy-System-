import urllib.request
import json
from playwright.sync_api import sync_playwright

req = urllib.request.Request(
    'http://127.0.0.1:8010/api/auth/login',
    data=json.dumps({'username': 'Mounir', 'password': 'Mm@593593@2026', 'expected_role': 'admin'}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:8010'}
)
res = urllib.request.urlopen(req)
token = res.headers.get('Set-Cookie').split(';')[0].split('=')[1]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1400, 'height': 900})
    ctx.add_cookies([{'name': 'mounir_local_session', 'value': token, 'domain': '127.0.0.1', 'path': '/'}])
    page = ctx.new_page()

    # Teacher login simulation (Teacher 28: Hamza Al-Adawi)
    page.goto('http://127.0.0.1:8010/teacher.html')
    page.evaluate('''() => {
        localStorage.setItem('monir_current_user', JSON.stringify({
            id: 28,
            username: 'teacher28',
            role: 'teacher',
            full_name: 'حمزه العدوي',
            teacher_id: 28
        }));
    }''')
    page.reload()
    page.wait_for_timeout(3500)

    # 1. Check active buttons: There should be ZERO buttons with text "حضور" that call recordSession('present')
    active_present_btns = page.locator('button[onclick*="\'present\'"]')
    print(f"Active manual 'حضور' buttons count: {active_present_btns.count()}")
    assert active_present_btns.count() == 0, f"Found {active_present_btns.count()} manual present buttons, should be 0"

    # 2. Check presence guard in recordSession
    guard_result = page.evaluate('''async () => {
        let alertTriggered = false;
        const origAlert = window.alert;
        window.alert = () => { alertTriggered = true; };
        if (window.MonirPopup) {
            window.MonirPopup.alert = () => { alertTriggered = true; return Promise.resolve(); };
        }
        await recordSession(9, 'present', 8);
        window.alert = origAlert;
        return alertTriggered;
    }''')
    print("Guard prevented manual recordSession('present'):", guard_result)
    assert guard_result is True, "Guard should have triggered and prevented manual presence recording"

    # 3. Verify ST0001 status in database
    st_info = page.evaluate('''async () => {
        const client = window.MonirDB.getClient();
        const { data: enr } = await client.from('enrollments').select('remaining_credits, present_count').eq('student_id', 9).single();
        const { data: att } = await client.from('attendance').select('id, course_name').eq('student_id', 9).gte('joined_at', '2026-11-13T00:00:00');
        return { enr, att };
    }''')
    print("ST0001 status in Supabase:", st_info)
    assert st_info['enr']['remaining_credits'] == 1, f"Expected 1 remaining credit, got {st_info['enr']['remaining_credits']}"
    assert st_info['enr']['present_count'] == 7, f"Expected 7 present count, got {st_info['enr']['present_count']}"
    assert len(st_info['att']) == 1, f"Expected 1 attendance record today, got {len(st_info['att'])}"

    print("\n ALL CHECKS PASSED PERFECTLY!")
    browser.close()
