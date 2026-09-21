#!/usr/bin/env python3
"""Lokaler Testserver (nur für die Entwicklung, nicht fürs Hosting nötig)."""
import os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from http.server import HTTPServer, SimpleHTTPRequestHandler


class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8735
print(f'Serving on http://127.0.0.1:{port}', flush=True)
HTTPServer(('127.0.0.1', port), H).serve_forever()
