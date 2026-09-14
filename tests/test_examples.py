import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'examples/python'))
from common import api
spec = importlib.util.spec_from_file_location('chain_example', ROOT / 'examples/python/03_chain.py')
chain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chain)
ID = '00000000-0000-4000-8000-000000000001'


class ChainTests(unittest.TestCase):
    def run_chain(self, actual):
        compressed = {'id': ID, 'status': 'succeeded', 'credits': {'actual': actual}, 'outputs': [{'asset_id': ID, 'mime_type': 'video/mp4', 'file_name': 'compressed.mp4'}]}
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(api, 'upload', return_value={'asset_id': ID}), patch.object(api, 'submit_saved', return_value={'id': ID}) as submit, patch.object(api, 'wait_job', side_effect=[compressed, {'id': ID, 'status': 'succeeded'}]):
                result = chain.chain(object(), 'source.mp4', folder, 30, 20)
                return result, submit.call_args_list

    def test_chain_passes_generated_asset_and_remaining_actual_budget(self):
        result, calls = self.run_chain(12)
        self.assertEqual(calls[1].args[2]['maximum_credits'], 18)
        self.assertEqual(calls[1].args[2]['input']['asset_id'], ID)
        self.assertIn('audio_job', result)

    def test_unknown_actual_reserves_first_cap(self):
        _, calls = self.run_chain(None)
        self.assertEqual(calls[1].args[2]['maximum_credits'], 10)

    def test_overrun_stops_next_step(self):
        with self.assertRaises(api.ClientError):
            self.run_chain(31)

    def test_resume_preserves_second_cap_when_actual_cost_arrives_later(self):
        compressed = {'id': ID, 'credits': {'actual': 5}, 'outputs': [{'asset_id': ID, 'mime_type': 'video/mp4', 'file_name': 'compressed.mp4'}]}
        with tempfile.TemporaryDirectory() as folder:
            Path(folder, 'extract.state.json').write_text(json.dumps({'request': {'body': {'maximum_credits': 10}}}))
            with patch.object(api, 'upload', return_value={'asset_id': ID}), patch.object(api, 'submit_saved', return_value={'id': ID}) as submit, patch.object(api, 'wait_job', side_effect=[compressed, {'id': ID}]):
                chain.chain(object(), 'source.mp4', folder, 30, 20)
                self.assertEqual(submit.call_args_list[1].args[2]['maximum_credits'], 10)

    def test_invalid_total_rejected_before_upload(self):
        with patch.object(api, 'upload') as upload:
            with self.assertRaises(api.ClientError):
                chain.chain(object(), 'source.mp4', '/tmp/unused-reclip', 10, 20)
            upload.assert_not_called()


class CurlTests(unittest.TestCase):
    def test_authenticated_read_and_quote_use_correct_routes(self):
        received = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                received.append((self.command, self.path, self.headers.get('Authorization'), None))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"ok":true}')

            def do_POST(self):
                body = self.rfile.read(int(self.headers['Content-Length']))
                received.append((self.command, self.path, self.headers.get('Authorization'), json.loads(body)))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"estimated_credits":0}')

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            env = dict(os.environ, RECLIP_API_KEY='test-key', RECLIP_API_BASE_URL='http://127.0.0.1:{}/api/v1'.format(server.server_port))
            subprocess.run(['bash', str(ROOT / 'examples/curl/quickstart.sh')], env=env, capture_output=True, check=True)
            with tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'request.json'
                path.write_text('{"tool":"mp4_to_mp3","input":{}}')
                subprocess.run(['bash', str(ROOT / 'examples/curl/quote.sh'), str(path)], env=env, capture_output=True, check=True)
            self.assertEqual(received[0][:3], ('GET', '/api/v1/me', 'Bearer test-key'))
            self.assertEqual(received[1][:3], ('POST', '/api/v1/jobs/quote', 'Bearer test-key'))
            self.assertEqual(received[1][3]['tool'], 'mp4_to_mp3')
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_remote_http_rejected_without_network(self):
        result = subprocess.run(['bash', str(ROOT / 'examples/curl/quickstart.sh')], env=dict(os.environ, RECLIP_API_KEY='test', RECLIP_API_BASE_URL='http://example.com/api/v1'), capture_output=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
