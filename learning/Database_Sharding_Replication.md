# 🗄️ DATABASE SCALING: SHARDING & REPLICATION

> [!IMPORTANT]
> Scaling a database is the hardest part of system scaling. Stateless apps leverage horizontal scaling easily; stateful databases require **Sharding** and **Replication**.

---

## 1. REPLICATION (Read Scalability)

Replication involves copying data to multiple nodes.

### 1.1 Master-Slave (Leader-Follower)

- **Writes**: Go to **Master** only.
- **Reads**: Can go to **Slaves** (Replicas).
- **Pros**: Increases read throughput, provides failover.
- **Cons**: **Replication Lag** (Eventual Consistency). If Master dies, data not yet replicated is lost.

### 1.2 Master-Master (Multi-Leader)

- **Writes**: Accepted by multiple nodes.
- **Pros**: High write availability, local writes in different regions.
- **Cons**: **Conflict Resolution** is painful (Last-Write-Wins, Vector Clocks).

---

## 2. SHARDING (Write Scalability)

Sharding (Partitioning) splits data across multiple machines (Shards) because one machine cannot hold it all.

### 2.1 Sharding Strategies

#### A. Key-Based (Hash) Sharding

`Shard_ID = hash(User_ID) % Number_of_Shards`

- **Pros**: Even distribution.
- **Cons**: **Resharding** is expensive (Consistent Hashing helps).

#### B. Range-Based Sharding

Shard by value ranges (e.g., Users A-F, G-M).

- **Pros**: Efficient for range queries.
- **Cons**: **Hotspots** (e.g., all new users start with 'A').

#### C. Directory-Based Sharding

Maintain a lookup table.

- **Pros**: Flexible.
- **Cons**: Lookup table becomes a single point of failure (SPOF).

---

## 3. CHALLENGES IN DISTRIBUTED DATABASES

### 3.1 Joins & Denormalization

You cannot `JOIN` tables across shards efficiently.

- **Solution**: **Denormalization** (duplicate data) or application-side joins.

### 3.2 Global Unique IDs

Auto-increment IDs don't work across shards.

- **Twitter Snowflake**: 64-bit ID (Timestamp + Machine ID + Sequence).
- **UUID**: Random, but large and not sortable.

### 3.3 CAP Theorem Recap

In a distributed database (Partitioned), you must choose between **Availability** and **Consistency**.

- **CP**: MongoDB (default), HBase.
- **AP**: Cassandra, DynamoDB.

---

## 4. NEWSQL & CLOUD NATIVE

Modern databases handle this automatically.

- **Google Spanner**: True Global Consistency (using Atomic Clocks/TrueTime).
- **CockroachDB**: Distributed SQL, auto-sharding.
- **Aurora (AWS)**: Separates Compute from Storage.

---

## 🎓 IMPLEMENTATION EXERCISE

1.  **System Design**: Design a URL Shortener (TinyURL).
2.  **Estimate**: 100M writes/month. Storage?
3.  **Sharding Key**: Shard by `Hash(Short_URL)`.
4.  **Database**: NoSQL (Cassandra) or Sharded MySQL?
5.  **Cache**: Redis cluster in front.
