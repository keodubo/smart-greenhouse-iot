import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class DemoConfigTests(unittest.TestCase):
    def test_demo_config_is_read_from_installation_with_or_without_explicit_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'raspberry-pi'
            folder.mkdir()
            script = folder / 'greenhouse.py'
            shutil.copy(Path(__file__).resolve().parents[1] / 'raspberry-pi' / script.name, script)
            config = folder / 'demo-pi.local.json'
            command = [sys.executable, str(script), '--check-config']
            missing = subprocess.run(command + ['--demo'], cwd=root, capture_output=True, text=True)
            self.assertNotEqual(missing.returncode, 0)
            self.assertIn(str(config.resolve()), missing.stderr)
            config.write_text(json.dumps(dict(broker='localhost', port=1883, prefix='lab', client_id='test')))
            for args in [[], ['--demo'], ['--config', 'raspberry-pi/demo-pi.local.json']]:
                with self.subTest(args=args):
                    subprocess.run(command + args, cwd=folder, check=True, capture_output=True)
