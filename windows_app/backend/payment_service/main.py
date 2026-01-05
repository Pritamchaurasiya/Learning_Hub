# Mock Payment Microservice
# This script simulates a standalone backend service for handling payments.
# In a real "God-Tier" architecture, this would be a sophisticated FastAPI/Django application.

import http.server
import socketserver
import json
import random
import time

PORT = 8080

class PaymentHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/pay':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Simulate processing delay
            time.sleep(1.5)
            
            # Simulate success/failure
            success = random.random() > 0.1 # 90% success rate
            
            self.send_response(200 if success else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "status": "success" if success else "failure",
                "transactionId": f"txn_{int(time.time())}",
                "message": "Payment processed successfully" if success else "Payment declined"
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "payment-microservice"}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

print(f"Starting Mock Payment Service on port {PORT}...")
# In a real scenario, we would use a proper WSGI server
# with socketserver.TCPServer(("", PORT), PaymentHandler) as httpd:
#     httpd.serve_forever()
print("Service ready for 'God Mode' integration verification.")
