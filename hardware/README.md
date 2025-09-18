# Hardware Guide: Solar Dewatering System

This document provides a complete guide to setting up and understanding the hardware for the AI-Powered Solar Dewatering System. The hardware's primary role is to monitor environmental conditions, control the pump based on a robust set of rules, and communicate its status in real-time.

## 1. Components List

To build the physical unit, you will need the following components:

| Component                  | Description                                      |
| :------------------------- | :----------------------------------------------- |
| **Microcontroller** | ESP32 Development Board (e.g., NodeMCU-32S)      |
| **Water Level Sensor** | HC-SR04 Ultrasonic Distance Sensor               |
| **Pump** | 5V DC Submersible Water Pump                     |
| **Power Source** | 5V Solar Panel (approx. 1-2W)                    |
| **Energy Storage** | Lithium-ion/LiPo Battery (e.g., 18650)           |
| **Cabling** | Jumper Wires (Male-to-Female, Male-to-Male)      |
| **Power Supply (for ESP32)** | Micro-USB cable and a standard USB power source. |

---

## 2. Circuit Connections

The components must be wired to the ESP32 according to the pin configuration defined in the firmware (`hardware/esp32-code/src/main.ino`). Please follow these connections carefully.

### ESP32 Pin Connections

| Component           | Component Pin | ESP32 Pin   |
| :------------------ | :------------ | :---------- |
| **Ultrasonic Sensor** | `VCC`         | `5V`        |
|                     | `GND`         | `GND`       |
|                     | `Trig`        | `GPIO 5`    |
|                     | `Echo`        | `GPIO 18`   |
| **Relay Module** | `VCC` / `DC+` | `5V`        |
|                     | `GND` / `DC-` | `GND`       |
|                     | `IN`          | `GPIO 23`   |
| **Solar Panel** | `V+` (Sensed) | `GPIO 34`   |
| **Battery** | `V+` (Sensed) | `GPIO 35`   |

***Note on Voltage Sensing:*** The ESP32's ADC pins can only handle up to 3.3V. You must use a voltage divider circuit to step down the voltage from the solar panel and battery before connecting them to `GPIO 34` and `GPIO 35`. The scaling factors `11.0f` (for solar) and `2.0f` (for battery) in the code correspond to specific resistor values and must be adjusted if you use a different divider.

### Power Circuit (Pump & Solar)

The relay acts as an automated switch for the pump, powered by the solar panel.

1.  The **Positive (+)** wire from the **Solar Panel** connects to the **COM** (Common) terminal on the relay module.
2.  The **Positive (+)** wire from the **5V Water Pump** connects to the **NO** (Normally Open) terminal on the relay module.
3.  The **Negative (-)** wires from both the **Solar Panel** and the **Water Pump** are connected together to a common **GND**.

---

## 3. System Setup

Follow these steps in order to configure the software components that control the hardware.

### Step 3.1: MQTT Broker Setup

Mosquitto is the server that will manage your MQTT messages.

-  **Download the Installer**: Go to the official Mosquitto download page for Windows: **[https://mosquitto.org/download/](https://mosquitto.org/download/)**
-  Find the appropriate installer for your version of Windows (usually the 64-bit installer).
-  **Run the Installer**:
      * Run the downloaded `.exe` file.
      * Follow the on-screen instructions. It's a standard installation process.
-  **Verify the Installation**:
      * Open a new Command Prompt (`cmd`).
      * Navigate to the Mosquitto installation directory, which is usually `C:\Program Files\mosquitto`.
        ```bash
        cd "C:\Program Files\mosquitto"
        ```
      * Run Mosquitto with the `-v` (verbose) flag to see its startup log:
        ```bash
        mosquitto -v
        ```

### Step 3.2: ESP32 Firmware Setup

1.  **Open the Firmware**: Open the `hardware/esp32-code/src/main.ino` file in the Arduino IDE or a compatible editor like VS Code with PlatformIO.
2.  **Configure WiFi**: Update the following lines with your local WiFi network credentials:
    ```cpp
    const char* WIFI_SSID = "Your_WiFi_Name";
    const char* WIFI_PASS = "Your_WiFi_Password";
    ```
3.  **Verify Broker**: Ensure the `MQTT_BROKER` is set to the correct address (e.g., `test.mosquitto.org` for development).
4.  **Install Libraries**: Make sure you have the `PubSubClient` library installed in your Arduino IDE (`Tools > Manage Libraries...`).
5.  **Upload**: Select your ESP32 board and port, then upload the code.
6.  **Verify**: Open the Serial Monitor at `115200` baud. You should see the ESP32 connect to WiFi and the MQTT broker, and then begin sending telemetry data.

### Step 3.3: Node-RED Setup

Node-RED acts as the bridge between your web dashboard and the MQTT network.

1.  **Install and Run**: If you don't have it, install Node-RED (`npm install -g node-red`) and run it (`node-red`).
2.  **Import Flow**: Open your browser to `http://127.0.0.1:1880`. Click the menu (☰) > **Import** and import the flow from `hardware/node-red-dashboard/solar-flow.json`.
3.  **Deploy**: Click the red **Deploy** button. The bridge is now active and will automatically forward messages between your dashboard and the MQTT broker.

---

## 4. Hardware Logic Explained

The ESP32 firmware (`main.ino`) is designed for autonomous and remote operation with the following logic:

### Sensor Interpretation (Dewatering Logic)

-   The HC-SR04 ultrasonic sensor is mounted at the **top** of the water container.
-   Therefore, a **small distance** reading (e.g., 4 cm) means the water level is **high** (the water is close to the sensor).
-   A **large distance** reading (e.g., 7 cm) means the water level is **low**.
-   This is a **dewatering system**, so the goal is to turn the pump **ON when the water is high**.

### Control Hierarchy and Logic

The pump's operation is decided based on a strict priority system:

1.  **Manual Mode (Highest Priority)**:
    -   The ESP32 listens to the `mine/pump/manual` MQTT topic.
    -   If it receives an `"ON"` or `"OFF"` message from the dashboard, it immediately obeys and locks into that state, ignoring all other rules.
    -   If it receives `"AUTO"`, it switches to its onboard automatic logic.

2.  **Onboard Automatic Logic**:
    -   **Power Check**: The system first checks if there is sufficient power to run the pump from either the solar panel (`> 4.5V`) or the battery (`> 3.2V`). If not, the pump is forced off.
    -   **Debounce/Consecutive Readings**: To prevent erratic behavior from a single noisy sensor reading, the firmware requires **3 consecutive readings** that meet the threshold before it will change the pump's state.
        -   It will turn the pump **ON** only after the water level has been at or above the `LEVEL_ON_CM` (4.0 cm) for 3 consecutive checks.
        -   It will turn the pump **OFF** only after the water level has been at or below the `LEVEL_OFF_CM` (7.0 cm) for 3 consecutive checks.
    -   **Safety Timers**: To protect the pump and conserve power, there are two safety timers:
        -   **Max Run Time**: The pump will automatically shut off after running for 30 seconds (`MAX_PUMP_RUN_MS`).
        -   **Minimum Off Time**: Once the pump turns off, it cannot turn back on for at least 5 seconds (`MIN_PUMP_OFF_MS`), preventing rapid cycling.

### Telemetry

-   Every 2 seconds (`TELEMETRY_INTERVAL_MS`), the ESP32 gathers the latest data, packages it into a JSON object, and publishes it to the `mine/telemetry` topic. This provides the real-time data feed for the dashboard.
-   The JSON payload includes: `timestamp`, `water_level_cm`, `solar_voltage`, `battery_voltage`, `pump_status`, and `manual_mode`.