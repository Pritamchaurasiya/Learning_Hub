#!/bin/bash
# Health Check Script

NAMESPACE=${1:-production}
APP_NAME="learning-hub"

echo "Checking health of $APP_NAME in $NAMESPACE..."

# Check pods
PODS=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME -o jsonpath='{.items[*].metadata.name}')
if [ -z "$PODS" ]; then
    echo "[ERROR] No pods found"
    exit 1
fi

for pod in $PODS; do
    STATUS=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.phase}')
    if [ "$STATUS" != "Running" ]; then
        echo "[ERROR] Pod $pod is not running (status: $STATUS)"
        exit 1
    fi
    echo "[OK] Pod $pod is running"
done

# Check services
kubectl get svc -n $NAMESPACE | grep $APP_NAME > /dev/null
if [ $? -eq 0 ]; then
    echo "[OK] Services are configured"
else
    echo "[ERROR] Services not found"
    exit 1
fi

# Check ingress
kubectl get ingress -n $NAMESPACE | grep $APP_NAME > /dev/null
if [ $? -eq 0 ]; then
    echo "[OK] Ingress is configured"
else
    echo "[WARN] Ingress not configured"
fi

echo "[DONE] All health checks passed"
