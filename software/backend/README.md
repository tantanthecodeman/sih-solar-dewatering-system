# Backend - Solar Pump Vendor Dashboard

The backend of this Solar Pump Vendor Dashboard project is designed to support **real-time monitoring, AI-powered predictions, and IoT integration**.  

> ⚡ **Built with AI assistance (LLMs) to optimize development** — core architecture, predictive models, and services were carefully structured with the help of AI, while all business logic and integration were implemented thoughtfully by us.

---


---

## Overview of Modules

### 1. `app/`
Contains the main backend application, structured with Flask, and provides APIs, AI services, and MQTT integration.

- **`models/`** – AI modules for pump prediction and decision-making.
  - `ai_predictor.py`: Core predictive logic using historical and synthetic solar data.
- **`routes/`** – REST API endpoints for dashboard interaction.
  - `enhanced_dashboard.py`: Data analytics endpoints.
  - `pump_control.py`: Controls and monitors pump operations.
- **`services/`** – Supporting utility services.
  - `ai_model_service.py`: Loads AI models, preprocesses inputs, and generates predictions.
  - `mqtt_service.py`: Handles communication with ESP32 devices and other IoT hardware.

---

### 2. `config.py`
Centralized configuration file for:
- MQTT broker settings
- AI model paths
- Environment variables and constants

---

### 3. `models/`
- `aiModel.py`: AI model architecture, helpers, and utility functions.
- `synthetic_solar_data_minute.csv`: Sample dataset used for AI training and validation.

---

### 4. CSV Files
- `pump_predictions (3).csv` – Historical AI pump predictions.
- `pump_simulated_predictions.csv` – Simulated predictions for testing and benchmarking.

---

### 5. `requirements.txt`
Python dependencies for running the backend:
- Flask, Flask-CORS
- scikit-learn, pandas, numpy
- paho-mqtt and other supporting libraries

---

### 6. `run.py`
Entry point to start the backend server:
- Initializes Flask app and routes
- Connects services for AI prediction and real-time pump monitoring

---

## AI / LLM Assistance

- **Development Approach:** Large Language Models were leveraged to:
  - Structure folder architecture efficiently.
  - Assist in boilerplate and predictive model code.
  - Optimize API and service integration.  
- **Team Contribution:** All integration logic, hardware communication, and dashboard-specific business rules were implemented directly by the team. AI assistance was **strategic, not a replacement** for development effort.

---

## Getting Started

1. **Create virtual environment:**

```bash
python -m venv venv
source venv/bin/activate    # Linux/macOS
venv\Scripts\activate       # Windows
```
2. **Install dependencies:**

```bash
pip install -r requirements.txt
```
3. **Run the backend server::**

```bash
python run.py
```
## Features

- Real-time solar pump monitoring
- AI-powered pump prediction
- IoT integration via MQTT
- Modular architecture for maintainability
- Supports synthetic and historical datasets for AI validation
