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
    "water_level": 1.5,  # Start with low water level to see changes
    "water_percentage": 25.0,  # Corresponding percentage
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
    
    # Return synthetic dynamic data on failure
    import random
    base_time = time.time()
    return {
        "temperature": 28 + 5 * np.sin(base_time / 3600) + random.uniform(-2, 2),
        "humidity": 65 + 15 * np.sin(base_time / 7200) + random.uniform(-5, 5), 
        "solar_irradiance": max(0, 400 + 300 * np.sin(base_time / 1800) + random.uniform(-50, 50)),
        "rainfall": max(0, 2 * np.sin(base_time / 5400) + random.uniform(-1, 2))
    }

def update_system_state():
    """Background thread to continuously update system state with more realistic simulation"""
    global system_state
    
    while True:
        try:
            current_time = time.time()
            
            # More realistic water level simulation
            if system_state["pump_status"] == "Running":
                # Water level increases when pump is running (faster rate)
                increase = np.random.uniform(0.15, 0.4)  # More noticeable increase
                system_state["water_level"] = min(6.0, system_state["water_level"] + increase)
                logger.info(f"💧 Pump running - Water level: {system_state['water_level']:.2f}cm (+{increase:.2f})")
            else:
                # Water level decreases when pump is off (natural drainage/evaporation)
                decrease = np.random.uniform(0.08, 0.2)  # Noticeable decrease
                system_state["water_level"] = max(0.0, system_state["water_level"] - decrease)
                logger.info(f"💧 Pump off - Water level: {system_state['water_level']:.2f}cm (-{decrease:.2f})")
            
            # Update percentage based on 6cm container
            system_state["water_percentage"] = (system_state["water_level"] / 6.0) * 100
            
            # Update weather data
            weather = fetch_weather_data()
            system_state["weather"] = weather
            
            # Make AI prediction with current features
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
            
            # Update solar power based on irradiance (more realistic)
            system_state["solar_power"] = round(weather["solar_irradiance"] * 0.012, 2)  # Adjusted scaling
            
            # Update hybrid usage (inversely related to solar)
            if weather["solar_irradiance"] < 200:
                system_state["hybrid_usage"] = min(80, 
                    system_state["hybrid_usage"] + np.random.uniform(1, 5))
            else:
                system_state["hybrid_usage"] = max(0,
                    system_state["hybrid_usage"] - np.random.uniform(0.5, 2))
            
            system_state["hybrid_usage"] = round(system_state["hybrid_usage"], 1)
            
            # Update CO2 savings
            system_state["co2_saved"] += np.random.uniform(0.05, 0.3)
            system_state["co2_saved"] = round(system_state["co2_saved"], 1)
            
            # Auto control logic (if not in manual override)
            if not system_state["manual_override"]:
                current_datetime = datetime.now()
                if (system_state.get("manual_override_until") and 
                    current_datetime > datetime.fromisoformat(system_state["manual_override_until"])):
                    system_state["manual_override"] = False
                    system_state["manual_override_until"] = None
                    logger.info("⏰ Manual override period ended, resuming AI control")
                
                # Enhanced AI-based pump control with hysteresis
                water_level = system_state["water_level"]
                current_pump_status = system_state["pump_status"]
                
                if prediction == 1 and current_pump_status != "Running":
                    if water_level <= 3.5:  # Only turn on if water is actually low
                        system_state["pump_status"] = "Running"
                        logger.info(f"🤖 AI started pump: Water {water_level:.2f}cm (prediction: {prediction})")
                elif prediction == 0 and current_pump_status == "Running":
                    if water_level >= 4.5:  # Hysteresis - only turn off when sufficiently full
                        system_state["pump_status"] = "OFF"
                        logger.info(f"🤖 AI stopped pump: Water {water_level:.2f}cm (prediction: {prediction})")
                
                # Emergency logic - always pump if critically low
                if water_level <= 1.0 and current_pump_status != "Running":
                    system_state["pump_status"] = "Running"
                    logger.warning(f"🚨 Emergency pump activation: Critical water level {water_level:.2f}cm")
                
                # Safety logic - stop pump if tank is full
                if water_level >= 5.8 and current_pump_status == "Running":
                    system_state["pump_status"] = "OFF"
                    logger.warning(f"🛑 Safety pump stop: Tank nearly full {water_level:.2f}cm")
            
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
        "water_level": round(system_state["water_level"], 2),
        "water_percentage": round(system_state["water_percentage"], 1),
        "solar": system_state["solar_power"],
        "hybrid": system_state["hybrid_usage"], 
        "co2_saved": system_state["co2_saved"],
        "ai_prediction": system_state["ai_prediction"],
        "ai_confidence": round(system_state["ai_confidence"], 3),
        "manual_override": system_state["manual_override"],
        "manual_override_until": system_state.get("manual_override_until"),
        "last_updated": system_state["last_updated"],
        "weather": {
            "temperature": round(system_state["weather"]["temperature"], 1),
            "humidity": round(system_state["weather"]["humidity"], 0),
            "solar_irradiance": round(system_state["weather"]["solar_irradiance"], 0),
            "rainfall": round(system_state["weather"]["rainfall"], 1)
        },
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
        "confidence": round(system_state["ai_confidence"], 3)
    })

