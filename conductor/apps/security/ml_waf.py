import os
import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any

try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger(__name__)

class MLWebAF:
    """
    Machine Learning Web Application Firewall (ML WAF).
    
    Uses Unsupervised Learning (Isolation Forest) to detect mathematically anomalous
    navigation patterns typical of scraping bots, credential stuffers, and DDoS arrays.
    """
    
    def __init__(self, contamination_rate: float = 0.05):
        """
        Args:
            contamination_rate (float): The expected proportion of malicious traffic in the dataset.
        """
        self.contamination_rate = contamination_rate
        self.model = None
        if SKLEARN_AVAILABLE:
            self.model = IsolationForest(contamination=self.contamination_rate, random_state=42)
        else:
            logger.warning("scikit-learn not installed. MLWebAF will operate in fallback heuristic mode.")

    def extract_features(self, request_logs: List[Dict[str, Any]]) -> np.ndarray:
        """
        Transforms raw HTTP request dictionaries into mathematical feature vectors.
        
        Expected features extracted per IP:
        1. Request Velocity (requests per second over the window)
        2. Endpoint Variance (number of unique URLs hit)
        3. 4xx Error Rate
        4. Average Payload Size (if applicable)
        """
        if not request_logs:
            return np.array([[]])
            
        features = []
        for ip, logs in self._group_by_ip(request_logs).items():
            if not logs:
                continue
                
            # Sort by timestamp
            logs.sort(key=lambda x: x.get('timestamp', 0))
            
            # 1. Calculate Velocity
            time_window_seconds = max((logs[-1]['timestamp'] - logs[0]['timestamp']).total_seconds(), 1)
            req_count = len(logs)
            velocity = req_count / time_window_seconds
            
            # 2. Endpoint Variance
            unique_endpoints = len(set(log.get('path', '') for log in logs))
            
            # 3. 4xx Error Rate (typically high for credential stuffing / dir busting)
            error_count = sum(1 for log in logs if 400 <= log.get('status_code', 200) < 500)
            error_rate = error_count / req_count if req_count > 0 else 0
            
            # 4. Average Payload (Detects massive scraping or heavy injection attempts)
            total_bytes = sum(log.get('bytes_sent', 0) for log in logs)
            avg_payload = total_bytes / req_count if req_count > 0 else 0
            
            features.append([velocity, unique_endpoints, error_rate, avg_payload])
            
        return np.array(features)

    def _group_by_ip(self, request_logs: List[Dict]) -> Dict[str, List[Dict]]:
        """Utility to group flat request logs by Source IP."""
        grouped = {}
        for log in request_logs:
            ip = log.get('ip')
            if not ip:
                continue
            if ip not in grouped:
                grouped[ip] = []
            grouped[ip].append(log)
        return grouped

    def train_baseline(self, historical_good_traffic: List[Dict[str, Any]]):
        """
        Trains the Isolation Forest on a dataset assumed to be mostly legitimate traffic.
        """
        if not SKLEARN_AVAILABLE or not self.model:
            logger.warning("Cannot train ML WAF: scikit-learn missing.")
            return False
            
        X = self.extract_features(historical_good_traffic)
        if len(X) < 10 or len(X[0]) == 0:
            logger.warning("Insufficient traffic data to train ML WAF.")
            return False
            
        try:
            self.model.fit(X)
            logger.info("ML WAF Isolation Forest baseline successfully trained.")
            return True
        except Exception as e:
            logger.error(f"Failed to train ML WAF: {str(e)}")
            return False

    def predict_anomalies(self, recent_traffic: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Scores recent traffic. Returns a dictionary mapping IP addresses to Anomaly Scores.
        Lower scores (negative) indicate higher likelihood of being a bot/anomaly.
        """
        results = {}
        if not recent_traffic:
            return results
            
        grouped_traffic = self._group_by_ip(recent_traffic)
        ips = list(grouped_traffic.keys())
        
        if not SKLEARN_AVAILABLE or not self.model:
            # Fallback dumb heuristic if ML is missing
            for ip, logs in grouped_traffic.items():
                velocity = len(logs) / max((logs[-1]['timestamp'] - logs[0]['timestamp']).total_seconds(), 1)
                # If velocity > 50 req/sec, flag as bad (-1.0). Else OK (1.0)
                results[ip] = -1.0 if velocity > 50 else 1.0
            return results
            
        try:
            # Ensure model is fitted
            # Technically Isolation Forest doesn't strict-require explicit pre-fit for prediction if we fit-predict,
            # but standard flow implies we pre-trained on baseline. If not, we can't score accurately.
            # Assuming pre-trained for this architecture via a background task.
            
            X = self.extract_features(recent_traffic)
            if len(X) == 0 or len(X[0]) == 0:
                 return results
                 
            # Note: IsolationForest.decision_function returns anomaly score. 
            # Negative values are outliers (bots), positive are inliers (humans).
            scores = self.model.decision_function(X)
            
            for index, ip in enumerate(ips):
                results[ip] = float(scores[index])
                
        except Exception as e:
            logger.error(f"Failed to predict ML WAF anomalies: {str(e)}")
            
        return results
