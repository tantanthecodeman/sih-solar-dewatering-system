/*
  ESP32 Solar Dewatering Firmware (Single-Threaded, Adjusted Logic)
  - Logic adjusted to match the user's proven simple sketch.
  - Features Active LOW relay control and a 3-count debounce for state changes.
  - Time constants have been reduced for faster testing.
*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

// ---------- CONFIG (edit if needed) ----------
const char* WIFI_SSID    = "<Name of Wifi Connected to ESP-32>";
const char* WIFI_PASS    = "<Password>";
const char* MQTT_BROKER  = "test.mosquitto.org";
const uint16_t MQTT_PORT = 1883;

// MQTT topics
const char* TOPIC_TELEMETRY = "mine/telemetry";
const char* TOPIC_MANUAL    = "mine/pump/manual"; // payload: "ON" | "OFF" | "AUTO"

// ---------- PINS ----------
const int TRIG_PIN      = 5;
const int ECHO_PIN      = 18;
const int RELAY_PIN     = 23;
const int SOLAR_ADC_PIN = 34;

// ---------- PARAMETERS ----------
float LEVEL_ON_CM  = 4.0f; // distance <= 4.0 cm => water high => START PUMP
float LEVEL_OFF_CM = 7.0f; // distance >= 7.0 cm => water low => STOP PUMP
const float SOLAR_ADC_SCALE   = 11.0f;
const float SOLAR_V_THRESHOLD = 4.5f;

// Debounce logic from the working test sketch
const int REQUIRED_CONSECUTIVE = 3;
int consecOn = 0;
int consecOff = 0;

// ---------- TIMINGS (Reduced for faster testing) ----------
const unsigned long SENSOR_READ_INTERVAL_MS   = 250;  // Reduced from 500
const unsigned long CONTROL_LOGIC_INTERVAL_MS = 100;
const unsigned long TELEMETRY_INTERVAL_MS   = 2000; // Reduced from 5000
const unsigned long MIN_PUMP_OFF_MS         = 5UL * 1000UL;   // Reduced from 20s
const unsigned long MAX_PUMP_RUN_MS         = 30UL * 1000UL;  // Reduced from 3min

// ---------- GLOBALS ----------
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// State variables
float waterLevelCM  = -1.0f;
float solarVoltage  = 0.0f;
bool  pumpState     = false;
String manualMode   = "AUTO";

// Timing variables
unsigned long pumpLastChangedMs = 0;
unsigned long pumpStartedAtMs   = 0;
unsigned long lastSensorReadMs  = 0;
unsigned long lastControlUpdateMs = 0;
unsigned long lastTelemetryMs   = 0;

// ---------- FORWARD DECLARATIONS ----------
void setPumpState(bool newState);
void mqttConnect();

// ---------- HELPER FUNCTIONS ----------
unsigned long nowMs() { return millis(); }

float measureDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1.0f;
  return (duration * 0.034f / 2.0f);
}

float readSolarVoltage() {
  int raw = analogRead(SOLAR_ADC_PIN);
  float v_adc = raw * (3.3f / 4095.0f);
  return v_adc * SOLAR_ADC_SCALE;
}

// ---------- MQTT & NETWORK ----------
void setPumpState(bool newState) {
    if (pumpState == newState) return; // No change needed

    pumpState = newState;
    // ACTIVE LOW LOGIC: LOW turns pump ON, HIGH turns pump OFF
    digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
    pumpLastChangedMs = nowMs();
    if (pumpState) {
        pumpStartedAtMs = nowMs();
    }
    // Reset debounce counters after any successful state change
    consecOn = 0;
    consecOff = 0;
    Serial.printf("Pump state set to: %s\n", pumpState ? "ON" : "OFF");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; ++i) {
    msg += (char)payload[i];
  }
  String t = String(topic);
  Serial.println("MQTT IN: " + t + " -> " + msg);

  if (t == TOPIC_MANUAL) {
    if (msg == "ON") {
      manualMode = "ON";
      setPumpState(true);
      Serial.println("Manual -> ON");
    } else if (msg == "OFF") {
      manualMode = "OFF";
      setPumpState(false);
      Serial.println("Manual -> OFF");
    } else {
      manualMode = "AUTO";
      Serial.println("Manual -> AUTO");
    }
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = nowMs();
  while (WiFi.status() != WL_CONNECTED && nowMs() - start < 20000) {
    Serial.print(".");
    delay(500);
  }
  if (WiFi.status() == WL_CONNECTED) Serial.println("\nWiFi connected");
  else Serial.println("\nWiFi connect failed");
}

void mqttConnect() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting MQTT...");
    String clientId = "ESP32-dewater-adjusted-" + String((uint32_t)esp_random(), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      mqttClient.subscribe(TOPIC_MANUAL);
    } else {
      Serial.print("fail rc=");
      Serial.print(mqttClient.state());
      Serial.println(", retry in 3s");
      delay(3000);
    }
  }
}

// ---------- MAIN LOGIC FUNCTIONS ----------
void handleSensors() {
  waterLevelCM = measureDistanceCM();
  solarVoltage = readSolarVoltage();
}

void handleControl() {
  // 1. Safety Override: Max run time
  if (pumpState && (nowMs() - pumpStartedAtMs > MAX_PUMP_RUN_MS)) {
    Serial.println("Control: Max pump run reached -> forcing OFF");
    setPumpState(false);
  }

  // 2. Manual Override Check
  if (manualMode != "AUTO") {
    return; // Manual mode is active, MQTT callback handles the state
  }
  
  // 3. Automatic Control Logic with Debounce
  if (waterLevelCM < 0) {
    Serial.println("Measurement INVALID (timeout)");
    consecOn = 0;
    consecOff = 0;
    return; // Invalid sensor reading, do nothing
  }
  
  Serial.print("Measured: " + String(waterLevelCM, 2) + " cm");

  // A. Water is high => count towards turning ON
  if (waterLevelCM <= LEVEL_ON_CM) {
    consecOn++;
    consecOff = 0;
    Serial.print(" | consecOn: " + String(consecOn));
    if (consecOn >= REQUIRED_CONSECUTIVE) {
      if (!pumpState && (nowMs() - pumpLastChangedMs >= MIN_PUMP_OFF_MS)) {
        Serial.print(" ==> Turning ON");
        setPumpState(true);
      }
    }
  }
  // B. Water is low => count towards turning OFF
  else if (waterLevelCM >= LEVEL_OFF_CM) {
    consecOff++;
    consecOn = 0;
    Serial.print(" | consecOff: " + String(consecOff));
    if (consecOff >= REQUIRED_CONSECUTIVE) {
      if (pumpState) {
        Serial.print(" ==> Turning OFF");
        setPumpState(false);
      }
    }
  }
  // C. Mid-range (dead band) => reset counters
  else {
    consecOn = 0;
    consecOff = 0;
    Serial.print(" | Mid-range");
  }
  Serial.println(); // Newline for cleaner log
}

void handleTelemetry() {
  String pStateStr = pumpState ? "ON" : "OFF";
  
  String payload = "{";
  payload += "\"ts\":" + String(nowMs()) + ",";
  payload += "\"water_level_cm\":" + String(waterLevelCM, 2) + ",";
  payload += "\"solar_voltage\":" + String(solarVoltage, 2) + ",";
  payload += "\"pump_status\":\"" + String(pStateStr ? "ON" : "OFF") + "\",";
  payload += "\"manual_mode\":\"" + manualMode + "\"";
  payload += "}";

  mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
}

// ---------- SETUP & LOOP ----------
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Start with pump OFF (HIGH for Active LOW)

  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  unsigned long now = nowMs();
  pumpLastChangedMs = now;
  pumpStartedAtMs = now;

  Serial.println("Adjusted Solar Dewatering Firmware Initialized.");
}

void loop() {
  unsigned long now = nowMs();

  // Task 1: Maintain network and MQTT connection
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) mqttConnect();
  mqttClient.loop(); // Handles incoming messages and keep-alive

  // Task 2: Read Sensors periodically
  if (now - lastSensorReadMs >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadMs = now;
    handleSensors();
  }

  // Task 3: Run Control Logic periodically
  if (now - lastControlUpdateMs >= CONTROL_LOGIC_INTERVAL_MS) {
    lastControlUpdateMs = now;
    handleControl();
  }

  // Task 4: Publish Telemetry periodically
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    handleTelemetry();
  }
}