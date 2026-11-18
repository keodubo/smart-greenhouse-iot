# Publicar y recibir MQTT en cualquier Raspberry

Una configuración local guarda el broker, el puerto y el topic. Los comandos usan `mosquitto_pub` y `mosquitto_sub`; no instalan software ni cambian la configuración de red por sí solos.

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

## 3. Guardar tu configuración local

Creá el archivo solo si todavía no existe:

```bash
cp -n mqtt-lab/config.example.json mqtt-lab/config.local.json
nano mqtt-lab/config.local.json
```

Reemplazá `CAMBIAR_TOPIC` por tu topic de pruebas o el topic exacto que corresponda. Conservá las comillas, comas y llaves. Guardá con **Ctrl+O**, Enter, y salí con **Ctrl+X**. El ejemplo usa `broker.hivemq.com` y puerto `1883`, como la práctica anterior; confirmá que el dispositivo actual usa el mismo broker.

`config.local.json` está excluido de Git y queda en esa Raspberry: **al clonar en otra deberás volver a crearlo**. Si necesitás conservar el topic entre equipos, guardalo en un lugar privado aprobado por el laboratorio; no subas identificadores privados ni contraseñas al repositorio público.

## 4. Recibir y publicar

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
