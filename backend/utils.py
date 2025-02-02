from flask_mail import Message
from flask import current_app
from threading import Thread
import os

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def send_async_email(app, msg):
    with app.app_context():
        mail.send(msg)

def send_notification_email(to, subject, body):
    app = current_app._get_current_object()
    msg = Message(subject,
                  sender=app.config['MAIL_USERNAME'],
                  recipients=[to])
    msg.body = body
    Thread(target=send_async_email, args=(app, msg)).start()

def schedule_escalation_check():
    """Schedule periodic checks for complaint escalation"""
    from apscheduler.schedulers.background import BackgroundScheduler
    from .routes import check_escalations
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=check_escalations, trigger="interval", minutes=5)
    scheduler.start()