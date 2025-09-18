import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'solar-dewatering-secret-key-2025'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # AI Model settings
    AI_MODEL_PATH = os.environ.get('AI_MODEL_PATH', 'pump_rf_realworld (2).pkl')
    CONTAINER_HEIGHT = float(os.environ.get('CONTAINER_HEIGHT', '6.0'))
    PUMP_ON_THRESHOLD = float(os.environ.get('PUMP_ON_THRESHOLD', '3.5'))
    
    # API settings
    API_TIMEOUT = int(os.environ.get('API_TIMEOUT', '10'))
    UPDATE_INTERVAL = int(os.environ.get('UPDATE_INTERVAL', '2'))
    
    # Mining site coordinates (Singrauli by default)
    SITE_LATITUDE = float(os.environ.get('SITE_LATITUDE', '24.1197'))
    SITE_LONGITUDE = float(os.environ.get('SITE_LONGITUDE', '82.6739'))
    SITE_NAME = os.environ.get('SITE_NAME', 'Singrauli Coalfield, MP')
    
    # Manual override settings
    MANUAL_OVERRIDE_DURATION = timedelta(minutes=int(os.environ.get('MANUAL_OVERRIDE_MINUTES', '10')))
    
    # MQTT settings (for future hardware integration)
    MQTT_BROKER = os.environ.get('MQTT_BROKER', 'localhost')
    MQTT_PORT = int(os.environ.get('MQTT_PORT', '1883'))
    MQTT_USERNAME = os.environ.get('MQTT_USERNAME', '')
    MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD', '')
    
    # Database settings (for data logging)
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///solar_dewatering.db')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'change-this-in-production'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}