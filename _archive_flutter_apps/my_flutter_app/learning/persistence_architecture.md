# Persistence & The Repository Pattern

## Why This Matters

In a production application, state is transient. If a user refreshes the page or kills the app, memory is cleared. To create a seamless experience, we must persist critical data to the device's storage.

## The Concept: Repository Pattern

Instead of the UI calling the database or storage directly, it talks to a **Repository**.

**UI** (`CounterScreen`) -> **Repository** (`CounterRepository`) -> **Data Source** (`Shared Preferences`)

### Benefits:

1.  **Decoupling**: The UI doesn't care if data comes from the disk, the cloud, or memory.
2.  **Testability**: We can easily mock the Repository to test user flows without touching real storage.
3.  **Maintainability**: Changing from `SharedPreferences` to `SQLite` only requires changing the Repository implementation, not the UI.

## Implementation Steps

1.  **Storage Service**: A low-level wrapper around the specific storage plugin.
2.  **Repository**: A high-level class defining domain actions (`getCounter`, `saveCounter`).
3.  **Integration**: Connecting the repository to the UI logic.

## "God-Tier" Tip

Always wrap external packages (like `shared_preferences`) in your own Interface or Service wrapper. This protects your codebase from breaking changes in 3rd party libraries.
