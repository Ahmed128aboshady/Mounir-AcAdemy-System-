import json
import sqlite3
import uuid
from datetime import datetime
from database import get_db

def create_paymob_order(
    student_id: int, 
    course_name: str, 
    block_to_unlock: int = 2, 
    payment_method: str = "card",
    package_id: str = None,
    package_name: str = None,
    credits_to_add: int = 4,
    amount: float = None
):
    """
    Creates a simulated Paymob order transaction for a specific course and package.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    if amount is None:
        pkg_prices = {
            'group_4': 400.0,
            'group_8': 500.0,
            'private_4_60': 1000.0,
            'private_4_30': 666.0
        }
        if package_id in pkg_prices:
            amount = pkg_prices[package_id]
        else:
            cursor.execute("SELECT price_per_block FROM courses WHERE name = ?", (course_name,))
            c_row = cursor.fetchone()
            amount = c_row["price_per_block"] if c_row else 500.0
    
    tx_id = f"PAYMOB-{uuid.uuid4().hex[:8].upper()}"
    receipt_no = f"REC-2026-{uuid.uuid4().hex[:6].upper()}"
    
    cursor.execute('''
    INSERT INTO payments (
        student_id, course_name, amount, currency, block_unlocked, 
        transaction_id, receipt_number, payment_method, status
    )
    VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?, 'pending')
    ''', (student_id, course_name, amount, block_to_unlock, tx_id, receipt_no, payment_method))
    
    payment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "payment_id": payment_id,
        "transaction_id": tx_id,
        "receipt_number": receipt_no,
        "course_name": course_name,
        "package_id": package_id,
        "package_name": package_name or "باقة تجديد الاشتراك",
        "credits_to_add": credits_to_add,
        "amount": amount,
        "currency": "EGP",
        "block_to_unlock": block_to_unlock
    }

def process_paymob_success(transaction_id: str, credits_to_add: int = 4, package_name: str = None):
    """
    Processes Paymob Webhook callback for a successful payment.
    Replenishes student credits (+credits_to_add), increments renewal_count, and sets formatted receipt.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT p.*, s.name as student_name, s.student_code, s.parent_name, s.parent_phone
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.transaction_id = ?
    """, (transaction_id,))
    payment = cursor.fetchone()
    if not payment:
        conn.close()
        return {"success": False, "error": "Transaction not found"}
        
    student_id = payment["student_id"]
    course_name = payment["course_name"]
    student_name = payment["student_name"]
    student_code = payment["student_code"]
    receipt_no = payment["receipt_number"] or f"REC-2026-{uuid.uuid4().hex[:6].upper()}"
    amount = payment["amount"]
    pkg_title = package_name or "باقة تجديد الاشتراك"
    
    wa_msg = f"إيصال سداد أكاديمية منير الذكية\nرقم الإيصال: {receipt_no}\nالطالب: {student_name} ({student_code})\nالمسار: {course_name}\nالباقة: {pkg_title}\nالرصيد المضاف: +{credits_to_add} حصص\nالمبلغ: {amount} ج.م\nرقم المعاملة: {transaction_id}\nالحالة: مدفوع بنجاح وتم شحن الرصيد فوراً."
    
    # 1. Update Payment status
    cursor.execute("""
    UPDATE payments 
    SET status = 'completed', receipt_number = ?, whatsapp_message = ?
    WHERE transaction_id = ?
    """, (receipt_no, wa_msg, transaction_id))
    
    # 2. Update Enrollment for that course & replenish remaining_credits (+credits_to_add)
    cursor.execute('''
    UPDATE enrollments 
    SET total_lectures_unlocked = total_lectures_unlocked + ?, renewal_count = renewal_count + 1, remaining_credits = remaining_credits + ?, excuse_count = 0
    WHERE student_id = ? AND course_name = ?
    ''', (credits_to_add, credits_to_add, student_id, course_name))
    
    # 3. Add celebratory notification
    cursor.execute('''
    INSERT INTO notifications (student_id, course_name, title, message, type, action_url)
    VALUES (
        ?,
        ?,
        ?,
        ?,
        'renewal',
        '/student.html'
    )
    ''', (
        student_id,
        course_name,
        f'تم تجديد الاشتراك بنجاح ({pkg_title})',
        f'شكراً لك! تم استلام رسوم التجديد ({amount} ج.م) بموجب إيصال #{receipt_no} وشحن +{credits_to_add} حصص لرصيدك فوراً.'
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Successfully recharged {credits_to_add} credits for {course_name}",
        "course_name": course_name,
        "package_name": pkg_title,
        "credits_added": credits_to_add,
        "amount": amount,
        "receipt_number": receipt_no,
        "whatsapp_message": wa_msg,
        "receipt": {
            "receipt_number": receipt_no,
            "student_name": student_name,
            "student_code": student_code,
            "course_name": course_name,
            "package_name": pkg_title,
            "credits_added": credits_to_add,
            "amount": amount,
            "created_at": datetime.now().isoformat()
        }
    }

