import joblib
import numpy as np
import pandas as pd
import os
import pickle
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIModelService:
    def __init__(self):
        self.model = None
        self.model_path = None
        self.features = ["water_level", "rain", "solar_historical", "time_of_day", "diesel_cost"]
        self.container_height = 6.0  # cm
        self.pump_on_threshold = 3.5  # cm
        self.load_model()
    
    def load_model(self):
        """Try to load the trained AI model from various locations"""
        possible_paths = [
            "pump_rf_realworld.pkl",
            "models/pump_rf_realworld.pkl", 
            "../pump_rf_realworld.pkl",
            "../../pump_rf_realworld.pkl",
            os.path.join(os.path.dirname(__file__), "../../pump_rf_realworld.pkl"),
            os.path.join(os.path.dirname(__file__), "../../../pump_rf_realworld.pkl"),
            "pump_rf_realworld (2).pkl",  # Alternative name from your code
            "../pump_rf_realworld (2).pkl"
        ]
        
        for path in possible_paths:
            if self._try_load_model(path):
                return True
        
        logger.warning("No pre-trained model found. Creating fallback model...")
        self._create_fallback_model()
        return False
    
    def _try_load_model(self, path):
        """Try to load model from a specific path"""
        try:
            if os.path.exists(path):
                self.model = joblib.load(path)
                self.model_path = path
                logger.info(f"✅ AI Model loaded successfully from: {path}")
                
                # Validate model
                test_features = np.array([[3.5, 0.5, 400, 2, 18.5]])
                prediction = self.model.predict(test_features)
                logger.info(f"Model validation: Input {test_features[0]} → Output {prediction[0]}")
                
                return True
        except Exception as e:
            logger.error(f"❌ Failed to load model from {path}: {e}")
        return False
    
    def _create_fallback_model(self):
        """Create a simple fallback model if no trained model is available"""
        try:
            logger.info("Creating fallback RandomForest model...")
            
            # Generate synthetic training data for 6cm container
            np.random.seed(42)
            n_samples = 1000
            
            # Features: water_level, rain, solar_historical, time_of_day, diesel_cost  
            X = np.random.rand(n_samples, 5)
            X[:, 0] = np.random.uniform(0, 6, n_samples)  # water_level (0-6 cm)
            X[:, 1] = np.random.exponential(1, n_samples)  # rain (mm)
            X[:, 2] = np.random.uniform(0, 800, n_samples)  # solar (W/m²)
            X[:, 3] = np.random.randint(0, 4, n_samples)  # time_of_day (0-3)
            X[:, 4] = np.random.uniform(15, 20, n_samples)  # diesel_cost
            
            # Target: pump_on logic for 6cm container
            y = np.zeros(n_samples)
            for i in range(n_samples):
                water_level = X[i, 0]
                rain = X[i, 1]
                solar = X[i, 2]
                
                # Pump ON if water level >= 3.5cm AND power available
                if (water_level >= self.pump_on_threshold and 
                    water_level <= self.container_height and
                    (solar > 150 or rain > 2)):
                    y[i] = 1
            
            # Train fallback model
            self.model = RandomForestClassifier(n_estimators=50, random_state=42)
            self.model.fit(X, y)
            
            logger.info(f"✅ Fallback model created with {n_samples} synthetic samples")
            logger.info(f"Pump ON rate: {y.mean()*100:.1f}%")
            
        except Exception as e:
            logger.error(f"Failed to create fallback model: {e}")
            self.model = None
    
    def predict(self, features_dict):
        """Make pump prediction based on input features"""
        try:
            if self.model is None:
                return self._fallback_prediction(features_dict)
            
            # Extract features in correct order
            feature_values = [
                features_dict.get("water_level", 0),
                features_dict.get("rain", 0),
                features_dict.get("solar_historical", 0),
                features_dict.get("time_of_day", 0),
                features_dict.get("diesel_cost", 18.5)
            ]
            
            X = np.array([feature_values])
            
            # Get prediction
            prediction = self.model.predict(X)[0]
            
            # Get confidence if available
            try:
                probabilities = self.model.predict_proba(X)[0]
                if len(probabilities) == 2:
                    confidence = probabilities[1] if prediction == 1 else probabilities[0]
                else:
                    confidence = probabilities[0]
            except:
                confidence = 0.8  # Default confidence
            
            logger.info(f"AI Prediction: {feature_values} → {prediction} (conf: {confidence:.3f})")
            
            return int(prediction), float(confidence)
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return self._fallback_prediction(features_dict)
    
    def _fallback_prediction(self, features_dict):
        """Simple rule-based prediction if AI model fails"""
        water_level = features_dict.get("water_level", 0)
        solar = features_dict.get("solar_historical", 0)
        rain = features_dict.get("rain", 0)
        
        # Simple logic for 6cm container
        if water_level >= self.pump_on_threshold and water_level <= self.container_height:
            if solar > 150 or rain > 2:  # Power source available
                return 1, 0.85  # Pump ON
        
        return 0, 0.90  # Pump OFF
    
    def get_model_info(self):
        """Get information about the loaded model"""
        return {
            "model_loaded": self.model is not None,
            "model_path": self.model_path,
            "model_type": type(self.model).__name__ if self.model else "None",
            "features": self.features,
            "container_height": self.container_height,
            "pump_threshold": self.pump_on_threshold
        }

# Singleton instance
ai_service = AIModelService()