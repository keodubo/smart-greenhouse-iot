# Demo del invernadero desde la Raspberry

Usá un solo publicador del Sense HAT, un solo controlador de lámpara y una sola pestaña que escriba en la matriz. El generador prepara las rutas de esta Raspberry, los topics de grupo99 y los del SONOFF asignado. Los archivos generados terminan en `.local.json` y quedan en el equipo.

## 1. Preparar la Raspberry

Abrí una terminal en el escritorio. Si clonaste en otra ubicación, usá esa carpeta en la primera línea.

```bash
cd ~/smart-greenhouse-iot
git pull --ff-only
read -rp 'Número de la etiqueta del SONOFF: ' sonoff
bash preparar-demo.sh "$sonoff"
```

Esperá el mensaje **Python listo**. Necesitás Node.js, Node-RED, Python con venv y la biblioteca física sense_hat instalada en el sistema. El script genera **node-red/demo.local.json**, configura HiveMQ en el puerto 1883 e instala Paho en el entorno virtual del proyecto. Conserva los flows que ya tengas en el editor.

## 2. Importar el flow de la demo

1. Abrí [Node-RED en la Raspberry](http://localhost:1880). Si está detenido, ejecutá `node-red` en otra terminal y dejala abierta.
2. Hacé una copia de lo que ya funciona con **☰ → Export → all flows → Download**. Si hay un controlador armado, pulsá **STOP / DISARM** y comprobá que la lámpara se apague. Detené el publicador Python anterior con **Ctrl+C**.
3. Deshabilitá las pestañas anteriores del display, de prueba manual y de automatización del invernadero (doble clic sobre cada pestaña → deshabilitar → **Done**). Pulsá **Deploy**.
4. Elegí **☰ → Import → select a file**, abrí **node-red/demo.local.json** y pulsá **Import**. Si el editor detecta IDs existentes, elegí importar como copia. Identificá las dos pestañas recién importadas, **Greenhouse — LIVE** y **HiveMQ → Display Sense HAT**. Habilitá ambas con doble clic en cada pestaña → habilitar → **Done**. Pulsá **Deploy** y esperá **connected** bajo los nodos MQTT.
5. La ruta del nodo **Mostrar en LEDs físicos** ya está configurada. Si cambiaste de Raspberry o moviste el repositorio, generá el archivo otra vez en su nueva ubicación.

## 3. Arrancar los sensores y mostrar la lámpara

En la terminal del repositorio ejecutá el siguiente comando y dejalo corriendo.

```bash
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --config raspberry-pi/demo-pi.local.json --sensor ambos --joystick
```

1. Esperá **MQTT connected**. En Node-RED abrí **Debug** (insecto), expandí **LIVE full status** y buscá `temperature` y `humidity`. El Sense HAT publica cada cinco segundos. La matriz muestra las lecturas recibidas por MQTT aproximadamente cada diez segundos.
2. Pulsá **ARM (then fresh sample)** en la pestaña LIVE. Esperá una lectura nueva. En automático, por debajo de 18 °C se pide ON, desde 22 °C se pide OFF y en el medio se conserva el estado anterior. Si la sala está cálida, es esperable que la lámpara siga apagada.
3. Con temperatura vigente, mové el joystick **arriba** para encender, **abajo** para apagar y **pulsalo hacia adentro** para volver a AUTO. En Debug, `requested` muestra la orden y `relayReported` el último estado informado por el SONOFF desde la conexión, inicialmente nulo. Mirá la lámpara para confirmar la salida física.
4. Si querés demostrar la conmutación automática cerca de la temperatura ambiente, elegí umbrales alcanzables según la lectura real. Por ejemplo, si la lectura inicial es 24 °C, generá el flow con `ON_BELOW_C=25 OFF_AT_C=26 node node-red/prepare-demo.js "$sonoff"`. Repetí el paso 2 de esta guía con el controlador detenido. Volvé a arrancar el publicador y pulsá ARM. Una lectura menor que 25 pide ON y una lectura de 26 o más pide OFF. Para comprobarlo, acercá una mano al sensor y observá el valor. Conservá los mismos umbrales si luego regenerás el flow con calibración.
5. Para terminar, pulsá **STOP / DISARM**, comprobá que la lámpara se apagó y luego detené Python con **Ctrl+C**. Una desconexión del broker impide entregar nuevas órdenes. Al reconectar, el controlador pide OFF y requiere volver a pulsar ARM.

## 4. Incorporar el nivel del tanque

1. Con el Arduino MKR WiFi 1010 y el SRF04 montados, verificá el cableado del laboratorio. El sketch usa Trig en D6 y Echo en D7. El MKR admite señales de 3,3 V y un Echo de 5 V necesita adaptación antes de llegar a D7. [Guía de hardware del proyecto](setup-guide.md#3-arduino-setup-and-wiring-check)
2. Desde el repositorio, prepará el archivo local de Wi-Fi en la computadora que va a programar el Arduino.

   ```bash
   cd arduino/greenhouse-sensor
   cp -n wifi_connection_info.example.h wifi_connection_info.h
   nano wifi_connection_info.h
   ```

   Completá el SSID y la contraseña localmente. Confirmá `MQTT_HOST` = `broker.hivemq.com`, `MQTT_PORT` = `1883`, `MQTT_PREFIX` = `IIoT/grupo99` y un `MQTT_CLIENT_ID` único sin `CHANGE_ME`. Guardá con **Ctrl+O**, Enter y **Ctrl+X**.
3. Abrí **greenhouse-sensor.ino** en Arduino IDE. Elegí **Arduino MKR WiFi 1010** y su puerto. Necesitás **Arduino SAMD Boards**, **WiFiNINA** y **ArduinoMqttClient**. Pulsá **Verify** y, con el montaje listo, **Upload**. El monitor serie a **115200** muestra la conexión y la distancia.
4. En **LIVE full status**, `distanceCm` debe variar cuando cambia la distancia al agua. Hasta calibrar, `level` y `lowWater` quedan en `null`. Temperatura, humedad y lámpara funcionan de forma independiente.
5. Cuando midan las referencias reales, desde la raíz del repositorio en la Raspberry ejecutá:

   ```bash
   read -rp 'Número del SONOFF: ' sonoff
   read -rp 'Distancia al agua en vacío (cm): ' vacio
   read -rp 'Distancia al agua en lleno (cm): ' lleno
   node node-red/prepare-demo.js "$sonoff" "$vacio" "$lleno"
   ```

   Usá punto para los decimales. Volvé a importar el flow siguiendo la sección 2 y arrancá el publicador. Con una distancia válida, el nivel en **IIoT/grupo99/nivel** pasa de 0 % en vacío a 100 % en lleno. Por debajo del 20 % aparece **AGUA BAJA** bajo el controlador. Al llegar al 25 % se borra el aviso.

## Ver el tráfico desde otra terminal

```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -v \
  -t IIoT/grupo99/temperatura -t IIoT/grupo99/humedad \
  -t IIoT/grupo99/distancia -t IIoT/grupo99/nivel
```

Si ves valores en MQTT pero la matriz queda vacía, mirá **Errores de Python** en Debug y confirmá que solo el flow nuevo esté escribiendo en los LEDs. Si ves distancia pero el nivel sigue nulo después de calibrar, revisá que esté desplegada la nueva exportación y que la lectura sea válida y tenga menos de 15 segundos.
