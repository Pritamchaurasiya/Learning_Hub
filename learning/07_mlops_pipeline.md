# Module 07: MLOps & Production ML Pipelines 🚀

## 🎯 Overview

MLOps is DevOps for Machine Learning. This module teaches you to deploy, monitor, and maintain ML systems in production like a Research Scientist at Google or Meta.

---

## 📖 The ML Lifecycle

```
Data → Features → Train → Evaluate → Deploy → Monitor → Retrain
  ↑                                              ↓        |
  └──────────────────────────────────────────────────────┘
```

---

## 🗂️ Feature Stores

### What is a Feature Store?

A centralized repository for storing, sharing, and reusing ML features.

```python
# Without Feature Store (Bad)
# Team A computes user_age from birth_date
# Team B computes user_age differently
# Inconsistency, duplication, bugs!

# With Feature Store (Good)
class FeatureStore:
    """Simple feature store implementation."""

    def __init__(self):
        self.offline_store = {}  # For training (historical data)
        self.online_store = {}   # For serving (latest values)
        self.feature_definitions = {}

    def register_feature(self, name, description, entity, compute_fn):
        """Register a feature definition."""
        self.feature_definitions[name] = {
            'description': description,
            'entity': entity,  # e.g., 'user', 'course'
            'compute_fn': compute_fn
        }

    def materialize(self, feature_name, entity_df):
        """Compute and store features."""
        definition = self.feature_definitions[feature_name]
        compute_fn = definition['compute_fn']

        # Compute features
        features = compute_fn(entity_df)

        # Store in offline (for training)
        self.offline_store[feature_name] = features

        # Store latest in online (for serving)
        entity_col = definition['entity'] + '_id'
        latest = features.groupby(entity_col).last()
        self.online_store[feature_name] = latest.to_dict()

    def get_training_features(self, feature_names, entity_df):
        """Get features for training (point-in-time correct)."""
        result = entity_df.copy()
        for name in feature_names:
            result = result.merge(self.offline_store[name], how='left')
        return result

    def get_online_features(self, feature_names, entity_id):
        """Get features for real-time serving."""
        return {
            name: self.online_store[name].get(entity_id)
            for name in feature_names
        }

# Usage
feature_store = FeatureStore()

# Register feature
feature_store.register_feature(
    name='user_total_courses',
    description='Total courses enrolled by user',
    entity='user',
    compute_fn=lambda df: df.groupby('user_id')['course_id'].count()
)
```

---

## 📦 Model Registry

### Track and Version Your Models

```python
import json
import hashlib
from datetime import datetime
from pathlib import Path

class ModelRegistry:
    """Track model versions, metadata, and artifacts."""

    def __init__(self, storage_path='./model_registry'):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.registry_file = self.storage_path / 'registry.json'
        self.registry = self._load_registry()

    def _load_registry(self):
        if self.registry_file.exists():
            return json.loads(self.registry_file.read_text())
        return {'models': {}}

    def _save_registry(self):
        self.registry_file.write_text(json.dumps(self.registry, indent=2))

    def register_model(self, name, model_path, metrics, params, tags=None):
        """Register a new model version."""
        if name not in self.registry['models']:
            self.registry['models'][name] = {'versions': []}

        version = len(self.registry['models'][name]['versions']) + 1

        # Compute model hash for integrity
        model_bytes = Path(model_path).read_bytes()
        model_hash = hashlib.md5(model_bytes).hexdigest()

        version_info = {
            'version': version,
            'path': str(model_path),
            'hash': model_hash,
            'metrics': metrics,
            'params': params,
            'tags': tags or [],
            'stage': 'development',
            'created_at': datetime.now().isoformat()
        }

        self.registry['models'][name]['versions'].append(version_info)
        self._save_registry()

        return version

    def promote_model(self, name, version, stage):
        """Promote model to staging/production."""
        versions = self.registry['models'][name]['versions']
        for v in versions:
            if v['version'] == version:
                v['stage'] = stage
                v['promoted_at'] = datetime.now().isoformat()
        self._save_registry()

    def get_production_model(self, name):
        """Get the current production model."""
        versions = self.registry['models'][name]['versions']
        for v in versions:
            if v['stage'] == 'production':
                return v
        return None

# Usage
registry = ModelRegistry()

# Register after training
version = registry.register_model(
    name='course_recommender',
    model_path='./models/recommender_v3.pkl',
    metrics={'accuracy': 0.92, 'f1': 0.88},
    params={'learning_rate': 0.001, 'epochs': 100},
    tags=['collaborative_filtering', 'neural_cf']
)

# Promote to production after validation
registry.promote_model('course_recommender', version=3, stage='production')
```

---

## 🔄 CI/CD for ML

### GitHub Actions Pipeline

```yaml
# .github/workflows/ml_pipeline.yml
name: ML Pipeline

on:
  push:
    paths:
      - "ml/**"
      - "data/**"

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Validate data
        run: python ml/validate_data.py

      - name: Train model
        run: python ml/train.py
        env:
          MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_URI }}

      - name: Evaluate model
        run: python ml/evaluate.py

      - name: Upload model artifact
        uses: actions/upload-artifact@v3
        with:
          name: model
          path: ./models/

  deploy:
    needs: train
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download model
        uses: actions/download-artifact@v3
        with:
          name: model

      - name: Deploy to staging
        run: |
          # Copy to staging server
          scp model.pkl staging:/models/
          # Restart serving
          ssh staging 'sudo systemctl restart model-server'
```

