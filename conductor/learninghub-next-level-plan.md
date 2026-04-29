# Next Level Implementation Plan: LearningHub

## Objective
Elevate the LearningHub platform by introducing an AI Study Assistant, advanced gamification features, and enhanced code formatting, providing a premium, interactive learning experience.

## Technology Stack Additions
- **Syntax Highlighting**: `highlight.js`

## Execution Sequence

### Phase 1: Enhanced Code Formatting & Interactive Markdown
1. **Dependencies**: Install `highlight.js` and `@types/highlight.js`.
2. **Markdown Utility**: Create a centralized `src/utils/markdown.ts` utility.
   - Configure `marked` to use `highlight.js`.
   - Implement a custom renderer for `code` blocks that injects HTML structure for a "Copy" button.
3. **Integration**: Update `CoursePage.tsx` to utilize the new markdown utility and implement the click handler for the dynamically injected "Copy" buttons. Add custom CSS for the code blocks in `index.css`.

### Phase 2: Advanced Gamification (Leaderboard & Daily Goals)
1. **State Management**: Update `useStore.ts` to track a "Daily Goal" (e.g., target XP for the day) and the user's progress towards it.
2. **Sidebar Updates**: Modify `Sidebar.tsx` to display a compact, circular progress indicator for the Daily Goal alongside the streak.
3. **Leaderboard Page**: 
   - Create `src/pages/LeaderboardPage.tsx`.
   - Implement a dynamically generated list of simulated users, positioning the current user within the ranks based on their actual XP.
   - Add a navigation link to the Leaderboard in the Sidebar.
   - Register the route in `App.tsx`.

### Phase 3: AI Study Assistant (Simulated)
1. **Component Design**: Create `src/components/ui/ChatWidget.tsx`—a floating button that expands into a chat interface.
2. **State & Logic**: 
   - Add chat history state to `useStore.ts`.
   - Implement a simulated AI response function that detects keywords in the user's message and contextualizes responses based on the currently active course title/content.
3. **Integration**: Embed the `ChatWidget` in `Layout.tsx` so it's accessible across the platform, specifically tailored when viewing a course.

## Verification
- Test code block rendering and copy functionality.
- Verify Daily Goal resets appropriately.
- Check the Leaderboard sorting and display logic.
- Ensure the Chat Widget opens, closes, and simulates responses without blocking the main UI thread.
