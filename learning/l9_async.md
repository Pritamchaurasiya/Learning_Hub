## ⚡ Lesson 9: Event-Driven Architecture (Async)

**Status**: IN PROGRESS

### 🐌 The Problem with "Sync"

Imagine a restaurant.

1.  You order food.
2.  The waiter goes to the kitchen.
3.  The waiter _waits_ for the chef to cook (20 mins).
4.  The waiter brings the food.
    **The waiter is blocked.** No one else can order.

This is how standard web APIs work. If `award_xp()` takes 500ms, the user waits 500ms extra.

### 🏃 The Solution: "Async" Queue

1.  You order food.
2.  Waiter writes a ticket (`Task`) and puts it on a spike (`Queue`).
3.  Waiter immediately says "Coming right up!" (200 OK).
4.  **Worker** (Chef) picks up the ticket and cooks in the background.
5.  When done, Chef rings a bell (`Notification`).

### 🛠️ The Stack

- **Celery**: The Task Manager (Waiter).
- **Redis**: The Message Broker (The Ticket Spike).
- **Worker**: The background process that executes tasks.

### 🔄 Our Implementation

- **Old**: `User finishes lesson` -> `Calculate XP` -> `Return Success`.
- **New**: `User finishes lesson` -> `Queue: process_lesson_completion` -> `Return Success`.
