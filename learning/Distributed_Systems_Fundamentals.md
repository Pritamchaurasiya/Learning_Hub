# 🌐 DISTRIBUTED SYSTEMS FUNDAMENTALS

## Building Reliable Systems at Scale

---

## 📋 TABLE OF CONTENTS

1. [What Are Distributed Systems](#-what-are-distributed-systems)
2. [CAP Theorem](#-cap-theorem)
3. [Consistency Models](#-consistency-models)
4. [Consensus Algorithms](#-consensus-algorithms)
5. [Distributed Transactions](#-distributed-transactions)
6. [Failure Modes](#-failure-modes)
7. [Service Mesh](#-service-mesh)
8. [Best Practices](#-best-practices)

---

## 🎯 WHAT ARE DISTRIBUTED SYSTEMS

### Definition

A **distributed system** is a collection of independent computers that appears to its users as a single coherent system.

### Why Distributed?

| Need                     | Solution                   |
| ------------------------ | -------------------------- |
| **Handle more traffic**  | Horizontal scaling         |
| **Reduce latency**       | Geographic distribution    |
| **Increase reliability** | No single point of failure |
| **Cost efficiency**      | Commodity hardware         |

### The Eight Fallacies

```
1. The network is reliable       ← Packets drop
2. Latency is zero               ← Distance matters
3. Bandwidth is infinite         ← Data has cost
4. The network is secure         ← Trust no one
5. Topology doesn't change       ← Nodes come and go
6. There is one administrator    ← Multi-team chaos
7. Transport cost is zero        ← Serialization overhead
8. The network is homogeneous    ← Different systems exist
```

---

## ⚖️ CAP THEOREM

### The Three Properties

```
┌─────────────────────────────────────────────────────────┐
│                    CAP Theorem                          │
│                                                         │
│      "Pick any two" during network partition            │
│                                                         │
│                    Consistency                          │
│                        ▲                                │
│                       / \                               │
│                      /   \                              │
│                     /     \                             │
│                    /  CA   \                            │
│           ┌──────/         \──────┐                    │
│           │     / (Impossible)   \│                    │
│           │    /   with P         \│                   │
│           │   /                     \│                 │
│           │  /   CP          AP      \│                │
│    Availability ────────────────────── Partition       │
│           │      (Choose one)         │ Tolerance      │
│           └───────────────────────────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Definitions

| Property                | Meaning                              | Example                            |
| ----------------------- | ------------------------------------ | ---------------------------------- |
| **Consistency**         | All nodes see same data at same time | Bank balance shows $100 everywhere |
| **Availability**        | System responds to every request     | Website always loads               |
| **Partition Tolerance** | System works despite network splits  | US/EU datacenters can disconnect   |

### CAP in Practice

| System                    | Choice | Trade-off                          |
| ------------------------- | ------ | ---------------------------------- |
| **MySQL (single node)**   | CA     | No partition tolerance             |
| **MongoDB (replica set)** | CP     | May reject writes during partition |
| **Cassandra**             | AP     | May return stale data              |
| **PostgreSQL + Patroni**  | CP     | Leader election pauses writes      |

### Real Decision: PACELC

```
If Partition:
  Choose A or C (CAP)
Else (normal operation):
  Choose Latency or Consistency

Example: Cassandra = PA/EL (Available in partition, Low latency normally)
Example: MongoDB = PC/EC (Consistent in partition, Consistent normally)
```

---

## 📊 CONSISTENCY MODELS

### Spectrum

```
Strong ◄──────────────────────────────────────────► Weak

Linearizable   Sequential   Causal   Eventual   None
    │              │          │         │         │
    │              │          │         │         │
 Slowest        Fast      Faster    Fastest   Chaos
```

### Definitions

| Model               | Guarantee                            | Use Case               |
| ------------------- | ------------------------------------ | ---------------------- |
| **Linearizability** | Reads reflect latest write           | Financial transactions |
| **Sequential**      | All see operations in same order     | Distributed locks      |
| **Causal**          | Related operations ordered correctly | Social feeds           |
| **Eventual**        | All nodes converge eventually        | DNS, CDN               |

### Implementation Examples

```python
# Eventual Consistency - Write to any replica
async def write_eventually(key, value):
    # Write to local node
    local_node.write(key, value)
    # Async replicate to others
    asyncio.create_task(replicate_to_peers(key, value))
    return True  # Return immediately

# Strong Consistency - Quorum writes
async def write_strongly(key, value):
    responses = await asyncio.gather(*[
        node.write(key, value) for node in nodes
    ])
    # Wait for majority acknowledgment
    acks = sum(1 for r in responses if r.success)
    if acks > len(nodes) // 2:
        return True
    raise ConsistencyError("Quorum not reached")
```

---

## 🤝 CONSENSUS ALGORITHMS

### Raft (Understandable Consensus)

```
┌─────────────────────────────────────────────────────────┐
│                     Raft Cluster                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │  Leader  │───►│ Follower │    │ Follower │        │
│   │  (Node1) │    │  (Node2) │    │  (Node3) │        │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘        │
│        │               │               │              │
│        │  Heartbeats + Log Replication │              │
│        └───────────────┴───────────────┘              │
│                                                         │
│  Election Timeout: If no heartbeat, become candidate   │
│  Term: Logical clock for elections                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Leader Election

```python
class RaftNode:
    def __init__(self, node_id, peers):
        self.node_id = node_id
        self.peers = peers
        self.state = 'follower'
        self.current_term = 0
        self.voted_for = None
        self.log = []

    async def run_election(self):
        self.state = 'candidate'
        self.current_term += 1
        self.voted_for = self.node_id

        votes = 1  # Vote for self

        for peer in self.peers:
            response = await peer.request_vote(
                term=self.current_term,
                candidate_id=self.node_id,
                last_log_index=len(self.log) - 1
            )
            if response.vote_granted:
                votes += 1

        if votes > len(self.peers) // 2:
            self.state = 'leader'
            await self.send_heartbeats()
```

### Paxos vs Raft

| Aspect                | Paxos         | Raft                 |
| --------------------- | ------------- | -------------------- |
| **Complexity**        | High          | Lower                |
| **Leader**            | Optional      | Required             |
| **Understandability** | Difficult     | Designed to be clear |
| **Production Use**    | Google Chubby | etcd, Consul         |

---

## 💱 DISTRIBUTED TRANSACTIONS

### Two-Phase Commit (2PC)

```
┌──────────────────────────────────────────────────────┐
│               Two-Phase Commit (2PC)                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Coordinator                                          │
│      │                                                │
│      │ Phase 1: PREPARE                              │
│      ╠═══════════════╦══════════════════╗            │
│      ▼               ▼                  ▼            │
│  ┌───────┐      ┌───────┐          ┌───────┐        │
│  │Node A │      │Node B │          │Node C │        │
│  │PREPARE│      │PREPARE│          │PREPARE│        │
│  └───┬───┘      └───┬───┘          └───┬───┘        │
│      │ YES          │ YES              │ YES         │
│      ╚══════════════╩══════════════════╝             │
│      │                                                │
│      │ Phase 2: COMMIT (if all YES)                  │
│      ╠═══════════════╦══════════════════╗            │
│      ▼               ▼                  ▼            │
│  ┌───────┐      ┌───────┐          ┌───────┐        │
│  │COMMIT │      │COMMIT │          │COMMIT │        │
│  └───────┘      └───────┘          └───────┘        │
│                                                       │
└──────────────────────────────────────────────────────┘

Problems:
- Coordinator is SPOF
- Blocking during failure
- Latency (2 round trips minimum)
```

### Saga Pattern (Eventual Consistency)

```
┌──────────────────────────────────────────────────────┐
│                    Saga Pattern                       │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Order Saga: Create Order → Charge Payment →         │
│              Reserve Inventory → Ship                │
│                                                       │
│  Happy Path:                                          │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐          │
│  │Create│──►│Charge│──►│Reserve│──►│ Ship │          │
│  │Order │   │      │   │      │   │      │          │
│  └──────┘   └──────┘   └──────┘   └──────┘          │
│                                                       │
│  Failure Path (Compensating Transactions):           │
│  ┌──────┐   ┌──────┐   ┌──────┐                     │
│  │Cancel│◄──│Refund│◄──│Release│◄── FAILURE         │
│  │Order │   │      │   │Stock │                     │
│  └──────┘   └──────┘   └──────┘                     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Implementation

```python
class OrderSaga:
    def __init__(self):
        self.compensations = []

    async def execute(self, order):
        try:
            # Step 1: Create order
            order_id = await order_service.create(order)
            self.compensations.append(
                lambda: order_service.cancel(order_id)
            )

            # Step 2: Charge payment
            payment_id = await payment_service.charge(order)
            self.compensations.append(
                lambda: payment_service.refund(payment_id)
            )

            # Step 3: Reserve inventory
            await inventory_service.reserve(order.items)
            self.compensations.append(
                lambda: inventory_service.release(order.items)
            )

            return order_id

        except Exception as e:
            # Compensate in reverse order
            for compensate in reversed(self.compensations):
                await compensate()
            raise
```

---

## 💥 FAILURE MODES

### Types of Failures

| Type          | Description                  | Detection         |
| ------------- | ---------------------------- | ----------------- |
| **Crash**     | Node stops responding        | Timeouts          |
| **Omission**  | Messages lost                | Acknowledgments   |
| **Timing**    | Response too slow            | Deadlines         |
| **Byzantine** | Arbitrary/malicious behavior | Voting algorithms |

### Detecting Failures

```python
import asyncio

class FailureDetector:
    def __init__(self, nodes, timeout=5):
        self.nodes = nodes
        self.timeout = timeout
        self.suspected = set()

    async def check_node(self, node):
        try:
            async with asyncio.timeout(self.timeout):
                response = await node.heartbeat()
                self.suspected.discard(node.id)
                return True
        except asyncio.TimeoutError:
            self.suspected.add(node.id)
            return False

    async def monitor(self):
        while True:
            await asyncio.gather(*[
                self.check_node(node) for node in self.nodes
            ])
            await asyncio.sleep(1)
```

### Circuit Breaker Pattern

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.state = 'CLOSED'
        self.last_failure_time = None

    async def call(self, func, *args, **kwargs):
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = 'HALF_OPEN'
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = await func(*args, **kwargs)
            self.failure_count = 0
            self.state = 'CLOSED'
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
            raise
```

---

## 🕸️ SERVICE MESH

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Service Mesh                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │               Control Plane                      │   │
│  │     (Istio Pilot, Consul, Linkerd)              │   │
│  └─────────────────────────────────────────────────┘   │
│                    │ Configs                           │
│                    ▼                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │               Data Plane                         │   │
│  │                                                  │   │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐  │   │
│  │  │ Sidecar  │    │ Sidecar  │    │ Sidecar  │  │   │
│  │  │ Proxy    │◄──►│ Proxy    │◄──►│ Proxy    │  │   │
│  │  └────┬─────┘    └────┬─────┘    └────┬─────┘  │   │
│  │       │               │               │         │   │
│  │  ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐  │   │
│  │  │Service A │    │Service B │    │Service C │  │   │
│  │  └──────────┘    └──────────┘    └──────────┘  │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Capabilities

- **Traffic Management**: Load balancing, routing, retries
- **Security**: mTLS, auth policies
- **Observability**: Metrics, traces, logs

---

## 💎 BEST PRACTICES

1. **Embrace eventual consistency** - Strong consistency is expensive
2. **Design for failure** - Everything fails eventually
3. **Idempotency everywhere** - Safe retries
4. **Circuit breakers** - Prevent cascade failures
5. **Timeouts on all operations** - Never wait forever
6. **Monitor everything** - Distributed tracing is essential
7. **Start simple** - Add complexity only when needed

---

**SINGULARITY ENGINE v17.0**  
_"Distributed systems: making the impossible merely difficult."_
