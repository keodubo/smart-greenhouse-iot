# Smart Greenhouse: next-lab setup

## Start here

This package implements the approved prototype. **The code is prepared for lab testing; hardware operation is not yet verified.** Use the existing lab hardware and environment. The live Node-RED tab starts disabled, relay control starts disarmed, and the SONOFF mapping is deliberately blank.

| File | What it does |
| --- | --- |
| [Arduino sketch](arduino/greenhouse-sensor/greenhouse-sensor.ino) | Reads ultrasonic distance on D6/D7; publishes every five seconds; reconnects after outages |
| [Raspberry Pi program](raspberry-pi/greenhouse.py) | Publishes temperature/humidity; sends joystick commands; displays controller status |
| [Importable Node-RED flow](node-red/greenhouse-flow.json) | Offline demo tab plus disabled live tab; uses built-in nodes only |
| [Flow configuration template](node-red/flow-config.example.json) | Broker, topics, relay payloads, calibration and thresholds |
| [Controller source](node-red/controller.js) | Temperature/water processing, manual modes and fault behavior |

**Data path:** Sense HAT + Arduino → Wi-Fi/MQTT → Node-RED → SONOFF. Node-RED publishes `nivel` and `estado`; the Pi uses `estado` to update the LEDs. Only Node-RED commands the relay.

## 1. Prepare without hardware

Commands below run from the root of your downloaded/cloned `smart-greenhouse-iot` folder:

```bash
cd smart-greenhouse-iot
node --test tests/*.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
python3 raspberry-pi/greenhouse.py --simulate --samples 3
```

The simulation prints labelled sample JSON only: no MQTT connection and no sensor/relay access. The JavaScript tests require Node.js 18+; Python helper tests use only the standard library. Physical adapters still need lab checks.

### Import and inspect the offline flow

1. Open the lab's existing Node-RED editor and export/back up any existing flows first.
2. Import `node-red/greenhouse-flow.json` through **Menu → Import → select a file**.
3. Keep **Greenhouse — LIVE (enable in lab)** disabled. Deploy only the offline demo when ready to run this local demonstration.
4. Open the Debug sidebar. Click **Reset demo**, then click temperature **17 → 20 → 22 → 20 → 17**. Expected requested states: **ON → ON → OFF → OFF → ON**. Perform the sequence without a 15-second gap.
5. Click water **19% → 22% → 25%**. The low-water flag should be **true → true → false**. Click humidity 55% if you want to clear its missing-data fault.
6. Try Manual OFF and AUTO. Inject 17 °C again before testing Manual ON if the temperature has expired.
7. Wait 15 seconds without another temperature input: requested state becomes OFF. Actual state always reads UNKNOWN.

The offline tab has **no MQTT outputs**. Its “relay” output goes to Debug only. Resetting this tab has no effect on the live controller. A water or humidity fault is independent of the temperature rule.

## 2. Agree configuration before the lab

Choose one group topic prefix such as `IIoT/<your-unique-group>`, without angle brackets, wildcards or a trailing slash. Use exactly the same broker, port and prefix on all three programs. The relay may have a different broker configured already: confirm that it matches before proceeding.

| Setting | Where to put it |
| --- | --- |
| Wi-Fi SSID/password | Local `arduino/greenhouse-sensor/wifi_connection_info.h` only |
| Arduino broker/prefix/client ID | Same Arduino header |
| Pi broker/prefix/client ID | Local `raspberry-pi/pi-config.local.json` |
| Node-RED broker/prefix, relay and thresholds | Local `node-red/flow-config.local.json`, then rebuild the flow |
| Pi Wi-Fi | Existing lab OS configuration; the Python script does not change networking |

Copy templates only if those local files do not already exist. Example commands for macOS/Linux:

```bash
cp -n arduino/greenhouse-sensor/wifi_connection_info.example.h arduino/greenhouse-sensor/wifi_connection_info.h
cp -n raspberry-pi/pi-config.example.json raspberry-pi/pi-config.local.json
cp -n node-red/flow-config.example.json node-red/flow-config.local.json
```

Edit the copies. All `CHANGE_ME` fields must be replaced. The exported flow uses `localhost` as a placeholder; set its broker to the lab-confirmed host, such as the proposal's `broker.hivemq.com`, to match the other devices. Use different client IDs for Arduino and Pi; Node-RED generates its own.

For the Node-RED config:

