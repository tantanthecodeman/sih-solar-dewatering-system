/*
  Solar Dewatering ESP32 Firmware

  Attribution:

  Human-Written / Reviewed:
  - Code cleanup, formatting, and readability improvements
  - Serial logging and debug message enhancements
  - Minor adjustments to control logic for clarity
  - Removal of unnecessary comments

  AI-Assisted / Original Logic:
  - Sensor reading functions (ultrasonic, solar, battery)
  - Pump control logic (automatic ON/OFF based on water level and power)
  - MQTT communication (connect, subscribe, publish, callback)
  - Pin definitions, thresholds, and timing intervals
  - Core loop structure and telemetry publishing

*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

// WiFi and MQTT Configuration
const char* WIFI_SSID = "<Your WiFi SSID>";
const char* WIFI_PASS = "<Your WiFi Password>";
const char* MQTT_BROKER = "test.mosquitto.org";
const uint16_t MQTT_PORT = 1883;

// MQTT Topics
const char* TOPIC_TELEMETRY = "mine/telemetry";
const char* TOPIC_MANUAL = "mine/pump/manual";

// Pin Definitions
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int RELAY_PIN = 23;
const int SOLAR_ADC_PIN = 34;
const int BATTERY_ADC_PIN = 35;

// System Parameters
float LEVEL_ON_CM = 4.0f;
float LEVEL_OFF_CM = 7.0f;
const float SOLAR_V_THRESHOLD = 4.5f;
const float BATTERY_V_THRESHOLD = 3.2f; 
const int REQUIRED_CONSECUTIVE = 3;

// Timings
const unsigned long SENSOR_READ_INTERVAL_MS = 250;
const unsigned long CONTROL_LOGIC_INTERVAL_MS = 100;
const unsigned long TELEMETRY_INTERVAL_MS = 2000;
const unsigned long MIN_PUMP_OFF_MS = 5UL * 1000UL;
const unsigned long MAX_PUMP_RUN_MS = 30UL * 1000UL;

// Global Variables
WiFiClient espClient;
PubSubClient mqttClient(espClient);

float waterLevelCM = -1.0f;
float solarVoltage = 0.0f;
float batteryVoltage = 0.0f;
bool pumpState = false;
String manualMode = "AUTO";

int consecOn = 0;
int consecOff = 0;

unsigned long pumpLastChangedMs = 0;
unsigned long pumpStartedAtMs = 0;
unsigned long lastSensorReadMs = 0;
unsigned long lastControlUpdateMs = 0;
unsigned long lastTelemetryMs = 0;

void setPumpState(bool newState);
void mqttConnect();

unsigned long nowMs() { 
  return millis(); 
}

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
  return v_adc * 11.0f; 
}

float readBatteryVoltage() {
  int raw = analogRead(BATTERY_ADC_PIN);
  float v_adc = raw * (3.3f / 4095.0f);
  return v_adc * 2.0f; 
}

void setPumpState(bool newState) {
    if (pumpState == newState) return;

    pumpState = newState;
    digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
    pumpLastChangedMs = nowMs();
    if (pumpState) {
        pumpStartedAtMs = nowMs();
    }
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
    String clientId = "ESP32-dewater-" + String((uint32_t)esp_random(), HEX);
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

void handleSensors() {
  waterLevelCM = measureDistanceCM();
  solarVoltage = readSolarVoltage();
  batteryVoltage = readBatteryVoltage();
}

void handleControl() {
  if (pumpState && (nowMs() - pumpStartedAtMs > MAX_PUMP_RUN_MS)) {
    Serial.println("Control: Max pump run reached -> forcing OFF");
    setPumpState(false);
  }

  if (manualMode != "AUTO") {
    return;
  }
  
  if (waterLevelCM < 0) {
    Serial.println("Measurement INVALID (timeout)");
    consecOn = 0;
    consecOff = 0;
    return;
  }
  
  bool canRunOnSolar = solarVoltage > SOLAR_V_THRESHOLD;
  bool canRunOnBattery = batteryVoltage > BATTERY_V_THRESHOLD;

  if (!canRunOnSolar && !canRunOnBattery) {
    if (pumpState) {
        Serial.println("Power sources depleted, turning pump OFF");
        setPumpState(false);
    }
    return;
  }
  
  Serial.print("Measured: " + String(waterLevelCM, 2) + " cm");

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
  else {
    consecOn = 0;
    consecOff = 0;
    Serial.print(" | Mid-range");
  }
  Serial.println();
}

void handleTelemetry() {
  String pStateStr = pumpState ? "ON" : "OFF";
  
  String payload = "{";
  payload += "\"ts\":" + String(nowMs()) + ",";
  payload += "\"water_level_cm\":" + String(waterLevelCM, 2) + ",";
  payload += "\"solar_voltage\":" + String(solarVoltage, 2) + ",";
  payload += "\"battery_voltage\":" + String(batteryVoltage, 2) + ",";
  payload += "\"pump_status\":\"" + pStateStr + "\",";
  payload += "\"manual_mode\":\"" + manualMode + "\"";
  payload += "}";

  mqttClient.publish(TOPIC_TELEMETRY, payload.c_str());
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  unsigned long now = nowMs();
  pumpLastChangedMs = now;
  pumpStartedAtMs = now;

  Serial.println("Solar Dewatering Firmware Initialized.");
}

void loop() {
  unsigned long now = nowMs();

  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) mqttConnect();
  mqttClient.loop();

  if (now - lastSensorReadMs >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadMs = now;
    handleSensors();
  }

  if (now - lastControlUpdateMs >= CONTROL_LOGIC_INTERVAL_MS) {
    lastControlUpdateMs = now;
    handleControl();
  }

  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    handleTelemetry();
  }
}