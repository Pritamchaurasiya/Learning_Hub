## 📊 Lesson 12: Observability (Eyes on the System)

**Status**: COMPLETED

### 🧐 Why Logs Aren't Enough

Logs tell you _what happened_ ("Error: User not found").
Metrics tell you _how the system feels_ ("Latency is spiking to 200ms").

### 🏗️ The Trio (LGM Stack)

1.  **L**oki (Logs): "Show me all errors for User 123."
2.  **G**rafana (Visuals): "Draw a graph of CPU usage."
3.  **M**etrics (Prometheus): "Count how many users signed up."

### 🔌 How we did it

1.  **Exporter**: `django-prometheus` middleware measures time for every request.
2.  **Scraper**: Prometheus visits `/metrics` every 15s and saves the numbers.
3.  **Dashboard**: We created `monitoring/dashboard.json` to visualize:
    - **RPS**: Requests Per Second.
    - **Latency**: How long users wait.
    - **Error Rate**: Percentage of 500s.

### 🚀 Try it

Import `conductor/monitoring/dashboard.json` into any Grafana instance.
