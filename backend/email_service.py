import os
import logging

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@nexusinstitute.com")

def send_email(to: str, subject: str, html_content: str) -> bool:
    if not SENDGRID_API_KEY:
        logger.info(f"[EMAIL MOCK] To: {to}, Subject: {subject}")
        logger.info(f"[EMAIL MOCK] SendGrid not configured. Email logged to console.")
        return True
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to,
            subject=subject,
            html_content=html_content
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False

def send_fee_reminder(to: str, student_name: str, course_name: str, amount: float, due_date: str) -> bool:
    subject = f"Fee Reminder - {course_name}"
    html = f"""
    <h2>Fee Payment Reminder</h2>
    <p>Dear {student_name},</p>
    <p>This is a reminder that your fee payment of <strong>${amount:.2f}</strong> 
    for <strong>{course_name}</strong> is due on <strong>{due_date}</strong>.</p>
    <p>Please make the payment at the earliest.</p>
    <p>Regards,<br>Nexus Institute</p>
    """
    return send_email(to, subject, html)

def send_assignment_notification(to: str, student_name: str, assignment_title: str, due_date: str) -> bool:
    subject = f"New Assignment: {assignment_title}"
    html = f"""
    <h2>New Assignment Posted</h2>
    <p>Dear {student_name},</p>
    <p>A new assignment <strong>{assignment_title}</strong> has been posted.</p>
    <p>Due date: <strong>{due_date}</strong></p>
    <p>Please submit before the deadline.</p>
    <p>Regards,<br>Nexus Institute</p>
    """
    return send_email(to, subject, html)

def send_announcement(to: str, student_name: str, title: str, message: str) -> bool:
    subject = f"Announcement: {title}"
    html = f"""
    <h2>{title}</h2>
    <p>Dear {student_name},</p>
    <p>{message}</p>
    <p>Regards,<br>Nexus Institute</p>
    """
    return send_email(to, subject, html)
