from flask import Blueprint, jsonify

dashboard_bp = Blueprint("dashboard", __name__)

# Mock data for testing
status = {
    "pump_status": "OFF",   # default
    "solar": 12.5,          # kW
    "water": 65,            # cm
    "hybrid": 20,           # % Diesel
    "co2": 120,             # kg saved
    "energy": [
        {"month": "Jan", "value": 100},
        {"month": "Feb", "value": 150},
        {"month": "Mar", "value": 200},
    ],
    "demand": [
        {"month": "Jan", "value": 80},
        {"month": "Feb", "value": 120},
        {"month": "Mar", "value": 180},
    ],
}


@dashboard_bp.route("/api/status", methods=["GET"])
def get_status():
    return jsonify(status)
