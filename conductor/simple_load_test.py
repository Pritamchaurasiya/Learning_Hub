import urllib.request
import time
import json

endpoints = [
    '/api/v1/courses/',
    '/api/v1/dsa/problems/',
]

base_url = 'http://127.0.0.1:8000'

print("=== LOAD TEST STARTED ===")
for _ in range(5):
    for endpoint in endpoints:
        start_time = time.time()
        try:
            req = urllib.request.Request(base_url + endpoint)
            out = urllib.request.urlopen(req, timeout=5)
            status = out.status
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception as e:
            status = str(e)
            
        elapsed = (time.time() - start_time) * 1000
        print(f"[{status}] {endpoint} - {elapsed:.1f}ms")
    time.sleep(0.5)
print("=== LOAD TEST COMPLETED ===")
