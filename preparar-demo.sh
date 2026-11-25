#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
node node-red/prepare-demo.js "$@"
python3 -m venv --system-site-packages raspberry-pi/.venv
raspberry-pi/.venv/bin/python -m pip install -r raspberry-pi/requirements.txt
raspberry-pi/.venv/bin/python -c 'from sense_hat import SenseHat; import paho.mqtt.client'
echo 'Python listo. Seguí demo.md para importar el flow y arrancar los sensores.'
