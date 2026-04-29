## 🔄 Lesson 11: CI/CD for Kubernetes

**Status**: COMPLETED

### 🤖 The Pipeline of Truth

Code isn't "done" until it's running.
In a "God-Tier" setup, we don't SSH into servers. We push code, and robots deploy it.

### 🛠️ The Flow

1.  **Commit**: You push code.
2.  **Lint & Test**: GitHub Actions runs `flake8` and `pytest`.
3.  **Docker Build**: Build the image `learning-hub:latest`.
4.  **Security Scan**: Scan image for vulnerabilities (Trivy/Snyk).
5.  **Helm Lint**: Check if K8s charts are valid.
6.  **Deploy**: `helm upgrade --install learning-hub ./charts/learning-hub`.

### 📜 Our Action

We added **Helm Lint** to our GitHub Action.
If you make a typo in `values.yaml`, the build FAILS. This prevents broken deploys.
