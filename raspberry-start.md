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