- `relayTopic`: the verified SONOFF **command** topic, outside your sensor/status namespace.
- `onPayload` and `offPayload`: exact **strings**, for example `"1"` and `"0"` only if those values have been physically verified. Never use a toggle payload such as the lab's switching example.
- `emptyCm` and `fullCm`: measured distances from the fixed sensor to the surface at the usable empty/full marks. They must satisfy `emptyCm > fullCm > 0`.
- `calibrationConfirmed`: set to `true` only after measuring those values. Until then, live water level is unknown; the offline demo uses example calibration.
- `onBelow=18`, `offAt=22`, `lowBelow=20`, `lowClearAt=25`, `staleMs=15000`: illustrative defaults from the preparation plan. Change them together if needed for the demonstration. These are not crop recommendations.

Generate a separate local configured export to preserve the blank template:

```bash
node node-red/build-flow.js node-red/flow-config.local.json node-red/greenhouse-flow.local.json
python3 raspberry-pi/greenhouse.py --check-config
```

The configured flow contains your relay topic, so keep it local. Import it using Node-RED's **replace existing nodes** choice for matching IDs; do not leave duplicate controllers active. If your editor does not offer replacement, update the existing broker, four input topics and configuration object at the top of the Live controller Function node instead. Do not enable a second controller. The generator always disables the live tab again.

The default MQTT transport is plain TCP on port 1883 for the supervised lab, with no broker authentication. HiveMQ's public broker provides no topic privacy or access control. Do not use secrets or actual heating equipment with this demo. A private/TLS broker would require coordinated configuration in all clients; it is not silently enabled by these files.

## 3. Arduino setup and wiring check

1. Use **Arduino MKR WiFi 1010**, a data-capable USB cable, the correct port, Arduino SAMD board support, **WiFiNINA** and **ArduinoMqttClient**. Do not select the NB 1500 mentioned in one inconsistent line of the Lab 3 brief.
2. Open `arduino/greenhouse-sensor/greenhouse-sensor.ino` in Arduino IDE. Keep `distance.h` and the configuration header in that same sketch folder. Click **Verify** before uploading.
3. With power disconnected, arrange **Trig → D6**, **Echo → D7 through any required voltage adaptation**, and common GND. Confirm the actual sensor model/pinout and supply with the instructor. The MKR's inputs are **3.3 V only**: do not connect a 5 V Echo directly. Do not assume a lookalike module's pinout is identical.
4. Have the instructor inspect the wiring and the enclosed SONOFF/bulb setup. Keep water separate from mains-powered equipment.
5. Upload only when ready and authorized in the lab. Open Serial Monitor at **115200 baud**. Expect a fresh distance reading approximately every five seconds once connected. No echo/out-of-range gives an invalid measurement, not 0 cm.
6. Check three known distances with a ruler. Mount the sensor above the tank and keep the usable full level outside the module's minimum distance. Current software sanity limits are 2–400 cm; confirm they suit the actual sensor and tank.
7. Close Serial Monitor and restart the Arduino to check independent operation. If it reports a missing Wi-Fi module, resolve board/firmware detection before integrating the sensor. This sketch does not change firmware.

Example local compile command if `arduino-cli` is installed:

```bash
arduino-cli compile --fqbn arduino:samd:mkrwifi1010 arduino/greenhouse-sensor
```

The sketch compiles without a private header using the example, but refuses network operation until configured. No upload command is run by the preparation/verification tools.

## 4. Raspberry Pi setup

Use the Pi's existing Raspberry Pi OS + Sense HAT installation. Download or clone this repository on the Pi and open a terminal in its root directory.

1. Check the available versions and hardware library:

```bash
python3 --version
node-red --version
python3 -c 'from sense_hat import SenseHat; print("Sense HAT library available")'
```

2. Use a local virtual environment with access to the already installed Sense HAT package. Paho is pinned to the version whose callback API the program uses:

```bash
python3 -m venv --system-site-packages raspberry-pi/.venv
raspberry-pi/.venv/bin/python -m pip install -r raspberry-pi/requirements.txt
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --check-config
```

If `venv` or `sense_hat` is missing, ask the lab instructor to restore the matching Raspberry Pi OS packages (`python3-venv` / `sense-hat`) rather than upgrading the entire lab image. Paho 2.1.0 requires Python 3.7+.

3. After the live flow is configured, start the publisher:

```bash
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py
```

It publishes temperature and humidity every five seconds, retries MQTT connections, and only sends joystick commands while connected. The current version logs readings to the terminal; it does not store historical measurements automatically.

