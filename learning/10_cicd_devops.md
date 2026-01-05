# Module 10: CI/CD & DevOps (God-Tier)

## 1. The Principle of Automation

**"If it's not automated, it's broken."**
In God-Tier engineering, we do not rely on "it works on my machine". We rely on the **Pipeline**. The pipeline is the single source of truth for building, testing, and releasing the application.

## 2. GitHub Actions Architecture

We use GitHub Actions because it's integrated with our source control, fast, and supports Windows 2022 runners natively.

### A Complete Workflow Example

Here is a complete, runnable GitHub Actions workflow for a Flutter Windows application. Create a file named `build.yml` in the `.github/workflows` directory of your repository.

```yaml
name: Build Flutter Windows App

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: windows-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Flutter
      uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.16.x' # Use the version your project depends on
        channel: 'stable'
        cache: true # Caches the Flutter SDK

    - name: Clean project
      run: flutter clean
      working-directory: ./my_flutter_app # Adjust to your project's root

    - name: Get dependencies
      run: flutter pub get
      working-directory: ./my_flutter_app

    - name: Run static analysis
      run: flutter analyze
      working-directory: ./my_flutter_app

    - name: Run tests
      run: flutter test
      working-directory: ./my_flutter_app

    - name: Build release
      run: flutter build windows --release
      working-directory: ./my_flutter_app

    - name: Archive Release Artifact
      uses: actions/upload-artifact@v3
      with:
        name: release-v${{ github.run_number }}
        path: ./my_flutter_app/build/windows/runner/Release/
```

### Triggering the Workflow
The `on` section in the YAML file defines when the workflow will run.
- `push: branches: [ main ]`: Triggers the workflow on every push to the `main` branch.
- `pull_request: branches: [ main ]`: Triggers the workflow on every pull request that targets the `main` branch.

## 3. Advanced Concepts

### Caching
To speed up builds, we cache the Flutter SDK and `pub` packages. The `subosito/flutter-action@v2` with `cache: true` handles SDK caching. For pub packages, you can add a separate cache step, but be cautious as it can sometimes lead to issues with stale dependencies.

### Secrets Management
Never commit API keys, passwords, or other secrets to your repository. Use GitHub's encrypted secrets.

1.  **Add a secret in GitHub:** Go to your repository's `Settings > Secrets and variables > Actions` and add a new secret (e.g., `API_KEY`).
2.  **Use the secret in your workflow:**

    ```yaml
    - name: Build release
      run: flutter build windows --release --dart-define=API_KEY=${{ secrets.API_KEY }}
      working-directory: ./my_flutter_app
    ```
3.  **Access the secret in your app:**

    ```dart
    const apiKey = String.fromEnvironment('API_KEY');
    ```

### Handling Build Failures & Notifications
GitHub Actions automatically sends an email notification on build failure. For more advanced notifications, you can add steps to your workflow to send messages to Slack, Discord, or other services using dedicated actions from the GitHub Marketplace.

## 4. Why This Matters

- **Bus Factor**: If a key developer leaves, the project doesn't die. The knowledge of how to build and release the app is encoded in the CI/CD pipeline.
- **Quality Gate**: Prevents broken code from being merged into the main branch. If the pipeline fails, the pull request is blocked.
- **Consistency**: Every build is produced in the exact same clean, controlled environment, eliminating "it works on my machine" issues.
