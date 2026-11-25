# Demo con sensores del Arduino

El Arduino publica temperatura, humedad y nivel en los topics `IIoT/grupo99/temperatura`, `IIoT/grupo99/humedad` y `IIoT/grupo99/nivel` de `broker.hivemq.com:1883`. Para temperatura y humedad usá un número como `23.66`. Para el nivel se admite un número de 0 a 100 o el JSON porcentual del proyecto. Publicá lecturas nuevas cada cinco segundos con retain desactivado. La Raspberry ejecuta Node-RED. La matriz del Sense HAT indica nivel bajo en rojo por debajo de 20 % y vuelve al verde desde 25 %. Si el nivel caduca se apaga.

1. En la Raspberry: `cd ~/smart-greenhouse-iot` y `git pull --ff-only`. Detené con Ctrl+C los publicadores de sensores Python que estuvieran corriendo.
2. Abrí Node-RED. Guardá una copia con Export → all flows. Para actualizar la demo existente, pausá las publicaciones de temperatura durante 15 segundos con HiveMQ conectado y comprobá el apagado. Deshabilitá las dos pestañas anteriores y pulsá Deploy.
3. Importá **node-red/demo-arduino-grupo99.json** desde el menú Import → select a file. Si aparecen IDs repetidos, importá como copia y dejá habilitadas únicamente las dos pestañas nuevas. Contiene **Dashboard & SenseHAT · Arduino** y **Arduino → SONOFF 9**. Si el grupo ya desplegó su dashboard en /ui, usá una sola de las dos pestañas de dashboard y un solo escritor de LEDs. Esta versión usa nodos integrados; el endpoint /ui debe estar disponible. El nodo del display ejecuta el Python del sistema y requiere sense_hat y el repositorio en la carpeta personal del usuario de Node-RED. En otra ubicación, editá la ruta de ese nodo.
4. Con el SONOFF y la lámpara listos, pulsá Deploy. El automático se activa en ese momento y envía OFF al conectarse. Abrí [el panel](http://127.0.0.1:1880/ui) y **Debug → Datos Arduino**. Si falta una lectura durante 15 segundos, el panel muestra un guion. Comprobá los mensajes en otra terminal con `mosquitto_sub -h broker.hivemq.com -p 1883 -v -t 'IIoT/grupo99/+'`.
5. Calentá el sensor del Arduino por encima de 25 °C. El controlador pide ON al SONOFF 9. A 24,5 °C o menos pide OFF. Entre ambos límites conserva la última orden. Compará la lámpara con `mosquitto_sub -h broker.hivemq.com -p 1883 -v -t 'IIoT/9/relay/0/#'`. Si faltan temperaturas válidas durante 15 segundos, el controlador pide OFF mientras esté conectado.
6. Para terminar con el broker conectado, detené las publicaciones del Arduino, esperá la orden OFF y comprobá físicamente que la lámpara se apagó antes de detener Node-RED.

## Panel de operación

Abrí `http://127.0.0.1:1880/ui` en la Raspberry. En otra computadora del laboratorio usá la dirección de la Raspberry en lugar de 127.0.0.1. El panel muestra las tres lecturas del Arduino, la alerta de agua, la conexión MQTT, el modo de control, la orden enviada y el último informe recibido del SONOFF con su hora.

- **Switch on** y **Switch off** seleccionan el modo manual. Encender requiere conexión y una temperatura vigente. Si pasan 15 segundos sin temperatura válida, se pide OFF y el encendido manual se cancela. **Automatic** devuelve el control a la regla de temperatura.
- En **Control thresholds** editá los límites de encendido y apagado y los dos límites del nivel de agua. Pulsá **Apply thresholds**. Se usan desde ese momento; entre los dos límites se conserva el estado anterior.
- Con el almacenamiento estándar en memoria los ajustes duran hasta el reinicio de Node-RED. Los valores iniciales son encendido por encima de 25 °C, apagado a 24,5 °C o menos, agua baja por debajo del 20 % y recuperación desde el 25 %.

En **Measurement history** seleccioná temperatura, humedad o nivel para ver las muestras recibidas en los últimos cinco minutos, con su mínimo, máximo y cantidad de observaciones. Un intervalo de 15 segundos sin muestras interrumpe el trazo.
