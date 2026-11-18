#!/usr/bin/env python3
"""Mostrar lecturas locales de temperatura y humedad en el Sense HAT físico."""
import math
import time


def display_text(kind, value):
    limits = {'temperatura': ('T', 'C', -40, 100), 'humedad': ('H', '%', 0, 100)}
    if kind not in limits:
        raise ValueError('Sensor desconocido')
    label, unit, minimum, maximum = limits[kind]
    if type(value) not in (int, float) or not math.isfinite(value) or not minimum <= value <= maximum:
        return label + ' ERROR'
    return f'{label} {value:.1f} {unit}'


def main():
    try:
        from sense_hat import SenseHat
        sense = SenseHat()
    except (ImportError, OSError, RuntimeError) as exc:
        raise SystemExit(f'No se pudo iniciar el Sense HAT físico: {exc}') from exc
    print('Mostrando sensores locales. Detener con Ctrl+C.', flush=True)
    try:
        while True:
            for kind, reader, colour in [
                ('temperatura', sense.get_temperature, [255, 100, 0]),
                ('humedad', sense.get_humidity, [0, 150, 255]),
            ]:
                try:
                    text = display_text(kind, reader())
                except (OSError, RuntimeError, ValueError):
                    text = display_text(kind, None)
                print(text, flush=True)
                sense.show_message(text, scroll_speed=0.05, text_colour=colour)
                time.sleep(0.5)
    except KeyboardInterrupt:
        print('\nLecturas detenidas.')
    finally:
        sense.clear()


if __name__ == '__main__':
    main()
