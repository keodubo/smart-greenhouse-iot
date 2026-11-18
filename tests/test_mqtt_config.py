import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('mqtt_lab', Path(__file__).parents[1] / 'mqtt-lab/mqtt-lab.py')
mqtt_lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mqtt_lab)


class ConfigTests(unittest.TestCase):
    def test_valid_config_is_returned(self):
        cfg = {'broker': 'broker.hivemq.com', 'port': 1883, 'topic': 'prueba/grupo/temperatura'}
        self.assertEqual(mqtt_lab.validate_config(cfg, 'pub'), cfg)

    def test_empty_and_wildcard_publish_topics_rejected(self):
        for topic in ['', 'prueba/+', 'prueba/#', 'CAMBIAR_TOPIC']:
            with self.subTest(topic=topic), self.assertRaises(ValueError):
                mqtt_lab.validate_config({'broker':'localhost','port':1883,'topic':topic}, 'pub')

    def test_subscriber_allows_valid_topic_wildcards(self):
        cfg = {'broker':'localhost','port':1883,'topic':'prueba/grupo/#'}
        self.assertEqual(mqtt_lab.validate_config(cfg, 'sub'), cfg)

    def test_invalid_port_and_broker_rejected(self):
        for cfg in [{'broker':'','port':1883,'topic':'x'}, {'broker':'localhost','port':True,'topic':'x'},
                    {'broker':'localhost','port':0,'topic':'x'}]:
            with self.subTest(cfg=cfg), self.assertRaises(ValueError):
                mqtt_lab.validate_config(cfg, 'pub')
