from flask import Blueprint, jsonify, request
import numpy as np
import requests
import time
from datetime import datetime, timedelta
from threading import Thread
import logging
from ..services.ai_model_service import ai_service

enhanced_dashboard_bp = Blueprint("enhanced_dashboard", __name__)
logger = logging.getLogger(__name__)

# Global system state
system_state = {
    "pump_status": "OFF",
    "water_level": 3.5,  # cm
    "water_percentage": 58.3,
    "solar_power": 0.0,  # kW
    "hybrid_usage": 0.0,  # % diesel
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
    
    # Return synthetic data on failure
    import random
    return {
        "temperature": round(random.uniform(25, 35), 1),
        "humidity": round(random.uniform(40, 80), 1), 
        "solar_irradiance": round(random.uniform(100, 800), 1),
        "rainfall": round(random.uniform(0, 5), 1)
    }

def update_system_state():
    """Background thread to continuously update system state"""
    global system_state
    
    while True:
        try:
            # Simulate water level changes
            if system_state["pump_status"] == "Running":
                # Water level increases when pump is running
                system_state["water_level"] = min(6.0, 
                    system_state["water_level"] + np.random.uniform(0.1, 0.3))
            else:
                # Water level decreases slowly when pump is off
                system_state["water_level"] = max(0.0,
                    system_state["water_level"] - np.random.uniform(0.05, 0.15))
            
            system_state["water_percentage"] = (system_state["water_level"] / 6.0) * 100
            
            # Update weather data
            weather = fetch_weather_data()
            system_state["weather"] = weather
            
            # Make AI prediction
            features = {
                "water_level": system_state["water_level"],
                "rain": weather["rainfall"],
                "solar_historical": weather["solar_irradiance"] * 0.001,  # Convert to kWh/m²
                "time_of_day": (datetime.now().hour // 6) % 4,
                "diesel_cost": 18.5
            }
            
            prediction, confidence = ai_service.predict(features)
            system_state["ai_prediction"] = prediction
            system_state["ai_confidence"] = confidence
            
            # Update solar power based on irradiance
            system_state["solar_power"] = round(weather["solar_irradiance"] * 0.015, 1)
            
            # Update hybrid usage (inversely related to solar)
            if weather["solar_irradiance"] < 200:
                system_state["hybrid_usage"] = min(80, 
                    system_state["hybrid_usage"] + np.random.uniform(2, 8))
            else:
                system_state["hybrid_usage"] = max(0,
                    system_state["hybrid_usage"] - np.random.uniform(1, 4))
            
            system_state["hybrid_usage"] = round(system_state["hybrid_usage"], 1)
            
            # Update CO2 savings
            system_state["co2_saved"] += np.random.uniform(0.1, 0.5)
            system_state["co2_saved"] = round(system_state["co2_saved"], 1)
            
            # Auto control logic (if not in manual override)
            if not system_state["manual_override"]:
                current_time = datetime.now()
                if (system_state.get("manual_override_until") and 
                    current_time > datetime.fromisoformat(system_state["manual_override_until"])):
                    system_state["manual_override"] = False
                    system_state["manual_override_until"] = None
                    logger.info("Manual override period ended, resuming AI control")
                
                # AI-based pump control
                if prediction == 1 and system_state["pump_status"] != "Running":
                    system_state["pump_status"] = "Running"
                    logger.info(f"🤖 AI started pump: Water {system_state['water_level']:.2f}cm")
                elif prediction == 0 and system_state["pump_status"] == "Running":
                    system_state["pump_status"] = "OFF"
                    logger.info(f"🤖 AI stopped pump: Water {system_state['water_level']:.2f}cm")
            
            system_state["last_updated"] = datetime.now().isoformat()
            
        except Exception as e:
            logger.error(f"State update error: {e}")
        
        time.sleep(2)  # Update every 2 seconds

# Start background monitoring
monitor_thread = Thread(target=update_system_state, daemon=True)
monitor_thread.start()

@enhanced_dashboard_bp.route("/status", methods=["GET"])
def get_system_status():
    """Get complete system status"""
    return jsonify({
        "pump_status": system_state["pump_status"],
        "water_level": system_state["water_level"],
        "water_percentage": system_state["water_percentage"],
        "solar": system_state["solar_power"],
        "hybrid": system_state["hybrid_usage"], 
        "co2_saved": system_state["co2_saved"],
        "ai_prediction": system_state["ai_prediction"],
        "ai_confidence": system_state["ai_confidence"],
        "manual_override": system_state["manual_override"],
        "manual_override_until": system_state.get("manual_override_until"),
        "last_updated": system_state["last_updated"],
        "weather": system_state["weather"],
        "energy": system_state["energy_data"],
        "demand": system_state["demand_data"],
        "system_health": system_state["system_health"]
    })

@enhanced_dashboard_bp.route("/ai-status", methods=["GET"])
def get_ai_status():
    """Get AI model status and info"""
    model_info = ai_service.get_model_info()
    return jsonify({
        **model_info,
        "last_prediction": system_state["ai_prediction"],
        "confidence": system_state["ai_confidence"]
    })

@enhanced_dashboard_bp.route("/start-pump", methods=["POST"])
def start_pump():
    """Manually start pump"""
    global system_state
    
    system_state["pump_status"] = "Running"
    system_state["manual_override"] = True
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=10)).isoformat()
    
    logger.info("Pump started manually")
    return jsonify({
        "message": "Pump started successfully",
        "manual_override": True,
        "ai_resumes_at": system_state["manual_override_until"]
    })

@enhanced_dashboard_bp.route("/stop-pump", methods=["POST"])
def stop_pump():
    """Manually stop pump"""
    global system_state
    
    system_state["pump_status"] = "OFF"
    system_state["manual_override"] = True
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=10)).isoformat()
    
    logger.info("Pump stopped manually")
    return jsonify({
        "message": "Pump stopped successfully",
        "manual_override": True,
        "ai_resumes_at": system_state["manual_override_until"]
    })

@enhanced_dashboard_bp.route("/manual-override", methods=["POST"])
def toggle_manual_override():
    """Toggle manual override mode"""
    global system_state
    
    data = request.get_json()
    enabled = data.get("enabled", False)
    
    system_state["manual_override"] = enabled
    if not enabled:
        system_state["manual_override_until"] = None
    
    return jsonify({
        "manual_override": system_state["manual_override"],
        "message": f"Manual override {'enabled' if enabled else 'disabled'}"
    })

@enhanced_dashboard_bp.route("/reset-system", methods=["POST"])
def reset_system():
    """Reset system to default state"""
    global system_state
    
    system_state.update({
        "pump_status": "OFF",
        "water_level": 3.5,
        "water_percentage": 58.3,
        "hybrid_usage": 0,
        "manual_override": False,
        "manual_override_until": None
    })
    
    return jsonify({"message": "System reset successfully"})