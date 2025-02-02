from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from .config import Config
from .models import db
from .routes import api
import os

mail = Mail()

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../frontend/assets', static_url_path='/assets')
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app)
    db.init_app(app)
    JWTManager(app)
    mail.init_app(app)
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')
    
    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory('../frontend', 'index.html')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app