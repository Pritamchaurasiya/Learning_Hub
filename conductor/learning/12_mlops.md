# 12. MLOps: Taking Models from Notebook to Production 🚀

> "Machine Learning code is only a tiny fraction of a real-world ML system." — Google (Hidden Technical Debt in ML Systems)

## 1. The Gap

- **Data Scientist**: "My model has 98% accuracy in Jupyter!"
- **MLE (Machine Learning Engineer)**: "Great. How do we serve it to 10k users/sec? How do we retry on failure? How do we version it?"

## 2. The Pipeline (The "Loop")

1.  **Data Ingestion**: Streaming (Kafka) vs Batch (Airflow).
2.  **Data Validation (TFDV)**: Did the input schema change? (e.g., age became string instead of int).
3.  **Preprocessing**: Feature Store (Feast). Ensure training features == serving features (Training-Serving Skew).
4.  **Model Training**: CI/CD for models (CT - Continuous Training).
5.  **Model Registry**: Version Control for binaries (MLflow, Weights & Biases).
6.  **Serving**: REST API (FastAPI) or gRPC (Triton Inference Server).
7.  **Monitoring**: Drift detection.

## 3. Key Concepts

### A. Data Drift

The world changes. A model trained on 2019 data fails on 2020 data (COVID).

- **Covariate Shift**: Input distribution $P(X)$ changes.
- **Concept Drift**: Relation $P(Y|X)$ changes.

### B. Feature Store

A centralized vault for features.

- **Offline Store**: Cheap storage (S3/BigQuery) for training.
- **Online Store**: Low latency (Redis) for inference.
- **Why?** Prevents re-engineering the same feature logic twice.

### C. A/B Testing & Canary Deployment

- **Canary**: Deploy new model to 1% of traffic. If error rate spikes, auto-rollback.
- **Shadow Mode**: Run new model in parallel with old one, but don't show user the result. Log inputs/outputs and compare.

## 4. Practical Implementation (FastAPI Serving)

A production-ready microservice wrapper for an ML model.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
# import joblib  # For loading sklearn models

app = FastAPI(title="AI Inference Engine")

class InputData(BaseModel):
    feature_1: float
    feature_2: float
    feature_3: float

class Prediction(BaseModel):
    class_id: int
    confidence: float

# Load model ONCE at startup (Global state)
# model = joblib.load("model_v1.pkl")
# Fake model for demo
model = lambda x: (1, 0.95) if x[0] > 0.5 else (0, 0.88)

@app.post("/predict", response_model=Prediction)
async def predict(data: InputData):
    """
    Real-time inference endpoint.
    """
    try:
        # 1. Transform input
        features = np.array([data.feature_1, data.feature_2, data.feature_3])

        # 2. Inference
        result, prob = model(features)

        # 3. Log to monitoring system (e.g., Prometheus)
        # increment_counter("predictions_total")

        return Prediction(class_id=result, confidence=prob)

    except Exception as e:
        # Log the specific error for debugging
        raise HTTPException(status_code=500, detail="Model inference failed")

# Run with: uvicorn main:app --workers 4
```

## 5. Tools of the Trade

- **Tracking**: MLflow, Weights & Biases (W&B).
- **Orchestration**: Kubeflow, Airflow, Prefect.
- **Serving**: TensorFlow Serving, TorchServe, NVIDIA Triton.
- **Infrastructure**: Kubernetes (K8s) is the OS of MLOps.

## 6. Mini-Exericse

1. Train a simple Iris model.
2. Save it with `pickle`.
3. Wrap it in FastAPI as shown above.
4. Dockerize it.
5. Send a `curl` request to it.
