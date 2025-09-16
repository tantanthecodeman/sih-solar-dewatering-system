from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Import routes
    from .routes.dashboard import dashboard_bp
    from .routes.pump_control import pump_bp

    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(pump_bp, url_prefix="/api")

    return app
