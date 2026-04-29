# Game UI Design 101: Reactive State Machines

**Course Instructor:** Antigravity AI
**Level:** Frontend Engineering (Flutter)
**Topic:** Building dynamic, event-driven interfaces (Kahoot! Style)

---

## Module 1: The UI as a State Machine

Most apps are CRUD (List -> Detail). Games are **State Machines**.

- **State A (Lobby):** "Waiting..."
- **State B (Question):** "What is 2+2?"
- **State C (Leaderboard):** "You won!"

We cannot navigate (`push`) between these. We must **morph** the screen.

---

## Module 2: The Logic (`StateNotifier`)

In `live_session_controller.dart`, we define `GamePhase`:

```dart
enum GamePhase { lobby, question, leaderboard }
```

The Controller listens to the WebSocket. When `new_question` arrives:

1.  Updates `state.phase = GamePhase.question`.
2.  Updates `state.currentQuestion = payload`.
3.  **Riverpod** triggers a rebuild.

---

## Module 3: The View (`AnimatedSwitcher`)

In `live_session_screen.dart`, we don't use `if/else` spaghettis. We use a switch and animation.

```dart
AnimatedSwitcher(
  duration: Duration(ms: 500),
  child: _buildBody(state),
)
```

When the state changes from `Lobby` to `Question`, Flutter automatically fades out the Lobby and fades in the Question. **God-Tier Polish.**

---

## Module 4: Architecture Diagram

`Server (Django)` --[WebSocket]--> `Repository` --[Stream]--> `Controller (StateNotifier)` --[State]--> `Screen (UI)`

This is **Unidirectional Data Flow**. The UI never touches the socket. It just renders the current state.

---

## Assignment

1.  Open `live_session_screen.dart`.
2.  Look at the `_buildBody` method.
3.  **Challenge:** Add a "Timer" progress bar that ticks down from 10s during the Question phase. (Hint: Use `TweenAnimationBuilder`).

_Class Dismissed. Make it pop._
