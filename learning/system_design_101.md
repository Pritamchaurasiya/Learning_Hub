# System Design 101: Building a Chat System

**Course Instructor:** Antigravity AI
**Level:** Senior Engineer / Architect
**Topic:** Designing WhatsApp / Discord / Slack

---

## Module 1: Functional Requirements

1.  **Real-Time messaging**: Latency < 200ms.
2.  **1-on-1 and Group Chat**.
3.  **Persistence**: Cloud history.
4.  **Online Status**: ("User is typing...").

---

## Module 2: The Architecture

We don't use HTTP POST for every message. It's too slow.
We use **WebSockets** (persistent TCP connections).

### Component Diagram

User A <--> Load Balancer <--> Chat Service (Django Channels) <--> Redis <--> User B

### Why Redis?

If User A is connected to **Server 1**, and User B is on **Server 2**.
How does Server 1 tell Server 2 to send a message?
**Answer:** Redis Pub/Sub. Server 1 publishes to channel `chat_room_101`. All servers listening to that channel get the message.

---

## Module 3: Database Schema (SQL vs NoSQL)

We used **PostgreSQL** (`GroupMessage` model) for simplicity.

- _Pros:_ Relational integrity, ACID transactions.
- _Cons:_ Hard to scale to billions of messages.

**"God-Tier" Scale:**
At 100M users, we would switch to **Cassandra** or **DynamoDB** (Wide-Column Store) optimized for write-heavy workloads.

---

## Module 4: Code Deep Dive

### 1. The Consumer (`ChatConsumer`)

- `connect()`: Joins the Redis Group (`chat_123`).
- `receive()`: Saves to DB -> Broadcasts to Group.
- `chat_message()`: Forwarding the broadcast to the specific WebSocket.

### 2. The Router (`asgi.py`)

Directs traffic from `wss://api.learninghub.com/ws/chat/...` to the right consumer code.

---

## Assignment

1.  Review `apps/study_groups/consumers.py`.
2.  Enhance it: Add a "Typing Indicator" (broadcast `{type: "typing"}` without saving to DB).

_Class Dismissed. Go design scaling systems._
