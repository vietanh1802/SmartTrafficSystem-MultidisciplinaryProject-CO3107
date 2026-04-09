# backend/app/services/iot_service.py

import os
import time
import logging
from pathlib import Path
from dotenv import load_dotenv
import paho.mqtt.client as mqtt


# =======================
# Load ENV
# =======================
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

USERNAME = os.getenv("ADAFRUIT_AIO_USERNAME")
KEY = os.getenv("ADAFRUIT_AIO_KEY")

if not USERNAME or not KEY:
    raise ValueError("Missing ADAFRUIT_AIO_USERNAME or ADAFRUIT_AIO_KEY")


# =======================
# Feed Config (centralized)
# =======================
class Feeds:
    CONTROL = f"{USERNAME}/feeds/dadn.light-sensor"
    
    TEMPERATURE = f"{USERNAME}/feeds/dadn.temp-sensor"

    LIGHT = {
        "A_RED": f"{USERNAME}/feeds/dadn.led-1",
        "A_GREEN": f"{USERNAME}/feeds/dadn.led-2",
        "B_RED": f"{USERNAME}/feeds/dadn.led-3",
        "B_GREEN": f"{USERNAME}/feeds/dadn.led-4",
    }


# =======================
# Logger
# =======================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IOTService")


# =======================
# IOT Service
# =======================
class IOTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.username_pw_set(USERNAME, KEY)

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

        self.light_value = None
        self.temperature_value = None

    # ---------- Callbacks ----------
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to Adafruit IO")
            client.subscribe(Feeds.CONTROL)
            client.subscribe(Feeds.TEMPERATURE)
        else:
            logger.error(f"Connection failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode()

        try:
            value = float(payload)
        except ValueError:
            return

        if topic == Feeds.CONTROL:
            self.light_value = value

        elif topic == Feeds.TEMPERATURE:
            self.temperature_value = value

    def get_sensor_data(self):
        return self.light_value, self.temperature_value

    # ---------- Public APIs ----------
    def start(self):
        self.client.connect("io.adafruit.com", 1883, 60)
        self.client.loop_start()

    def publish(self, feed: str, value):
        self.client.publish(feed, str(value))
        logger.info(f"Published {value} -> {feed}")

    def send_control(self, state: int):
        """Send traffic state (0,1,2,3)"""
        self.publish(Feeds.CONTROL, state)

    def send_light_states(self, states: dict):
        """
        states = {
            "A_RED": 0,
            "A_GREEN": 1,
            "B_RED": 1,
            "B_GREEN": 0
        }
        """
        for key, value in states.items():
            time.sleep(0.5)
            feed = Feeds.LIGHT[key]
            self.publish(feed, value)


# =======================
# Decision Logic (clean hơn)
# =======================
def decision_logic(vehicle_a: int, vehicle_b: int) -> dict:
    if vehicle_a > vehicle_b:
        return {
            "A_RED": 0,
            "A_GREEN": 1,
            "B_RED": 1,
            "B_GREEN": 0,
        }
    else:
        return {
            "A_RED": 1,
            "A_GREEN": 0,
            "B_RED": 0,
            "B_GREEN": 1,
        }

# import time

# if __name__ == "__main__":
#     print("username use os",os.getenv("ADAFRUIT_AIO_USERNAME"))
#     print("pass use os",os.getenv("ADAFRUIT_AIO_KEY"))
#     iot_service.start()

#     time.sleep(2)  # chờ MQTT connect

#     vehicle_count = 15
#     state = mock_decision_logic(25, 20)
#     #iot_service.send_humid_sensor(23)

#     iot_service.send_light_states(state)

#     time.sleep(2)  # giữ chương trình sống để nhận message

# =======================
# Main test
# =======================
if __name__ == "__main__":
    service = IOTService()
    service.start()

    time.sleep(2)

    # state = decision_logic(25, 20)
    # service.send_light_states(state)
    for i in range(100):
        time.sleep(2)
        print("Sensor data:", service.get_sensor_data())