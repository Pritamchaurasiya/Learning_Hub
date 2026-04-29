#!/bin/bash
# Production Deployment Script
set -e

echo "=================================="
echo "Deploying to PRODUCTION environment"
echo "=================================="

# Configuration
NAMESPACE="production"
APP_NAME="learning-hub"
IMAGE_TAG="v$(date +%Y%m%d)-$(git rev-parse --short HEAD)"

echo "[1/6] Running pre-deployment checks..."
python scripts/check_migrations.py
pytest tests/test_integration_deployment.py -v

echo "[2/6] Building production Docker image..."
docker build -t $APP_NAME:$IMAGE_TAG .
docker tag $APP_NAME:$IMAGE_TAG $APP_NAME:latest

echo "[3/6] Setting up Kubernetes namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "[4/6] Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
kubectl apply -f k8s/secrets.yaml -n $NAMESPACE

echo "[5/6] Deploying application with blue-green strategy..."
# Set image tag in deployment
kubectl set image deployment/$APP_NAME-web web=$APP_NAME:$IMAGE_TAG -n $NAMESPACE
kubectl apply -f k8s/deployment.yaml -n $NAMESPACE
kubectl apply -f k8s/service.yaml -n $NAMESPACE
kubectl apply -f k8s/hpa.yaml -n $NAMESPACE
kubectl apply -f k8s/ingress.yaml -n $NAMESPACE

echo "[6/6] Verifying deployment..."
kubectl rollout status deployment/$APP_NAME-web -n $NAMESPACE --timeout=600s
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

echo "=================================="
echo "PRODUCTION deployment complete!"
echo "Image: $APP_NAME:$IMAGE_TAG"
echo "=================================="
