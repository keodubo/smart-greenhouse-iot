# Raspberry Pi desde cero: temperatura y humedad en los LEDs

Usá la Raspberry Pi 16 con el Sense HAT. El recorrido es **sensor físico → MQTT → Node-RED → matriz LED**. Seguí los pasos en orden desde el escritorio de la Raspberry.

## 1. Encender y descargar el proyecto

1. Encendé la Raspberry y abrí una **Terminal**.
2. Confirmá que esté conectada a la red del laboratorio.
3. Pegá este bloque. Si ya existe el repositorio, se actualiza.

```bash
cd ~
if [ -d smart-greenhouse-iot/.git ]; then
  git -C smart-greenhouse-iot pull --ff-only
else
  git clone https://github.com/keodubo/smart-greenhouse-iot.git
fi
cd ~/smart-greenhouse-iot
```

Si clonaste en otra carpeta, entrá en esa carpeta y hacé `git pull --ff-only` allí.

## 2. Preparar Python y probar la matriz

```bash
cd ~/smart-greenhouse-iot
python3 -m venv --system-site-packages raspberry-pi/.venv
raspberry-pi/.venv/bin/python -m pip install -r raspberry-pi/requirements.txt
raspberry-pi/.venv/bin/python raspberry-pi/mostrar-mqtt.py 21.5 --humidity 55
```

Deberías ver los dos valores de prueba en los LEDs. Si falta `sense_hat`, verificá que estés usando la Raspberry del laboratorio con la biblioteca física instalada. Cerrá con **Ctrl+C** cualquier programa anterior que esté escribiendo en la matriz.

Generá el comando exacto para el nodo de Node-RED y copiá la línea que imprime:

```bash
printf 'python3 "%s"\n' "$(realpath raspberry-pi/mostrar-mqtt.py)"
```

## 3. Abrir Node-RED e importar el flow

