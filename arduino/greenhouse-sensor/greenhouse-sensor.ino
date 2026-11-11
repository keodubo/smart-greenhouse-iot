#include <WiFiNINA.h>
#include <ArduinoMqttClient.h>
#include "distance.h"
#if __has_include("wifi_connection_info.h")
#include "wifi_connection_info.h"
#else
#include "wifi_connection_info.example.h"
#endif

const int TRIG_PIN = 6;
const int ECHO_PIN = 7;
const unsigned long SAMPLE_MS = 5000;
const unsigned long RETRY_MS = 5000;
const unsigned long ECHO_TIMEOUT_US = 25000;
WiFiClient transport;
MqttClient mqtt(transport);
unsigned long lastAttempt = 0;
unsigned long lastSample = 0;
bool firstAttempt = true;
bool configured = false;
const char DISTANCE_TOPIC[] = MQTT_PREFIX "/distancia";

void setup() {
  Serial.begin(115200);  // Do not wait for a USB Serial Monitor.
  pinMode(TRIG_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);
  configured = strlen(SECRET_SSID) > 0 && !strstr(SECRET_SSID, "CHANGE_ME") &&
    !strstr(MQTT_PREFIX, "CHANGE_ME") && !strpbrk(MQTT_PREFIX, "+#") &&
    !strstr(MQTT_CLIENT_ID, "CHANGE_ME") && strlen(MQTT_PREFIX) > 0 &&
    MQTT_PREFIX[strlen(MQTT_PREFIX)-1] != '/';
  WiFi.setTimeout(5000);
  mqtt.setId(MQTT_CLIENT_ID);
  mqtt.setCleanSession(true);
  mqtt.setConnectionTimeout(3000);
  mqtt.setKeepAliveInterval(10000);
}

void loop() {
  const unsigned long now = millis();
  if (!configured) {
    if (firstAttempt || now - lastAttempt >= RETRY_MS) {
      firstAttempt = false; lastAttempt = now;
      Serial.println("Configure wifi_connection_info.h before using hardware.");
    }
    return;
  }
  if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) {
    if (!firstAttempt && now - lastAttempt < RETRY_MS) return;
    firstAttempt = false; lastAttempt = now;
    if (WiFi.status() == WL_NO_MODULE) {
      Serial.println("Wi-Fi module unavailable; check board and firmware in the lab.");
      return;
    }
    if (WiFi.status() != WL_CONNECTED) {
      mqtt.stop();
      WiFi.begin(SECRET_SSID, SECRET_PASS);
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi unavailable; retrying.");
        return;
      }
    }
    if (!mqtt.connect(MQTT_HOST, MQTT_PORT)) {
      Serial.println("MQTT unavailable; retrying.");
      return;
    }
    Serial.println("MQTT connected; sending fresh readings only.");
    lastSample = millis() - SAMPLE_MS;
  }
  mqtt.poll();
  if (millis() - lastSample < SAMPLE_MS) return;
  lastSample = millis();
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  const float cm = distanceCm(pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US));
  if (!mqtt.connected()) return;
  if (!mqtt.beginMessage(DISTANCE_TOPIC, false, 0)) return;
  if (isnan(cm)) {
    mqtt.print("{\"value\":null,\"unit\":\"cm\",\"valid\":false}");
    Serial.println("Distance invalid (timeout/out of range).");
  } else {
    mqtt.print("{\"value\":"); mqtt.print(cm, 2);
    mqtt.print(",\"unit\":\"cm\",\"valid\":true}");
    Serial.print("Distance cm: "); Serial.println(cm, 2);
  }
  if (!mqtt.endMessage()) Serial.println("Publish failed; next reading will retry.");
}
