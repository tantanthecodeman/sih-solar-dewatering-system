import joblib
import numpy as np

# Load trained model once
MODEL_PATH = "pump_rf_realworld (2).pkl"
rf_model = joblib.load(MODEL_PATH)

def predict_pump(features: dict) -> int:
    """
    Predict pump state based on input features.
    Features must include: water_level, rain, solar_historical, time_of_day, diesel_cost
    Returns: 0 (OFF) or 1 (ON)
    """
    try:
        X = np.array([[
            features.get("water_level", 0),
            features.get("rain", 0),
            features.get("solar_historical", 0),
            features.get("time_of_day", 0),
            features.get("diesel_cost", 0)
        ]])
        prediction = rf_model.predict(X)[0]
        return int(prediction)
    except Exception as e:
        print(f"Prediction error: {e}")
        return 0
