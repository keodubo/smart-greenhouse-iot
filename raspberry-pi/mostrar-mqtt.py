#!/usr/bin/env python3
"""Display a temperature supplied by Node-RED, without reading a local sensor."""
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
    parser.add_argument('temperature', help='Temperatura recibida, por ejemplo 23.5')
    parser.add_argument('--preview', action='store_true', help='Imprimir texto sin acceder al hardware')
    args = parser.parse_args()
    try:
        text = temperature_text(args.temperature)
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
