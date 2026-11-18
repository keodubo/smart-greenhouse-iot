import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('sense_readings', Path(__file__).parents[1] / 'raspberry-pi/mostrar-sensores.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SensorReadingsTests(unittest.TestCase):
    def test_sensor_values_are_labelled_and_rounded(self):
        self.assertEqual(module.display_text('temperatura', 21.54), 'T 21.5 C')
        self.assertEqual(module.display_text('humedad', 55.24), 'H 55.2 %')

    def test_invalid_readings_produce_an_error_label(self):
        for value in [None, True, float('nan'), float('inf'), -1, 101]:
            with self.subTest(value=value):
                self.assertEqual(module.display_text('humedad', value), 'H ERROR')

    def test_temperature_range_and_unknown_sensor(self):
        self.assertEqual(module.display_text('temperatura', -41), 'T ERROR')
        self.assertEqual(module.display_text('temperatura', 101), 'T ERROR')
        with self.assertRaises(ValueError):
            module.display_text('nivel', 30)
