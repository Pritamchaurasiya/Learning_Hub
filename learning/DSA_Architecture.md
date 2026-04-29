# DSA Module Architecture & Implementation Guide

## Overview

This document explains the architecture behind the Data Structures and Algorithms (DSA) module in the Learning Hub application. It covers the full stack implementation, from the Django backend Repository Pattern to the Flutter Frontend with Riverpod and Animations.

## Backend Architecture (Django)

We use a **Repository Pattern** to decouple business logic from the Data Access Layer.

### 1. Model (`apps/dsa/models.py`)

The `Problem` model stores DSA problems.

- **Optimization**: `db_index=True` on `title` for fast search.
- **Slug**: Unique identifier for URL-friendly access.
- **Tags**: Many-to-Many relationship with `Tag` model.

### 2. Repository (`apps/dsa/repositories.py`)

The `ProblemRepository` encapsulates all database queries.

- **Method**: `get_list_queryset(difficulty, tag_slug, search)`
- **Search Logic**: Uses `Q` objects for efficient `OR` queries (Title OR Description).
  ```python
  if search:
      queryset = queryset.filter(
          Q(title__icontains=search) |
          Q(description__icontains=search)
      )
  ```
- **Performance**: `prefetch_related('tags')` prevents N+1 query problems.

### 3. ViewSet (`apps/dsa/views.py`)

The API Layer that handles HTTP requests.

- **Role**: Parses query parameters (`difficulty`, `tag`, `search`) and delegates to the Repository.
- **Benefit**: Keeps views clean and focused on HTTP concerns.

## Frontend Architecture (Flutter)

We use **Riverpod** for state management and **Flutter Animate** for premium UI effects.

### 1. State Management (`DsaProblemsNotifier`)

We use a `StateNotifier` to manage `DsaProblemsState`.

- **State**: Immutable class holding `problems`, `isLoading`, `error`, and filters (`searchQuery`, `selectedDifficulty`, `selectedTag`).
- **Logic**:
  - `setSearchQuery(query)` updates state and triggers `loadProblems()`.
  - `loadProblems()` builds the query parameters and calls the API via Dio.

### 2. UI Implementation (`DsaProblemsScreen`)

- **Search Bar**: A dedicated `TextField` that updates the provider on change.
  - _Tip_: Added a subtle drop shadow and rounded corners for a "premium" feel.
- **Animations**:
  - **Entry**: `.animate().fadeIn().slideY()` gives a smooth entrance to the screen.
  - **List Items**: Staggered animations using `delay: (50 * index).ms` make the list feel alive.
  - **Empty State**: A pulsing icon animation draws attention when no results are found.

### 3. "God Mode" Considerations

- **No Duplication**: Logic is centralized in the Notifier.
- **Error Handling**: Graceful UI states for loading and errors.
- **Responsiveness**: Layout adapts to available space (expanded list).

## How to Extend

To add a new feature (e.g., "Sort by Points"):

1.  **Backend**: Add `sort` param to `get_list_queryset`.
2.  **Frontend**: Add `sortOption` to `DsaProblemsState`.
3.  **UI**: Add a Sort Dropdown in the AppBar actions.
