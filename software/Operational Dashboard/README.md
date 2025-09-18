# Solar Dewatering Dashboard (React)

## Quick start

1. Extract the folder.
2. Open `src/App.jsx` and replace `<YOUR_PC_IP>` in MQTT_WS with your machine IP where Node-RED is running.
   Example:
   ```js
   const MQTT_WS = "ws://192.168.1.50:1880/mqtt"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```
5. Open URL printed by vite (e.g. http://localhost:5173) in your browser.

## Node-RED WebSocket bridge

I included a sample Node-RED flow JSON (`node-red-flow.json`) that creates a simple WebSocket endpoint `/mqtt` and bridges messages to/from a real MQTT broker (test.mosquitto.org) and your Node-RED environment. Import it into Node-RED (menu → import → clipboard).

- The front-end connects to `ws://<NODE_RED_IP>:1880/mqtt`
- Node-RED will forward `mine/sensors` messages from the real MQTT broker to websocket clients
- And forward websocket client messages published to `mine/pump/control` to the MQTT broker

