import sys
import os
sys.path.append(os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from main import app
from seed_data import seed_all

seed_all()
client = TestClient(app)

print("=== 1. TEST STUDENT PROFILE ===")
res = client.get("/api/student/1")
assert res.status_code == 200
data = res.json()
print("Student Name:", data["student"]["name"])
print("Unlocked Lectures:", data["student"]["total_lectures_unlocked"])
assert data["student"]["total_lectures_unlocked"] == 4

print("\n=== 2. TEST 4-LECTURE BLOCK UNLOCKING ===")
res = client.get("/api/student/1/lectures")
assert res.status_code == 200
lecs = res.json()["lectures"]
print(f"Total Lectures: {len(lecs)}")
for l in lecs:
    status_icon = "🔓" if l["is_unlocked"] else "🔒"
    print(f" - Lecture #{l['lecture_number']}: {l['title']} [{status_icon} Unlocked={l['is_unlocked']}]")
assert lecs[0]["is_unlocked"] == True
assert lecs[3]["is_unlocked"] == True
assert lecs[4]["is_unlocked"] == False # Lecture 5 locked!

print("\n=== 3. TEST GOOGLE MEET LIVE ATTENDANCE ===")
res = client.post("/api/lectures/3/join", json={"student_id": 1, "duration_minutes": 60})
assert res.status_code == 200
print("Join Result:", res.json()["message"])

print("\n=== 4. TEST POSTPONING LECTURE WITH NO-PENALTY NOTIFICATION ===")
res = client.post("/api/lectures/postpone", json={
    "lecture_id": 4,
    "new_scheduled_time": "2026-10-05 19:00",
    "reason": "تنسيق مواعيد مع المحاضر لضمان جودة البث المباشر"
})
assert res.status_code == 200
print("Postpone Result:", res.json()["message"])

# Check notifications
res = client.get("/api/student/1/notifications")
notifs = res.json()
print(f"Student Notifications count: {len(notifs)}")
print("Latest Notif Title:", notifs[0]["title"])
print("Latest Notif Body:", notifs[0]["message"])

print("\n=== 5. TEST PAYMOB RENEWAL TO UNLOCK LECTURES 5-8 ===")
res_check = client.post("/api/paymob/checkout", json={"student_id": 1, "block_to_unlock": 2, "payment_method": "card"})
assert res_check.status_code == 200
tx_id = res_check.json()["transaction_id"]
print("Paymob Transaction ID:", tx_id)

# Process Webhook
res_web = client.post("/api/paymob/webhook", json={"transaction_id": tx_id})
assert res_web.status_code == 200
print("Webhook Result:", res_web.json())

# Check that lectures 5 to 8 are now unlocked!
res = client.get("/api/student/1/lectures")
lecs = res.json()["lectures"]
print("\n=== AFTER PAYMOB RENEWAL: LECTURE UNLOCK STATUS ===")
for l in lecs:
    status_icon = "🔓" if l["is_unlocked"] else "🔒"
    print(f" - Lecture #{l['lecture_number']}: {l['title']} [{status_icon} Unlocked={l['is_unlocked']}]")
assert lecs[4]["is_unlocked"] == True # Lecture 5 now unlocked!
assert lecs[7]["is_unlocked"] == True # Lecture 8 now unlocked!

print("\n" + "="*60)
print("🎉 ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY!")
print("="*60)
