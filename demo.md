# Demo del invernadero desde la Raspberry

Usá un solo publicador del Sense HAT, un solo controlador de lámpara y una sola pestaña que escriba en la matriz. El generador prepara las rutas de esta Raspberry, los topics de grupo99 y los del SONOFF asignado. Los archivos generados terminan en `.local.json` y quedan en el equipo.

## 1. Preparar la Raspberry

Abrí una terminal en el escritorio. Si clonaste en otra ubicación, usá esa carpeta en la primera línea.

```bash
cd ~/smart-greenhouse-iot
git pull --ff-only
bash preparar-demo.sh --temperatura-ambiente 9
```

Este comando usa el SONOFF 9 y lee la temperatura actual del Sense HAT. Fija el umbral de encendido en el siguiente grado entero y el de apagado un grado más arriba. Anotá los dos valores que imprime. Para usar los umbrales fijos del proyecto (18 y 22 °C), ejecutá `bash preparar-demo.sh 9`.

**Configuración del grupo 99.** Para la prueba de la lámpara, el generador completa todo. Si ves `CHANGE_ME` en `pi-config.example.json`, estás viendo una plantilla. El publicador de la demo usa `demo-pi.local.json`. El broker es `broker.hivemq.com`, puerto `1883`. Los sensores publican bajo `IIoT/grupo99`. El comando previsto es `IIoT/9/relay/0/set` con `1` o `0`, y el estado es `IIoT/9/relay/0`. Confirmá el topic del equipo nuevo antes del despliegue: en otra terminal ejecutá `mosquitto_sub -h broker.hivemq.com -p 1883 -v -t 'IIoT/9/#'`, pulsá el botón físico del SONOFF 9 y comprobá que la línea del relé cambia junto con la lámpara. Dejala apagada. Si solo ves eventos de botón o no llega nada, revisá el topic y el broker del equipo con el laboratorio antes de habilitar LIVE.

Esperá el mensaje **Python listo**. Necesitás Node.js, Node-RED, Python con venv y la biblioteca física sense_hat instalada en el sistema. El script genera **node-red/demo.local.json**, configura HiveMQ en el puerto 1883 e instala Paho en el entorno virtual del proyecto. Conserva los flows que ya tengas en el editor.

Para actualizar un montaje ya preparado con los umbrales de 30 y 31 °C, ejecutá `ON_BELOW_C=30 OFF_AT_C=31 node node-red/prepare-demo.js 9` tras el pull y volvé a importar el archivo generado. El controlador y la matriz de esta demo toman las lecturas estructuradas del Sense HAT. Los números sueltos que lleguen por los mismos topics se ignoran. Una lectura vence después de 15 segundos sin una muestra válida.

## 2. Importar el flow de la demo

1. Abrí [Node-RED en la Raspberry](http://localhost:1880). Si está detenido, ejecutá `node-red` en otra terminal y dejala abierta.
2. Hacé una copia de lo que ya funciona con **☰ → Export → all flows → Download**. Si hay un controlador armado, pulsá **STOP / DISARM** y comprobá que la lámpara se apague. Detené el publicador Python anterior con **Ctrl+C**.
3. Deshabilitá las pestañas anteriores del display, de prueba manual y de automatización del invernadero (doble clic sobre cada pestaña → deshabilitar → **Done**). Pulsá **Deploy**.
4. Elegí **☰ → Import → select a file**, abrí **node-red/demo.local.json** y pulsá **Import**. Si el editor detecta IDs existentes, elegí importar como copia. Identificá las dos pestañas recién importadas, **Greenhouse — LIVE** y **HiveMQ → Display Sense HAT**. Habilitá ambas con doble clic en cada pestaña → habilitar → **Done**. Pulsá **Deploy** y esperá **connected** bajo los nodos MQTT.
5. La ruta del nodo **Mostrar en LEDs físicos** ya está configurada. Si cambiaste de Raspberry o moviste el repositorio, generá el archivo otra vez en su nueva ubicación.

## 3. Arrancar los sensores y mostrar la lámpara

En la terminal del repositorio ejecutá el siguiente comando y dejalo corriendo.

```bash
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --demo
```

1. Esperá **MQTT connected**. En Node-RED abrí **Debug** (insecto), expandí **LIVE full status** y buscá `temperature` y `humidity`. El Sense HAT publica cada cinco segundos. La matriz muestra las lecturas recibidas por MQTT aproximadamente cada diez segundos.
2. Pulsá **ARM (then fresh sample)** en la pestaña LIVE. Esperá una lectura nueva. En AUTO, una lectura inferior al primer umbral enciende la lámpara. Acercá la mano al Sense HAT y esperá a que la lectura llegue al segundo umbral para ver el apagado. Retirá la mano para que vuelva a bajar. En el intervalo entre ambos umbrales se conserva el estado anterior.
3. Con temperatura vigente, mové el joystick **arriba** para encender, **abajo** para apagar y **pulsalo hacia adentro** para volver a AUTO. En Debug, `requested` muestra la orden y `relayReported` el último estado informado por el SONOFF desde la conexión, inicialmente nulo. Mirá la lámpara para confirmar la salida física.
4. Si querés demostrar la conmutación automática cerca de la temperatura ambiente, elegí umbrales alcanzables según la lectura real. Por ejemplo, si la lectura inicial es 24 °C, generá el flow con `ON_BELOW_C=25 OFF_AT_C=26 node node-red/prepare-demo.js 9`. Repetí el paso 2 de esta guía con el controlador detenido. Volvé a arrancar el publicador y pulsá ARM. Una lectura menor que 25 pide ON y una lectura de 26 o más pide OFF. Para comprobarlo, acercá una mano al sensor y observá el valor.
5. Para terminar, pulsá **STOP / DISARM**, comprobá que la lámpara se apagó y luego detené Python con **Ctrl+C**. Una desconexión del broker impide entregar nuevas órdenes. Al reconectar, el controlador pide OFF y requiere volver a pulsar ARM.

## 4. Incorporar el nivel del tanque

El Arduino con el sensor de inmersión calibrado publica en `IIoT/grupo99/nivel` en HiveMQ, puerto 1883. Usá el firmware de inmersión del equipo. El sketch SRF04 del repositorio corresponde al montaje anterior.

El formato acordado es `{"value":68.0,"unit":"percent","valid":true}`. También se admite un número simple entre 0 y 100 en este topic. Publicá sin retención, aproximadamente cada 5 segundos. Node-RED se suscribe a nivel y publica el estado calculado en `IIoT/grupo99/estado`. En **Debug → LIVE full status**, comprobá `level` antes de pulsar ARM. Si el Arduino envía 0, debe verse 0 %. Una muestra inválida o 15 segundos sin datos dejan el nivel en `null`. La alerta `lowWater` se activa por debajo de 20 % y se borra al llegar a 25 %.

## Ver el tráfico desde otra terminal

```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -v \
  -t IIoT/grupo99/temperatura -t IIoT/grupo99/humedad \
  -t IIoT/grupo99/nivel
```

Si ves valores en MQTT pero la matriz queda vacía, mirá **Errores de Python** en Debug y confirmá que solo el flow nuevo esté escribiendo en los LEDs.
