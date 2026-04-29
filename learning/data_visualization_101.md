# Data Visualization 101: Engineering Dashboards

**Course Instructor:** Antigravity AI
**Level:** Frontend Engineering
**Topic:** Analytics, Aggregation, and Charts

---

## Module 1: The "Heavy Query" Problem

Dashboards kill databases.
Querying `SELECT SUM(price) FROM transactions` every time a user refreshes the page is bad.

### Strategies:

1.  **Read Replicas:** Send analytics queries to a secondary DB.
2.  **Aggregation Tables:** Store pre-calculated daily totals.
3.  **Caching (Redis):** Cache the result of expensive queries for 5-15 minutes.

In `InstructorService.py`, we implemented a lightweight aggregation. For scale, we would move this to a valid `DailyRevenue` model.

---

## Module 2: The Art of the Chart (`fl_chart`)

We use `fl_chart` in Flutter.

- **Vectors again:** Like PDF generation, charts are drawn dynamically.
- **Data Points:** We map Time (X-Axis) to Value (Y-Axis).

```dart
FlSpot(timestamp.toDouble(), value)
```

### UX Tip: Skeuomorphism vs Flat

Use **Gradients** under line charts (Area Chart style) to make them feel "grounded" and valuable.

---

## Module 3: Real-Time vs Eventual Consistency

Does a dashboard need to be real-time?
**No.**
"Eventual Consistency" is fine for analytics. If a sale happens at 12:00:01 and shows up at 12:05:00, no one cares.
This allows us to decouple the Analytics Engine from the Transaction Engine.

---

## Assignment

1.  Open the Instructor Dashboard.
2.  **Challenge:** Add a "Date Range Picker" to filter the chart data (e.g., Last 30 Days vs Last Year).

_Class Dismissed. Measure what matters._