@enhanced_dashboard_bp.route("/start-pump", methods=["POST"])
def start_pump():
    """Manually start pump"""
    global system_state
    
    system_state["pump_status"] = "Running"
    system_state["manual_override"] = True
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=5)).isoformat()
    
    logger.info("👤 Pump started manually")
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
    system_state["manual_override_until"] = (datetime.now() + timedelta(minutes=5)).isoformat()
    
    logger.info("👤 Pump stopped manually")
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
        logger.info("👤 Manual override disabled, AI control resumed")
    else:
        logger.info("👤 Manual override enabled")
    
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
        "water_level": 1.5,  # Start with low level for testing
        "water_percentage": 25.0,
        "hybrid_usage": 0,
        "manual_override": False,
        "manual_override_until": None
    })
    
    logger.info("🔄 System reset to default state")
    return jsonify({"message": "System reset successfully"})

# Test endpoints for debugging
@enhanced_dashboard_bp.route("/test/set-water-level", methods=["POST"])
def set_test_water_level():
    """Test endpoint to set water level manually"""
    global system_state
    
    data = request.get_json()
    level = float(data.get("level", 3.5))
    level = max(0, min(6.0, level))  # Clamp between 0-6
    
    system_state["water_level"] = level
    system_state["water_percentage"] = (level / 6.0) * 100
    
    logger.info(f"🧪 Test: Water level set to {level:.2f}cm")
    return jsonify({
        "message": f"Water level set to {level:.2f}cm",
        "water_level": level,
        "water_percentage": system_state["water_percentage"]
    })

@enhanced_dashboard_bp.route("/test/simulate-scenario", methods=["POST"])
def simulate_scenario():
    """Simulate different water level scenarios"""
    global system_state
    
    data = request.get_json()
    scenario = data.get("scenario", "normal")
    
    scenarios = {
        "low": {"water_level": 1.0, "pump_status": "OFF"},
        "critical": {"water_level": 0.5, "pump_status": "Running"},
        "optimal": {"water_level": 4.0, "pump_status": "OFF"},
        "full": {"water_level": 5.5, "pump_status": "OFF"},
        "normal": {"water_level": 3.5, "pump_status": "OFF"}
    }
    
    if scenario in scenarios:
        system_state.update(scenarios[scenario])
        system_state["water_percentage"] = (system_state["water_level"] / 6.0) * 100
        logger.info(f"🧪 Simulating scenario: {scenario}")
        
        return jsonify({
            "message": f"Scenario '{scenario}' activated",
            "water_level": system_state["water_level"],
            "pump_status": system_state["pump_status"]
        })
    
    return jsonify({"error": "Invalid scenario"}), 400