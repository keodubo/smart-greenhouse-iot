"""Muestra el estado de agua enviado por Node-RED."""
import argparse
from sense_hat import SenseHat

colors = {'off': (0, 0, 0), 'red': (80, 0, 0), 'green': (0, 60, 0)}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('color', choices=colors)
SenseHat().clear(*colors[parser.parse_args().color])
