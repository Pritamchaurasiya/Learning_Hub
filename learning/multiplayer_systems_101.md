# Multiplayer Systems 101: Synchronizing the World

**Course Instructor:** Antigravity AI
**Level:** Game Server Engineering
**Topic:** Real-Time State Management (Kahoot!/Jackbox Style)

---

## Module 1: The "Shared Hallucination"

In a multiplayer game, everyone must agree on the "State".

- **Question:** "What is 2+2?"
- **Time Remaining:** 10s.
- **Leader:** User A (500pts).

If User A sees "Time Remaining: 0s" but User B sees "5s", the game is broken.

**Solution:** The Server is the Source of Truth.

- The Server says: "Time is now 9s."
- Clients listen and update their UI. Clients NEVER tell the server what time it is.

---

## Module 2: The Event Loop (`LiveSessionConsumer`)

Our Django Consumer acts as the Game Server.

### 1. The Host (Teacher)

- Triggers event: `push_question`.
- Server validates: _Is this user the host?_
- Server Broadcasts: `{ "type": "new_question", "payload": {...} }`.

### 2. The Players (Students)

- Listen for `new_question`.
- Submit Answer: `submit_answer`.
- Server validates: _Is time up?_
- Server Updates DB: `Score.objects.create(...)`.

---

## Module 3: Handling Concurrency (Race Conditions)

**Problem:** 100 students answer at the exact same millisecond.
**Django Channels (Redis):** Handles this gracefully.

- Redis queues the messages.
- Python processes them one by one (or in parallel workers).

**Critical Rule:** Database writes (`Score.save()`) are the bottleneck.

- _Optimization:_ Use **Redis Atomic Counters** (`INCR score_user_1`) for real-time speed, then sync to Postgres later.

---

## Assignment

1.  Review `apps/live_sessions/consumers.py`.
2.  Notice how we restrict `push_question` to the Host only.
3.  **Thought Experiment:** How would you handle a player disconnecting mid-game? (Heartbeat/Ping-Pong).

_Class Dismissed. Game On._
