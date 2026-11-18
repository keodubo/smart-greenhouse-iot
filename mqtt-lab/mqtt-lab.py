#!/usr/bin/env python3
"""Publicar o recibir MQTT con mosquitto y configuración guardada localmente."""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent


def resolve_config(config, sensor, topic):
    result = dict(config) if config is not None else {'broker': 'broker.hivemq.com', 'port': 1883}
    if sensor:
        result['topic'] = 'IIoT/grupo99/' + sensor
    elif topic is not None:
        result['topic'] = topic
    return result


def validate_config(config, mode):
    if not isinstance(config, dict):
        raise ValueError('La configuración debe ser un objeto JSON.')
    host, port, topic = config.get('broker'), config.get('port'), config.get('topic')
    if not isinstance(host, str) or not host.strip() or host.startswith('-') or any(c.isspace() for c in host):
        raise ValueError('Indicá un broker válido sin mqtt:// ni espacios.')
    if '://' in host or '/' in host:
        raise ValueError('Escribí solo el nombre del broker, sin protocolo ni ruta.')
    if type(port) is not int or not 1 <= port <= 65535:
        raise ValueError('El puerto debe ser un número entre 1 y 65535.')
    if not isinstance(topic, str) or not topic or 'CAMBIAR_TOPIC' in topic or '\x00' in topic:
        raise ValueError('Configurá el topic en mqtt-lab/config.local.json o con --topic.')
    if mode == 'pub' and ('+' in topic or '#' in topic):
        raise ValueError('No se puede publicar en topics con + o #.')
    if mode == 'sub':
        parts = topic.split('/')
        if any(('+' in p and p != '+') or ('#' in p and (p != '#' or i != len(parts)-1)) for i,p in enumerate(parts)):
            raise ValueError('Comodines MQTT inválidos en el topic de suscripción.')
    return config


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=ROOT / 'config.local.json', help='archivo de configuración local')
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--topic', help='usar otro topic solo para este comando')
    selection.add_argument('--sensor', choices=['temperatura', 'humedad', 'nivel'],
                           help='seleccionar un topic fijo del grupo 99')
    commands = parser.add_subparsers(dest='mode', required=True)
    commands.add_parser('sub', help='escuchar mensajes; salir con Ctrl+C')
    pub = commands.add_parser('pub', help='publicar un mensaje no retenido')
    pub.add_argument('mensaje', help='mensaje a enviar')
    args = parser.parse_args()
    try:
        if args.config.exists():
            config = json.loads(args.config.read_text(encoding='utf-8'))
            if not isinstance(config, dict):
                raise ValueError('La configuración debe ser un objeto JSON.')
        else:
            config = None
            if args.config != ROOT / 'config.local.json':
                raise ValueError('No se encuentra el archivo de configuración indicado.')
        config = resolve_config(config, args.sensor, args.topic)
        validate_config(config, args.mode)
    except (OSError, ValueError, TypeError) as exc:
        parser.error(str(exc))
    binary = 'mosquitto_' + args.mode
    program = shutil.which(binary)
    if program is None:
        parser.exit(1, f'No se encontró {binary}. Instalá mosquitto-clients según la guía.\n')
    cmd = [program, '-h', config['broker'], '-p', str(config['port']), '-t', config['topic'], '-q', '0']
    if args.mode == 'pub':
        cmd.extend(['-m', args.mensaje])
    else:
        cmd.append('-v')
    sys.stdout.flush()
    os.execv(program, cmd)


if __name__ == '__main__':
    main()
