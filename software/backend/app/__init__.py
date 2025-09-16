from flask import Flask
from flask_cors import CORS
import logging
import os

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all domains and routes
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Import and register blueprints
    from .routes.enhanced_dashboard import enhanced_dashboard_bp
    from .routes.pump_control import pump_bp
    
    app.register_blueprint(enhanced_dashboard_bp, url_prefix="/api")
    app.register_blueprint(pump_bp, url_prefix="/api")
    
    @app.route("/")
    def health_check():
        return {
            "status": "healthy",
            "service": "Solar Dewatering System API",
            "version": "1.0.0"
        }
    
    @app.route("/api/health")
    def api_health():
        return {
            "api_status": "online",
            "ai_model": "loaded",
            "endpoints": [
                "/api/status",
                "/api/ai-status", 
                "/api/start-pump",
                "/api/stop-pump",
                "/api/manual-override",
                "/api/reset-system"
            ]
        }
    
    return app