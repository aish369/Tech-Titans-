from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
from .models import db, User, Complaint, Notification
from .utils import send_notification_email, allowed_file

api = Blueprint('api', __name__)

# Authentication Routes
@api.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and user.check_password(data['password']) and user.user_type == data['userType']:
        token = create_access_token(identity=user.id)
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'userType': user.user_type,
                'hostelBlock': user.hostel_block,
                'roomNumber': user.room_number
            }
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@api.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    # Frontend will handle token removal
    return jsonify({'message': 'Logged out successfully'})

# Dashboard Routes
@api.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_type == 'student':
        complaints = Complaint.query.filter_by(user_id=user_id)
    else:
        complaints = Complaint.query
    
    return jsonify({
        'total': complaints.count(),
        'pending': complaints.filter_by(status='pending').count(),
        'inProgress': complaints.filter_by(status='inProgress').count(),
        'resolved': complaints.filter_by(status='resolved').count(),
        'emergency': complaints.filter_by(type='emergency').count(),
        'medical': complaints.filter_by(type='medical').count(),
        'maintenance': complaints.filter_by(type='maintenance').count()
    })

# Complaint Routes
@api.route('/complaints', methods=['POST'])
@jwt_required()
def create_complaint():
    user_id = get_jwt_identity()
    
    title = request.form.get('title')
    description = request.form.get('description')
    complaint_type = request.form.get('type')
    
    complaint = Complaint(
        title=title,
        description=description,
        type=complaint_type,
        user_id=user_id
    )
    
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
            complaint.image_url = filename
    
    db.session.add(complaint)
    db.session.commit()
    
    # Create notification for wardens if emergency
    if complaint_type == 'emergency':
        wardens = User.query.filter_by(user_type='warden').all()
        for warden in wardens:
            notification = Notification(
                user_id=warden.id,
                message=f"New emergency complaint: {title}",
                complaint_id=complaint.id
            )
            db.session.add(notification)
            send_notification_email(warden.email, "Emergency Complaint", notification.message)
    
    db.session.commit()
    return jsonify({'message': 'Complaint created successfully', 'id': complaint.id})

@api.route('/complaints', methods=['GET'])
@jwt_required()
def get_complaints():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    complaint_type = request.args.get('type')
    
    query = Complaint.query
    
    if user.user_type == 'student':
        query = query.filter_by(user_id=user_id)
    
    if status:
        query = query.filter_by(status=status)
    if complaint_type:
        query = query.filter_by(type=complaint_type)
    
    complaints = query.order_by(Complaint.timestamp.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'complaints': [{
            'id': c.id,
            'title': c.title,
            'description': c.description,
            'type': c.type,
            'status': c.status,
            'timestamp': c.timestamp.isoformat(),
            'image_url': c.image_url,
            'user': {
                'name': c.user.name,
                'hostelBlock': c.user.hostel_block,
                'roomNumber': c.user.room_number
            }
        } for c in complaints.items],
        'total': complaints.total,
        'pages': complaints.pages,
        'current_page': complaints.page
    })

# Notification Routes
@api.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).order_by(Notification.timestamp.desc()).all()
    
    return jsonify([{
        'id': n.id,
        'message': n.message,
        'timestamp': n.timestamp.isoformat(),
        'complaintId': n.complaint_id
    } for n in notifications])

@api.route('/notifications/mark-read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    user_id = get_jwt_identity()
    notification_ids = request.json.get('notificationIds', [])
    
    Notification.query.filter(
        Notification.id.in_(notification_ids),
        Notification.user_id == user_id
    ).update({'is_read': True}, synchronize_session=False)
    
    db.session.commit()
    return jsonify({'message': 'Notifications marked as read'})