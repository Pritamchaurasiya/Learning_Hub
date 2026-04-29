#!/bin/bash
# Staging Deployment Script
set -e

echo "=================================="
echo "Deploying to STAGING environment"
echo "=================================="

# Configuration
NAMESPACE="staging"
APP_NAME="learning-hub"
IMAGE_TAG="staging-$(git rev-parse --short HEAD)"

echo "[1/5] Building Docker image..."
docker build -t $APP_NAME:$IMAGE_TAG .

echo "[2/5] Setting up Kubernetes namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "[3/5] Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
kubectl apply -f k8s/secrets.yaml -n $NAMESPACE

echo "[4/5] Deploying application..."
kubectl apply -f k8s/deployment.yaml -n $NAMESPACE
kubectl apply -f k8s/service.yaml -n $NAMESPACE
kubectl apply -f k8s/hpa.yaml -n $NAMESPACE

echo "[5/5] Waiting for deployment..."
kubectl rollout status deployment/$APP_NAME-web -n $NAMESPACE --timeout=300s

echo "=================================="
echo "STAGING deployment complete!"
echo "=================================="