---

## 📊 Model Serving

### REST API for Model Serving

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle
import numpy as np

app = FastAPI()

# Load model at startup
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

class PredictionRequest(BaseModel):
    user_id: int
    course_features: list[float]

class PredictionResponse(BaseModel):
    predictions: list[float]
    model_version: str

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        features = np.array([request.course_features])
        predictions = model.predict(features).tolist()

        return PredictionResponse(
            predictions=predictions,
            model_version="v3.2.1"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

# Run: uvicorn serve:app --host 0.0.0.0 --port 8080
```

---

## 📈 Model Monitoring

### Drift Detection

```python
import numpy as np
from scipy import stats

class DriftDetector:
    """Detect data and model drift in production."""

    def __init__(self, reference_data, threshold=0.05):
        self.reference = reference_data
        self.threshold = threshold
        self.reference_stats = self._compute_stats(reference_data)

    def _compute_stats(self, data):
        return {
            'mean': np.mean(data, axis=0),
            'std': np.std(data, axis=0),
            'distribution': data
        }

    def detect_drift(self, new_data):
        """Detect if new data has drifted from reference."""
        results = {}

        for i in range(new_data.shape[1]):
            # Kolmogorov-Smirnov test
            ks_stat, p_value = stats.ks_2samp(
                self.reference[:, i],
                new_data[:, i]
            )

            results[f'feature_{i}'] = {
                'ks_statistic': ks_stat,
                'p_value': p_value,
                'drift_detected': p_value < self.threshold
            }

        return results

    def detect_prediction_drift(self, reference_preds, new_preds):
        """Detect model prediction drift."""
        ks_stat, p_value = stats.ks_2samp(reference_preds, new_preds)

        return {
            'prediction_drift': p_value < self.threshold,
            'p_value': p_value,
            'action': 'retrain' if p_value < self.threshold else 'none'
        }

# Usage
detector = DriftDetector(training_data)

# In production, periodically check
drift_report = detector.detect_drift(last_week_data)
if any(r['drift_detected'] for r in drift_report.values()):
    alert_team("Data drift detected!")
    trigger_retraining()
```

### Performance Monitoring Dashboard

```python
import json
from datetime import datetime
from collections import deque

class ModelMonitor:
    """Track model performance metrics over time."""

    def __init__(self, window_size=1000):
        self.predictions = deque(maxlen=window_size)
        self.latencies = deque(maxlen=window_size)
        self.errors = deque(maxlen=window_size)

    def log_prediction(self, prediction, actual, latency_ms):
        """Log a single prediction."""
        self.predictions.append({
            'prediction': prediction,
            'actual': actual,
            'timestamp': datetime.now().isoformat()
        })
        self.latencies.append(latency_ms)

    def log_error(self, error_type, message):
        """Log prediction errors."""
        self.errors.append({
            'type': error_type,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })

    def get_metrics(self):
        """Calculate current performance metrics."""
        if not self.predictions:
            return {}

        preds = [p['prediction'] for p in self.predictions]
        actuals = [p['actual'] for p in self.predictions if p['actual'] is not None]

        return {
            'total_predictions': len(self.predictions),
            'error_rate': len(self.errors) / max(len(self.predictions), 1),
            'latency_p50': np.percentile(self.latencies, 50),
            'latency_p95': np.percentile(self.latencies, 95),
            'latency_p99': np.percentile(self.latencies, 99),
            'accuracy': np.mean([p == a for p, a in zip(preds, actuals)]) if actuals else None
        }
```

---

## 🔄 Automated Retraining

```python
class AutoRetrainer:
    """Automatically retrain models when performance degrades."""

    def __init__(self, model_name, accuracy_threshold=0.85):
        self.model_name = model_name
        self.accuracy_threshold = accuracy_threshold

    def should_retrain(self, current_accuracy):
        """Check if retraining is needed."""
        return current_accuracy < self.accuracy_threshold

    def trigger_retraining(self, training_data):
        """Trigger model retraining pipeline."""
        print(f"Retraining {self.model_name}...")

        # 1. Prepare fresh data
        X, y = training_data

        # 2. Train new model
        new_model = train_model(X, y)

        # 3. Evaluate
        new_accuracy = evaluate_model(new_model, X_test, y_test)

        # 4. Only deploy if better
        if new_accuracy > self.accuracy_threshold:
            registry.register_model(
                name=self.model_name,
                model_path=save_model(new_model),
                metrics={'accuracy': new_accuracy}
            )
            return True

        return False
```

---

## 📋 MLOps Checklist

### Before Deployment

- [ ] Model versioned in registry
- [ ] Metrics logged (accuracy, latency, size)
- [ ] Input/output schemas defined
- [ ] Bias/fairness evaluation complete
- [ ] Load testing passed

### In Production

- [ ] Health endpoints working
- [ ] Logging enabled
- [ ] Monitoring dashboards set up
- [ ] Alerting configured
- [ ] Rollback plan ready

### Continuous Improvement

- [ ] Drift detection active
- [ ] Feedback loop established
- [ ] A/B testing infrastructure
- [ ] Automated retraining pipeline

---

## ✏️ Exercises

1. Build a simple feature store for user behavior features
2. Implement model versioning with Git LFS
3. Create a drift detection pipeline
4. Set up model serving with FastAPI

---

_Next Module: 08_data_engineering.md - Building Data Pipelines_
