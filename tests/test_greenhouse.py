import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('greenhouse', Path(__file__).parents[1] / 'raspberry-pi/greenhouse.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

class GreenhouseTests(unittest.TestCase):
    def test_sensor_payload_rejects_invalid_values(self):
        for value in [None, True, float('nan'), float('inf'), '17', -50, 120]:
            self.assertEqual(g.measurement(value, 'C'), {'value': None, 'unit': 'C', 'valid': False})
        self.assertEqual(g.measurement(21.567, 'C'), {'value':21.57,'unit':'C','valid':True})
        self.assertFalse(g.measurement(101, 'percent')['valid'])

    def test_joystick_ignores_release_hold_and_unmapped_directions(self):
        self.assertEqual(g.joystick_command('up','pressed'),'ON')
        self.assertEqual(g.joystick_command('down','pressed'),'OFF')
        self.assertEqual(g.joystick_command('middle','pressed'),'AUTO')
        for direction,action in [('up','released'),('up','held'),('left','pressed')]:
            self.assertIsNone(g.joystick_command(direction,action))

    def test_status_display_distinguishes_request_from_unknown_actual(self):
        status={'mode':'AUTO','armed':True,'requested':'ON','actual':'UNKNOWN','lowWater':False,'faults':[]}
        pixels=g.status_pixels(status, 0)
        self.assertEqual(len(pixels),64)
        self.assertEqual(pixels[16], [0,80,0])  # Requested ON row
        self.assertEqual(pixels[32], [50,0,50])  # Actual unknown row
        self.assertEqual(g.status_pixels(status,15), [[80,0,0]]*64)
        self.assertEqual(g.status_pixels(None,0), [[80,0,0]]*64)

    def test_config_rejects_wildcard_and_placeholder_namespace(self):
        base={'broker':'localhost','port':1883,'prefix':'IIoT/test-only','client_id':'test-pi'}
        self.assertEqual(g.validate_config(base)['port'],1883)
        for patch in [{'prefix':'IIoT/#'},{'prefix':'IIoT/CHANGE_ME'},{'port':0},{'port':True},
                      {'client_id':''},{'prefix':'IIoT/test/'}]:
            with self.assertRaises(ValueError): g.validate_config({**base,**patch})

if __name__ == '__main__': unittest.main()
