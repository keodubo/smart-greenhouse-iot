#!/usr/bin/env python3
"""Display temperature and humidity supplied by Node-RED, without reading a local sensor."""
import argparse
import math


def temperature_text(value):
    if isinstance(value, bool):
        raise ValueError('La temperatura debe ser un número entre -40 y 100 C.')
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        raise ValueError('La temperatura debe ser un número entre -40 y 100 C.') from None
    if not math.isfinite(temperature) or not -40 <= temperature <= 100:
        raise ValueError('La temperatura debe ser un número entre -40 y 100 C.')
    return f'{temperature:.1f} C'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('temperature', nargs='?', help='Temperatura recibida, por ejemplo 23.5')
    parser.add_argument('--humidity', type=float, help='Humedad relativa en porcentaje')
    parser.add_argument('--preview', action='store_true', help='Imprimir texto sin acceder al hardware')
    args = parser.parse_args()
    try:
        parts = []
        if args.temperature is not None:
            parts.append('T ' + temperature_text(args.temperature))
        if args.humidity is not None:
            if not 0 <= args.humidity <= 100:
                raise ValueError('La humedad debe estar entre 0 y 100 %.')
            parts.append(f'H {args.humidity:.1f} %')
        if not parts:
            raise ValueError('Indicá temperatura o humedad.')
        text = '  '.join(parts)
    except ValueError as error:
        parser.error(str(error))
    if args.preview:
        print(text)
        return

    from sense_hat import SenseHat
    sense = SenseHat()
    try:
        sense.show_message(text, scroll_speed=0.05, text_colour=[255, 100, 0])
    finally:
        sense.clear()


if __name__ == '__main__':
    main()
