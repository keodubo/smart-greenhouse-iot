#!/usr/bin/env python3
"""Sense HAT publisher and status display. --simulate never opens a network connection."""
import argparse
import json
import math
from pathlib import Path
import queue
import time


def measurement(value, unit):
    minimum, maximum = (-40, 100) if unit == 'C' else (0, 100)
    valid = type(value) in (int, float) and math.isfinite(value) and minimum <= value <= maximum
    return {'value': round(value, 2) if valid else None, 'unit': unit, 'valid': valid}

def joystick_command(direction, action):
    return {'up': 'ON', 'down': 'OFF', 'middle': 'AUTO'}.get(direction) if action == 'pressed' else None

def status_pixels(status, age):
    if not isinstance(status, dict) or age >= 15 or age < 0:
        return [[80, 0, 0]] * 64
    mode = [0, 0, 80] if status.get('mode') == 'AUTO' else [0, 60, 60]
    if status.get('armed') is not True:
        mode = [50, 50, 0]
    requested = [0, 80, 0] if status.get('requested') == 'ON' else [0, 0, 20]
    # Magenta always denotes unknown physical relay state, never confirmed ON/OFF.
    actual = [50, 0, 50]
    warning = [80, 0, 0] if status.get('faults') else (
        [80, 40, 0] if status.get('lowWater') else [0, 30, 0])
    return [colour for colour in (mode, requested, actual, warning) for _ in range(16)]

def validate_config(config):
    prefix = config.get('prefix', '')
    if not isinstance(prefix, str) or not prefix or any(x in prefix for x in ['+', '#', '\0', 'CHANGE_ME']) or prefix.endswith('/'):
        raise ValueError('Set a unique prefix without MQTT wildcards or a trailing slash.')
    if type(config.get('port')) is not int or not 1 <= config['port'] <= 65535:
        raise ValueError('port must be an integer from 1 to 65535.')
    for key in ('broker', 'client_id'):
        if not isinstance(config.get(key), str) or not config[key] or 'CHANGE_ME' in config[key]:
            raise ValueError('Set broker and a unique client_id.')
    return config


def run_hardware(config):
    import paho.mqtt.client as mqtt
    from sense_hat import SenseHat

    sense = SenseHat()
    inbox = queue.Queue(maxsize=20)
    prefix = config['prefix']
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=config['client_id'], clean_session=True)
    client.reconnect_delay_set(min_delay=1, max_delay=10)

    def enqueue(value):
        try:
            inbox.put_nowait(value)
        except queue.Full:
            pass  # No unbounded queue if an unexpected publisher floods the topic.

    def on_connect(c, userdata, flags, reason_code, properties):
        enqueue(None)
        if not reason_code.is_failure:
            c.subscribe(prefix + '/estado', qos=0)
            print('MQTT connected.', flush=True)
        else:
            print('MQTT connection rejected.', flush=True)

    def on_disconnect(c, userdata, flags, reason_code, properties):
        enqueue(None)
        print('MQTT disconnected; commands are not queued.', flush=True)

    def on_message(c, userdata, message):
        if message.retain or len(message.payload) > 4096:
            return
        try:
            status = json.loads(message.payload)
            if isinstance(status, dict) and status.get('actual') == 'UNKNOWN' and isinstance(status.get('faults'), list):
                enqueue((time.monotonic(), status))
        except (ValueError, UnicodeError):
            pass

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.connect_async(config['broker'], config['port'], keepalive=10)
    client.loop_start()
    last_sample = -math.inf
    latest_status = None
    received = -math.inf
    try:
        while True:
            now = time.monotonic()
            while not inbox.empty():
                item = inbox.get_nowait()
                if item is None:
                    latest_status = None
                else:
                    received, latest_status = item
            for event in sense.stick.get_events():
                command = joystick_command(event.direction, event.action)
                if command and client.is_connected():
                    client.publish(prefix + '/manual', command, qos=0, retain=False)
            if now - last_sample >= 5:
                last_sample = now
                for suffix, unit, reader in [('temperatura', 'C', sense.get_temperature),
                                             ('humedad', 'percent', sense.get_humidity)]:
                    try:
                        payload = measurement(reader(), unit)
                    except (OSError, RuntimeError):
                        payload = measurement(None, unit)
                    if client.is_connected():
                        client.publish(prefix + '/' + suffix, json.dumps(payload, allow_nan=False), qos=0, retain=False)
                    print(suffix, json.dumps(payload), flush=True)
            sense.set_pixels(status_pixels(latest_status if client.is_connected() else None, now - received))
            time.sleep(0.1)
    finally:
        sense.clear()
        client.disconnect()
        client.loop_stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path(__file__).with_name('pi-config.local.json'))
    parser.add_argument('--check-config', action='store_true', help='Validate configuration without hardware/network access')
    parser.add_argument('--simulate', action='store_true', help='Print labelled example measurements offline')
    parser.add_argument('--samples', type=int, default=3)
    args = parser.parse_args()
    if args.simulate:
        for _ in range(max(0, args.samples)):
            print(json.dumps({'simulation': True, 'temperatura': measurement(17, 'C'),
                              'humedad': measurement(55, 'percent')}))
        return
    try:
        config = validate_config(json.loads(args.config.read_text()))
    except (OSError, ValueError, TypeError, AttributeError):
        parser.error('Invalid/missing local configuration. Copy pi-config.example.json and fill in the documented fields.')
    if args.check_config:
        print('Configuration valid. No hardware/network access performed.')
        return
    try:
        run_hardware(config)
    except KeyboardInterrupt:
        print('Publisher stopped. Use Node-RED STOP and verify the bulb is OFF.')


if __name__ == '__main__':
    main()
