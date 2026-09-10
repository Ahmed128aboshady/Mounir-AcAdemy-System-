import json
import sqlite3
import uuid
from datetime import datetime
from database import get_db

def create_paymob_order(student_id: int, course_name: str, block_to_unlock: int = 2, payment_method: str = "card"):
    """
    Creates a simulated Paymob order transaction for a specific course.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get course price
    cursor.execute("SELECT price_per_block FROM courses WHERE name = ?", (course_name,))
    c_row = cursor.fetchone()
    amount = c_row["price_per_block"] if c_row else 450.0
    
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
        "amount": amount,
        "currency": "EGP",
        "block_to_unlock": block_to_unlock
    }

def process_paymob_success(transaction_id: str):
    """
    Processes Paymob Webhook callback for a successful payment.
    Unlocks Block 2 (Lectures 5-8), replenishes Quran credits (+4), and sets formatted receipt.
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
    block_unlocked = payment["block_unlocked"]
    student_name = payment["student_name"]
    receipt_no = payment["receipt_number"] or f"REC-2026-{uuid.uuid4().hex[:6].upper()}"
    amount = payment["amount"]
    
    wa_msg = f"إيصال سداد أكاديمية منير الذكية\nرقم الإيصال: {receipt_no}\nالطالب: {student_name} ({payment['student_code']})\nالمسار: {course_name}\nالمبلغ: {amount} ج.م\nرقم المعاملة: {transaction_id}\nالحالة: مدفوع بنجاح وتم فتح المرحلة {block_unlocked}."
    
    # 1. Update Payment status
    cursor.execute("""
    UPDATE payments 
    SET status = 'completed', receipt_number = ?, whatsapp_message = ?
    WHERE transaction_id = ?
    """, (receipt_no, wa_msg, transaction_id))
    
    # 2. Update Enrollment for that course & replenish remaining_credits (+4)
    cursor.execute('''
    UPDATE enrollments 
    SET unlocked_blocks = ?, total_lectures_unlocked = ?, renewal_count = renewal_count + 1, remaining_credits = remaining_credits + 4, excuse_count = 0
    WHERE student_id = ? AND course_name = ?
    ''', (block_unlocked, block_unlocked * 4, student_id, course_name))
    
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
        f'تم تجديد مسار ({course_name}) بنجاح',
        f'شكراً لك! تم استلام رسوم التجديد ({amount} ج.م) بموجب إيصال #{receipt_no} وتفعيل المرحلة {block_unlocked} فوراً.'
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Block {block_unlocked} unlocked successfully for {course_name}",
        "course_name": course_name,
        "receipt_number": receipt_no,
        "whatsapp_message": wa_msg,
        "total_lectures_unlocked": block_unlocked * 4
    }

