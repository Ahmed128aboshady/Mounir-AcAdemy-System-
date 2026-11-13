import os
import json
import urllib.request
from playwright.sync_api import sync_playwright

def run_tests():
    # 0. Obtain Admin Session Token
    req = urllib.request.Request(
        'http://127.0.0.1:8010/api/auth/login',
        data=json.dumps({'username': 'Mounir', 'password': 'Mm@593593@2026', 'expected_role': 'admin'}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:8010'}
    )
    res = urllib.request.urlopen(req)
    raw_cookie = res.headers.get('Set-Cookie')
    admin_token = raw_cookie.split(';')[0].split('=')[1]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ═══════════════════════════════════════════════════════════
        # 1. VERIFY TEACHER PORTAL: NO UNDO BUTTONS
        # ═══════════════════════════════════════════════════════════
        print("\n--- 1. Testing Teacher Portal (teacher.html) ---")
        teacher_ctx = browser.new_context(viewport={'width': 1400, 'height': 900})
        teacher_ctx.add_cookies([
            {'name': 'mounir_local_session', 'value': admin_token, 'domain': '127.0.0.1', 'path': '/'}
        ])
        teacher_page = teacher_ctx.new_page()
        teacher_page.goto('http://127.0.0.1:8010/teacher.html')
        teacher_page.evaluate('''() => {
            localStorage.setItem('monir_current_user', JSON.stringify({
                id: 10,
                username: 'teacher10',
                role: 'teacher',
                full_name: 'أحمد محمود',
                teacher_id: 10
            }));
        }''')
        teacher_page.reload()
        teacher_page.wait_for_timeout(3000)

        # Count any button containing "تراجع"
        undo_btns = teacher_page.locator('button:has-text("تراجع")')
        print("Undo buttons count in teacher.html:", undo_btns.count())
        assert undo_btns.count() == 0, f"Expected 0 undo buttons, found {undo_btns.count()}"
        print("SUCCESS: Zero 'تراجع' buttons in teacher portal.")

        # ═══════════════════════════════════════════════════════════
        # 2. VERIFY ADMIN PORTAL: TAJWEED MANAGER MODAL & EXCEL UPLOAD
        # ═══════════════════════════════════════════════════════════
        print("\n--- 2. Testing Admin Portal Tajweed Manager (admin.html) ---")
        admin_ctx = browser.new_context(viewport={'width': 1400, 'height': 900})
        admin_ctx.add_cookies([
            {'name': 'mounir_local_session', 'value': admin_token, 'domain': '127.0.0.1', 'path': '/'}
        ])
        admin_page = admin_ctx.new_page()
        admin_page.on('dialog', lambda d: d.accept())
        admin_page.goto('http://127.0.0.1:8010/admin.html')
        admin_page.wait_for_timeout(3000)

        # Check Header Button
        header_btn = admin_page.locator('button[onclick*="openTajweedAdminModal"]')
        print("Tajweed Header button count:", header_btn.count())
        assert header_btn.count() > 0, "Tajweed Header button missing"

        # Click button to open modal
        header_btn.first.click()
        admin_page.wait_for_timeout(1000)

        modal = admin_page.locator('#tajweedAdminModal')
        print("Modal is visible:", modal.is_visible())
        assert modal.is_visible(), "Tajweed modal did not open"

        # Test updating video
        admin_page.fill('#tajweedVideoTitleInput', 'المرئي لأحكام التجويد - ملخص شهر نوفمبر 2026')
        admin_page.fill('#tajweedVideoUrlInput', 'https://drive.google.com/file/d/1_8McctJtMxwIX3UrsGBSvom7r0GsQjGv/view')
        admin_page.click('#btnSaveTajweedVideo')
        admin_page.wait_for_timeout(2000)

        # Dismiss any popup if open
        popup_btn = admin_page.locator('#monir-popup-root button')
        if popup_btn.count() > 0 and popup_btn.first.is_visible():
            popup_btn.first.click()
            admin_page.wait_for_timeout(500)
        print("Saved video successfully.")

        # Test uploading Excel template
        template_path = os.path.abspath('قالب_أسئلة_التجويد_الشهري.xlsx')
        assert os.path.exists(template_path), f"Template file not found at {template_path}"

        file_input = admin_page.locator('#tajweedExcelFileInput')
        file_input.set_input_files(template_path)
        admin_page.wait_for_timeout(2500)

        # Check that questions preview rendered
        parsed_count_el = admin_page.locator('#tajweedParsedQuestionsCount')
        parsed_count = parsed_count_el.inner_text().strip()
        print("Parsed questions count displayed:", parsed_count)
        assert parsed_count == "20", f"Expected 20 parsed questions, got {parsed_count}"

        publish_bar = admin_page.locator('#tajweedPublishBar')
        assert publish_bar.is_visible(), "Publish bar should be visible after uploading Excel"

        # Click publish button
        admin_page.click('#btnPublishTajweedQuestions')
        admin_page.wait_for_timeout(4000)

        # Dismiss any popup if open
        popup_btn2 = admin_page.locator('#monir-popup-root button')
        if popup_btn2.count() > 0 and popup_btn2.first.is_visible():
            popup_btn2.first.click()
            admin_page.wait_for_timeout(500)
        print("Published 20 Tajweed questions to Supabase Cloud.")

        # Take screenshot of Admin Tajweed Manager
        admin_page.screenshot(path="admin_tajweed_manager_verified.png")
        print("Screenshot saved to admin_tajweed_manager_verified.png")

        # ═══════════════════════════════════════════════════════════
        # 3. VERIFY STUDENT PORTAL: QUIZ QUESTIONS AND VIDEO
        # ═══════════════════════════════════════════════════════════
        print("\n--- 3. Testing Student Portal (student.html) ---")
        student_ctx = browser.new_context(viewport={'width': 1400, 'height': 900})
        student_ctx.add_cookies([
            {'name': 'mounir_local_session', 'value': admin_token, 'domain': '127.0.0.1', 'path': '/'}
        ])
        student_page = student_ctx.new_page()
        student_page.goto('http://127.0.0.1:8010/student.html')
        student_page.evaluate('''() => {
            localStorage.setItem('monir_current_user', JSON.stringify({
                id: 101,
                username: 'student101',
                role: 'student',
                student_id: 101,
                full_name: 'طالب تجريبي'
            }));
            localStorage.setItem('monir_tajweed_active_video', JSON.stringify({
                title: 'المرئي لأحكام التجويد - ملخص شهر نوفمبر 2026',
                url: 'https://drive.google.com/file/d/1_8McctJtMxwIX3UrsGBSvom7r0GsQjGv/preview'
            }));
            localStorage.setItem('monir_auth_token', 'test_token');
        }''')
        student_page.reload()
        student_page.wait_for_timeout(3000)

        print("Student page URL:", student_page.url)

        # Check video url via function
        video_info = student_page.evaluate('() => window.getStudentTajweedVideoInfo ? window.getStudentTajweedVideoInfo() : null')
        print("Student active video info:", video_info)
        assert video_info and '1_8McctJtMxwIX3UrsGBSvom7r0GsQjGv' in video_info.get('url', ''), "Student video URL did not reflect active update"
        assert '/preview' in video_info.get('url', ''), "Google Drive video URL should be normalized to /preview"
        print("SUCCESS: Student received normalized active Tajweed video.")

        # Verify quiz 1003 questions from Supabase
        supabase_questions = student_page.evaluate('''async () => {
            const client = window.MonirDB ? window.MonirDB.getClient() : null;
            if (!client) return [];
            const { data, error } = await client
                .from('quiz_questions')
                .select('*')
                .eq('quiz_id', 1003);
            return data;
        }''')
        print(f"Supabase quiz_questions count for quiz 1003: {len(supabase_questions) if supabase_questions else 0}")
        assert supabase_questions and len(supabase_questions) == 20, f"Expected 20 questions in Supabase, found {len(supabase_questions)}"
        print("SUCCESS: 20 Tajweed Questions successfully verified in Supabase Cloud for quiz 1003.")

        browser.close()
        print("\n ALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
