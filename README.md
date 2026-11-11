# Smart Greenhouse IoT

Código para un prototipo de invernadero: Raspberry Pi + Sense HAT, Arduino MKR WiFi 1010 + sensor ultrasónico y una lámpara controlada por SONOFF mediante MQTT y Node-RED.

**Preparado para probar en el laboratorio. El funcionamiento físico todavía no está verificado.**

## Recibir temperatura de HiveMQ y mostrarla en los LEDs

Seguí **[el paso a paso en español](display-guide.md)**: clonar en la Raspberry, probar el display, importar el flow y configurar MQTT/exec.

```text
HiveMQ → mqtt in → validar → delay → exec → Python → Sense HAT físico
```

- [Flow importable para el display](node-red/mqtt-display-flow.json).
- [Programa Python que muestra el dato recibido](raspberry-pi/mostrar-mqtt.py).
- Este flow es independiente de la lámpara. Configurá el topic real y la ruta de Python antes de habilitarlo.

## Empezar con Node-RED en la Raspberry

1. En el navegador de la **Raspberry**, abrí [el flow JSON](https://raw.githubusercontent.com/keodubo/smart-greenhouse-iot/HEAD/node-red/greenhouse-flow.json) y guardalo con **Ctrl+S**, con nombre `greenhouse-flow.json`. Si se descarga directamente, usá ese archivo.
2. Abrí una terminal en la Raspberry y ejecutá:

   ```bash
   node-red
   ```

3. Dejá la terminal abierta y entrá desde el navegador de la Raspberry a [http://localhost:1880](http://localhost:1880), o a la dirección que muestre la terminal. Si Node-RED ya está iniciado, abrí su editor sin iniciar otra instancia.
4. Exportá una copia de los flows existentes antes de cambiar nada. En Node-RED: **☰ → Import → select a file** y elegí `greenhouse-flow.json`.
5. Mantené deshabilitada la pestaña **Greenhouse — LIVE (enable in lab)**. En **OFFLINE DEMO**, desplegá el flow, abrí Debug y pulsá **Reset demo**.
6. Pulsá las entradas **17 °C → 20 °C → 22 °C**, sin pausas de 15 segundos. En Debug, `requested` debe mostrar **ON → ON → OFF**. Es una simulación y no manda comandos a la lámpara.

Si el navegador está en una computadora Windows y Node-RED corre en otra Raspberry, `localhost` apuntaría a Windows: usá la dirección de la Raspberry indicada por el laboratorio.

## Para controlar la lámpara real

Primero confirmá con el laboratorio:

- El SONOFF utiliza **MQTT**; algunos modelos de otras prácticas usan HTTP.
- Broker y puerto configurados en ese SONOFF.
- Topic exacto de comandos y mensajes exactos para **ON** y **OFF**. No se presuponen `1`/`0` y no se utiliza un comando de alternancia.
- Lámpara/SONOFF correctamente montados por el laboratorio.

Luego seguí la [guía completa de configuración y puesta en marcha](setup-guide.md). El flow integrado necesita una lectura nueva de temperatura después de **ARM**; no basta con pulsar un botón ON sin sensor. Para probar solo la lógica, usá la pestaña offline.

El estado físico del relé aparece como **UNKNOWN** porque todavía no se conoce un protocolo de confirmación. Observá la lámpara. Al perder conexión el controlador se desarma; después de reconectar hay que volver a pulsar **ARM**. Antes de reiniciar/desplegar/deshabilitar el flow, pulsá **STOP / DISARM** y comprobá que la lámpara se apagó.

## Descargar todo

Sin iniciar sesión en GitHub: **Code → Download ZIP**, extraer en una carpeta nueva.

O desde la terminal de la Raspberry, si tiene Git:

```bash
git clone https://github.com/keodubo/smart-greenhouse-iot.git
cd smart-greenhouse-iot
```

No se instala ni ejecuta automáticamente ningún programa al descargar el repositorio.

## Archivos

| Carpeta/archivo | Contenido |
| --- | --- |
| [`node-red/greenhouse-flow.json`](node-red/greenhouse-flow.json) | Flow importable: demo offline + pestaña live deshabilitada |
| [`node-red/flow-config.example.json`](node-red/flow-config.example.json) | Configuración de ejemplo sin credenciales ni datos del dispositivo |
| [`arduino/greenhouse-sensor/`](arduino/greenhouse-sensor/) | Sketch del sensor ultrasónico y plantilla Wi-Fi |
| [`raspberry-pi/`](raspberry-pi/) | Temperatura/humedad, joystick, LEDs y dependencias |
| [`setup-guide.md`](setup-guide.md) | Configuración, cableado, calibración, arranque y parada (inglés) |
| [`hardware-checklist.md`](hardware-checklist.md) | Registro de resultados pendientes del laboratorio |
| [`verification.md`](verification.md) | Verificación local y limitaciones |
| [`tests/`](tests/) | Pruebas unitarias del comportamiento |

## Configuración privada

Copiá las plantillas a `wifi_connection_info.h`, `pi-config.local.json` y `flow-config.local.json`, siguiendo la guía. Esos archivos y el flow configurado `greenhouse-flow.local.json` están excluidos de Git. No publiques contraseñas, topics privados de dispositivos ni exportaciones con credenciales.

Los documentos del profesor, PDFs del curso, datos personales, configuraciones privadas y el historial del workspace no se incluyen en este repositorio.

## Pruebas locales

Desde la carpeta del repositorio, con Node.js 18+ y Python 3:

```bash
node --test tests/*.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
python3 raspberry-pi/greenhouse.py --simulate --samples 3
```

La simulación de Python solo imprime datos de ejemplo; no se conecta a la red ni al hardware.
