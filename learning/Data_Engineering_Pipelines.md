# 🛢️ DATA ENGINEERING PIPELINES: THE BACKBONE OF AI SYSTEMS

> [!IMPORTANT] > **Data Engineering** is the discipline of making data **available**, **reliable**, and **consumable** for analysis and ML models. Without robust pipelines, AI is starving.

---

## 🏗️ 1. ARCHITECTURE PATTERNS

### 1.1 ETL vs ELT

| Feature         | ETL (Extract, Transform, Load)          | ELT (Extract, Load, Transform)              |
| :-------------- | :-------------------------------------- | :------------------------------------------ |
| **Logic**       | Transform **before** loading            | Transform **after** loading                 |
| **Compute**     | Specialized engine (Spark, Informatica) | Target Data Warehouse (Snowflake, BigQuery) |
| **Flexibility** | Rigid schemas                           | Flexible schema-on-read                     |
| **Use Case**    | Legacy systems, strict compliance       | Modern cloud warehouses, raw data lakes     |

### 1.2 The Modern Data Stack (MDS)

1.  **Ingestion**: Fivetran, Airbyte
2.  **Warehousing**: Snowflake, BigQuery, Redshift
3.  **Transformation**: dbt (data build tool)
4.  **Orchestration**: Airflow, Dagster, Prefect
5.  **Governance**: Atlan, Amundsen

---

## 🌊 2. BATCH VS STREAMING DATA

### 2.1 Batch Processing

- **Definition**: Processing finite chunks of data at scheduled intervals.
- **Tools**: Apache Spark, Hadoop MapReduce, AWS Glue.
- **Example**: Nightly report generation, implementation of complex joins.

### 2.2 Streaming Processing

- **Definition**: Processing data in motion, record-by-record or micro-batches.
- **Tools**: Apache Flink, Kafka Streams, Spark Streaming.
- **Example**: Fraud detection, Real-time leaderboards, IoT monitoring.

### 2.3 The Kappa & Lambda Architectures

> [!NOTE] > **Lambda Architecture**: Hybrid approach processing data twice (Batch layer for accuracy, Speed layer for latency).
> **Kappa Architecture**: Treat everything as a stream. One processing path.

---

## 🐍 3. ORCHESTRATION: AIRFLOW & DAGSTER

### 3.1 Apache Airflow

The industry standard. Uses **DAGs (Directed Acyclic Graphs)** written in Python.

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def extract():
    print("Extracting data...")

def transform():
    print("Transforming data...")

with DAG("etl_pipeline", start_date=datetime(2023, 1, 1)) as dag:
    t1 = PythonOperator(task_id="extract", python_callable=extract)
    t2 = PythonOperator(task_id="transform", python_callable=transform)

    t1 >> t2  # Dependency definition
```

### 3.2 Dagster

A newer, data-aware orchestrator. Treats data assets as first-class citizens, not just tasks.

---

## 💾 4. DATA LAKES & WAREHOUSES

### 4.1 Data Warehouse (DWH)

- **Structure**: Structured, Relational (SQL).
- **Purpose**: BI, Reporting.
- **Examples**: Snowflake, BigQuery.

### 4.2 Data Lake

- **Structure**: Unstructured/Semi-structured (JSON, Parquet, Avro).
- **Purpose**: ML training data, raw dumps.
- **Examples**: AWS S3, Azure Blob Storage (ADLS).

### 4.3 Data Lakehouse

The convergence. ACID transactions on Data Lakes.

- **Technology**: Delta Lake (Databricks), Apache Iceberg, Apache Hudi.

---

## 🛡️ 5. DATA QUALITY & GOVERNANCE

Data is a liability if it's wrong.

### 5.1 Great Expectations (GX)

Python library for validating data.

```python
import great_expectations as gx

context = gx.get_context()
validator = context.sources.pandas_default.read_csv("data.csv")
validator.expect_column_values_to_be_between(
    "age", min_value=0, max_value=120
)
validator.save_expectation_suite()
```

### 5.2 Data Mesh

A socio-technical paradigm shift.

- **Domain-Oriented Ownership**: "Users Team" owns "Users Data Product".
- **Data as a Product**: Treated with SLAs, documentation, and versioning.
- **Self-Serve Infrastructure**: Platform team provides the tools, domains provide the data.

---

## 🎓 LEARN MORE

- **Books**: "Designing Data-Intensive Applications" (Kleppmann), "Fundamentals of Data Engineering".
- **Practice**: Set up a local Airflow instance and build a pipeline that scrapes a website and loads it into SQLite.
