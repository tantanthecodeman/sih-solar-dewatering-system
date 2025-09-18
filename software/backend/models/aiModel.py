import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import joblib
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# MINING SITE CONFIGURATIONS FOR REALISTIC SIMULATION
MINING_SITES = {
    "Singrauli_MP": {
        "name": "Singrauli Coalfield, Madhya Pradesh",
        "soil_permeability": 0.002,  # cm/hour
        "avg_rainfall_mm_per_day": 3.2,  # Annual average
        "diesel_cost_range": (85, 95),  # INR per liter
        "solar_threshold": 200,  # W/m² minimum for solar operation
        "grid_backup_cost": 8.5  # INR per kWh
    },
    "Korba_Chhattisgarh": {
        "name": "Korba Coalfield, Chhattisgarh",
        "soil_permeability": 0.0015,
        "avg_rainfall_mm_per_day": 4.1,
        "diesel_cost_range": (87, 97),
        "solar_threshold": 180,
        "grid_backup_cost": 9.2
    },
    "Jharia_Jharkhand": {
        "name": "Jharia Coalfield, Jharkhand",
        "soil_permeability": 0.003,
        "avg_rainfall_mm_per_day": 5.8,
        "diesel_cost_range": (82, 92),
        "solar_threshold": 190,
        "grid_backup_cost": 7.8
    }
}

# Select mining site for simulation
SELECTED_SITE = "Singrauli_MP"
SITE_CONFIG = MINING_SITES[SELECTED_SITE]

