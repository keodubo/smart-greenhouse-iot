#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
ambient=false
if [[ ${1:-} == --temperatura-ambiente ]]; then
  ambient=true
  shift
fi
python3 -m venv --system-site-packages raspberry-pi/.venv
raspberry-pi/.venv/bin/python -m pip install -r raspberry-pi/requirements.txt
raspberry-pi/.venv/bin/python -c 'from sense_hat import SenseHat; import paho.mqtt.client'
if [[ $ambient == true ]]; then
  # La lectura se hace en el Sense HAT de esta Raspberry antes de generar el flow.
  base=$(raspberry-pi/.venv/bin/python - <<'PYTHON'
import math
from sense_hat import SenseHat

temperature = SenseHat().get_temperature()
if not math.isfinite(temperature) or not -40 <= temperature <= 98:
    raise SystemExit("Lectura inicial de temperatura fuera de rango.")
print(math.floor(temperature) + 1)
PYTHON
)
  export ON_BELOW_C=$base OFF_AT_C=$((base + 1))
fi
node node-red/prepare-demo.js "$@"
echo 'Python listo. Seguí demo.md para importar el flow y arrancar los sensores.'
