import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'solar-dewatering-secret-key-2024'
    DEBUG = os.environ.get('FLASK_DEBUG') or True
    
    # MQTT settings
    MQTT_BROKER = os.environ.get('MQTT_BROKER') or 'broker.emqx.io'
    MQTT_PORT = int(os.environ.get('MQTT_PORT') or 1883)
    MQTT_TOPIC = os.environ.get('MQTT_TOPIC') or 'mining/solar'
    MQTT_CLIENT_ID = os.environ.get('MQTT_CLIENT_ID') or 'solar_pump_backend'
    
    # Weather API settings
    NASA_POWER_API_BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    OPENMETEO_API_BASE = 'https://api.open-meteo.com/v1/forecast'
    
    # Mining site coordinates (Default: Singrauli)
    SITE_LATITUDE = float(os.environ.get('SITE_LATITUDE') or 24.1197)
    SITE_LONGITUDE = float(os.environ.get('SITE_LONGITUDE') or 82.6739)
    SITE_NAME = os.environ.get('SITE_NAME') or 'Singrauli Coalfield, MP'
    
    # AI Model settings
    MODEL_PATH = os.environ.get('MODEL_PATH') or 'models/pump_rf_realworld.pkl'
    PREDICTION_UPDATE_INTERVAL = int(os.environ.get('PREDICTION_UPDATE_INTERVAL') or 300)  # 5 minutes
    
    # Container settings (6cm container from your model)
    CONTAINER_HEIGHT = float(os.environ.get('CONTAINER_HEIGHT') or 6.0)  # cm
    PUMP_ON_THRESHOLD = float(os.environ.get('PUMP_ON_THRESHOLD') or 3.5)  # cm
    PUMP_OFF_THRESHOLD = float(os.environ.get('PUMP_OFF_THRESHOLD') or 2.0)  # cm
    
    # Redis settings (for caching)
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'