class SolarDewateringModel:
    def __init__(self, site_config):
        self.site_config = site_config
        self.model = None
        self.label_encoder = LabelEncoder()

    def load_datasets(self):
        """Load water level and solar irradiance datasets"""
        try:
            # Load water level data
            water_df = pd.read_csv('water_level_dataset.csv')
            
            # Load solar irradiance data
            solar_df = pd.read_csv('synthetic_solar_data_minute.csv')
            
            # Ensure 'timestamp' is present for alignment, if not, create generic index
            if 'timestamp' not in water_df.columns:
                 water_df['timestamp'] = pd.date_range(start='2024-01-01', periods=len(water_df), freq='H')
            if 'timestamp' not in solar_df.columns:
                 solar_df['timestamp'] = pd.date_range(start='2024-01-01', periods=len(solar_df), freq='H')

            print("Loaded custom water level and solar irradiance datasets.")
            return water_df, solar_df
            
        except FileNotFoundError as e:
            print(f"Error loading datasets: {e}")
            print("Generating synthetic datasets for demonstration (Fallback ONLY)...")
            return self.generate_synthetic_datasets_fallback()

    def generate_synthetic_datasets_fallback(self):
        """Generate synthetic datasets if files not found (Fallback ONLY)"""
        np.random.seed(42)
        n_records = 2000
        dates = pd.date_range(start='2024-01-01', periods=n_records, freq='H')
        
        water_levels = np.random.uniform(0.5, 5.5, n_records) # Diverse range
        solar_irradiance = []
        # In your solar data generation section
        for i in range(n_records):
          hour = dates[i].hour
          if 6 <= hour <= 18: 
          # Generate realistic daytime solar values
            base_irradiance = 600 * np.sin(np.pi * (hour - 6) / 12)  # Peak 600 W/m²
            weather_factor = np.random.choice([0.3, 0.7, 1.0], p=[0.2, 0.3, 0.5])  # Cloudy/Clear
            noise = np.random.normal(0, 50)
            irradiance = max(30, base_irradiance * weather_factor + noise)
          else: 
            irradiance = np.random.uniform(0, 25)  # Night values
          solar_irradiance.append(irradiance)

        
        water_df = pd.DataFrame({'timestamp': dates, 'water_level_cm': water_levels})
        solar_df = pd.DataFrame({'timestamp': dates, 'solar_irradiance_w_per_m2': solar_irradiance})
        
        return water_df, solar_df

    def simulate_environmental_factors(self, n_records):
        """Simulate rainfall, diesel cost, and soil absorption"""
        np.random.seed(42)
        rainfall = np.random.exponential(self.site_config['avg_rainfall_mm_per_day'] / 24, n_records)
        rainfall = np.clip(rainfall, 0, 20)
        diesel_cost_base = np.mean(self.site_config['diesel_cost_range'])
        diesel_cost_variation = np.random.normal(0, 2, n_records)
        diesel_cost = np.clip(diesel_cost_base + diesel_cost_variation, self.site_config['diesel_cost_range'][0], self.site_config['diesel_cost_range'][1])
        soil_absorption_rate = np.random.normal(self.site_config['soil_permeability'], self.site_config['soil_permeability'] * 0.2, n_records)
        soil_absorption_rate = np.clip(soil_absorption_rate, 0, self.site_config['soil_permeability'] * 2)
        return rainfall, diesel_cost, soil_absorption_rate

    def calculate_pump_logic(self, water_level, solar_irradiance, rainfall):
      """
      Pump operation logic with aggressive solar prioritization.
      """
      SOLAR_MIN_THRESHOLD = 50  # Increased from 30
    
      if water_level < 0.8:  # Lowered threshold
          pump_state = "OFF"
          power_source = "NONE"
      elif water_level > 1.2:  # Lowered threshold
          pump_state = "ON"
          if solar_irradiance >= 150:  # Good solar conditions
              power_source = "SOLAR"
          else:
              power_source = "GRID"
      else:
          # Intermediate range (0.8 to 1.2)
          if rainfall > 2.0 or water_level > 1.0:
              pump_state = "ON"
              power_source = "SOLAR" if solar_irradiance >= 100 else "GRID"
          else:
              pump_state = "STANDBY"
              power_source = "SOLAR" if solar_irradiance >= SOLAR_MIN_THRESHOLD else "GRID"
    
      # CRITICAL: Ensure this return statement exists at the end
      return pump_state, power_source



    def prepare_training_data(self):
      """Generate diverse dataset with all required columns"""
      water_df, solar_df = self.load_datasets()
      n_records = min(len(water_df), len(solar_df), 2000)
    
      # 1. GENERATE DIVERSE WATER LEVELS (for OFF, STANDBY, ON states)
      water_level = np.zeros(n_records)
      chunk_size = n_records // 4
    
      # Four scenarios for maximum diversity
      scenarios = [
          (0.3, 0.9),   # LOW - mostly OFF states
          (0.8, 1.4),   # MEDIUM-LOW - STANDBY states  
          (1.2, 2.2),   # MEDIUM - mixed ON/STANDBY
          (2.5, 4.5)    # HIGH - mostly ON states
    ]
    
      for i in range(4):
          start = i * chunk_size
          end = (i + 1) * chunk_size if i < 3 else n_records
          target_min, target_max = scenarios[i]
          water_level[start:end] = np.random.uniform(target_min, target_max, end - start)
    
      # 2. GENERATE REALISTIC SOLAR WITH DAY/NIGHT CYCLE
      timestamps = pd.date_range(start='2024-06-01', periods=n_records, freq='H')
      solar_irradiance = np.zeros(n_records)
    
      for i in range(n_records):
          hour = timestamps[i].hour
        
          if 6 <= hour <= 18:  # Daytime
              # Realistic solar curve (50-800 W/m²)
              time_factor = np.sin(np.pi * (hour - 6) / 12)
              base_irradiance = 400 * time_factor + 100  # 100-500 base
            
              # Weather: 50% clear, 30% partial, 20% cloudy/rainy
              weather = np.random.choice([1.2, 0.7, 0.2], p=[0.5, 0.3, 0.2])
              noise = np.random.normal(0, 40)
            
              solar_irradiance[i] = max(20, base_irradiance * weather + noise)
          else:  # Nighttime
              solar_irradiance[i] = np.random.uniform(0, 25)
    
    # 3. DIVERSE PUMP LOGIC for all three states
      def calculate_diverse_pump_logic(water_level, solar_irradiance, rainfall):
          if water_level < 0.8:  # LOW water
              pump_state = "OFF"
              power_source = "NONE"
          elif water_level < 1.3:  # MEDIUM-LOW water
              pump_state = "STANDBY"
            # Even in standby, prefer solar if available
              power_source = "SOLAR" if solar_irradiance >= 100 else "GRID"
          else:  # HIGH water (>= 1.3)
              pump_state = "ON"
            # Strong solar preference when pump is ON
              if solar_irradiance >= 200:  # Excellent solar
                  power_source = "SOLAR"
              elif solar_irradiance >= 80:   # Good solar
                  power_source = "SOLAR"
              else:  # Poor solar or nighttime
                  power_source = "GRID"
        
          return pump_state, power_source
    
        # Generate other environmental factors
      rainfall = np.random.exponential(self.site_config['avg_rainfall_mm_per_day'] / 24, n_records)
      rainfall = np.clip(rainfall, 0, 15)  # Cap at 15mm/hour
    
      diesel_cost_base = np.mean(self.site_config['diesel_cost_range'])
      diesel_cost = np.random.normal(diesel_cost_base, 2, n_records)
      diesel_cost = np.clip(diesel_cost, 80, 100)
    
      soil_absorption = np.random.normal(
          self.site_config['soil_permeability'], 
          self.site_config['soil_permeability'] * 0.2, 
          n_records
      )
      soil_absorption = np.clip(soil_absorption, 0, 0.005)
    
    # Apply pump logic
      pump_states = []
      power_sources = []
    
      for i in range(n_records):
          state, source = calculate_diverse_pump_logic(
              water_level[i], solar_irradiance[i], rainfall[i]
          )
          pump_states.append(state)
          power_sources.append(source)
    
    # Create comprehensive dataset with ALL required columns
      dataset = pd.DataFrame({
          'timestamp': timestamps,
          'water_level_cm': water_level,
          'solar_irradiance_w_per_m2': solar_irradiance,
          'rainfall_mm_per_hour': rainfall,
          'diesel_cost_inr_per_liter': diesel_cost,
          'soil_absorption_cm_per_hour': soil_absorption,
          'hour_of_day': timestamps.hour,
          'pump_state': pump_states,
          'power_source': power_sources
      })
    
    # ADD ALL MISSING DERIVED FEATURES
      dataset['water_level_category'] = pd.cut(
          dataset['water_level_cm'], 
          bins=[0, 1.0, 2.0, 6], 
          labels=['Low', 'Medium', 'High']
      )
    
    # Power consumption (0 for OFF, low for STANDBY, high for ON)
      power_consumption = []
      for state in pump_states:
          if state == 'OFF':
              power_consumption.append(0)
          elif state == 'STANDBY':
              power_consumption.append(np.random.uniform(0.5, 1.2))  # Standby power
          else:  # ON
              power_consumption.append(np.random.uniform(2.5, 4.5))  # Full power
    
      dataset['estimated_power_consumption_kwh'] = power_consumption
    
    # OPERATIONAL COST (the missing column causing the KeyError)
      operational_costs = []
      for i, row in dataset.iterrows():
          if row['power_source'] == 'GRID':
              cost = row['estimated_power_consumption_kwh'] * self.site_config['grid_backup_cost']
          elif row['power_source'] == 'SOLAR':
              cost = 0  # Solar is free after installation
          else:  # NONE
              cost = 0
          operational_costs.append(cost)
    
      dataset['operational_cost_inr'] = operational_costs
    
    # Create pump_operation combined field
      dataset['pump_operation'] = dataset['pump_state'] + '_' + dataset['power_source']
    
      return dataset



    
    # The rest of the class methods (train_model, predict_pump_operation, save_model, load_model) remain unchanged.
    def train_model(self, dataset):
        """Train Random Forest model for pump control prediction"""
        # Prepare features for training
        feature_columns = [
            'water_level_cm', 'solar_irradiance_w_per_m2', 'rainfall_mm_per_hour',
            'diesel_cost_inr_per_liter', 'soil_absorption_cm_per_hour'
        ]
        
        # Create target variable combining pump state and power source
        dataset['pump_operation'] = dataset['pump_state'] + '_' + dataset['power_source']
        
        X = dataset[feature_columns]
        y = dataset['pump_operation']
        
        class_counts = y.value_counts()
        single_member_classes = class_counts[class_counts < 2].index.tolist()
        
        if single_member_classes:
            print(f"\nWarning: The following classes have less than 2 members: {single_member_classes}")
            print("Proceeding with non-stratified split to avoid ValueError.")
        
        # Encode target variable
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Split dataset - using non-stratified split to avoid ValueError
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42
        )
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        
        print("\n" + "="*80)
        print("MODEL TRAINING RESULTS")
        print("="*80)
        print(f"Training samples: {len(X_train)}")
        print(f"Testing samples: {len(X_test)}")
        print(f"Number of classes: {len(self.label_encoder.classes_)}")
        print(f"Classes: {list(self.label_encoder.classes_)}")
        
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, 
                                     target_names=self.label_encoder.classes_))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nFeature Importance:")
        for idx, row in feature_importance.iterrows():
            print(f"{row['feature']:30s}: {row['importance']:.4f}")
        
        return X_test, y_test, y_pred
    
    def predict_pump_operation(self, input_data):
        """Make predictions for pump operation"""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        prediction_encoded = self.model.predict(input_data)
        prediction_proba = self.model.predict_proba(input_data)
        
        # Decode predictions
        predictions = self.label_encoder.inverse_transform(prediction_encoded)
        
        # Split pump state and power source
        results = []
        for i, pred in enumerate(predictions):
            parts = pred.split('_')
            pump_state = parts[0]
            power_source = parts[1] if len(parts) > 1 else 'NONE'
            
            results.append({
                'pump_state': pump_state,
                'power_source': power_source,
                'confidence': max(prediction_proba[i])
            })
        
        return results
    
    def save_model(self, filename="solar_dewatering_model.pkl"):
        """Save trained model"""
        if self.model is None:
            raise ValueError("No model to save!")
        
        model_data = {
            'model': self.model,
            'label_encoder': self.label_encoder,
            'site_config': self.site_config,
            'feature_columns': [
                'water_level_cm', 'solar_irradiance_w_per_m2', 'rainfall_mm_per_hour',
                'diesel_cost_inr_per_liter', 'soil_absorption_cm_per_hour'
            ]
        }
        
        joblib.dump(model_data, filename)
        print(f"\nModel saved as {filename}")
    
    def load_model(self, filename="solar_dewatering_model.pkl"):
        """Load trained model"""
        model_data = joblib.load(filename)
        self.model = model_data['model']
        self.label_encoder = model_data['label_encoder']
        self.site_config = model_data['site_config']
        print(f"Model loaded from {filename}")


