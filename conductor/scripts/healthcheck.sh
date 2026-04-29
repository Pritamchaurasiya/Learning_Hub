#!/bin/bash
# Healthcheck script for Docker/K8s
# Returns 0 if healthy, 1 if unhealthy

# 1. Check if Django accepts connections
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/)

if [ "$STATUS" == "200" ]; then
    echo "✅ Backend is healthy (HTTP 200)"
    exit 0
else
    echo "❌ Backend is UNHEALTHY (HTTP $STATUS)"
    exit 1
fi
