# HiveMQ → Node-RED → display físico

Node-RED recibe la temperatura por MQTT, valida el dato y se lo pasa a Python. Python muestra ese número en los LEDs del Sense HAT; no lee el sensor local.

```text
mqtt in → Validar temperatura → delay (1 cada 5 s) → exec → LEDs
```

Este flow es independiente de la lámpara: no tiene salidas MQTT ni manda órdenes al SONOFF.

## 1. Clonar en la Raspberry

Abrí una terminal **en la Raspberry**, no en Windows:

```bash
cd ~
git clone https://github.com/keodubo/smart-greenhouse-iot.git
cd smart-greenhouse-iot
```

El repositorio es público y no requiere iniciar sesión. Si falta Git, podés usar **Code → Download ZIP** y extraer en una carpeta nueva.

Si ya lo clonaste, actualizalo en lugar de clonarlo otra vez:

```bash
cd ~/smart-greenhouse-iot
git status --short
git pull --ff-only
```

Si Git avisa de cambios locales o conflictos, conservá tus cambios y revisá el mensaje; no uses `reset --hard`. Si la carpeta existente no es un clon, elegí una carpeta nueva.

## 2. Probar el display

Desde la carpeta del repositorio:

```bash
python3 raspberry-pi/mostrar-mqtt.py 23.5
```

Deberías ver **23.5 C** desplazándose por los LEDs físicos. Es un valor de prueba, no una medición. El programa termina y limpia los LEDs al acabar.

Usá el mismo Python y usuario con los que ya funcionaba `sense_hat`. No necesitás instalar Paho para este circuito: MQTT lo gestiona Node-RED. Si falta `sense_hat`, comprobá el intérprete y el entorno de la prueba anterior. No uses `sense_emu`, que es un emulador.

No ejecutes otros programas que escriban en los LEDs. En particular, `greenhouse.py` también dibuja estados en esa matriz. Esta prueba independiente presupone que el emisor MQTT ya funciona sin competir por el display.

## 3. Obtener la ruta del programa

```bash
realpath raspberry-pi/mostrar-mqtt.py
```

Copiá la ruta devuelta para el nodo `exec`. No presupongas que el usuario se llama `pi`.

## 4. Abrir Node-RED e importar

Si Node-RED aún no está iniciado:

```bash
node-red
```

Dejá la terminal abierta. En el navegador de la Raspberry, entrá a [http://localhost:1880](http://localhost:1880) o a la dirección indicada en la terminal. Si ya corre como servicio, abrí el editor existente sin iniciar otra instancia.

1. Exportá una copia de tus flows actuales.
2. En **☰ → Import → select a file**, elegí `smart-greenhouse-iot/node-red/mqtt-display-flow.json` desde tu carpeta personal.
3. Aparece **HiveMQ → Display Sense HAT**, inicialmente deshabilitada para configurarla primero.
4. No importes duplicados si esa pestaña ya existe. Un futuro `git pull` actualiza los archivos, pero no reemplaza automáticamente los flows guardados en Node-RED.

## 5. Configurar mqtt in

Doble clic en **Temperatura desde HiveMQ**:

- **Server:** el ejemplo usa `broker.hivemq.com`, puerto `1883`, para HiveMQ público. Debe ser el mismo broker del emisor. Si usan HiveMQ Cloud, configurá su host, puerto, TLS y credenciales en Node-RED; es otro servicio.
- **Topic:** reemplazá `IIoT/CHANGE_ME/temperatura` por el topic exacto del emisor, respetando mayúsculas y barras.
- **Output:** String/UTF-8 y **QoS:** 0, ya configurados.

El flow acepta un número como `23.5` o el mensaje del proyecto:

```json
{"value":23.5,"unit":"C","valid":true}
```

Rechaza textos arbitrarios, lecturas inválidas, valores fuera de -40 a 100 C y mensajes retenidos antiguos. Solo el número normalizado llega a `exec`. No conectes `mqtt in` directamente a `exec`.

## 6. Configurar exec

Doble clic en **Mostrar en LEDs físicos**:

1. En **Command**, reemplazá la ruta de ejemplo por la del paso 3, precedida por `python3`:

   ```text
   python3 "/ruta/real/smart-greenhouse-iot/raspberry-pi/mostrar-mqtt.py"
   ```

2. Dejá marcada **Append msg.payload**. Así se añade `23.5` como argumento.
3. Dejá el modo **exec** y el campo de argumentos adicionales vacío.
4. El timeout es de 4 segundos. El nodo `delay` deja pasar una lectura cada 5 segundos y descarta las intermedias para no acumular mensajes.
5. Pulsá **Done**.

Si Node-RED corre con otro usuario, ese usuario debe poder leer el archivo y acceder al Sense HAT. No uses `sudo` en `exec` como solución automática.

## 7. Activar y recibir

1. Doble clic en el nombre de la pestaña y habilitala (**Enabled** o desmarcar **Disabled**, según versión).
2. Pulsá **Deploy**. No actives otros flows que escriban en esos LEDs.
3. El nodo MQTT debería indicar **connected**.
4. Pedile al emisor una lectura nueva. Conectarse al broker no genera temperaturas por sí solo.
5. El número recibido debería aparecer y desaparecer al terminar el desplazamiento. No es una indicación continua de temperatura fresca.

Para una prueba controlada, otro publicador MQTT puede enviar `23.5` al mismo topic, sin retención. Identificá esa prueba como simulada. Para datos reales, conservá el formato.

## Diagnóstico

| Qué ocurre | Qué comprobar |
| --- | --- |
| MQTT desconectado | Wi-Fi, host, puerto y TLS si corresponde |
| Conectado, sin mensajes | Topic exacto y emisor publicando nuevas lecturas |
| Llegan datos, sin texto en LEDs | Activá el Debug **Mensaje recibido (diagnóstico)** y revisá el formato |
| Lectura retenida rechazada | Publicá una lectura nueva, no retenida |
| Python no encuentra el archivo | Ruta absoluta y permisos del usuario de Node-RED |
| Falta `sense_hat` | Intérprete y entorno usados por Node-RED |
| Texto cortado / timeout | Medí el tiempo del comando directo; si supera 4 s, usá delay de 10 s y timeout de 9 s |
| Colores o texto superpuestos | Otro programa/flow escribe en la matriz |

La segunda salida de `exec` va a **Errores de Python**. La tercera indica **code 0** si terminó sin error; comprobá visualmente el display.

## Verificación sin hardware

```bash
node --test tests/*.test.js
python3 -B -m unittest discover -s tests -p 'test_*.py'
python3 raspberry-pi/mostrar-mqtt.py --preview 23.5
```

`--preview` imprime el texto sin acceder al Sense HAT. Para los LEDs físicos, ejecutá **sin** `--preview`.

Fuentes: [MQTT Input de Node-RED](https://cookbook.nodered.org/mqtt/subscribe-to-topic), [API del Sense HAT](https://sense-hat.readthedocs.io/en/latest/api/#show_message).
