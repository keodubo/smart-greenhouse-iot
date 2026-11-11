# Publicar una temperatura en HiveMQ y mostrarla en la Raspberry

Como en la práctica, publicamos desde la terminal al broker. Node-RED recibe el dato y ejecuta Python para mostrarlo en los LEDs físicos del Sense HAT.

```text
Terminal (mosquitto_pub) → HiveMQ → Node-RED → Python → display
```

## Antes de empezar

- Raspberry conectada a Internet y Sense HAT funcionando.
- Node-RED ejecutándose en la Raspberry.
- Flow `node-red/mqtt-display-flow.json` importado y ruta del programa configurada en `exec`.
- Comando `mosquitto_pub` disponible en la terminal, como en la práctica. Si no existe, pedí al laboratorio los clientes Mosquitto; no necesitás instalar un broker local.

Si todavía falta preparar algo, seguí primero [la guía de clonación y configuración del display](display-guide.md).

## 1. Conectar Node-RED al broker

Doble clic en **Temperatura desde HiveMQ** y configurá:

| Campo | Valor |
| --- | --- |
| Server | `broker.hivemq.com` |
| Port | `1883` |
| Topic | `IIoT/TU_GRUPO/temperatura` |
| Output | String / UTF-8 |
| QoS | `0` |

Reemplazá `TU_GRUPO` por el identificador acordado por tu grupo. Usá un topic propio de la prueba para evitar mezclar mensajes de otros grupos.

Estos datos corresponden al **broker público de HiveMQ**, que no requiere cuenta. Si usan HiveMQ Cloud privado, hay que usar el host, puerto, TLS y credenciales de esa cuenta en ambos clientes. No publiques credenciales en este repositorio.

Pulsá **Done**, habilitá la pestaña **HiveMQ → Display Sense HAT** y pulsá **Deploy**. El nodo MQTT debería indicar **connected**.

## 2. Publicar una temperatura desde otra terminal

Dejá Node-RED funcionando y abrí otra terminal en la Raspberry:

```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "IIoT/TU_GRUPO/temperatura" \
  -m "23.5"
```

**Reemplazá `TU_GRUPO` por exactamente el mismo identificador que pusiste en Node-RED.** El broker, el puerto y el topic deben coincidir.

El comando publica una vez y termina. Normalmente no imprime nada si funciona. No añadas `-r`: el flow descarta mensajes retenidos antiguos.

## 3. Comprobar el display físico

Debería aparecer **23.5 C** desplazándose por los LEDs y desaparecer al terminar. Es un valor de prueba introducido manualmente, pero el mensaje viaja realmente por HiveMQ; no es una lectura del sensor.

Esperá al menos cinco segundos y probá otro valor:

```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "IIoT/TU_GRUPO/temperatura" \
  -m "28.0"
```

El flow también acepta el formato del proyecto:

```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "IIoT/TU_GRUPO/temperatura" \
  -m '{"value":23.5,"unit":"C","valid":true}'
```

No necesitás otro programa Python para suscribirte: **Node-RED recibe MQTT; Python muestra el dato recibido**.

## Si no aparece la temperatura

1. Comprobá **connected** bajo el nodo MQTT.
2. Revisá que el topic sea idéntico, incluidas mayúsculas y barras.
3. Activá el Debug **Mensaje recibido (diagnóstico)** y publicá otra lectura.
4. Si llega el dato, revisá la ruta absoluta en `exec` y que **Append msg.payload** esté activado.
5. Mirá **Errores de Python** en Debug. `code 0` en la salida de finalización significa que el programa terminó sin error; verificá visualmente los LEDs.
6. Comprobá que ningún otro programa esté escribiendo en la matriz, incluido `greenhouse.py`.

## Próximos pasos

- [ ] Conectar Node-RED al broker y confirmar **connected**.
- [ ] Publicar `23.5` en el mismo topic.
- [ ] Confirmar que aparece en los LEDs físicos.
- [ ] Repetir con `28.0` después de cinco segundos.

## Referencias

- [Broker público de HiveMQ](https://www.hivemq.com/mqtt/public-mqtt-broker/).
- [Manual oficial de mosquitto_pub](https://mosquitto.org/man/mosquitto_pub-1.html).
- [Guía del display de este proyecto](display-guide.md).

El broker público es compartido: usalo para los datos no sensibles de esta prueba. El recorrido completo con tu hardware debe verificarse en el laboratorio.
