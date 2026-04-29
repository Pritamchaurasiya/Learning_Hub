# 11. Distributed Systems Consensus: The Heart of Scale 🌐

> "A distributed system is one in which the failure of a computer you didn't even know existed can render your own computer unusable." — Leslie Lamport

## 1. The Impossible Problem (CAP Theorem)

You can only have **2 out of 3**:

1.  **Consistency**: Every read receives the most recent write.
2.  **Availability**: Every request receives a (non-error) response.
3.  **Partition Tolerance**: System continues to operate despite network messages dropping.

**Reality**: In a distributed system, Partitions (P) _will_ happen. So you must choose:

- **CP** (Consistency > Availability): MongoDB, HBase. System goes down if it can't guarantee data is same everywhere.
- **AP** (Availability > Consistency): Cassandra, DynamoDB. "Eventual Consistency". System stays up, but you might see old data briefly.

## 2. The Consensus Problem

How do multiple servers ("nodes") agree on a value (e.g., "Transaction X happened") when:

- Nodes might crash.
- Network is unreliable.
- Clocks are out of sync.

## 3. The Algorithms

### A. Paxos (The "Holy Grail")

- Invented by Leslie Lamport.
- Extremely robust, mathematically proven safety.
- **Problem**: Famously difficult to understand and implement correctly.
- Used in: Google Spanner, Chubby.

### B. Raft (The "Understandable" One)

- Designed specifically to be easier than Paxos.
- **Leader Election**: Nodes elect a Leader.
- **Log Replication**: Leader accepts writes, replicates to Followers.
- **Safety**: Only committed if majority (>50%) acknowledge.
- Used in: **Kubernetes (etcd)**, Consul, CockroachDB.

### C. Byzantine Fault Tolerance (BFT)

- What if nodes are _malicious_ (hackers), not just crashed?
- Requires $3f+1$ nodes to handle $f$ traitors.
- Used in: Blockchain (Bitcoin uses Proof of Work as a probabilistic BFT).

## 4. Logical Clocks

Physical time is unreliable across servers. We use **Logical Clocks**.

- **Lamport Timestamps**: "A happened before B".
- **Vector Clocks**: Detects _concurrent_ events (used in Amazon Dynamo).

## 5. Practical Python Implementation (Simplified Raft Leader Election)

```python
import random
import time
from enum import Enum

class NodeState(Enum):
    FOLLOWER = 1
    CANDIDATE = 2
    LEADER = 3

class Node:
    def __init__(self, node_id, total_nodes):
        self.id = node_id
        self.state = NodeState.FOLLOWER
        self.term = 0
        self.votes = 0
        self.total_nodes = total_nodes

    def start_election(self):
        """Became a Candidate, requesting votes."""
        self.state = NodeState.CANDIDATE
        self.term += 1
        self.votes = 1 # Vote for self
        print(f"Node {self.id}: Starting election for Term {self.term}")

    def receive_vote_request(self, candidate_term, candidate_id):
        """Decide whether to vote for a candidate."""
        if candidate_term > self.term:
            self.term = candidate_term
            self.state = NodeState.FOLLOWER
            print(f"Node {self.id}: Voted for Node {candidate_id}")
            return True
        return False

    def on_vote_received(self):
        self.votes += 1
        if self.votes > (self.total_nodes / 2):
            self.state = NodeState.LEADER
            print(f"Node {self.id}: 👑 I AM THE LEADER for Term {self.term}!")

# Simulation
nodes = [Node(i, 3) for i in range(3)]

# Node 0 times out and starts election
nodes[0].start_election()

# Other nodes vote
if nodes[1].receive_vote_request(nodes[0].term, nodes[0].id):
    nodes[0].on_vote_received()

if nodes[2].receive_vote_request(nodes[0].term, nodes[0].id):
    nodes[0].on_vote_received()

# Result: Node 0 gets majority and becomes leader.
```

## 6. Research & Design Patterns

- **Saga Pattern**: Handling distributed transactions without a global lock. A sequence of local transactions with "Compensating Transactions" (undo) if one fails.
- **CQRS (Command Query Responsibility Segregation)**: Separate Read models (cache/fast) from Write models (consistent).
- **Sharding**: Horizontal partitioning of data. key % num_shards. (Beware the "Hot Key" problem).
