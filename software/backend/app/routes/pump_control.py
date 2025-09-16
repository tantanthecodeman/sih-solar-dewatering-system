from flask import Blueprint, jsonify

pump_bp = Blueprint("pump", __name__)

@pump_bp.route("/start-pump", methods=["POST"])
def start_pump():
    return jsonify({"message": "Pump started successfully"}), 200

@pump_bp.route("/stop-pump", methods=["POST"])
def stop_pump():
    return jsonify({"message": "Pump stopped successfully"}), 200
