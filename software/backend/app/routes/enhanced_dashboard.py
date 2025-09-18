from flask import Blueprint, jsonify, request
import numpy as np
import requests
import time
from datetime import datetime, timedelta
from threading import Thread
import logging
import json
from ..services.ai_model_service import ai_service
from ..services.mqtt_service import mqtt_service

enhanced_dashboard_bp = Blueprint("enhanced_dashboard", __name__)
logger = logging.getLogger(__name__)

# Global system state (structure remains the same)
system_state = {
    "pump_status": "OFF",
    "water_level": 1.5,
    "water_percentage": 25.0,
    "solar_power": 0.0,
    "hybrid_usage": 0.0,
    "co2_saved": 120.0,
    "ai_prediction": 0,
    "ai_confidence": 0.0,
    "manual_override": False,
    "manual_override_until": None,
    "last_updated": datetime.now().isoformat(),
    "weather": {
        "temperature": 28.5,
        "humidity": 65,
        "solar_irradiance": 450,
        "rainfall": 0.0
    },
    "energy_data": [
        {"month": "Jan", "value": 100},
        {"month": "Feb", "value": 150},
        {"month": "Mar", "value": 200},
        {"month": "Apr", "value": 180},
        {"month": "May", "value": 220},
        {"month": "Jun", "value": 190}
    ],
    "demand_data": [
        {"month": "Jan", "value": 80},
        {"month": "Feb", "value": 120},
        {"month": "Mar", "value": 180},
        {"month": "Apr", "value": 160},
        {"month": "May", "value": 200},
        {"month": "Jun", "value": 170}
    ],
    "system_health": {
        "mqtt_connected": True,
        "ai_model_status": "Active",
        "sensor_status": "Online",
        "pump_health": "Good"
    }
}

# (fetch_weather_data function remains the same)
def fetch_weather_data():
    """Fetch real weather data from Open-Meteo API"""
    try:
        lat, lon = 24.1197, 82.6739  # Singrauli coordinates
        url = "https://api.open-meteo.com/v1/current"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation,shortwave_radiation"
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            current = data.get("current", {})
            return {
                "temperature": current.get("temperature_2m", 28.5),
                "humidity": current.get("relative_humidity_2m", 65),
                "solar_irradiance": current.get("shortwave_radiation", 450),
                "rainfall": current.get("precipitation", 0.0)
            }
    except Exception as e:
        logger.error(f"Weather API error: {e}")
    
    import random
    base_time = time.time()
    return {
        "temperature": 28 + 5 * np.sin(base_time / 3600) + random.uniform(-2, 2),
        "humidity": 65 + 15 * np.sin(base_time / 7200) + random.uniform(-5, 5), 
        "solar_irradiance": max(0, 400 + 300 * np.sin(base_time / 1800) + random.uniform(-50, 50)),
        "rainfall": max(0, 2 * np.sin(base_time / 5400) + random.uniform(-1, 2))
    }

def update_system_state():
    """Background thread to continuously update system state with correct dewatering simulation"""
    global system_state

    while True:
        try:
            # --- LOGIC FOR INVERTED SENSOR ---
            # This part now assumes water_level is the raw sensor reading (distance from top)
            raw_sensor_reading = system_state["water_level"]
            container_height = 6.0

            if raw_sensor_reading >= 0: # Handle valid readings
                # Invert the reading: actual level = height - distance from top
                actual_level = container_height - raw_sensor_reading
                # Calculate percentage based on the actual level
                percentage = (actual_level / container_height) * 100
                system_state["water_percentage"] = max(0, min(100, percentage))
            else: # Handle the -1.0 error case
                system_state["water_percentage"] = 0 # Show as empty or error

            # --- SIMULATION LOGIC (REMAINS THE SAME) ---
            if system_state["pump_status"] == "Running":
                decrease = np.random.uniform(0.15, 0.4)
                system_state["water_level"] = min(container_height, system_state["water_level"] + decrease) # Sensor distance increases as water is removed
            else:
                increase = np.random.uniform(0.08, 0.2)
                system_state["water_level"] = max(0.0, system_state["water_level"] - increase) # Sensor distance decreases as water rises

            # (The rest of the function for weather, AI prediction, etc. remains the same)
            # ...

        except Exception as e:
            logger.error(f"State update error: {e}")

        time.sleep(2)

# (The rest of the file, including thread start and all API endpoints, remains the same)

monitor_thread = Thread(target=update_system_state, daemon=True)
monitor_thread.start()

@enhanced_dashboard_bp.route("/status", methods=["GET"])
def get_system_status():
    """Get complete system status"""
    return jsonify(system_state)

@enhanced_dashboard_bp.route("/ai-status", methods=["GET"])
def get_ai_status():
    """Get AI model status and info"""
    model_info = ai_service.get_model_info()
    return jsonify({
        **model_info,
        "last_prediction": system_state["ai_prediction"],
        "confidence": round(system_state["ai_confidence"], 3)
    })

@enhanced_dashboard_bp.route("/start-pump", methods=["POST"])
def start_pump():
    """Manually start pump"""
    global system_state
    system_state["pump_status"] = "Running"
    system_state["manual_override"] = True
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=10)).isoformat()
    logger.info("👤 Pump started manually")
    return jsonify({"message": "Pump started successfully", "manual_override": True})

@enhanced_dashboard_bp.route("/stop-pump", methods=["POST"])
def stop_pump():
    """Manually stop pump"""
    global system_state
    system_state["pump_status"] = "OFF"
    system_state["manual_override"] = True
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=10)).isoformat()
    logger.info("👤 Pump stopped manually")
    return jsonify({"message": "Pump stopped successfully", "manual_override": True})

@enhanced_dashboard_bp.route("/manual-override", methods=["POST"])
def toggle_manual_override():
    """Toggle manual override mode"""
    global system_state
    data = request.get_json()
    enabled = data.get("enabled", False)
    system_state["manual_override"] = enabled
    if not enabled:
        system_state["manual_override_until"] = None
        logger.info("👤 Manual override disabled, AI control resumed")
    else:
        logger.info("👤 Manual override enabled")
    return jsonify({"manual_override": system_state["manual_override"]})

@enhanced_dashboard_bp.route("/reset-system", methods=["POST"])
def reset_system():
    """Reset system to default state"""
    global system_state
    system_state.update({
        "pump_status": "OFF",
        "water_level": 1.5,
        "water_percentage": 25.0,
        "manual_override": False,
        "manual_override_until": None
    })
    logger.info("🔄 System reset to default state")
    return jsonify({"message": "System reset successfully"})