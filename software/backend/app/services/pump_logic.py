import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../pump_rf_realworld.pkl")
model = joblib.load(MODEL_PATH)

def decide_pump(data):
    # Example: preprocess input for ML model
    features = [[data["water_level"], data["rainfall"]]]
    prediction = model.predict(features)[0]

    return {"pump_state": int(prediction)}
