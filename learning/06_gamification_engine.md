# 🎮 Gamification & Engagement Engine 2.0

This document explains the "Next Level" engagement architecture implemented to drive user retention.

## 1. ⚡ The Streak Engine

**Goal**: Build a habit-forming loop where users learn daily.

### Logic

The streak logic is handled in `GamificationService.check_streaks(user)`.
It is triggered **automatically** whenever a user performs a tracked activity (Lesson View, Quiz, etc.).

**Rules**:

- **Active Today**: No change (Streak maintained).
- **Active Yesterday**: Streak += 1.
- **Missed Day**: Streak resets to 1.
- **Badges**: Awarded at 3, 7, 30, 100, 365 days.

**Fix Applied**:
We identified a critical logical error where `AnalyticsService.track_activity` was _ignoring_ streak updates. We applied a patch in `apps/ai_engine/analytics_service.py` to ensure every action counts.

## 2. 🎲 AI Daily Challenges

**Goal**: meaningful, personalized goals every 24 hours.

### Endpoint

`POST /api/v1/ai/challenges/generate-daily/`

### Workflow

1.  **Check**: Does user have a daily challenge for `today`?
2.  **Generate**: If not, the AI (currently Heuristic Engine) selects a topic based on user weak spots (e.g., "Python", "Algorithms").
3.  **Create**: A specific `Challenge` object is created with a 24-hour expiry.
4.  **Auto-Join**: The user is immediately enrolled.

### JSON Response

```json
{
  "status": "success",
  "message": "Daily challenge generated",
  "data": {
    "challenge_id": 105,
    "title": "Daily Quest: Master Algorithms",
    "xp_reward": 450
  }
}
```

## 3. 🏆 Rewards & XP

XP is the currency of the platform.

- **Lesson Complete**: +50 XP
- **Quiz Pass**: +100 XP
- **Course Complete**: +500 XP
- **Daily Quest**: +150-450 XP

## 4. 🔮 Future Enhancements (Roadmap)

- **PvP Challenges**: specific user-vs-user coding duels.
- **Shop**: Spend XP on profile frames or "Streak Freeze" items.
- **LLM Generation**: Use Gemini 2.0 to write custom lore-based descriptions for daily quests (e.g., "Defeat the Python Dragon").
