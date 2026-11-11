import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('mqtt_display', Path(__file__).parents[1] / 'raspberry-pi/mostrar-mqtt.py')
display = importlib.util.module_from_spec(spec)
spec.loader.exec_module(display)


class DisplayTests(unittest.TestCase):
    def test_formats_received_value_without_reading_sensor(self):
        self.assertEqual(display.temperature_text('23.5'), '23.5 C')
        self.assertEqual(display.temperature_text('-40'), '-40.0 C')
        self.assertEqual(display.temperature_text('100'), '100.0 C')

    def test_rejects_missing_non_numeric_nonfinite_and_out_of_range(self):
        for value in [None, True, '', 'not-a-number', 'nan', 'inf', '-inf', '101', '-41']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                display.temperature_text(value)


if __name__ == '__main__':
    unittest.main()
