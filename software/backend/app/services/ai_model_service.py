import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIModelService:
    def __init__(self, dataset_path="pump_predictions (3).csv", model_path="trained_model.pkl"):
        self.dataset_path = dataset_path
        self.model_path = model_path
        self.model = None
        # These are the feature columns the model will use for prediction.
        # Your CSV must contain these columns.
        self.features = ["water_level", "rain", "solar_historical", "time_of_day", "diesel_cost"]
        # This is the column the model will learn to predict from your CSV.
        self.target = "pump_state"

        self.load_or_train_model()

    def load_or_train_model(self):
        """
        Tries to load a pre-trained model. If it doesn't exist, it trains a new
        model from the CSV dataset and saves it.
        """
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                logger.info(f"✅ Successfully loaded pre-trained model from: {self.model_path}")
            elif os.path.exists(self.dataset_path):
                logger.warning(f"'{self.model_path}' not found. Training new model from '{self.dataset_path}'...")
                self._train_model_from_csv()
            else:
                logger.error(f"FATAL: No model '{self.model_path}' or dataset '{self.dataset_path}' found. AI service cannot operate.")
        except Exception as e:
            logger.error(f"❌ Error during model loading or training: {e}")

    def _train_model_from_csv(self):
        """
        Loads the CSV, trains the RandomForest model, and saves it to a .pkl file.
        """
        try:
            # Load the dataset using pandas
            df = pd.read_csv(self.dataset_path)
            logger.info(f"Loaded dataset with {len(df)} rows.")

            # Ensure all required columns are present
            required_columns = self.features + [self.target]
            if not all(col in df.columns for col in required_columns):
                missing = set(required_columns) - set(df.columns)
                raise ValueError(f"CSV file is missing required columns: {missing}")

            # Separate features (X) and the target variable (y)
            X = df[self.features]
            y = df[self.target]

            # Initialize and train the RandomForestClassifier model
            self.model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
            self.model.fit(X, y)
            logger.info("✅ Model training complete.")

            # Save the newly trained model for future use
            joblib.dump(self.model, self.model_path)
            logger.info(f"✅ New model saved to: {self.model_path}")

        except Exception as e:
            logger.error(f"❌ Failed to train model from CSV: {e}")
            self.model = None

    def predict(self, features_dict):
        """
        Makes a pump prediction based on a dictionary of live features.
        """
        if self.model is None:
            logger.warning("No model available, cannot make a prediction.")
            return 0, 0.0  # Default to OFF if no model is loaded

        try:
            # Create a pandas DataFrame from the dictionary, ensuring correct column order
            live_data = pd.DataFrame([features_dict], columns=self.features)

            prediction = self.model.predict(live_data)[0]
            probabilities = self.model.predict_proba(live_data)[0]
            confidence = probabilities[int(prediction)]

            logger.info(f"AI Prediction: {features_dict} → {prediction} (Confidence: {confidence:.2f})")
            return int(prediction), float(confidence)
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return 0, 0.0

# Create a singleton instance for the app to use
ai_service = AIModelService()