# Smart Greenhouse lab record

All rows are **pending physical verification**. Fill in during the lab; do not replace pending with expected results.

Date: ______  Operators: ______

## Configuration record (no secrets)

- Pi model / OS / Python / Node-RED: ______
- Arduino SAMD core / WiFiNINA / ArduinoMqttClient / NINA firmware: ______
- Actual ultrasonic model / checked Echo-voltage adaptation: ______
- SONOFF model / firmware / explicit command mapping verified: ______
- Tank empty distance: ______ cm; full distance: ______ cm
- Reference temperature comparison / observed offset: ______

## Results

| Check | Expected | Observed | Pass/fail | Evidence |
| --- | --- | --- | --- | --- |
| Pi sensor reads | Numeric temperature/humidity | Pending | | |
| Joystick + LEDs | Modes and indicators match guide | Pending | | |
| Arduino distance 1/2/3 | Compare against ruler | Pending | | |
| No echo | Invalid, not zero | Pending | | |
| Arduino without Serial Monitor | Boots and publishes | Pending | | |
| SONOFF explicit ON/OFF | Correct physical bulb state | Pending | | |
| Live temperature rule | Agreed thresholds + hysteresis | Pending | | |
| Water calibration/warning | Valid level and warning hysteresis | Pending | | |
| Missing temperature | OFF request after 15 s; check bulb | Pending | | |
| Reconnect | Disarmed, OFF requested, new sample after ARM | Pending | | |
| Ten-minute run | Record gaps, unexpected switching, recovery | Pending | | |

Label injected data and offline demonstrations as simulation. Keep credentials, private addresses and device identifiers out of shared evidence.