**Joystick:** up = manual ON; down = manual OFF; centre = AUTO. Held/released events and left/right are ignored. Manual ON requires an armed controller and a fresh temperature. A temperature fault cancels manual mode.

**Sense HAT LEDs:** four horizontal bands, two rows per band, from top to bottom:

| Band | Meaning |
| --- | --- |
| Mode | Blue AUTO; cyan manual; yellow disarmed |
| Requested state | Green ON; dim blue OFF |
| Actual state | Magenta UNKNOWN: command delivery/physical switching is not confirmed |
| Fault/water | Red any fault; amber low water with no other faults; dim green otherwise |

All red means no fresh controller status or MQTT disconnected. It is normal before the live flow starts. Read the Node-RED Debug status for the exact fault. Pi heat may affect the temperature reading: compare against a reference and document any offset; no invented compensation is applied.

## 5. Live startup in the lab

1. Verify the physical actuator's explicit ON/OFF mapping with the instructor and keep it OFF. Confirm there is no other lab program publishing to its command topic.
2. Fill and import the local configured flow; check the broker and namespace on all devices. Keep the offline demo separate.
3. Enable the live tab and deploy. On connection, a configured controller requests OFF and remains disarmed. A request is not proof that the bulb switched.
4. Start Arduino and Pi publishers. In **LIVE full status**, verify temperature/humidity and calibrated water level. Resolve any relay/control configuration faults.
5. Click **ARM**. This requests OFF and discards previous sensor samples. Wait for a **new** temperature sample (about five seconds) before expecting automatic control.
6. Demonstrate temperature regulation, water warning and manual control. Choose achievable demo thresholds or use the offline demo for extreme temperatures; do not heat electronics or claim injected data is measured.
7. If disconnected, the live controller disarms. When connected again it requests OFF, but you must click **ARM** and wait for a new temperature before resuming.
8. To finish: click **STOP / DISARM**, physically verify OFF, then stop the Pi program with Ctrl+C and power down using the lab procedure. **STOP and verify OFF before redeploying, disabling or restarting Node-RED**; shutting down software cannot guarantee a disconnected relay switches off.

No feedback topic is assumed: `actual` intentionally remains `UNKNOWN`. The relay path is not a safety controller. If MQTT/broker/relay communication fails while the bulb is ON, use the supervised physical power-off procedure. QoS 0 requests are not delivery acknowledgments.

## 6. Lab acceptance record

Record results in [hardware-checklist.md](hardware-checklist.md). Minimum next-lab checks:

- [ ] Pi temperature/humidity, all joystick directions and LED meanings.
- [ ] Arduino ruler checks, no-echo behavior and boot without Serial Monitor.
- [ ] SONOFF explicit ON/OFF and observed physical state.
- [ ] 17 → 20 → 22 → 20 → 17 logic using the offline demo, then an achievable live threshold demonstration.
- [ ] Low-water warning, measured tank calibration and invalid/stale level.
- [ ] 15-second temperature timeout requests OFF while the command path still works.
- [ ] MQTT reconnect leaves controller disarmed; manual ON is not restored.
- [ ] Ten-minute run; record actual update gaps, errors and recovery rather than assuming performance.

## 7. Sources and limits

- Project proposal (course workspace, not redistributed), p. 1: hardware, architecture, approximately five-second publishing.
- Course Lab 3 manual (not redistributed), pp. 3–9: board libraries, D6/D7, ultrasonic timing and MQTT. Project code is newly prepared; the distance equation follows the lab.
- [Arduino MKR input-voltage guidance](https://docs.arduino.cc/tutorials/mkr-wifi-1010/connecting-sensors/).
- [Sense HAT API](https://sense-hat.readthedocs.io/en/latest/api/): sensor, joystick and LED interfaces.
- [Paho Python 2.x API](https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html): callbacks, reconnect and publishing.
- [Node-RED messages](https://nodered.org/docs/user-guide/messages) and [Function nodes](https://nodered.org/docs/user-guide/writing-functions).
- [HiveMQ public broker](https://www.hivemq.com/mqtt/public-mqtt-broker/): shared testing service, not private/production use.

Only built-in Node-RED nodes are required; no dashboard plugin, automatic service installation, broker provisioning or SONOFF firmware modification is included. Keep existing lab dependencies where possible. Local verification versions/results are in [verification.md](verification.md).
