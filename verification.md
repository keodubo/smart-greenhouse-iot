# Local verification

Software checks performed on 11 November 2026:

| Check | Result |
| --- | --- |
| JavaScript controller and Function adapter unit tests | 14 passed |
| Python sensor/joystick/display/configuration unit tests | 4 passed |
| C++ distance conversion checks | Passed timeout, range and known-distance cases |
| Arduino MKR WiFi 1010 compilation | Passed with SAMD core 1.8.14, WiFiNINA 2.1.1 and ArduinoMqttClient 0.1.8 |
| Python dependency | Paho 2.1.0 client construction verified without connecting |
| Node-RED 4.1.0 runtime | 33-node flow loaded; live tab disabled |
| Offline runtime demonstration | 17 C requested ON, 20 C kept ON, 22 C requested OFF |
| Independent code review | No Critical/Important findings |

JavaScript checks used Node.js 22.20.0; Python checks used Python 3.12.0. These checks do not establish compatibility with every version installed in the lab. No dashboard extensions are required.

Physical measurements, Pi/Sense HAT operation, Wi-Fi, actual MQTT delivery, SONOFF operation and tank calibration remain pending. Use [the hardware checklist](hardware-checklist.md) to record observed results. Never treat requested relay state as physical confirmation.

To repeat the C++ helper check with a C++ compiler:

```bash
c++ -std=c++11 tests/sensor-test.cpp -o /tmp/greenhouse-sensor-test
/tmp/greenhouse-sensor-test
```

To compile without uploading, use Arduino IDE Verify or:

```bash
arduino-cli compile --fqbn arduino:samd:mkrwifi1010 arduino/greenhouse-sensor
```
