import os
import sys
import django
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to python path
project_root = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conductor.settings')
django.setup()

from apps.security.ml_waf import MLWebAF
from apps.ai_engine.soar_engine import AutonomousSOAREngine

def test_ml_waf_anomaly_detection():
    print("Testing ML Web Application Firewall (User Behavior Analytics)...")
    
    waf = MLWebAF(contamination_rate=0.1)
    
    # 1. Generate Synthetic Traffic (Legitimate Users vs Scraper Bot)
    now = datetime.now()
    
    traffic = []
    
    # Human 1 (Slow, erratic, low volume)
    for i in range(5):
        traffic.append({
            'ip': '192.168.1.100',
            'timestamp': now - timedelta(seconds=100 - (i * 20)),
            'path': f'/api/courses/{i}/',
            'status_code': 200,
            'bytes_sent': 500
        })
        
    # Human 2 
    for i in range(3):
        traffic.append({
            'ip': '203.0.113.50',
            'timestamp': now - timedelta(seconds=i * 15),
            'path': '/api/dashboard/',
            'status_code': 200,
            'bytes_sent': 1200
        })
        
    # BOTNET IP (Fast polling, high 404s, dir busting)
    for i in range(80):
        traffic.append({
            'ip': '10.0.0.99',
            'timestamp': now - timedelta(seconds=i * 0.1), # Very fast
            'path': f'/api/hidden-admin-{i}/', # High variance
            'status_code': 404, # High error rate
            'bytes_sent': 100
        })
        
    # 2. Train baseline (In reality happens asynchronously via Celery)
    waf.train_baseline(traffic)
    
    # 3. Score recent traffic
    anomaly_scores = waf.predict_anomalies(traffic)
    print("\nAnomaly Scores (Lower is more anomalous/bot-like):")
    for ip, score in anomaly_scores.items():
        print(f"IP: {ip} -> Score: {score:.3f}")
        
    # Assertions
    bot_score = anomaly_scores.get('10.0.0.99', 1.0)
    human_score = anomaly_scores.get('192.168.1.100', -1.0)
    
    print(f"\nEvaluating Bot [{bot_score}] vs Human [{human_score}]")
    assert bot_score < human_score, "WAF Failed: Bot scored higher than human."
    assert bot_score < 0, "WAF Failed: Bot was not classified as an anomaly (negative score)."
    
    # 4. Trigger SOAR Playbook
    if bot_score < 0:
        print("\nAnomaly detected by ML WAF. Handing off to SOAR Engine...")
        result = AutonomousSOAREngine.execute_bot_mitigation_playbook('10.0.0.99', bot_score)
        print(f"SOAR Result: {result}")
        assert result['status'] == 'mitigated', "SOAR failed to apply Redis DenyList."

    print("\n✅ ML WAF & SOAR Bot Mitigation Verified Successfully.")

if __name__ == "__main__":
    test_ml_waf_anomaly_detection()
