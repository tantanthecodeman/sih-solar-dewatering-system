import paho.mqtt.client as mqtt
import logging

logger = logging.getLogger(__name__)

class MQTTService:
    def __init__(self, broker, port=1883):
        self.broker = broker
        self.port = port
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.is_connected = False

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("✅ MQTT Service: Connected successfully to broker.")
            self.is_connected = True
        else:
            logger.error(f"❌ MQTT Service: Failed to connect, return code {rc}")
            self.is_connected = False

    def connect(self):
        try:
            self.client.connect_async(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"❌ MQTT Service: Error connecting to {self.broker}: {e}")

    def publish(self, topic, payload, qos=0):
        if self.is_connected:
            self.client.publish(topic, payload, qos)
        else:
            logger.warning("MQTT Service: Not connected. Cannot publish message.")

# Create a singleton instance for the app to use
# This uses the same public broker as your ESP32
mqtt_service = MQTTService("test.mosquitto.org")
mqtt_service.connect()