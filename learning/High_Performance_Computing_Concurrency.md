# ⚡ PERFORMANCE ENGINEERING: CONCURRENCY & LOW-LATENCY

> [!IMPORTANT] > **Performance is a feature.** A slow system is a broken system. This guide covers how to squeeze every bit of power out of your hardware.

---

## 🏎️ 1. CONCURRENCY VS. PARALLELISM

- **Concurrency**: Dealing with lots of things at once (Interleaving tasks).
- **Parallelism**: Doing lots of things at once (Simultaneous execution on multiple cores).

---

## 🧵 2. THREADS, PROCESSES, AND COROUTINES

### 2.1 Processes

- Self-contained execution environment.
- Own memory space.
- Heavyweight to create and switch.

### 2.2 Threads

- Run within a process.
- Share memory.
- Context switching is faster but still expensive.

### 2.3 Coroutines (Async/Await)

- **Virtual Threads** or **Lightweight Threads**.
- Managed by the application/runtime, not the OS.
- Can handle millions of connections (Node.js, Go Goroutines, Python Asyncio).

---

## 🧠 3. COMMON PITFALLS

- **Race Conditions**: Two threads accessing shared data simultaneously, leading to unpredictable results.
  - _Fix_: Locks, Semaphores, Atomic operations.
- **Deadlocks**: Thread A waits for B, and B waits for A.
  - _Fix_: Consistent lock ordering, Timeouts.
- **N+1 Query Problem**: Making 100 database hits when 1 would suffice.
  - _Fix_: Select Related (Joins) or Prefetch Related.

---

## 🚀 4. CACHING STRATEGIES

1.  **In-Memory**: Redis, Memcached (Microseconds).
2.  **Database Indexing**: B-Trees, Hash Indexes (Milliseconds).
3.  **CDN**: Edge caching (Closest to the user).
4.  **Browser Caching**: Storing static assets locally.

---

## 🧪 5. PROFILING & BENCHMARKING

**"You can't optimize what you can't measure."**

- **cProfile**: Python profiling.
- **Flame Graphs**: Visualizing where the CPU spends time.
- **Load Testing**: Tools like **Locust** or **JMeter**.

---

## 🎓 MENTAL MODEL: AMDAHL'S LAW

The speedup of a program from using multiple processors is limited by the sequential fraction of the program. If 10% of your code MUST be sequential, your max speedup is 10x, even with 1,000 cores.

---

## 🚀 NEXT LEVEL: ZERO-COPY NETWORKING

Techniques to move data between the network and application memory without intermediate copies in the OS kernel. (e.g., `sendfile` system call).
