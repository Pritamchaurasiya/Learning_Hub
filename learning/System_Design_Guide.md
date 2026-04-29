# 🏗️ SYSTEM DESIGN COMPLETE GUIDE

## From Junior Developer to Architect

### Learning Hub - God Mode v10.0

---

# 📖 TABLE OF CONTENTS

1. [Core Concepts](#1-core-concepts)
2. [Scalability](#2-scalability)
3. [Load Balancing](#3-load-balancing)
4. [Caching](#4-caching)
5. [Databases](#5-databases)
6. [Message Queues](#6-message-queues)
7. [Microservices](#7-microservices)
8. [Case Studies](#8-case-studies)

---

# 1. CORE CONCEPTS

## Why System Design Matters?

- **Interviews**: Senior/Staff level interviews are 50% system design
- **Scalability**: Your startup's app goes viral → can it handle 1M users?
- **Cost**: Bad design = expensive infrastructure bills
- **Reliability**: Users expect 99.99% uptime

## Key Metrics to Know

| Metric           | Value                  | Example                  |
| ---------------- | ---------------------- | ------------------------ |
| **Latency**      | < 100ms                | Google search response   |
| **Throughput**   | Requests/sec           | Netflix: 100K+ RPS       |
| **Availability** | 99.9% (3 nines)        | 8.76 hours downtime/year |
| **Durability**   | 99.9999999% (11 nines) | S3 data storage          |

## Numbers Every Developer Should Know

```
Read 1 MB from RAM:           0.25 ms
Read 1 MB from SSD:           1 ms
Read 1 MB from HDD:           20 ms
Read 1 MB over network:       10 ms (same datacenter)
Round trip within datacenter: 0.5 ms
Round trip cross-continent:   150 ms
```

---

# 2. SCALABILITY

## Vertical vs Horizontal Scaling

### Vertical Scaling (Scale Up)

- **What**: Add more CPU/RAM to existing server
- **Pros**: Simple, no code changes
- **Cons**: Hardware limits, single point of failure
- **Example**: Upgrade from 8GB to 64GB RAM

### Horizontal Scaling (Scale Out)

- **What**: Add more servers
- **Pros**: No hardware limits, better reliability
- **Cons**: Complexity, need stateless design
- **Example**: Add 10 more web servers

```
Vertical:  [  Big Server  ]

Horizontal: [Server 1]
            [Server 2]
            [Server 3]
               ...
            [Server N]
```

## CAP Theorem

In a distributed system, you can only guarantee 2 of these 3:

| Property                | Meaning                                      |
| ----------------------- | -------------------------------------------- |
| **Consistency**         | All nodes see the same data at the same time |
| **Availability**        | Every request gets a response                |
| **Partition Tolerance** | System works despite network failures        |

### Real-World Choices

- **CP (Consistency + Partition)**: Banking systems, inventory
- **AP (Availability + Partition)**: Social media feeds, DNS

> "Since network partitions are inevitable, you're really choosing between C and A"

---

# 3. LOAD BALANCING

## What is a Load Balancer?

Distributes incoming traffic across multiple servers to ensure no single server is overwhelmed.

```
                    ┌──────────────┐
                    │ Load Balancer │
                    └──────┬───────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         [Server 1]   [Server 2]   [Server 3]
```

## Algorithms

### 1. Round Robin

Requests go to servers in order: 1 → 2 → 3 → 1 → 2 → 3...

```python
servers = ['A', 'B', 'C']
current = 0

def get_server():
    global current
    server = servers[current]
    current = (current + 1) % len(servers)
    return server
```

### 2. Weighted Round Robin

Servers with more capacity get more requests.

### 3. Least Connections

Send to server with fewest active connections.

### 4. IP Hash

Same client IP always goes to same server (session persistence).

## Popular Tools

- **Nginx**: Reverse proxy + load balancer
- **HAProxy**: High-performance TCP/HTTP load balancer
- **AWS ALB/NLB**: Managed cloud load balancers

## Health Checks

Load balancers regularly ping servers to check if they're alive.

```
GET /health → 200 OK (healthy)
GET /health → 503 Service Unavailable (unhealthy)
```

---

# 4. CACHING

## Why Cache?

- Reduce database load
- Faster response times
- Lower infrastructure costs

## Cache Hit vs Miss

- **Hit**: Data found in cache → fast
- **Miss**: Data not in cache → fetch from database → store in cache

## Cache Strategies

### 1. Cache-Aside (Lazy Loading)

```python
def get_user(user_id):
    # Try cache first
    user = cache.get(f'user:{user_id}')
    if user:
        return user  # Cache hit

    # Cache miss - fetch from DB
    user = db.query(f'SELECT * FROM users WHERE id = {user_id}')
    cache.set(f'user:{user_id}', user, ttl=3600)  # Cache for 1 hour
    return user
```

**Pros**: Only caches what's needed
**Cons**: Initial request is slow

### 2. Write-Through

Write to cache AND database simultaneously.

```python
def update_user(user_id, data):
    db.update(user_id, data)
    cache.set(f'user:{user_id}', data)
```

**Pros**: Cache always consistent
**Cons**: Higher write latency

### 3. Write-Behind (Write-Back)

Write to cache immediately, sync to database later.

**Pros**: Fast writes
**Cons**: Risk of data loss if cache fails

## Cache Invalidation

> "There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton

### Strategies

1. **TTL (Time-To-Live)**: Auto-expire after duration
2. **Event-Based**: Invalidate on data changes
3. **LRU (Least Recently Used)**: Evict oldest items when full

## Redis (In-Memory Cache)

```python
import redis

r = redis.Redis()

# Strings
r.set('key', 'value', ex=3600)  # Expires in 1 hour
r.get('key')

# Lists
r.lpush('queue', 'task1')
r.rpop('queue')

# Sets (unique values)
r.sadd('online_users', 'user123')
r.smembers('online_users')

# Sorted Sets (leaderboard)
r.zadd('leaderboard', {'player1': 100, 'player2': 200})
r.zrange('leaderboard', 0, -1, withscores=True)
```

---

# 5. DATABASES

## SQL vs NoSQL

| Feature        | SQL                           | NoSQL                         |
| -------------- | ----------------------------- | ----------------------------- |
| Data Structure | Tables (structured)           | Documents, Key-Value, Graph   |
| Schema         | Fixed schema                  | Flexible schema               |
| Scaling        | Vertical (typically)          | Horizontal (designed for it)  |
| ACID           | Strong                        | Eventual consistency          |
| Use Case       | Complex queries, transactions | High scalability, varied data |

## Database Scaling

### Replication

```
         [Primary DB] ───write───
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
[Replica 1][Replica 2][Replica 3]
    read      read      read
```

- **Primary**: Handles writes
- **Replicas**: Handle reads
- **Benefit**: Scale reads, better availability

### Sharding (Horizontal Partitioning)

Split data across multiple databases.

```
Users A-M → Shard 1
Users N-Z → Shard 2
```

**Methods**:

1. **Range-Based**: By ID range or alphabetical
2. **Hash-Based**: `shard = hash(user_id) % num_shards`
3. **Directory-Based**: Lookup table maps data to shards

**Challenges**:

- Joins across shards are expensive
- Re-sharding when adding servers
- "Hot" shards if data is uneven

## Database Indexing

```sql
-- Without index: O(n) scan
SELECT * FROM users WHERE email = 'test@test.com';

-- With index: O(log n) lookup
CREATE INDEX idx_email ON users(email);

-- Composite index for multi-column queries
CREATE INDEX idx_user_category ON courses(user_id, category_id);
```

### When NOT to Index

- Small tables
- Columns with low cardinality (few unique values)
- Tables with heavy writes (indexes slow down inserts)

---

# 6. MESSAGE QUEUES

## What is a Message Queue?

Asynchronous communication between services. Producer sends messages, consumer processes them later.

```
[Service A] ──► [Message Queue] ──► [Service B]
  Producer                           Consumer
```

## Use Cases

- **Email sending**: Don't wait for email to send before responding to user
- **Image processing**: Queue heavy tasks for background workers
- **Order processing**: Decouple order creation from payment, inventory

## Popular Tools

- **RabbitMQ**: Traditional, reliable, AMQP protocol
- **Apache Kafka**: High throughput, distributed streaming
- **Redis Pub/Sub**: Simple, in-memory

## Kafka Example

```python
from kafka import KafkaProducer, KafkaConsumer

# Producer
producer = KafkaProducer(bootstrap_servers='localhost:9092')
producer.send('orders', b'{"order_id": 123}')

# Consumer
consumer = KafkaConsumer('orders', bootstrap_servers='localhost:9092')
for message in consumer:
    process_order(message.value)
```

---

# 7. MICROSERVICES

## Monolith vs Microservices

### Monolith

```
┌─────────────────────────────┐
│        Single App            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │Auth│ │Users│ │Orders│ │Pay│ │
│  └───┘ └───┘ └───┘ └───┘   │
└─────────────────────────────┘
```

**Pros**: Simple, easy to test, one deployment
**Cons**: Scaling all-or-nothing, single point of failure

### Microservices

```
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│ Auth  │  │ Users │  │Orders │  │Payment│
│Service│  │Service│  │Service│  │Service│
└───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
    │          │          │          │
    └──────────┴──────────┴──────────┘
                API Gateway
```

**Pros**: Scale independently, team autonomy, tech flexibility
**Cons**: Complexity, network latency, distributed debugging

## API Gateway

Single entry point that routes requests to appropriate microservices.

```
Client → API Gateway → Auth Service
                    → User Service
                    → Order Service
```

**Functions**:

- Routing
- Authentication
- Rate limiting
- Request/response transformation

## Service Discovery

How services find each other in a dynamic environment.

- **Client-Side**: Services query registry (Consul, Eureka)
- **Server-Side**: Load balancer queries registry

---

# 8. CASE STUDIES

## Design: URL Shortener (bit.ly)

### Requirements

- Shorten long URLs to short codes
- Redirect short codes to original URLs
- 100M URLs/month, 10B redirects/month

### High-Level Design

```
┌────────────────────────────────────────┐
│                 Client                  │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│            Load Balancer               │
└───────────────────┬────────────────────┘
                    │
┌───────┬───────────┼───────────┬────────┐
│       ▼           ▼           ▼        │
│  [Server 1]  [Server 2]  [Server 3]    │
└───────┬───────────┬───────────┬────────┘
        │           │           │
┌───────▼───────────▼───────────▼────────┐
│              Cache (Redis)              │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│          Database (Sharded)            │
└────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE urls (
    id BIGINT PRIMARY KEY,
    short_code VARCHAR(7) UNIQUE,
    original_url TEXT,
    created_at TIMESTAMP,
    expiry_at TIMESTAMP
);

CREATE INDEX idx_short_code ON urls(short_code);
```

### Short Code Generation

Base62 encoding of auto-increment ID

```python
CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def encode(num):
    result = []
    while num > 0:
        result.append(CHARS[num % 62])
        num //= 62
    return ''.join(reversed(result))

# encode(1000000) → "4C92"
```

---

## Design: Chat System (WhatsApp)

### Requirements

- 1:1 and group chat
- 500M daily active users
- Message delivery guarantee

### Key Components

1. **WebSockets**: Real-time bidirectional communication
2. **Message Queue**: Store messages when user offline
3. **Presence Service**: Track online/offline status
4. **Push Notifications**: Notify when app is closed

### Message Flow

```
User A sends message:
1. A → WebSocket Gateway → Chat Service
2. Chat Service → Message Queue
3. If B online: Chat Service → WebSocket → B
   If B offline: Push Notification Service → B's phone
```

---

## Design: Video Streaming (Netflix)

### Challenges

- Massive file sizes (4K video = 10+ GB/hour)
- Global users with varying network speeds
- Peak usage (evening) = 10x normal traffic

### Solutions

1. **CDN (Content Delivery Network)**

   - Cache videos at edge locations near users
   - Netflix Open Connect: 15,000+ servers worldwide

2. **Adaptive Bitrate Streaming**

   - Multiple quality versions (480p, 720p, 1080p, 4K)
   - Client dynamically switches based on bandwidth

3. **Video Encoding**
   - Original video encoded to multiple resolutions
   - Each resolution split into small chunks (2-10 seconds)

```
Original.mp4 → [Encoder] → 480p/chunk001.mp4
                        → 480p/chunk002.mp4
                        → 720p/chunk001.mp4
                        → 720p/chunk002.mp4
                        → 1080p/chunk001.mp4
                        → ...
```

---

# 🎯 INTERVIEW FRAMEWORK

## 4-Step Approach

### Step 1: Clarify Requirements (5 min)

- Functional requirements (what it does)
- Non-functional requirements (scale, latency, availability)
- Constraints (existing systems, budget)

### Step 2: High-Level Design (10 min)

- Draw boxes for major components
- Show data flow between components
- Identify key technologies

### Step 3: Deep Dive (15 min)

- Pick 2-3 components to detail
- Discuss trade-offs
- Handle edge cases

### Step 4: Wrap Up (5 min)

- Summarize design
- Discuss monitoring/alerting
- Mention future improvements

---

_Generated by God Mode v10.0 - Infinite Learning Engine_
_Learning Hub System Design Track_
