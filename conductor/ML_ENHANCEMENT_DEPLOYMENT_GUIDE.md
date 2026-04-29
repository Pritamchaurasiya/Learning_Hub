# ML Enhancement Deployment Guide
**Complete deployment automation guide for ML-enhanced Learning Hub platform**

# 🚀 ML Enhancement Deployment Guide

This guide provides comprehensive instructions for deploying the ML-enhanced Learning Hub platform with advanced AI capabilities, real-time personalization, and enterprise-grade monitoring.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Infrastructure Setup](#infrastructure-setup)
3. [ML Services Deployment](#ml-services-deployment)
4. [Configuration Management](#configuration-management)
5. [Monitoring Setup](#monitoring-setup)
6. [Testing and Validation](#testing-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Performance Optimization](#performance-optimization)

## 🔧 System Requirements

### Minimum Requirements
- **CPU**: 8 cores (16 cores recommended)
- **Memory**: 16GB RAM (32GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **GPU**: NVIDIA Tesla T4 or equivalent (for ML inference)
- **Network**: 1Gbps bandwidth

### Software Requirements
- **Docker**: 20.10+
- **Kubernetes**: 1.28+
- **Python**: 3.10+
- **PostgreSQL**: 15+
- **Redis**: 7.0+
- **Node.js**: 18+ (for frontend)

## 🏗️ Infrastructure Setup

### 1. Kubernetes Cluster Setup

```bash
# Create namespace for ML services
kubectl create namespace learning-hub-ml

# Apply GPU node pool configuration
kubectl apply -f infrastructure/kubernetes/gpu-node-pool.yaml

# Verify GPU nodes
kubectl get nodes -l accelerator=nvidia-tesla-t4
```

### 2. Storage Configuration

```bash
# Create persistent volumes for ML models
kubectl apply -f infrastructure/kubernetes/ml-storage.yaml

# Verify storage classes
kubectl get storageclass
```

### 3. Network Configuration

```bash
# Apply network policies
kubectl apply -f infrastructure/kubernetes/ml-network-policies.yaml

# Verify network policies
kubectl get networkpolicies -n learning-hub-ml
```

## 🤖 ML Services Deployment

### 1. Deploy ML Model Serving

```bash
# Deploy ML model serving infrastructure
kubectl apply -f k8s/ml-model-serving.yaml

# Verify deployments
kubectl get deployments -n ml-inference

# Check pod status
kubectl get pods -n ml-inference
```

### 2. Deploy Enhanced AI Services

```bash
# Deploy enhanced AI engine services
kubectl apply -f k8s/ai-engine-enhanced.yaml

# Verify services
kubectl get services -n learning-hub-ml
```

### 3. Deploy Monitoring Stack

```bash
# Deploy Prometheus and Grafana
kubectl apply -f monitoring/prometheus-grafana.yaml

# Verify monitoring
kubectl get pods -n monitoring
```

## ⚙️ Configuration Management

### 1. Environment Variables

Create `.env` file with ML configuration:

```bash
# ML Services Configuration
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://redis-service:6379/0
POSTGRES_URL=postgresql://user:pass@postgres-service:5432/learninghub

# Model Serving Configuration
MODEL_REGISTRY_URL=http://ml-model-registry:5000
TENSORFLOW_SERVING_URL=http://tensorflow-serving:8501
PYTORCH_SERVING_URL=http://pytorch-serving:8080

# Monitoring Configuration
PROMETHEUS_GATEWAY_URL=http://prometheus-pushgateway:9091
ALERTMANAGER_SMTP_PASSWORD=your_smtp_password

# Performance Configuration
ML_INFERENCE_TIMEOUT=5
ML_CACHE_TTL=3600
ML_BATCH_SIZE=32
```

### 2. Kubernetes ConfigMaps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ml-config
  namespace: learning-hub-ml
data:
  config.yaml: |
    model_serving:
      max_batch_size: 32
      timeout_ms: 5000
      gpu_memory_fraction: 0.8
    
    caching:
      l1_max_size: 1000
      l2_ttl: 3600
      refresh_ahead_ratio: 0.8
    
    monitoring:
      collection_interval: 30
      alert_thresholds:
        latency_warning: 100
        latency_critical: 500
        memory_warning: 0.8
        memory_critical: 0.9
```

### 3. Secrets Management

```bash
# Create secrets for sensitive data
kubectl create secret generic ml-secrets \
  --from-literal=gemini-api-key=your_gemini_api_key \
  --from-literal=redis-password=your_redis_password \
  --from-literal=postgres-password=your_postgres_password \
  -n learning-hub-ml
```

## 📊 Monitoring Setup

### 1. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "ml_alerts.yml"

scrape_configs:
  - job_name: 'ml-inference'
    static_configs:
      - targets: ['ml-inference-gateway:8000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'ml-services'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - learning-hub-ml
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### 2. Grafana Dashboards

Import the following dashboards:

1. **ML Inference Performance**
   - Request latency
   - Throughput metrics
   - Error rates
   - Model accuracy

2. **ML Resource Usage**
   - Memory usage
   - CPU usage
   - GPU utilization
   - Queue sizes

3. **ML Business Metrics**
   - User engagement
   - Recommendation accuracy
   - Learning effectiveness
   - Personalization impact

### 3. Alert Configuration

```yaml
# ml_alerts.yml
groups:
  - name: ml_performance
    rules:
      - alert: HighInferenceLatency
        expr: ml_inference_latency_seconds{quantile="0.95"} > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High ML inference latency"
          description: "95th percentile latency is {{ $value }}s"

      - alert: CriticalInferenceLatency
        expr: ml_inference_latency_seconds{quantile="0.95"} > 0.5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical ML inference latency"
          description: "95th percentile latency is {{ $value }}s"
```

## 🧪 Testing and Validation

### 1. Health Checks

```bash
# Check ML services health
curl http://ml-inference-gateway:8000/health

# Check model registry
curl http://ml-model-registry:5000/health

# Check monitoring
curl http://prometheus:9090/-/healthy
```

### 2. Load Testing

```bash
# Install k6 for load testing
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -o k6.tar.gz
tar -xzf k6.tar.gz
sudo mv k6 /usr/local/bin/

# Run load test
k6 run tests/ml-load-test.js
```

### 3. Integration Tests

```bash
# Run ML integration tests
python manage.py test tests.test_ml_integration_comprehensive -v

# Run performance benchmarks
python manage.py test tests.test_ml_integration_comprehensive.TestMLPerformanceBenchmarks -v
```

### 4. Model Validation

```python
# Validate ML models
from apps.ai_engine.ml_integration import ml_integration
from apps.ai_engine.realtime_inference import inference_pipeline

# Test inference pipeline
await inference_pipeline.initialize()
result = await inference_pipeline.predict(
    model_name="text-embedding",
    input_data={"text": "Test validation"}
)
print(f"Inference result: {result}")

# Test ML integration
recommendations = await ml_integration.get_real_time_recommendations(
    user_id=1,
    context='courses'
)
print(f"Recommendations: {recommendations}")
```

## 🔧 Troubleshooting

### Common Issues

#### 1. GPU Not Available

```bash
# Check GPU nodes
kubectl get nodes -l accelerator=nvidia-tesla-t4

# Check GPU resources
kubectl describe node <gpu-node-name> | grep nvidia

# Fix: Add GPU node pool or update node labels
```

#### 2. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n learning-hub-ml

# Check resource limits
kubectl describe pod <pod-name> -n learning-hub-ml | grep -A 10 Limits

# Fix: Adjust resource requests/limits
```

#### 3. Slow Inference

```bash
# Check inference latency
curl -w "@curl-format.txt" http://ml-inference-gateway:8000/predict -X POST -H "Content-Type: application/json" -d '{"text":"test"}'

# Check model serving logs
kubectl logs -f deployment/tensorflow-serving -n ml-inference

# Fix: Optimize batch size or model quantization
```

#### 4. Cache Issues

```bash
# Check Redis connection
kubectl exec -it redis-0 -n learning-hub-ml -- redis-cli ping

# Check cache statistics
curl http://ml-inference-gateway:8000/metrics | grep cache

# Fix: Check Redis configuration and memory limits
```

### Debug Commands

```bash
# Get ML service logs
kubectl logs -f deployment/ml-inference-gateway -n ml-inference

# Check pod events
kubectl get events -n learning-hub-ml --sort-by='.lastTimestamp'

# Debug specific pod
kubectl exec -it <pod-name> -n learning-hub-ml -- /bin/bash

# Check resource usage
kubectl top pods -n learning-hub-ml
```

## ⚡ Performance Optimization

### 1. Model Optimization

```python
# Enable model quantization
from apps.ai_engine.realtime_inference import inference_pipeline

await inference_pipeline.initialize()

# Use ultra optimization level
result = await inference_pipeline.predict(
    model_name="text-embedding",
    input_data={"text": "optimized test"},
    optimization_level="ultra"
)
```

### 2. Caching Optimization

```python
# Configure advanced caching
from apps.ai_engine.advanced_caching import advanced_cache_manager

# Configure cache for ML predictions
advanced_cache_manager.configure_cache(
    "ml_prediction:",
    CacheConfig(
        ttl=300,
        max_size=500,
        refresh_ahead=True,
        compression=True
    )
)
```

### 3. Database Optimization

```python
# Use optimized queries
from apps.ai_engine.optimized_queries import optimized_query_manager

# Get optimized user profile
profile = optimized_query_manager.get_optimized_user_profile(user_id=1)

# Clear cache if needed
optimized_query_manager.clear_optimization_cache()
```

### 4. Monitoring Optimization

```python
# Configure metrics collection
from apps.ai_engine.ml_monitoring import ml_metrics_collector

# Start collection with custom interval
ml_metrics_collector.collection_interval = 15  # 15 seconds
ml_metrics_collector.start_collection()
```

## 📈 Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable |
|--------|--------|------------|
| Inference Latency | < 50ms | < 100ms |
| Cache Hit Rate | > 80% | > 70% |
| Memory Usage | < 80% | < 90% |
| CPU Usage | < 70% | < 85% |
| Throughput | > 100 req/s | > 50 req/s |
| Error Rate | < 1% | < 5% |

### Benchmark Tests

```bash
# Run performance benchmarks
python tests/performance_benchmarks.py

# Generate performance report
python tests/generate_performance_report.py
```

## 🔄 Maintenance Tasks

### Daily

```bash
# Check service health
kubectl get pods -n learning-hub-ml

# Review error logs
kubectl logs --since=24h -n learning-hub-ml | grep ERROR

# Check resource usage
kubectl top nodes && kubectl top pods -n learning-hub-ml
```

### Weekly

```bash
# Update ML models
kubectl rollout restart deployment/tensorflow-serving -n ml-inference

# Clear old cache entries
kubectl exec -it redis-0 -n learning-hub-ml -- redis-cli FLUSHDB

# Review performance metrics
curl http://prometheus:9090/api/v1/query_range?query=ml_inference_latency_seconds&start=7d&end=now&step=1h
```

### Monthly

```bash
# Update dependencies
kubectl set image deployment/ml-inference-gateway ml-inference-gateway=latest -n ml-inference

# Backup configurations
kubectl get configmaps -n learning-hub-ml -o yaml > backup/configmaps-$(date +%Y%m%d).yaml

# Performance audit
python tools/performance_audit.py
```

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] System requirements met
- [ ] Kubernetes cluster ready
- [ ] GPU nodes available
- [ ] Storage configured
- [ ] Network policies applied
- [ ] Secrets created
- [ ] ConfigMaps applied
- [ ] Monitoring deployed

### Deployment

- [ ] ML services deployed
- [ ] Health checks passing
- [ ] Load balancer configured
- [ ] DNS records updated
- [ ] SSL certificates installed
- [ ] Monitoring alerts configured

### Post-deployment

- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Load tests successful
- [ ] Monitoring dashboards working
- [ ] Alert notifications tested
- [ ] Backup procedures verified

## 📞 Support

### Contact Information

- **DevOps Team**: devops@learninghub.com
- **ML Engineering**: ml-team@learninghub.com
- **Infrastructure**: infra@learninghub.com

### Emergency Contacts

- **Critical Issues**: +1-555-ML-HELP
- **Performance Issues**: +1-555-PERF-HELP
- **Security Issues**: +1-555-SEC-HELP

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ ML inference latency < 50ms
- ✅ System uptime > 99.9%
- ✅ Cache hit rate > 80%
- ✅ Error rate < 1%
- ✅ Throughput > 100 req/s

### Business Metrics
- ✅ User engagement +25%
- ✅ Learning effectiveness +20%
- ✅ Personalization accuracy +30%
- ✅ System cost optimization -15%

### Operational Metrics
- ✅ Deployment time < 10 minutes
- ✅ Recovery time < 5 minutes
- ✅ Monitoring coverage 100%
- ✅ Documentation completeness 100%

---

**Last Updated**: 2026-03-26
**Version**: 2.0
**Status**: Production Ready