1. Abrí [http://localhost:1880](http://localhost:1880) en el navegador de la Raspberry. Si el editor no abre porque Node-RED está detenido, ejecutá `node-red` en otra terminal, dejala abierta y recargá la página.
2. Si ya existe **HiveMQ → Display Sense HAT** y tiene los nodos de temperatura y humedad, usá esa pestaña y pasá al paso 4. Si es una versión anterior, exportá una copia y deshabilitala antes de importar la nueva.
3. En el menú **☰ → Import → select a file**, elegí `smart-greenhouse-iot/node-red/mqtt-display-flow.json` desde tu carpeta personal. Pulsá **Import** y abrí la pestaña **HiveMQ → Display Sense HAT**.

## 4. Configurar y desplegar

1. Abrí el nodo **Mostrar en LEDs físicos** con doble clic.
2. En **Command**, pegá la línea completa que generaste en el paso 2. Mantené marcada la opción **Append msg.payload** y dejá vacío el campo de argumentos adicionales.
3. Pulsá **Done**. Abrí las propiedades de la pestaña del display con doble clic en su nombre y habilitala.
4. Los nodos **Temperatura desde HiveMQ** y **Humedad desde HiveMQ** usan `broker.hivemq.com:1883` y los topics `IIoT/grupo99/temperatura` e `IIoT/grupo99/humedad`. Pulsá **Deploy** y esperá que ambos indiquen **connected**.

## 5. Publicar lecturas reales

En la terminal y desde la carpeta del repositorio, probá primero temperatura:

```bash
cd ~/smart-greenhouse-iot
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --sensor temperatura
```

Esperá a ver `T … C` en la matriz. Después pulsá **Ctrl+C** y probá humedad:

```bash
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --sensor humedad
```

Cuando aparezca `H … %`, pulsá **Ctrl+C** y arrancá las dos juntas:

```bash
raspberry-pi/.venv/bin/python raspberry-pi/greenhouse.py --sensor ambos
```

Dejá ese proceso corriendo mientras quieras ver las lecturas. Publica cada cinco segundos. El flow actualiza los LEDs cada diez segundos. Si existe `raspberry-pi/pi-config.local.json`, su broker y prefijo deben coincidir con Node-RED.

Si el comando directo ilumina los LEDs pero MQTT no muestra lecturas, activá **Mensaje recibido (diagnóstico)** en el flow y pulsá **Deploy**. El panel **Debug** (ícono de insecto) muestra los datos recibidos y los mensajes de **Errores de Python**. Si aparece `Indicá temperatura o humedad`, revisá **Append msg.payload** y volvé a desplegar.

Para más detalles, consultá la [guía del display](display-guide.md).

## 6. Conectar el SONOFF 5 y controlar la lámpara con temperatura real

Este paso usa el flow **Greenhouse — LIVE** junto con el display del paso 5. La Raspberry Pi 16 publica la temperatura del Sense HAT y el controlador de Node-RED decide cuándo enviar ON u OFF al SONOFF 5.

### Confirmar y probar el relé

- Confirmá con el laboratorio si **el SONOFF 5 usa MQTT**. Pedí el broker y el puerto, el topic exacto de comandos y los dos mensajes explícitos de encendido y apagado. El número de la etiqueta no identifica el topic. El valor `2` de la práctica alterna el estado.
- Si el SONOFF usa **HTTP**, este flow requiere una adaptación. Un `ECONNREFUSED` en el puerto `8081` se diagnostica en el nodo **http request** del flow de la práctica HTTP. Confirmá la dirección del equipo asignado y probá primero **Get Device Info**.
- Con el SONOFF y la lámpara ya montados por el laboratorio, probá el camino MQTT con dos nodos **Inject** conectados a un **MQTT out**. En cada Inject, poné el payload confirmado como **string**, sin repetición ni envío al iniciar. En MQTT out, cargá el broker, puerto y topic confirmados, con **Retain false**. Desplegá y probá **OFF → ON → OFF**, observando la lámpara en cada paso. Deshabilitá la pestaña de prueba y volvé a desplegar antes de activar el control automático.

### Configurar el flow automático

En la terminal de la Raspberry, desde el repositorio:

```bash
cd ~/smart-greenhouse-iot
cp -n node-red/flow-config.example.json node-red/flow-config.local.json
nano node-red/flow-config.local.json
```

| Campo | Qué poner |
| --- | --- |
| `broker` y `port` | Los que usa el SONOFF 5. Para este flow deben coincidir con los del publicador del Sense HAT. Si son distintos, hace falta configurar conexiones separadas. |
| `prefix` | `IIoT/grupo99`, igual que el publicador. |
| `relayTopic` | Topic confirmado del SONOFF 5. El controlador actual exige que esté fuera de `IIoT/grupo99/`. Si el topic asignado está dentro de ese prefijo, hay que adaptar el controlador antes de armarlo. |
| `onPayload` y `offPayload` | Mensajes confirmados para los dos estados, entre comillas. |
| `onBelow` y `offAt` | Umbrales en °C. Con `18` y `22`, la lámpara enciende por debajo de 18 °C y se apaga al llegar a 22 °C. Entre ambos conserva el estado anterior. |

Guardá con **Ctrl+O**, Enter y **Ctrl+X**. Generá el flow con tu configuración:

```bash
node node-red/build-flow.js node-red/flow-config.local.json node-red/greenhouse-flow.local.json
```

1. En Node-RED, exportá una copia de los flows existentes. Si ya tenés otro controlador de la lámpara, pulsá **STOP / DISARM**, comprobá que se apague y deshabilitá ese controlador antes de activar el nuevo.
2. Abrí **☰ → Import → select a file** e importá **`node-red/greenhouse-flow.local.json`**. Habilitá **Greenhouse — LIVE** y pulsá **Deploy**. Dejá vacía la casilla **Topic** de **Verified SONOFF command**: el controlador la completa con `relayTopic`.
3. Dejá corriendo el publicador del paso 5 con `--sensor ambos`. En **Debug → LIVE full status**, confirmá que aparece una temperatura numérica real y que el MQTT figura conectado. El nivel del tanque puede quedar pendiente para esta prueba.
4. Pulsá **ARM (then fresh sample)** y esperá la siguiente lectura, aproximadamente cinco segundos. Mirá el estado solicitado y observá físicamente la lámpara. `UNKNOWN` indica que el flow carece de confirmación del relé.
5. Para probar ambos estados con la temperatura ambiente, podés ajustar temporalmente los umbrales. Por ejemplo, con una lectura estable de 21 °C, `onBelow: 22` y `offAt: 24` permiten probar el encendido. Antes de cambiar la configuración, pulsá **STOP / DISARM** y comprobá que se apague. Luego, con `onBelow: 18` y `offAt: 20`, la misma lectura queda por encima del umbral de apagado. Restaurá los valores acordados después de la prueba.
6. Para terminar, pulsá **STOP / DISARM** y verificá que la lámpara quedó apagada antes de detener Node-RED. Si se pierde la conexión, el relé puede conservar su estado físico. Usá el procedimiento de apagado del laboratorio y volvé a armar el flow tras reconectar.

Los archivos `*.local.json` quedan en la Raspberry. Si cambiás de equipo, completá allí la configuración del relé.
