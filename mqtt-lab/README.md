# Publicar y recibir MQTT en cualquier Raspberry

Los tres topics del grupo 99 ya vienen preparados. Los comandos usan `mosquitto_pub` y `mosquitto_sub`; no instalan software ni cambian la configuración de red por sí solos.

## 1. Clonar o actualizar

En una Raspberry nueva:

```bash
git clone https://github.com/keodubo/smart-greenhouse-iot.git
cd smart-greenhouse-iot
```

Si ya clonaste el repositorio, entrá en esa carpeta y actualizá con `git pull`. Si Git informa de cambios locales o conflictos, no los descartes: revisalos antes de continuar.

## 2. Comprobar los programas

```bash
python3 --version
mosquitto_pub --help
mosquitto_sub --help
```

Si falta Mosquitto, pedí autorización al laboratorio antes de instalar paquetes. En Raspberry Pi OS, el paquete suele llamarse `mosquitto-clients`:

```bash
sudo apt update
sudo apt install mosquitto-clients
```

## 3. Usar los topics del grupo 99

Los siguientes topics ya están incorporados y no requieren editar ningún archivo:

| Selección | Topic MQTT |
| --- | --- |
| `temperatura` | `IIoT/grupo99/temperatura` |
| `humedad` | `IIoT/grupo99/humedad` |
| `nivel` | `IIoT/grupo99/nivel` |

El broker predeterminado es `broker.hivemq.com`, puerto `1883`. Si ya creaste `config.local.json`, se conservarán su broker y puerto, pero `--sensor` elegirá el topic de la tabla aunque el archivo tenga otro topic.

En una terminal, desde la carpeta del repositorio:

```bash
python3 mqtt-lab/mqtt-lab.py --sensor temperatura sub
```

En otra terminal, desde la misma carpeta:

```bash
python3 mqtt-lab/mqtt-lab.py --sensor temperatura pub '21.5'
```

La primera terminal debería mostrar `IIoT/grupo99/temperatura 21.5`. Para salir, pulsá **Ctrl+C**. Reemplazá `temperatura` por `humedad` o `nivel` en ambas terminales para probar los otros topics.

Para escuchar simultáneamente mensajes bajo ese grupo:

```bash
python3 mqtt-lab/mqtt-lab.py --topic 'IIoT/grupo99/+' sub
```

El comodín también muestra cualquier otro topic de un nivel bajo `IIoT/grupo99/`. Los mensajes son texto plano: el flow de control de la lámpara requiere JSON validado (ver [la guía de montaje](../setup-guide.md)); estos números solos sirven para probar MQTT y no activan ese controlador. El topic `nivel` representa un porcentaje estimado, no una medición de distancia.

HiveMQ es público y compartido. Cualquier cliente podría enviar o leer esos topics; coordiná las pruebas con tu grupo y no envíes datos privados. Antes de publicar verificá que no haya otro sistema actuando sobre el topic.

## 4. Configuración local opcional

Creá el archivo solo si todavía no existe:

```bash
cp -n mqtt-lab/config.example.json mqtt-lab/config.local.json
nano mqtt-lab/config.local.json
```

Para usar los comandos sin `--sensor`, reemplazá `CAMBIAR_TOPIC` por el topic exacto. Conservá las comillas, comas y llaves. Guardá con **Ctrl+O**, Enter, y salí con **Ctrl+X**. Confirmá que el dispositivo actual usa el broker indicado.

`config.local.json` está excluido de Git y queda en esa Raspberry: **al clonar en otra deberás volver a crearlo**. Si necesitás conservar el topic entre equipos, guardalo en un lugar privado aprobado por el laboratorio; no subas identificadores privados ni contraseñas al repositorio público.

## 5. Recibir y publicar con topic personalizado

Abrí dos terminales en la carpeta del repositorio. En la primera:

```bash
python3 mqtt-lab/mqtt-lab.py sub
```

En la segunda:

```bash
python3 mqtt-lab/mqtt-lab.py pub 'hola'
```

La primera terminal debería mostrar el topic y `hola` si ambas se conectan al mismo broker y topic. Para salir de la suscripción, pulsá **Ctrl+C**. Esta prueba envía datos por la red: usá un topic de prueba propio, no el de un dispositivo, y no envíes datos sensibles. HiveMQ es público, compartido y en este ejemplo la conexión no está cifrada.

Para cambiar de topic solo en una orden, sin editar el archivo:

```bash
python3 mqtt-lab/mqtt-lab.py --topic 'prueba/mi-grupo/temperatura' sub
python3 mqtt-lab/mqtt-lab.py --topic 'prueba/mi-grupo/temperatura' pub '21.5'
```

El `--topic` va antes de `sub` o `pub`. El suscriptor admite comodines MQTT, por ejemplo `prueba/mi-grupo/#`; el publicador requiere un topic concreto. Los mensajes se envían con QoS 0 y sin retain. El script no configura autenticación ni TLS: si el broker del laboratorio los requiere, consultá la configuración indicada por el profesor.

## Lámpara SONOFF

Para controlarla necesitás confirmar su broker, topic y mensajes ON/OFF específicos. El ejemplo de la práctica con `2` alterna el estado y no identifica comandos separados. No uses el topic de prueba como si fuera el de la lámpara y verificá físicamente cualquier cambio con la instalación del laboratorio.