def main():
    """Main execution function"""
    print("="*80)
    print("SOLAR DEWATERING SYSTEM - SIMULATED DATASET MODEL")
    print("="*80)
    
    dewatering_model = SolarDewateringModel(SITE_CONFIG)
    
    # Prepare training data
    print("\nPreparing training dataset...")
    dataset = dewatering_model.prepare_training_data()
    
    print(f"\nDataset prepared with {len(dataset)} records")
    print("\nDataset sample (should show diversity in pump_state and power_source):")
    # Show the diverse sample data
    print(dataset[['water_level_cm', 'solar_irradiance_w_per_m2', 'pump_state', 'power_source']].head(10))
    
    # Analyze dataset distribution
    print("\nPump State Distribution:")
    print(dataset['pump_state'].value_counts())
    print("\nPower Source Distribution:")
    print(dataset['power_source'].value_counts())
    
    # Train model
    print("\nTraining model...")
    X_test, y_test, y_pred = dewatering_model.train_model(dataset)
    
    # Save model and dataset
    dewatering_model.save_model("solar_dewatering_model.pkl")
    dataset.to_csv("pump_operations_dataset.csv", index=False)
    
    # Demo predictions
    print("\n" + "="*80)
    print("DEMO PREDICTIONS")
    print("="*80)
    
    # Create sample input data
    demo_data = pd.DataFrame({
        'water_level_cm': [1.5, 4.2, 2.3, 5.1], # Low, High, Medium, High
        'solar_irradiance_w_per_m2': [150, 450, 20, 320], # Day/Sun, Day/Cloud, Night/Off, Day/Clear
        'rainfall_mm_per_hour': [2.1, 0.5, 8.2, 1.0],
        'diesel_cost_inr_per_liter': [88, 90, 85, 92],
        'soil_absorption_cm_per_hour': [0.002, 0.0018, 0.0025, 0.0015]
    })
    
    predictions = dewatering_model.predict_pump_operation(demo_data)
    
    print("Sample Predictions:")
    for i, (_, row) in enumerate(demo_data.iterrows()):
        pred = predictions[i]
        print(f"\nScenario {i+1}:")
        print(f"  Water Level: {row['water_level_cm']} cm (Thresholds: <1.8 OFF, >2.8 ON)")
        print(f"  Solar Irradiance: {row['solar_irradiance_w_per_m2']} W/m² (Threshold: 30 W/m²)")
        print(f"  → Pump: {pred['pump_state']}")
        print(f"  → Power Source: {pred['power_source']}")
        print(f"  → Confidence: {pred['confidence']:.3f}")
    
    # Cost analysis
    print("\n" + "="*80)
    print("OPERATIONAL COST ANALYSIS")
    print("="*80)
    
    on_records = dataset[dataset['pump_state'] == 'ON']
    solar_operations = len(on_records[on_records['power_source'] == 'SOLAR'])
    grid_operations = len(on_records[on_records['power_source'] == 'GRID'])
    total_operations = len(on_records)
    
    if total_operations > 0:
        solar_percentage = (solar_operations / total_operations) * 100
        grid_percentage = (grid_operations / total_operations) * 100
        
        avg_grid_cost = on_records[on_records['power_source'] == 'GRID']['operational_cost_inr'].mean()
        
        print(f"Total Pump Operations: {total_operations}")
        print(f"Solar Operations: {solar_operations} ({solar_percentage:.1f}%)")
        print(f"Grid Operations: {grid_operations} ({grid_percentage:.1f}%)")
        print(f"Average Grid Operation Cost: ₹{avg_grid_cost:.2f}")

    print("\n" + "="*80)

if __name__ == "__main__":
    main()